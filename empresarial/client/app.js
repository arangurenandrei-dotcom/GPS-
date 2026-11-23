const puestos = { trabajador: 'Trabajador', jefe: 'Jefe de departamento', ceo: 'Dirección general' };
const accionesHistorial = {
  crear: 'Alta del expediente', derivar: 'Traspaso a Técnicos', entregar: 'Parte entregado',
  subsanar: 'Subsanación solicitada', validar: 'Documentación validada', cerrar: 'Expediente cerrado',
  reasignar: 'Responsable cambiado'
};
const fecha = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' });
const formatoFecha = value => fecha.format(new Date(value));
let sesion;
let main;
let account;
let nav;
let api;
let iniciarSalida;
let abrirOriginal;
let layout;
let refresco;
let cambioPendiente;

function nodo(tag, attrs = {}, ...contenido) {
  const item = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function') item.addEventListener(key, value);
    else item.setAttribute(key, value);
  }
  item.append(...contenido);
  return item;
}

const p = (text, attrs) => nodo('p', attrs, text);
const encabezado = (text, nivel = 'h1') => nodo(nivel, {}, text);
const boton = (text, click, className = '') => nodo('button', { type: 'button', class: className, click }, text);
const estado = () => p('', { role: 'status' });
const tarjeta = (...children) => nodo('section', { class: 'card' }, ...children);
const campo = (label, control) => nodo('label', {}, label, control);
const input = (attrs = {}) => nodo('input', attrs);
const select = opciones => nodo('select', {}, ...opciones.map(([value, label]) => nodo('option', { value }, label)));
const fase = id => sesion.fases[id].nombre;

function mensaje(error) {
  const mensajes = {
    'auth/invalid-credential': 'Revisa el correo y la contraseña.',
    'auth/email-already-in-use': 'La cuenta ya existe. Puedes iniciar sesión.',
    'auth/network-request-failed': 'No se puede conectar a Firebase Auth.',
    'auth/weak-password': 'Usa al menos seis caracteres.',
    'functions/unavailable': 'No se puede conectar. Puedes reintentar esta operación.',
    'functions/internal': 'El servidor no pudo completar la operación.'
  };
  return mensajes[error.code] ?? (error.code?.startsWith('functions/')
    ? error.message : 'No se pudo completar la operación.');
}

function mostrarError(target, error) {
  target.classList.add('issue');
  target.textContent = mensaje(error);
}

function enCurso(target, button, accion) {
  button.disabled = true;
  target.classList.remove('issue');
  target.textContent = 'Procesando…';
  return Promise.resolve().then(accion).catch(error => mostrarError(target, error)).finally(() => {
    button.disabled = false;
    if (target.textContent === 'Procesando…') target.textContent = '';
  });
}

function mutacion(metodo) {
  let anterior;
  let id;
  return data => {
    const huella = JSON.stringify(data);
    if (anterior !== huella) {
      anterior = huella;
      id = crypto.randomUUID();
    }
    return api(metodo, { ...data, operacionId: id });
  };
}

function formulario(texto, construir) {
  const aviso = estado();
  const submit = nodo('button', { type: 'submit', class: 'primary' }, texto);
  const form = nodo('form', {
    submit: event => {
      event.preventDefault();
      if (!submit.disabled) enCurso(aviso, submit, construir);
    }
  });
  return { form, append: (...campos) => form.append(...campos, submit, aviso) };
}

function pantalla(titulo) {
  const destino = nodo('div', {}, encabezado(titulo));
  main.replaceChildren(destino);
  cambioPendiente.hidden = true;
  return destino;
}

function abrir(titulo, cargar) {
  refresco = () => abrir(titulo, cargar);
  const destino = pantalla(titulo);
  const aviso = estado();
  destino.append(aviso);
  aviso.textContent = 'Cargando…';
  Promise.resolve().then(() => cargar(destino)).then(() => aviso.remove()).catch(error => mostrarError(aviso, error));
  return destino;
}

function paginador(contenedor, leer, pintar, vacio) {
  const lista = nodo('ul');
  const aviso = estado();
  let cursor;
  const mas = boton('Cargar más', () => enCurso(aviso, mas, cargar));
  mas.hidden = true;
  contenedor.append(lista, mas, aviso);
  async function cargar() {
    const pagina = await leer(cursor);
    if (!contenedor.isConnected) return;
    if (!cursor && pagina.items.length === 0) lista.append(nodo('li', { class: 'meta' }, vacio));
    lista.append(...pagina.items.map(item => nodo('li', {}, pintar(item))));
    cursor = pagina.cursor;
    mas.hidden = !cursor;
  }
  return cargar();
}

