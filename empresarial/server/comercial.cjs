'use strict';

const { createHash } = require('node:crypto');
const { FieldValue } = require('firebase-admin/firestore');

const perfiles = {
  jefe: 'Andrei (Jefe)',
  jefe_mikel: 'Mikel (Jefe)',
  ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => ['comercial' + (i + 1), 'Comercial ' + (i + 1)])),
  ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => ['mikel_com' + (i + 1), 'Mikel Com. ' + (i + 1)]))
};
const claves = Object.fromEntries(Object.entries(perfiles).map(([clave, nombre]) => [nombre, clave]));
const colecciones = ['zonas', 'fichas', 'jornadas', 'actividad', 'misiones', 'pueblos_completados',
  'alias_perfiles', 'tareas_jefe'];
const ambito = clave => clave.includes('mikel') ? 'mikel' : 'andrei';
const mapa = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const huella = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const mismoAmbito = (a, b) => Object.hasOwn(perfiles, b) && ambito(a) === ambito(b);
const camposReserva = ['obraDate', 'obraTime', 'obraEquipoInstalacion', 'crmUploaded',
  'reservaId', 'konsorAppointmentVerified', 'historicoKonsorEventoId'];
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

function claveComercial(value, area, puesto, fail) {
  if (value == null || value === '') return null;
  if (area !== 'comercial' || typeof value !== 'string' || !Object.hasOwn(perfiles, value) ||
      value.startsWith('jefe') !== (puesto === 'jefe')) {
    fail('invalid-argument', 'El perfil comercial histórico es incompatible con el puesto.');
  }
  return value;
}

function senalar(tx, equipo) {
  tx.set(equipo.collection('senales').doc('actividad'), { actualizado: FieldValue.serverTimestamp() });
}

