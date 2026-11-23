import { initializeApp } from 'firebase/app';
import {
  browserSessionPersistence, connectAuthEmulator, createUserWithEmailAndPassword, getAuth, onAuthStateChanged,
  setPersistence, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

const main = document.querySelector('#app');
const account = document.querySelector('#account');
const nav = document.querySelector('#nav');

const puestos = { trabajador: 'Trabajador', jefe: 'Jefe de departamento', ceo: 'Dirección general' };
const accionesHistorial = {
  crear: 'Alta del expediente', derivar: 'Traspaso a Técnicos', entregar: 'Parte entregado',
  subsanar: 'Subsanación solicitada', validar: 'Documentación validada', cerrar: 'Expediente cerrado',
  reasignar: 'Responsable cambiado'
};
const fecha = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Madrid' });
const formatoFecha = value => fecha.format(new Date(value));
let sesion;
let revisionSesion = 0;
let auth;
let callable;

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

async function api(metodo, data = {}) {
  return (await callable({ metodo, ...data })).data;
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
  return { form, submit, aviso, append: (...campos) => form.append(...campos, submit, aviso) };
}

function pantalla(titulo) {
  const destino = nodo('div', {}, encabezado(titulo));
  main.replaceChildren(destino);
  return destino;
}

function abrir(titulo, cargar) {
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

function login(registro = false) {
  nav.hidden = true;
  account.replaceChildren();
  const destino = pantalla(registro ? 'Crear cuenta' : 'Acceder a Operaciones');
  destino.className = 'auth';
  const email = input({ type: 'email', required: '', autocomplete: 'email' });
  const password = input({ type: 'password', required: '', minlength: 6,
    autocomplete: registro ? 'new-password' : 'current-password' });
  const form = formulario(registro ? 'Crear cuenta' : 'Iniciar sesión', () => registro
    ? createUserWithEmailAndPassword(auth, email.value, password.value)
    : signInWithEmailAndPassword(auth, email.value, password.value));
  form.append(campo('Correo', email), campo('Contraseña', password));
  destino.append(tarjeta(p('Usa una cuenta de este entorno local.', { class: 'meta' }), form.form,
    boton(registro ? 'Volver al acceso' : 'Crear cuenta', () => login(!registro))));
}

function navegacion(id) {
  const botones = {
    expedientes: ['Expedientes', expedientes],
    indicadores: ['Indicadores', indicadores],
    avisos: ['Avisos', avisos],
    equipo: ['Equipo', equipo]
  };
  const persona = sesion.persona;
  const paginas = [persona.departamento === 'direccion' ? 'indicadores' : 'expedientes', 'avisos'];
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
    if (sesion.persona.departamento === 'comercial') {
      const crear = mutacion('crearExpediente');
      const titulo = input({ required: '', maxlength: 120 });
      const referencia = input({ maxlength: 100 });
      const form = formulario('Crear expediente', async () => {
        const nuevo = await crear({ titulo: titulo.value, referencia: referencia.value });
        if (destino.isConnected) detalle(nuevo.id);
      });
      form.append(campo('Título', titulo), campo('Referencia interna (opcional)', referencia));
      destino.append(tarjeta(encabezado('Nuevo expediente', 'h2'), form.form));
    }
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
  const form = formulario('Dar de alta', async () => {
    await alta({ equipoId, departamento, uid: uid.value.trim(), nombre: nombre.value,
      puesto: sesion.persona.puesto === 'ceo' ? puesto.value : 'trabajador', activo: true });
    if (panel.isConnected) directorio(destino, equipoId, departamento);
  });
  form.append(campo('UID de la cuenta', uid), campo('Nombre visible', nombre),
    ...(sesion.persona.puesto === 'ceo' ? [campo('Puesto', puesto)] : []));
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

async function cambiarCuenta(user) {
  const version = ++revisionSesion;
  sesion = undefined;
  if (!user) {
    login();
    return;
  }
  nav.hidden = true;
  const salida = estado();
  const salir = boton('Cerrar sesión', () => enCurso(salida, salir, () => signOut(auth)));
  account.replaceChildren(salir, salida);
  const destino = pantalla('Acceso a KONSOR');
  const aviso = estado();
  destino.append(aviso);
  aviso.textContent = 'Comprobando tu perfil…';
  try {
    const perfil = await api('sesion');
    if (version !== revisionSesion) return;
    sesion = perfil;
    account.prepend(nodo('span', {}, perfil.persona.nombre + ' · ' + perfil.departamentos[perfil.persona.departamento]));
    const esDireccion = perfil.persona.departamento === 'direccion';
    navegacion(esDireccion ? 'indicadores' : 'expedientes');
    if (esDireccion) indicadores();
    else expedientes();
  } catch (error) {
    if (version !== revisionSesion) return;
    mostrarError(aviso, error);
    if (error.code === 'functions/permission-denied') {
      destino.append(p('Facilita este UID a tu responsable para que habilite tu acceso.'),
        p('UID: '), nodo('code', {}, user.uid));
    }
    destino.append(boton('Comprobar acceso', () => cambiarCuenta(user)));
  }
}

async function iniciar() {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    pantalla('Entorno de desarrollo').append(p('Abre la aplicación desde el servidor local de emuladores.'));
    return;
  }
  const app = initializeApp({ projectId: 'demo-konsor-empresarial', apiKey: 'konsor-emulator-only' });
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9109', { disableWarnings: true });
  await setPersistence(auth, browserSessionPersistence);
  const functions = getFunctions(app, 'europe-west1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5003);
  callable = httpsCallable(functions, 'konsorEmpresarial');
  onAuthStateChanged(auth, cambiarCuenta);
}

iniciar().catch(error => mostrarError(pantalla('Acceso a KONSOR').appendChild(estado()), error));