function navegacion(id) {
  const botones = {
    expedientes: ['Expedientes', expedientes],
    indicadores: ['Indicadores', indicadores],
    tareas: ['Tareas', tareas],
    avisos: ['Avisos', avisos],
    equipo: ['Equipo', equipo]
  };
  const persona = sesion.persona;
  const paginas = persona.departamento === 'direccion' ? ['indicadores'] : ['expedientes', 'tareas', 'avisos'];
  if (['jefe', 'ceo'].includes(persona.puesto)) paginas.push('equipo');
  nav.hidden = false;
  nav.replaceChildren(...paginas.map(pagina => {
    const [label, mostrar] = botones[pagina];
    const b = boton(label, () => { navegacion(pagina); mostrar(); });
    if (pagina === id) b.setAttribute('aria-current', 'page');
    return b;
  }));
}

function expedientes() {
  abrir('Expedientes', async destino => {
    const lista = tarjeta(encabezado('Bandeja de expedientes', 'h2'));
    destino.append(lista);
    await paginador(lista, cursor => api('listarExpedientes', { cursor: cursor ?? null }), e => {
      const b = boton(e.titulo, () => detalle(e.id), 'list-entry');
      b.append(nodo('span', {}, fase(e.fase) + ' · ' + e.responsable));
      return b;
    }, 'Todavía no hay expedientes en tu bandeja.');
  });
}

function detalle(id) {
  abrir('Expediente', async destino => {
    const e = await api('leerExpediente', { id });
    if (!destino.isConnected) return;
    const datos = nodo('dl');
    const campos = [['Fase', fase(e.fase)], ['Responsable', e.responsable], ['Actualizado', formatoFecha(e.actualizado)]];
    if (e.referencia) campos.push(['Referencia', e.referencia]);
    if (e.superficie !== null) campos.push(['Superficie', e.superficie.toLocaleString('es-ES') + ' m²']);
    if (e.justificante) campos.push(['Justificante interno', e.justificante]);
    for (const [etiqueta, valor] of campos) datos.append(nodo('dt', {}, etiqueta), nodo('dd', {}, valor));
    destino.append(nodo('div', { class: 'row controls' }, boton('Volver a expedientes', () => {
      navegacion('expedientes'); expedientes();
    }), boton('Actualizar', () => detalle(id))), tarjeta(encabezado(e.titulo, 'h2'), datos));
    if (e.ficha) mostrarFicha(destino, e.ficha);
    if (e.ia) mostrarIA(destino, e.ia, id);
    if (e.acciones.length) {
      const actions = nodo('div', { class: 'row' });
      const editor = nodo('div');
      for (const accion of e.acciones) {
        actions.append(boton(accion.nombre, () => editarExpediente(e, accion, editor)));
      }
      destino.append(tarjeta(encabezado('Acciones del expediente', 'h2'), actions, editor));
    }
    const historial = tarjeta(encabezado('Historial', 'h2'));
    historial.classList.add('activity');
    destino.append(historial);
    await paginador(historial, cursor => cursor ? api('leerExpediente', { id, cursor }).then(d => d.historial) : e.historial, evento => {
      const datos = nodo('div', {}, nodo('strong', {}, accionesHistorial[evento.accion]),
        p(evento.actor + ' · ' + formatoFecha(evento.fecha), { class: 'meta' }));
      if (evento.responsable && evento.accion !== 'cerrar') datos.append(p('Responsable: ' + evento.responsable));
      if (evento.motivo) datos.append(p(evento.motivo));
      if (evento.superficie) datos.append(p(evento.superficie.toLocaleString('es-ES') + ' m²'));
      return datos;
    }, 'El expediente todavía no tiene movimientos.');
  });
}

function mostrarFicha(destino, ficha) {
  const panel = tarjeta(encabezado('Ficha comercial', 'h2'), p('Revisión de origen ' + ficha.revision, { class: 'meta' }));
  const datos = nodo('dl');
  const campos = [
    ['Dirección', ficha.direccion], ['Localidad', ficha.localidad], ['Código postal', ficha.codigoPostal],
    ['Superficie estimada', ficha.superficieEstimada && ficha.superficieEstimada + ' m²'],
    ['Contacto', ficha.contacto], ['Teléfono', ficha.telefono]
  ];
  for (const [etiqueta, valor] of campos) {
    if (valor) datos.append(nodo('dt', {}, etiqueta), nodo('dd', {}, valor));
  }
  if (datos.childElementCount) panel.append(datos);
  if (ficha.id) panel.append(boton('Abrir ficha comercial', () => abrirOriginal(ficha.id)));
  destino.append(panel);
}