function crearComercial({ equipos, fail, id }) {
  function exigir(persona) {
    if (persona.departamento !== 'comercial' || !Object.hasOwn(perfiles, persona.legacyKey)) {
      fail('permission-denied', 'Tu cuenta requiere un perfil comercial vinculado.');
    }
    return equipos.doc(persona.equipoId);
  }

  const acceso = (persona, ficha) => ficha && !ficha.borrado && Object.hasOwn(perfiles, persona.legacyKey) &&
    mismoAmbito(persona.legacyKey, ficha.propietario) &&
    (persona.puesto === 'jefe' || ficha.propietario === persona.legacyKey);

  async function leerTrabajo(tx, persona) {
    const equipo = exigir(persona);
    const docs = await Promise.all(colecciones.map(async col => {
      const group = equipo.collection(col).where('borrado', '==', false);
      const consulta = persona.puesto === 'jefe' ? group.where('ambito', '==', ambito(persona.legacyKey))
        : group.where('propietario', '==', persona.legacyKey);
      const resultado = await tx.get(consulta.limit(5001));
      if (resultado.size > 5000) fail('resource-exhausted', 'El equipo supera el límite de carga del visor comercial.');
      return resultado.docs.map(doc => {
        const { datos, rev, zona, propietario, orden } = doc.data();
        return { col, id: doc.id, datos, rev, ...(col === 'fichas' && { zona, owner: propietario, orden }) };
      });
    }));
    return { key: persona.legacyKey, docs: docs.flat() };
  }

  async function guardarTrabajo(tx, persona, input) {
    const equipo = exigir(persona);
    const op = id(input.op, 'Operación comercial');
    const { changes } = input;
    if (!Array.isArray(changes) || !changes.length || changes.length > 300 ||
        Buffer.byteLength(JSON.stringify(changes)) > 2_000_000) {
      fail('invalid-argument', 'El lote comercial está vacío o supera el tamaño permitido.');
    }
    const recibo = equipo.collection('recibosTrabajo').doc(huella([persona.uid, op]));
    const anterior = (await tx.get(recibo)).data();
    const firma = huella(changes);
    if (anterior) {
      if (anterior.firma !== firma) fail('already-exists', 'La operación comercial ya se usó con otros cambios.');
      return { ok: true, op };
    }

    const registros = new Map();
    for (const c of changes) {
      if (!mapa(c) || !colecciones.includes(c.col) || !Number.isSafeInteger(c.rev) || c.rev < 0 || c.rev >= Number.MAX_SAFE_INTEGER ||
          (c.remove !== undefined && typeof c.remove !== 'boolean')) {
        fail('invalid-argument', 'Cambio comercial inválido.');
      }
      const clave = c.col + '/' + id(c.id, 'Registro');
      if (registros.has(clave)) fail('invalid-argument', 'El lote contiene un registro repetido.');
      if (c.remove !== true && (!mapa(c.datos) || Buffer.byteLength(JSON.stringify(c.datos)) > 160_000)) {
        fail('invalid-argument', 'Datos comerciales inválidos o demasiado grandes.');
      }
      if (c.col === 'fichas' && c.remove !== true) {
        id(c.zona, 'Sector de la ficha');
        if (!Number.isSafeInteger(c.orden) || c.orden < 0) fail('invalid-argument', 'Orden de ficha inválido.');
      }
      registros.set(clave, { cambio: c, ref: equipo.collection(c.col).doc(c.id) });
    }

    const leidos = await tx.getAll(...[...registros.values()].map(r => r.ref));
    leidos.forEach(snap => { registros.get(snap.ref.path.slice(equipo.path.length + 1)).antes = snap.data(); });
    const zonasExternas = new Map();

    for (const { cambio: c, antes } of registros.values()) {
      if (antes && !acceso(persona, antes)) fail('permission-denied', 'El registro queda fuera de tu ámbito comercial.');
      if ((antes?.rev ?? 0) !== c.rev) fail('aborted', 'Los datos comerciales han cambiado. Recarga antes de guardar.');
      if (c.remove === true && !antes) fail('not-found', 'El registro ya no está disponible.');
      if (c.remove === true && antes.expedienteId) {
        fail('failed-precondition', 'La ficha está vinculada a un expediente y se conserva.');
      }
      const zona = c.col === 'fichas' ? (c.remove ? antes.zona : c.zona) : null;
      if (zona && !registros.has('zonas/' + zona)) zonasExternas.set(zona, equipo.collection('zonas').doc(zona));
    }
    if (zonasExternas.size) {
      for (const snap of await tx.getAll(...zonasExternas.values())) zonasExternas.set(snap.id, snap.data());
    }

    for (const { cambio: c, antes } of registros.values()) {
      if (c.col !== 'zonas' || c.remove !== true) continue;
      const existentes = await tx.get(equipo.collection('fichas').where('zona', '==', c.id).where('borrado', '==', false).limit(301));
      if (existentes.docs.some(f => registros.get('fichas/' + f.id)?.cambio.remove !== true)) {
        fail('failed-precondition', 'El sector aún contiene fichas activas.');
      }
    }

    for (const r of registros.values()) {
      const { cambio: c, antes } = r;
      if (c.col === 'fichas' || c.remove === true) continue;
      let propietario = antes?.propietario ?? persona.legacyKey;
      if (c.col === 'zonas') {
        if (String(c.datos.id) !== c.id) fail('invalid-argument', 'El sector tiene un ID distinto del documento.');
        propietario = Object.hasOwn(claves, c.datos.comercial) ? claves[c.datos.comercial] : null;
        if (!propietario || !mismoAmbito(persona.legacyKey, propietario) ||
            (persona.puesto !== 'jefe' && propietario !== persona.legacyKey)) {
          fail('permission-denied', 'El propietario del sector queda fuera de tu ámbito.');
        }
        if (antes && propietario !== antes.propietario) {
          fail('failed-precondition', 'El cambio de propietario del sector requiere traslado de las fichas.');
        }
        if (Object.hasOwn(c.datos, 'clients')) fail('invalid-argument', 'Las fichas se guardan en sus propios documentos.');
      }
      if (c.col === 'alias_perfiles' && c.id !== persona.legacyKey) fail('permission-denied', 'Solo puedes editar tu perfil.');
      if (['jornadas', 'actividad'].includes(c.col) &&
          (String(c.datos.id) !== c.id || c.datos.user !== perfiles[propietario])) {
        fail('permission-denied', 'El registro debe identificar a su titular comercial.');
      }
      if (c.col === 'tareas_jefe' && persona.puesto !== 'jefe') fail('permission-denied', 'La planificación requiere jefatura.');
      r.despues = { datos: c.datos, propietario, ambito: ambito(propietario), rev: c.rev + 1, borrado: false };
    }

    for (const r of registros.values()) {
      const { cambio: c, antes } = r;
      if (c.col !== 'fichas' || c.remove === true) continue;
      const registroZona = registros.get('zonas/' + c.zona);
      const zona = registroZona ? registroZona.despues : zonasExternas.get(c.zona);
      if (!acceso(persona, zona)) fail('permission-denied', 'El sector de la ficha queda fuera de tu ámbito.');
      if (c.owner !== zona.propietario || (antes && antes.propietario !== zona.propietario)) {
        fail('permission-denied', 'La ficha debe pertenecer al mismo propietario que su sector.');
      }
      if (antes?.expedienteId && c.zona !== antes.zona) {
        fail('failed-precondition', 'La ficha está vinculada a un expediente y debe conservar su sector.');
      }
      if (camposReserva.some(key => (c.datos[key] || null) !== (antes?.datos[key] || null)) ||
          (c.datos.obraStatus === 'agendada' && antes?.datos.obraStatus !== 'agendada')) {
        fail('failed-precondition', 'La reserva de obras necesita la integración de agenda autorizada.');
      }
      r.despues = {
        datos: c.datos, rev: c.rev + 1, borrado: false, propietario: zona.propietario,
        ambito: zona.ambito, zona: c.zona, orden: c.orden,
        ...(antes?.expedienteId && { expedienteId: antes.expedienteId })
      };
    }

    for (const { cambio, antes, ref, despues } of registros.values()) {
      tx.set(ref, cambio.remove === true ? { ...antes, borrado: true, rev: cambio.rev + 1 } : despues);
    }
    tx.create(recibo, { firma, fecha: new Date() });
    senalar(tx, equipo);
    return { ok: true, op };
  }

  async function origen(tx, persona, fichaId) {
    const equipo = exigir(persona);
    const ref = equipo.collection('fichas').doc(id(fichaId, 'Ficha comercial'));
    const ficha = (await tx.get(ref)).data();
    if (!acceso(persona, ficha)) fail('not-found', 'La ficha comercial no está disponible.');
    const zona = (await tx.get(equipo.collection('zonas').doc(ficha.zona))).data();
    if (!acceso(persona, zona)) fail('failed-precondition', 'La ficha necesita un sector comercial activo.');
    if (!text(ficha.datos.street, 200) || !text(ficha.datos.locality || zona.datos.town, 120)) {
      fail('failed-precondition', 'Completa la calle y la localidad en la ficha comercial.');
    }
    return { equipo, ref, ficha };
  }

  async function proyeccion(tx, persona, e) {
    if (!e.fichaId || persona.departamento === 'direccion') return null;
    const equipo = equipos.doc(e.equipoId);
    const ficha = (await tx.get(equipo.collection('fichas').doc(e.fichaId))).data();
    if (!ficha || ficha.borrado) return null;
    const origenComercial = persona.departamento === 'comercial' && acceso(persona, ficha);
    const usaDireccion = origenComercial || ['tecnicos', 'oficina'].includes(persona.departamento);
    if (!usaDireccion) return { revision: ficha.rev };
    const datos = ficha.datos;
    const zona = (await tx.get(equipo.collection('zonas').doc(ficha.zona))).data()?.datos;
    return {
      revision: ficha.rev,
      direccion: text(datos.street, 200),
      localidad: text(datos.locality || zona?.town, 120),
      codigoPostal: text(datos.postalCode || datos.cp, 12),
      superficieEstimada: typeof datos.m2 === 'number' || typeof datos.m2 === 'string' ? String(datos.m2).slice(0, 24) : '',
      ...(origenComercial && { id: e.fichaId }),
      ...(persona.departamento === 'oficina' && {
        contacto: text(datos.name, 120), telefono: text(datos.phone, 32)
      })
    };
  }

  return { leerTrabajo, guardarTrabajo, origen, proyeccion };
}

module.exports = { crearComercial, claveComercial, senalar };
