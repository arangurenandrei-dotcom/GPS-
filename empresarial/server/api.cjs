'use strict';

const { createHash } = require('node:crypto');
const { FieldPath } = require('firebase-admin/firestore');
const { departamentos, fases, transiciones, puedeLeer, acciones } = require('./flujo.cjs');
const { evaluarParte, refEvaluacion, resumenIA } = require('./ia.cjs');
const { crearComercial, claveComercial, senalar } = require('./comercial.cjs');

const TAMANO = 25;
const digest = (...args) => createHash('sha256').update(JSON.stringify(args)).digest('hex');
const fechaIso = value => value.toDate().toISOString();

function crearApi({ db, auth, HttpsError, configIA }) {
  const miembros = db.collection('miembros');
  const equipos = db.collection('equipos');
  const expedientes = db.collection('expedientes');
  const auditoria = db.collection('auditoria');
  const tareas = db.collection('tareas');
  const fail = (code, message) => { throw new HttpsError(code, message); };

  function id(value, label) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value) || /^__.*__$/.test(value)) {
      fail('invalid-argument', label + ' inválido.');
    }
    return value;
  }

  function texto(value, label, max, min = 1) {
    if (typeof value !== 'string' || value.trim().length < min || value.length > max ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
      fail('invalid-argument', label + ' inválido.');
    }
    return value.trim();
  }

  const comercial = crearComercial({ equipos, fail, id });

  function departamento(value) {
    if (typeof value !== 'string' || !Object.hasOwn(departamentos, value)) {
      fail('invalid-argument', 'Departamento inválido.');
    }
    return value;
  }

  async function actor(tx, request) {
    if (!request.auth?.uid) fail('unauthenticated', 'Inicia sesión.');
    const { uid } = request.auth;
    const perfil = (await tx.get(miembros.doc(uid))).data();
    if (!perfil?.activo) fail('permission-denied', 'Tu cuenta necesita un alta activa en KONSOR.');
    return { ...perfil, uid };
  }

  function exigirCEO(persona) {
    if (persona.puesto !== 'ceo') fail('permission-denied', 'Esta acción corresponde a Dirección general.');
  }

  function gestion(persona, equipoId, area, puesto) {
    if (persona.puesto === 'ceo') return;
    if (persona.puesto !== 'jefe' || persona.equipoId !== equipoId ||
        persona.departamento !== area || puesto !== 'trabajador') {
      fail('permission-denied', 'El perfil queda fuera de tu ámbito de gestión.');
    }
  }

  async function cuentaActiva(uid) {
    try {
      const cuenta = await auth.getUser(uid);
      if (cuenta.disabled) fail('failed-precondition', 'La cuenta está desactivada en Firebase Auth.');
    } catch (error) {
      if (error.code === 'auth/user-not-found') fail('not-found', 'La cuenta aún no se ha registrado.');
      throw error;
    }
  }

  async function pagina(tx, query, cursor, mapear, campoReciente = null) {
    let q = campoReciente ? query.orderBy(campoReciente, 'desc') : query.orderBy(FieldPath.documentId());
    if (cursor !== undefined && cursor !== null) {
      const key = id(cursor, 'Cursor');
      if (campoReciente) {
        const doc = await tx.get(query.doc(key));
        if (!doc.exists) fail('invalid-argument', 'Cursor inválido.');
        q = q.startAfter(doc);
      } else q = q.startAfter(key);
    }
    const { docs } = await tx.get(q.limit(TAMANO + 1));
    const visibles = docs.slice(0, TAMANO);
    return { items: visibles.map(mapear), cursor: docs.length > TAMANO ? visibles.at(-1).id : null };
  }

  function recibos(persona, input) {
    const operationId = id(input.operacionId, 'Identificador de operación');
    return miembros.doc(persona.uid).collection('operaciones').doc(operationId);
  }

  async function mutar(tx, persona, input, payload, aplicar) {
    const recibo = recibos(persona, input);
    const tipo = digest(...payload);
    const previo = (await tx.get(recibo)).data();
    if (previo) {
      if (previo.tipo !== tipo) fail('already-exists', 'La operación ya se utilizó con otros datos.');
      return previo.resultado;
    }
    const resultado = await aplicar(recibo.id);
    tx.create(recibo, { tipo, resultado });
    return resultado;
  }

  function registrar(tx, ref, revision, persona, action, fase, fecha, extra = {}) {
    tx.create(ref.collection('historial').doc(String(revision).padStart(12, '0')), {
      revision, accion: action, fase, actor: persona.nombre, actorUid: persona.uid,
      departamento: persona.departamento, fecha, ...extra
    });
  }

  function avisos(uid) {
    return db.collection('bandejas').doc(uid).collection('avisos');
  }

  function avisar(tx, uid, expedienteId, revision, tipo, fase, fecha) {
    tx.create(avisos(uid).doc(fecha.getTime() + '-' + expedienteId + '-' + revision), {
      expedienteId, tipo, fase, fecha, leido: false
    });
  }

  function asignarTarea(tx, expediente, revision, fase, uid, responsable, equipoId, fecha) {
    const tarea = tareas.doc(expediente.id + '-' + revision);
    tx.create(tarea, {
      expedienteId: expediente.id, equipoId, departamento: fases[fase].departamento,
      fase, responsableUid: uid, responsable, estado: 'pendiente', fecha
    });
    return tarea.id;
  }

  function resumen(doc) {
    const e = doc.data();
    return {
      id: doc.id, titulo: e.titulo, referencia: e.referencia, fase: e.fase, revision: e.revision,
      departamento: fases[e.fase].departamento, responsable: e.responsable, actualizado: fechaIso(e.actualizado)
    };
  }

  function revisaParte(persona, expediente) {
    return acciones(persona, expediente).some(accion => accion.id === 'validar');
  }

  const metodos = {
    sesion: async (_tx, persona) => ({ persona, departamentos, fases }),

    leerTrabajo: comercial.leerTrabajo,
    guardarTrabajo: comercial.guardarTrabajo,

    listarEquipos: async (tx, persona, input) => {
      exigirCEO(persona);
      return pagina(tx, equipos, input.cursor, doc => ({ id: doc.id, nombre: doc.data().nombre }));
    },

    crearEquipo: async (tx, persona, input) => {
      exigirCEO(persona);
      const ref = equipos.doc(id(input.equipoId, 'Identificador de equipo'));
      const nombre = texto(input.nombre, 'Nombre de equipo', 80);
      return mutar(tx, persona, input, ['crearEquipo', ref.id, nombre], async () => {
        if ((await tx.get(ref)).exists) fail('already-exists', 'El equipo ya existe.');
        const fecha = new Date();
        tx.create(ref, { nombre, fecha });
        tx.create(auditoria.doc(), { accion: 'alta_equipo', actorUid: persona.uid, equipoId: ref.id, fecha });
        return { id: ref.id };
      });
    },

    listarMiembros: async (tx, persona, input) => {
      const equipoId = id(input.equipoId, 'Equipo');
      const area = departamento(input.departamento);
      gestion(persona, equipoId, area, 'trabajador');
      const q = miembros.where('equipoId', '==', equipoId).where('departamento', '==', area);
      return pagina(tx, q, input.cursor, doc => ({ uid: doc.id, ...doc.data() }));
    },

    gestionarMiembro: async (tx, persona, input) => {
      const equipoId = id(input.equipoId, 'Equipo');
      const area = departamento(input.departamento);
      const uid = id(input.uid, 'Cuenta');
      const miembro = miembros.doc(uid);
      const { puesto, activo } = input;
      if (!['jefe', 'trabajador'].includes(puesto) || typeof activo !== 'boolean') {
        fail('invalid-argument', 'Puesto o estado inválido.');
      }
      gestion(persona, equipoId, area, puesto);
      const nombre = texto(input.nombre, 'Nombre visible', 80);
      const solicitado = claveComercial(input.legacyKey, area, puesto, fail);
      if (solicitado && persona.puesto !== 'ceo') fail('permission-denied', 'Dirección asigna el vínculo comercial.');
      return mutar(tx, persona, input, ['gestionarMiembro', equipoId, area, uid, puesto, activo, nombre, solicitado], async () => {
        const [equipo, anterior] = await tx.getAll(equipos.doc(equipoId), miembro);
        if (!equipo.exists) fail('not-found', 'El equipo no existe.');
        const previo = anterior.data();
        if (previo && (previo.equipoId !== equipoId || previo.departamento !== area || previo.puesto !== puesto)) {
          fail('permission-denied', 'La cuenta ya tiene otro ámbito asignado.');
        }
        if (!previo && !activo) fail('not-found', 'No existe un alta que suspender.');
        if (activo) await cuentaActiva(uid);
        const legacyKey = solicitado ?? previo?.legacyKey ?? null;
        if (previo?.legacyKey && previo.legacyKey !== legacyKey) {
          fail('failed-precondition', 'El vínculo comercial conserva la titularidad de las fichas.');
        }
        if (legacyKey) {
          const vinculo = equipo.ref.collection('vinculosComerciales').doc(legacyKey);
          const asignado = (await tx.get(vinculo)).data();
          if (asignado && asignado.uid !== uid) fail('already-exists', 'El perfil comercial ya está asignado en ese equipo.');
          if (!asignado) tx.create(vinculo, { uid });
        }
        tx.set(miembro, { equipoId, departamento: area, puesto, activo, nombre, legacyKey });
        tx.create(auditoria.doc(), {
          accion: activo ? 'activar_miembro' : 'suspender_miembro', actorUid: persona.uid,
          miembroUid: uid, equipoId, departamento: area, puesto, fecha: new Date()
        });
        senalar(tx, equipo.ref);
        return { uid, activo };
      });
    },

    crearExpediente: async (tx, persona, input) => {
      if (persona.departamento !== 'comercial') fail('permission-denied', 'El expediente se inicia en Comercial.');
      const fichaId = id(input.fichaId, 'Ficha comercial');
      return mutar(tx, persona, input, ['crearExpediente', fichaId], async () => {
        const origen = await comercial.origen(tx, persona, fichaId);
        const ref = expedientes.doc(digest('ficha', persona.equipoId, fichaId));
        const previo = (await tx.get(ref)).data();
        if (previo) {
          if (!puedeLeer(persona, previo)) fail('permission-denied', 'El expediente ya tiene responsable en Comercial.');
          return { id: ref.id, revision: previo.revision };
        }
        const fecha = new Date();
        let responsable = persona;
        if (origen.ficha.propietario !== persona.legacyKey) {
          const vinculo = (await tx.get(origen.equipo.collection('vinculosComerciales').doc(origen.ficha.propietario))).data();
          if (vinculo) {
            const perfil = (await tx.get(miembros.doc(vinculo.uid))).data();
            if (perfil?.activo && perfil.equipoId === persona.equipoId && perfil.legacyKey === origen.ficha.propietario) {
              responsable = { ...perfil, uid: vinculo.uid };
            }
          }
        }
        const tareaId = asignarTarea(tx, ref, 1, 'captacion', responsable.uid, responsable.nombre, persona.equipoId, fecha);
        tx.create(ref, {
          equipoId: persona.equipoId, titulo: 'Intervención ' + ref.id.slice(0, 8).toUpperCase(),
          referencia: fichaId, fichaId, tareaId, fase: 'captacion', revision: 1,
          creadorUid: persona.uid, responsableUid: responsable.uid, responsable: responsable.nombre,
          lectores: [...new Set([persona.uid, responsable.uid])], departamentos: ['comercial'], actualizado: fecha
        });
        tx.update(origen.ref, { expedienteId: ref.id });
        registrar(tx, ref, 1, persona, 'crear', 'captacion', fecha);
        if (responsable.uid !== persona.uid) avisar(tx, responsable.uid, ref.id, 1, 'asignacion', 'captacion', fecha);
        senalar(tx, origen.equipo);
        return { id: ref.id, revision: 1 };
      });
    },

    listarExpedientes: async (tx, persona, input) => {
      if (persona.departamento === 'direccion') fail('permission-denied', 'Dirección consulta los indicadores agregados.');
      const q = expedientes.where('equipoId', '==', persona.equipoId);
      const scope = persona.puesto === 'jefe'
        ? q.where('departamentos', 'array-contains', persona.departamento)
        : q.where('lectores', 'array-contains', persona.uid);
      return pagina(tx, scope, input.cursor, resumen);
    },

    leerExpediente: async (tx, persona, input) => {
      const ref = expedientes.doc(id(input.id, 'Expediente'));
      const doc = await tx.get(ref);
      const e = doc.data();
      if (!e || !puedeLeer(persona, e)) fail('not-found', 'El expediente no está disponible.');
      const historial = await pagina(tx, ref.collection('historial'), input.cursor,
        evento => {
          const { actorUid, fecha, ...datos } = evento.data();
          return { ...datos, fecha: fechaIso(fecha) };
        }, 'revision');
      let ia = null;
      if (e.revisionParte && revisaParte(persona, e)) {
        ia = configIA ? resumenIA((await tx.get(refEvaluacion(ref, e.revisionParte))).data())
          : { estado: 'sin_configurar', reintentar: false };
      }
      return {
        ...resumen(doc), superficie: e.superficie ?? null,
        justificante: persona.departamento === 'administracion' ? e.justificante ?? null : null,
        acciones: acciones(persona, e), historial, ia, ficha: await comercial.proyeccion(tx, persona, e)
      };
    },

    reintentarRevision: async (tx, persona, input) => {
      const ref = expedientes.doc(id(input.id, 'Expediente'));
      const e = (await tx.get(ref)).data();
      if (!e || !puedeLeer(persona, e)) fail('not-found', 'El expediente no está disponible.');
      if (!revisaParte(persona, e)) fail('permission-denied', 'La revisión corresponde a Oficina.');
      if (!configIA || !e.revisionParte) fail('failed-precondition', 'La revisión asistida no está disponible.');
      return { id: ref.id, revision: e.revisionParte };
    },

    listarDestinos: async (tx, persona, input) => {
      const e = (await tx.get(expedientes.doc(id(input.id, 'Expediente')))).data();
      if (!e || !puedeLeer(persona, e)) fail('not-found', 'El expediente no está disponible.');
      const area = acciones(persona, e).find(a => a.id === input.accion)?.asignarDepartamento;
      if (!area) fail('permission-denied', 'No se pueden consultar los destinatarios para esa acción.');
      const q = miembros.where('equipoId', '==', persona.equipoId)
        .where('departamento', '==', area).where('activo', '==', true);
      return pagina(tx, q, input.cursor, doc => {
        const { nombre, puesto } = doc.data();
        return { uid: doc.id, nombre, puesto };
      });
    },

    avanzarExpediente: async (tx, persona, input) => {
      const ref = expedientes.doc(id(input.id, 'Expediente'));
      const e = (await tx.get(ref)).data();
      if (!e || !puedeLeer(persona, e)) fail('not-found', 'El expediente no está disponible.');
      if (typeof input.accion !== 'string' ||
          (input.accion !== 'reasignar' && !Object.hasOwn(transiciones, input.accion))) {
        fail('invalid-argument', 'Acción inválida.');
      }
      const paso = transiciones[input.accion];
      const revision = input.revision;
      if (!Number.isSafeInteger(revision) || revision < 1) fail('invalid-argument', 'Revisión inválida.');
      const uid = paso?.hasta === 'cerrado' ? null : id(input.responsableUid, 'Responsable');
      const motivo = paso?.motivo ? texto(input.motivo, 'Motivo', 600) : null;
      const justificante = paso?.justificante ? texto(input.justificante, 'Justificante interno', 120) : null;
      const superficie = paso?.superficie ? input.superficie : null;
      if (paso?.superficie && (!Number.isFinite(superficie) || superficie <= 0 || superficie > 1000000)) {
        fail('invalid-argument', 'La superficie debe estar entre 0 y 1.000.000 m² y ser mayor que cero.');
      }
      return mutar(tx, persona, input,
        ['avanzarExpediente', ref.id, revision, input.accion, uid, motivo, justificante, superficie], async () => {
          if (revision !== e.revision) fail('aborted', 'El expediente ha cambiado. Actualiza antes de continuar.');
          const accion = acciones(persona, e).find(a => a.id === input.accion);
          if (!accion) fail('permission-denied', 'Esta acción no está disponible para tu puesto y fase.');
          const fase = paso?.hasta ?? e.fase;
          const area = fases[fase].departamento;
          let responsable = e.responsable;
          if (uid) {
            const destino = (await tx.get(miembros.doc(uid))).data();
            if (!destino?.activo || destino.equipoId !== e.equipoId || destino.departamento !== area) {
              fail('failed-precondition', 'Selecciona una cuenta activa del equipo y departamento de destino.');
            }
            if (input.accion === 'reasignar' && uid === e.responsableUid) {
              fail('failed-precondition', 'Selecciona otro responsable.');
            }
            responsable = destino.nombre;
          }
          const lectores = [...new Set(uid ? [...e.lectores, uid] : e.lectores)];
          if (lectores.length > 100) fail('resource-exhausted', 'El expediente alcanzó el límite de participantes.');
          const fecha = new Date();
          const nuevaRevision = revision + 1;
          const subsanaciones = e.subsanaciones ?? 0;
          const tareaActual = e.tareaId ? await tx.get(tareas.doc(e.tareaId)) : null;
          if (tareaActual?.exists) tx.update(tareaActual.ref, {
            estado: input.accion === 'reasignar' ? 'reasignada' : 'completada', resuelta: fecha
          });
          const tareaId = uid ? asignarTarea(tx, ref, nuevaRevision, fase, uid, responsable, e.equipoId, fecha) : null;
          tx.update(ref, {
            fase, tareaId, revision: nuevaRevision, actualizado: fecha, responsable, lectores,
            responsableUid: uid ?? e.responsableUid,
            departamentos: [...new Set([...e.departamentos, area])],
            ...(superficie !== null && {
              superficie, revisionParte: nuevaRevision,
              datosRevision: {
                cambioSuperficie: !e.superficie ? 'primera' :
                  Math.abs(superficie - e.superficie) / e.superficie >= 0.10 ? 'alto' : 'normal',
                subsanaciones: subsanaciones === 0 ? 'ninguna' : subsanaciones === 1 ? 'una' : 'varias'
              }
            }),
            ...(motivo !== null && { subsanaciones: subsanaciones + 1 }),
            ...(justificante !== null && { justificante })
          });
          registrar(tx, ref, nuevaRevision, persona, input.accion, fase, fecha, {
            responsable, ...(motivo !== null && { motivo }), ...(superficie !== null && { superficie })
          });
          avisar(tx, uid ?? e.creadorUid, ref.id, nuevaRevision, uid ? 'asignacion' : 'cierre', fase, fecha);
          senalar(tx, equipos.doc(e.equipoId));
          return { id: ref.id, revision: nuevaRevision };
        });
    },

    listarTareas: async (tx, persona, input) => {
      if (persona.departamento === 'direccion') fail('permission-denied', 'Dirección consulta los indicadores.');
      const scope = tareas.where('equipoId', '==', persona.equipoId);
      const consulta = persona.puesto === 'jefe' && input.equipo === true
        ? scope.where('departamento', '==', persona.departamento)
        : scope.where('responsableUid', '==', persona.uid);
      const estados = input.resueltas === true ? ['completada', 'reasignada'] : ['pendiente', 'en_curso'];
      return pagina(tx, consulta.where('estado', 'in', estados), input.cursor, doc => {
        const { expedienteId, estado, fase, responsable, fecha } = doc.data();
        return { id: doc.id, expedienteId, estado, fase, responsable, fecha: fechaIso(fecha) };
      });
    },

    iniciarTarea: async (tx, persona, input) => {
      const ref = tareas.doc(id(input.id, 'Tarea'));
      const tarea = (await tx.get(ref)).data();
      if (!tarea || tarea.equipoId !== persona.equipoId || tarea.responsableUid !== persona.uid) {
        fail('not-found', 'La tarea no está disponible.');
      }
      const caso = (await tx.get(expedientes.doc(tarea.expedienteId))).data();
      if (caso?.tareaId !== ref.id || !['pendiente', 'en_curso'].includes(tarea.estado)) {
        fail('failed-precondition', 'Esta tarea ya se ha resuelto.');
      }
      if (tarea.estado === 'pendiente') {
        tx.update(ref, { estado: 'en_curso', inicio: new Date() });
        senalar(tx, equipos.doc(tarea.equipoId));
      }
      return { estado: 'en_curso' };
    },

    listarAvisos: (tx, persona, input) => pagina(tx, avisos(persona.uid), input.cursor, doc => {
      const datos = doc.data();
      return { id: doc.id, ...datos, fecha: fechaIso(datos.fecha) };
    }, 'fecha'),

    leerAviso: async (tx, persona, input) => {
      const ref = avisos(persona.uid).doc(id(input.id, 'Aviso'));
      const aviso = (await tx.get(ref)).data();
      if (!aviso) fail('not-found', 'El aviso no está disponible.');
      if (!aviso.leido) {
        tx.update(ref, { leido: true });
        if (persona.equipoId) senalar(tx, equipos.doc(persona.equipoId));
      }
      return { leido: true };
    },

    indicadores: async (tx, persona) => {
      if (persona.departamento !== 'direccion') fail('permission-denied', 'Indicadores reservados a Dirección.');
      const scope = persona.puesto === 'ceo' ? expedientes : expedientes.where('equipoId', '==', persona.equipoId);
      const conteos = await Promise.all(Object.keys(fases).map(async fase => {
        const resultado = await tx.get(scope.where('fase', '==', fase).count());
        return [fase, resultado.data().count];
      }));
      return { fases: Object.fromEntries(conteos) };
    }
  };

  return async request => {
    const { metodo, ...input } = request.data ?? {};
    const resultado = await db.runTransaction(async tx => {
      const persona = await actor(tx, request);
      if (typeof metodo !== 'string' || !Object.hasOwn(metodos, metodo)) {
        fail('invalid-argument', 'Operación desconocida.');
      }
      return metodos[metodo](tx, persona, input);
    });
    if (metodo === 'reintentarRevision') {
      await evaluarParte({ db, ref: expedientes.doc(resultado.id), revision: resultado.revision, config: configIA });
      return { ok: true };
    }
    return resultado;
  };
}

module.exports = { crearApi };