function tareas(equipo = false, resueltas = false) {
  abrir('Tareas', async destino => {
    const controles = nodo('div', { class: 'row controls' },
      boton(resueltas ? 'Ver tareas abiertas' : 'Ver tareas resueltas', () => tareas(equipo, !resueltas)));
    if (sesion.persona.puesto === 'jefe') {
      controles.append(boton(equipo ? 'Ver mis tareas' : 'Ver tareas del departamento', () => tareas(!equipo, resueltas)));
    }
    const lista = tarjeta(encabezado(resueltas ? 'Resueltas' : 'Abiertas', 'h2'));
    destino.append(controles, lista);
    const estados = { pendiente: 'Pendiente', en_curso: 'En curso', completada: 'Completada', reasignada: 'Reasignada' };
    await paginador(lista, cursor => api('listarTareas', { equipo, resueltas, cursor: cursor ?? null }), tarea => {
      const abrir = boton(fase(tarea.fase), () => {
        navegacion('expedientes');
        detalle(tarea.expedienteId);
      }, 'list-entry');
      abrir.append(nodo('span', {}, tarea.responsable + ' · ' + estados[tarea.estado] + ' · ' + formatoFecha(tarea.fecha)));
      const item = nodo('div', { class: 'card' }, abrir);
      if (!equipo && tarea.estado === 'pendiente') {
        const aviso = estado();
        const comenzar = boton('Empezar tarea', () => enCurso(aviso, comenzar, async () => {
          await api('iniciarTarea', { id: tarea.id });
          if (destino.isConnected) tareas();
        }));
        item.append(comenzar, aviso);
      }
      return item;
    }, 'Todavía no hay tareas.');
  });
}

function mostrarIA(destino, ia, id) {
  const estados = {
    sin_configurar: 'Gemini está pendiente de configuración en este entorno.',
    pendiente: 'Clasificación pendiente.', procesando: 'Clasificando el parte.',
    fallida: 'Gemini no completó la clasificación.'
  };
  const panel = tarjeta(encabezado('Revisión asistida', 'h2'), p(ia.recomendacion ?? estados[ia.estado]));
  if (ia.reintentar) {
    const aviso = estado();
    const actualizar = boton(ia.estado === 'pendiente' ? 'Solicitar revisión' : 'Reintentar revisión', () =>
      enCurso(aviso, actualizar, async () => {
        await api('reintentarRevision', { id });
        if (destino.isConnected) detalle(id);
      }));
    panel.append(actualizar, aviso);
  }
  destino.append(panel);
}

function editarExpediente(e, accion, editor) {
  const vista = nodo('div');
  editor.replaceChildren(vista);
  const guardar = mutacion('avanzarExpediente');
  const campos = [];
  const destino = select([['', 'Selecciona un responsable']]);
  destino.required = true;
  const superficie = input({ type: 'number', required: '', min: '0.01', max: '1000000', step: 'any' });
  const motivo = nodo('textarea', { required: '', maxlength: 600, rows: 3 });
  const justificante = input({ required: '', maxlength: 120 });
  const form = formulario('Confirmar', async () => {
    await guardar({
      id: e.id, accion: accion.id, revision: e.revision,
      ...(accion.asignarDepartamento && { responsableUid: destino.value }),
      ...(accion.superficie && { superficie: superficie.valueAsNumber }),
      ...(accion.motivo && { motivo: motivo.value }),
      ...(accion.justificante && { justificante: justificante.value })
    });
    if (vista.isConnected) detalle(e.id);
  });
  if (accion.asignarDepartamento) {
    const aviso = estado();
    let cursor;
    const mas = boton('Cargar destinatarios', () => enCurso(aviso, mas, cargar));
    async function cargar() {
      const pagina = await api('listarDestinos', { id: e.id, accion: accion.id, cursor: cursor ?? null });
      destino.append(...pagina.items.map(persona =>
        nodo('option', { value: persona.uid }, persona.nombre + ' · ' + puestos[persona.puesto])));
      if (!cursor && !pagina.items.length) aviso.textContent = 'No hay cuentas activas en el departamento de destino.';
      cursor = pagina.cursor;
      mas.hidden = !cursor;
    }
    campos.push(campo('Responsable en ' + sesion.departamentos[accion.asignarDepartamento], destino), mas, aviso);
    enCurso(aviso, mas, cargar);
  }
  if (accion.superficie) campos.push(campo('Superficie instalada (m²)', superficie));
  if (accion.motivo) campos.push(campo('Motivo de subsanación', motivo));
  if (accion.justificante) campos.push(campo('Referencia del justificante interno', justificante));
  form.append(...campos);
  vista.append(encabezado(accion.nombre, 'h3'), form.form);
}

function avisos() {
  abrir('Avisos', async destino => {
    const lista = tarjeta();
    destino.append(lista);
    await paginador(lista, cursor => api('listarAvisos', { cursor: cursor ?? null }), a => {
      const error = estado();
      const etiqueta = a.tipo === 'cierre' ? 'Expediente cerrado' : 'Expediente asignado';
      const open = boton(etiqueta, () => {
        navegacion('expedientes');
        detalle(a.expedienteId);
      }, 'list-entry');
      open.append(nodo('span', {}, fase(a.fase) + ' · ' + formatoFecha(a.fecha)));
      const leido = p('Leído', { class: 'meta' });
      const marcar = boton('Marcar como leído', () => enCurso(error, marcar, async () => {
        await api('leerAviso', { id: a.id });
        marcar.replaceWith(leido);
      }));
      return nodo('div', { class: 'card' }, open, a.leido ? leido : marcar, error);
    }, 'Todavía no tienes avisos.');
  });
}

function indicadores() {
  abrir('Indicadores de expedientes', async destino => {
    const { fases } = await api('indicadores');
    if (!destino.isConnected) return;
    destino.append(nodo('div', { class: 'grid' }, ...Object.entries(fases).map(([id, cantidad]) =>
      tarjeta(encabezado(fase(id), 'h2'), p(String(cantidad), { class: 'count' })))));
  });
}

function equipo() {
  abrir('Equipo', async destino => {
    const { persona } = sesion;
    if (persona.puesto === 'jefe') {
      directorio(destino, persona.equipoId, persona.departamento);
      return;
    }
    const equipoId = input({ required: '', maxlength: 128, pattern: '[A-Za-z0-9_\\-]+' });
    const nombre = input({ required: '', maxlength: 80 });
    const crear = mutacion('crearEquipo');
    const alta = formulario('Crear equipo', async () => {
      await crear({ equipoId: equipoId.value, nombre: nombre.value });
      if (destino.isConnected) equipo();
    });
    alta.append(campo('Identificador de equipo', equipoId), campo('Nombre del equipo', nombre));
    const lista = tarjeta(encabezado('Equipos', 'h2'));
    const panel = nodo('section');
    destino.append(tarjeta(encabezado('Nuevo equipo', 'h2'), alta.form), lista, panel);
    await paginador(lista, cursor => api('listarEquipos', { cursor: cursor ?? null }), item =>
      boton(item.nombre, () => {
        const area = select(Object.entries(sesion.departamentos));
        const members = nodo('div');
        area.addEventListener('change', () => directorio(members, item.id, area.value));
        panel.replaceChildren(tarjeta(encabezado(item.nombre, 'h2'), campo('Departamento', area)), members);
        directorio(members, item.id, area.value);
      }, 'list-entry'), 'Crea un equipo para dar de alta a sus miembros.');
  });
}

function directorio(destino, equipoId, departamento) {
  const panel = tarjeta(encabezado(sesion.departamentos[departamento], 'h2'));
  const alta = mutacion('gestionarMiembro');
  const uid = input({ required: '', maxlength: 128 });
  const nombre = input({ required: '', maxlength: 80 });
  const puesto = select([['trabajador', puestos.trabajador], ['jefe', puestos.jefe]]);
  const legacy = select([
    ['', 'Sin vincular'], ['jefe', 'Jefe Andrei'], ['jefe_mikel', 'Jefe Mikel'],
    ...Array.from({ length: 5 }, (_, i) => ['comercial' + (i + 1), 'Comercial ' + (i + 1)]),
    ...Array.from({ length: 5 }, (_, i) => ['mikel_com' + (i + 1), 'Mikel Com. ' + (i + 1)])
  ]);
  const form = formulario('Dar de alta', async () => {
    await alta({ equipoId, departamento, uid: uid.value.trim(), nombre: nombre.value,
      puesto: sesion.persona.puesto === 'ceo' ? puesto.value : 'trabajador', activo: true,
      ...(sesion.persona.puesto === 'ceo' && departamento === 'comercial' && legacy.value && { legacyKey: legacy.value })
    });
    if (panel.isConnected) directorio(destino, equipoId, departamento);
  });
  form.append(campo('UID de la cuenta', uid), campo('Nombre visible', nombre),
    ...(sesion.persona.puesto === 'ceo' ? [campo('Puesto', puesto)] : []),
    ...(sesion.persona.puesto === 'ceo' && departamento === 'comercial' ? [campo('Perfil comercial histórico', legacy)] : []));
  const lista = tarjeta(encabezado('Miembros', 'h2'));
  panel.append(form.form);
  destino.replaceChildren(panel, lista);
  const error = estado();
  lista.append(error);
  paginador(lista, cursor => api('listarMiembros', { equipoId, departamento, cursor: cursor ?? null }), miembro => {
    const fila = nodo('div', { class: 'row' },
      nodo('span', {}, miembro.nombre + ' · ' + puestos[miembro.puesto] + ' · ' + (miembro.activo ? 'Activo' : 'Suspendido')));
    if (sesion.persona.puesto === 'ceo' || miembro.puesto === 'trabajador') {
      const guardar = mutacion('gestionarMiembro');
      const aviso = estado();
      const toggle = boton(miembro.activo ? 'Suspender' : 'Reactivar', () => enCurso(aviso, toggle, async () => {
        await guardar({ equipoId, departamento, uid: miembro.uid, nombre: miembro.nombre,
          puesto: miembro.puesto, activo: !miembro.activo });
        if (panel.isConnected) directorio(destino, equipoId, departamento);
      }));
      fila.append(toggle, aviso);
    }
    return fila;
  }, 'Aún no hay miembros en este departamento.').catch(errorApi => mostrarError(error, errorApi));
}

export function montarOperaciones({ llamar, salir, fichaOriginal }) {
  api = llamar;
  iniciarSalida = salir;
  abrirOriginal = fichaOriginal;
  account = nodo('div', { class: 'ke-account' });
  nav = nodo('nav', { 'aria-label': 'Operaciones' });
  main = nodo('main', { class: 'ke-main', tabindex: '-1' });
  cambioPendiente = boton('Cargar cambios del servidor', () => refresco?.());
  cambioPendiente.hidden = true;
  layout = nodo('section', { id: 'konsorOperaciones', hidden: '', 'aria-label': 'Operaciones de KONSOR' },
    nodo('header', { class: 'ke-header' }, nodo('div', { class: 'ke-shell row' },
      nodo('strong', { class: 'ke-brand' }, 'KONSOR'), account)),
    nodo('div', { class: 'ke-shell' }, nav, cambioPendiente, main));
  document.body.append(layout);

  function abrirPanel(perfil, vista = null, fichaId = null, volver = null) {
    sesion = perfil;
    layout.hidden = false;
    const avisoSalida = estado();
    const salida = boton('Cerrar sesión', () => enCurso(avisoSalida, salida, iniciarSalida));
    account.replaceChildren(nodo('span', {}, perfil.persona.nombre + ' · ' +
      perfil.departamentos[perfil.persona.departamento]), salida, avisoSalida);
    if (volver) account.insertBefore(boton('Volver a Comercial', volver), salida);
    const inicial = vista || (perfil.persona.departamento === 'direccion' ? 'indicadores' : 'expedientes');
    navegacion(inicial);
    if (fichaId) {
      const crear = mutacion('crearExpediente');
      abrir('Expediente compartido', async destino => {
        const caso = await crear({ fichaId });
        if (destino.isConnected) detalle(caso.id);
      });
    } else ({ expedientes, indicadores, avisos, tareas, equipo })[inicial]();
    main.focus();
  }

  return {
    abrir: abrirPanel,
    cerrar() {
      layout.hidden = true;
      main.replaceChildren();
      sesion = undefined;
    },
    cambio() {
      if (layout.hidden || !refresco) return;
      // Mantiene la selección y los datos que ya se estén introduciendo.
      if (main.querySelector('form') || main.contains(document.activeElement) && document.activeElement !== main) {
        cambioPendiente.hidden = false;
      } else refresco();
    }
  };
}
