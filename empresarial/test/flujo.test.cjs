'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { execFile, execFileSync } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { evaluarParte, refEvaluacion } = require('../server/ia.cjs');

const proyecto = 'demo-konsor-empresarial';
const endpoint = 'http://127.0.0.1:5003/' + proyecto + '/europe-west1/konsorEmpresarial';
const authEndpoint = 'http://127.0.0.1:9109/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test';
const dbEndpoint = 'http://127.0.0.1:8183/v1/projects/' + proyecto + '/databases/(default)/documents';
const password = 'emulador-' + randomUUID();
const etiqueta = randomUUID().slice(0, 8);
const equipoId = 'zona-' + etiqueta;
const otroEquipoId = 'otra-zona-' + etiqueta;
const ejecutar = promisify(execFile);

async function cuenta(nombre) {
  const correo = nombre + '-' + etiqueta + '@konsor.example';
  const res = await fetch(authEndpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: correo, password, returnSecureToken: true })
  });
  const { localId: uid, idToken: token, error } = await res.json();
  assert.ok(uid && token, JSON.stringify(error));
  return { nombre, correo, uid, token };
}

async function call(persona, metodo, data = {}) {
  const headers = { 'Content-Type': 'application/json', Connection: 'close' };
  if (persona) headers.Authorization = 'Bearer ' + persona.token;
  const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ data: { metodo, ...data } }) });
  const r = await res.json();
  if (!res.ok) throw Object.assign(new Error(r.error?.message || JSON.stringify(r)), { code: r.error?.status });
  return r.result;
}

const mutate = (actor, metodo, payload) => call(actor, metodo, { ...payload, operacionId: randomUUID() });
const error = code => ({ code });
const personaEn = (persona, departamento, puesto, team = equipoId, activo = true) => ({
  uid: persona.uid, nombre: persona.nombre, departamento, puesto, equipoId: team, activo
});

test('Aplicación integrada con Auth, Functions, Firestore y Chromium', { timeout: 200000 }, async t => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8183');
  const [ceo, comercial, colega, jefe, tecnico, otroTecnico, oficina, administracion, direccion, otroEquipo, nuevo, jefeComercial] =
    await Promise.all(['direccion-general', 'comercial', 'colega', 'jefe-tecnico',
      'tecnico', 'otro-tecnico', 'oficina', 'administracion', 'direccion', 'otro-equipo', 'nuevo', 'jefe-comercial'].map(cuenta));

  await t.test('Autenticación, arranque, alta y aislamiento de perfiles', async () => {
    await assert.rejects(call(null, 'sesion'), error('UNAUTHENTICATED'));
    await assert.rejects(call(nuevo, 'sesion'), error('PERMISSION_DENIED'));
    const alta = path.resolve(__dirname, '../scripts/alta-ceo.cjs');
    await ejecutar(process.execPath, [alta, ceo.uid, ceo.nombre]);
    await ejecutar(process.execPath, [alta, ceo.uid, ceo.nombre]);
    await assert.rejects(ejecutar(process.execPath, [alta, nuevo.uid, nuevo.nombre]), /Dirección general ya se ha inicializado/);
    const primario = await call(ceo, 'sesion');
    assert.equal(Object.keys(primario.departamentos).length, 5);
    assert.equal(primario.persona.puesto, 'ceo');
    assert.deepEqual(await call(ceo, 'listarEquipos'), { items: [], cursor: null });
    await mutate(ceo, 'crearEquipo', { equipoId, nombre: 'Equipo ' + etiqueta });
    await mutate(ceo, 'crearEquipo', { equipoId: otroEquipoId, nombre: 'Otro equipo ' + etiqueta });
    for (const [persona, area, puesto, team, legacyKey] of [
      [comercial, 'comercial', 'trabajador', equipoId, 'comercial1'],
      [colega, 'comercial', 'trabajador', equipoId, 'comercial2'],
      [jefeComercial, 'comercial', 'jefe', equipoId, 'jefe'], [jefe, 'tecnicos', 'jefe'],
      [oficina, 'oficina', 'trabajador'], [administracion, 'administracion', 'trabajador'],
      [direccion, 'direccion', 'jefe'], [otroEquipo, 'tecnicos', 'jefe', otroEquipoId]
    ]) {
      await mutate(ceo, 'gestionarMiembro', { ...personaEn(persona, area, puesto, team), ...(legacyKey && { legacyKey }) });
    }
    await mutate(jefe, 'gestionarMiembro', personaEn(tecnico, 'tecnicos', 'trabajador'));
    await mutate(jefe, 'gestionarMiembro', personaEn(otroTecnico, 'tecnicos', 'trabajador'));
    await assert.rejects(mutate(tecnico, 'gestionarMiembro', personaEn(nuevo, 'tecnicos', 'jefe')), error('PERMISSION_DENIED'));
    await assert.rejects(mutate(jefe, 'gestionarMiembro', personaEn(nuevo, 'oficina', 'trabajador')), error('PERMISSION_DENIED'));
    await assert.rejects(mutate(jefe, 'gestionarMiembro', personaEn(nuevo, 'tecnicos', 'jefe')), error('PERMISSION_DENIED'));
    await assert.rejects(mutate(ceo, 'gestionarMiembro', personaEn(comercial, 'oficina', 'trabajador')), error('PERMISSION_DENIED'));
    await assert.rejects(mutate(ceo, 'gestionarMiembro', {
      ...personaEn(nuevo, 'comercial', 'trabajador'), legacyKey: 'comercial1'
    }), error('ALREADY_EXISTS'));
    await assert.rejects(mutate(jefeComercial, 'gestionarMiembro', {
      ...personaEn(nuevo, 'comercial', 'trabajador'), legacyKey: 'comercial3'
    }), error('PERMISSION_DENIED'));
    const miembros = await call(jefe, 'listarMiembros', { equipoId, departamento: 'tecnicos' });
    assert.equal(miembros.items.length, 3);
    await assert.rejects(call(jefe, 'listarMiembros', { equipoId: otroEquipoId, departamento: 'tecnicos' }), error('PERMISSION_DENIED'));
    assert.deepEqual(await call(direccion, 'indicadores'), {
      fases: { captacion: 0, instalacion: 0, documentacion: 0, validacion: 0, cerrado: 0 }
    });
  });

  let caso;
  const zonaId = 'zona-' + etiqueta;
  const fichaId = 'f_' + etiqueta;
  const ficha = { col: 'fichas', id: fichaId, zona: zonaId, orden: 0, owner: 'comercial1', rev: 0,
    datos: { name: 'Contacto de validación', phone: '600000001', dni: '00000000T', email: 'interior@konsor.example',
      street: 'Calle del Ensayo 31', postalCode: '31001', m2: 63 } };
  const lote = { op: randomUUID(), changes: [
    { col: 'zonas', id: zonaId, rev: 0, datos: { id: zonaId, comercial: 'Comercial 1', town: 'Pamplona', points: [] } }, ficha
  ] };

  await t.test('Guardado V2, titularidad y vínculo único al expediente', async () => {
    assert.deepEqual(await call(comercial, 'guardarTrabajo', lote), { ok: true, op: lote.op });
    assert.deepEqual(await call(comercial, 'guardarTrabajo', lote), { ok: true, op: lote.op });
    const lectura = await call(comercial, 'leerTrabajo');
    assert.equal(lectura.key, 'comercial1');
    assert.equal(lectura.docs.find(d => d.id === fichaId).rev, 1);
    assert.equal((await call(jefeComercial, 'leerTrabajo')).docs.length, 2);
    assert.deepEqual((await call(colega, 'leerTrabajo')).docs, []);
    await assert.rejects(call(tecnico, 'leerTrabajo'), error('PERMISSION_DENIED'));
    await assert.rejects(call(colega, 'guardarTrabajo', { op: randomUUID(), changes: [{ ...ficha, rev: 1 }] }),
      error('PERMISSION_DENIED'));
    await assert.rejects(call(colega, 'guardarTrabajo', {
      op: randomUUID(), changes: [{ ...ficha, id: 'f_ajena', owner: 'comercial2' }]
    }), error('PERMISSION_DENIED'));
    await assert.rejects(mutate(comercial, 'crearExpediente', { fichaId: 'inexistente' }), error('NOT_FOUND'));
    await assert.rejects(mutate(colega, 'crearExpediente', { fichaId }), error('NOT_FOUND'));
    const input = { fichaId, operacionId: randomUUID() };
    [caso] = await Promise.all([call(comercial, 'crearExpediente', input), mutate(comercial, 'crearExpediente', { fichaId })])
      .then(resultados => { assert.deepEqual(resultados[0], resultados[1]); return resultados; });
    assert.deepEqual(await call(comercial, 'crearExpediente', input), caso);
    await assert.rejects(call(comercial, 'crearExpediente', { ...input, fichaId: 'otra' }), error('ALREADY_EXISTS'));
    await assert.rejects(call(comercial, 'guardarTrabajo', {
      op: randomUUID(), changes: [{ col: 'fichas', id: fichaId, rev: 1, remove: true }]
    }), error('FAILED_PRECONDITION'));
    await assert.rejects(call(comercial, 'guardarTrabajo', { op: randomUUID(), changes: [ficha] }), error('ABORTED'));
    const tareas = (await call(comercial, 'listarTareas')).items;
    assert.equal(tareas.length, 1);
    assert.equal(tareas[0].expedienteId, caso.id);
    await assert.rejects(call(colega, 'iniciarTarea', { id: tareas[0].id }), error('NOT_FOUND'));
    await call(comercial, 'iniciarTarea', { id: tareas[0].id });
    assert.equal((await call(comercial, 'listarTareas')).items[0].estado, 'en_curso');
  });

  await t.test('Expediente, autorización, reintento y concurrencia', async () => {
    for (const persona of [colega, jefe, oficina, otroEquipo, direccion, ceo]) {
      await assert.rejects(call(persona, 'leerExpediente', { id: caso.id }), error('NOT_FOUND'));
    }
    const datos = await call(comercial, 'leerExpediente', { id: caso.id });
    assert.equal(datos.fase, 'captacion');
    assert.deepEqual(datos.acciones.map(a => a.id), ['derivar']);
    const destinos = await call(comercial, 'listarDestinos', { id: caso.id, accion: 'derivar' });
    assert.deepEqual(destinos.items.map(a => a.uid).sort(), [tecnico, jefe, otroTecnico].map(p => p.uid).sort());
    const traslado = { id: caso.id, revision: 1, accion: 'derivar', responsableUid: tecnico.uid, operacionId: randomUUID() };
    await assert.rejects(call(comercial, 'avanzarExpediente', { ...traslado, responsableUid: otroEquipo.uid }), error('FAILED_PRECONDITION'));
    const intentos = [traslado, { ...traslado, operacionId: randomUUID() }];
    const resultados = await Promise.allSettled(intentos.map(input => call(comercial, 'avanzarExpediente', input)));
    assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(resultados.find(r => r.status === 'rejected').reason.code, 'ABORTED');
    const ganador = intentos[resultados.findIndex(r => r.status === 'fulfilled')];
    assert.equal((await call(comercial, 'avanzarExpediente', ganador)).revision, 2);
    const aviso = (await call(tecnico, 'listarAvisos')).items;
    assert.equal(aviso.length, 1);
    assert.equal(aviso[0].leido, false);
    assert.equal(aviso[0].expedienteId, caso.id);
    await assert.rejects(call(colega, 'leerAviso', { id: aviso[0].id }), error('NOT_FOUND'));
    await assert.rejects(mutate(comercial, 'avanzarExpediente', {
      id: caso.id, revision: 2, accion: 'entregar', responsableUid: oficina.uid, superficie: 75
    }), error('PERMISSION_DENIED'));
    assert.equal((await call(jefe, 'listarExpedientes')).items[0].id, caso.id);
    assert.deepEqual((await call(otroEquipo, 'listarExpedientes')).items, []);
    assert.deepEqual((await call(comercial, 'listarTareas')).items, []);
    assert.equal((await call(comercial, 'listarTareas', { resueltas: true })).items[0].estado, 'completada');
    assert.equal((await call(jefe, 'listarTareas', { equipo: true })).items[0].expedienteId, caso.id);
    assert.deepEqual((await call(otroEquipo, 'listarTareas', { equipo: true })).items, []);
    const proj = (await call(tecnico, 'leerExpediente', { id: caso.id })).ficha;
    assert.deepEqual(proj, { revision: 1, direccion: ficha.datos.street, localidad: 'Pamplona',
      codigoPostal: '31001', superficieEstimada: '63' });

    await call(comercial, 'guardarTrabajo', { op: randomUUID(), changes: [
      { ...ficha, rev: 1, datos: { ...ficha.datos, street: 'Calle del Ensayo 32' } }
    ] });
    assert.equal((await call(tecnico, 'leerExpediente', { id: caso.id })).ficha.direccion, 'Calle del Ensayo 32');
    assert.equal((await call(tecnico, 'leerExpediente', { id: caso.id })).revision, 2);

    const signal = dbEndpoint + '/equipos/' + equipoId + '/senales/actividad';
    const señal = await fetch(signal, { headers: { Authorization: 'Bearer ' + tecnico.token } });
    assert.equal(señal.status, 200);
    assert.deepEqual(Object.keys((await señal.json()).fields), ['actualizado']);
    assert.equal((await fetch(signal, { headers: { Authorization: 'Bearer ' + otroEquipo.token } })).status, 403);
    const documento = dbEndpoint + '/equipos/' + equipoId + '/fichas/' + fichaId;
    assert.equal((await fetch(documento, { headers: { Authorization: 'Bearer ' + comercial.token } })).status, 403);
    for (const headers of [{}, { Authorization: 'Bearer ' + tecnico.token }]) {
      assert.equal((await fetch(dbEndpoint + '/expedientes', { headers })).status, 403);
      assert.equal((await fetch(dbEndpoint + '/expedientes/' + caso.id, { headers })).status, 403);
      assert.equal((await fetch(dbEndpoint + '/expedientes/' + caso.id + '/historial', { headers })).status, 403);
      assert.equal((await fetch(dbEndpoint + '/expedientes/' + caso.id, {
        method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { fase: { stringValue: 'cerrado' } } })
      })).status, 403);
    }
  });

  await t.test('Técnicos, subsanación, Oficina, cierre e indicadores', async () => {
    const avance = (persona, revision, accion, campos) => mutate(persona, 'avanzarExpediente', {
      id: caso.id, revision, accion, ...campos
    });
    await mutate(jefe, 'gestionarMiembro', personaEn(tecnico, 'tecnicos', 'trabajador', equipoId, false));
    await assert.rejects(call(tecnico, 'listarAvisos'), error('PERMISSION_DENIED'));
    await assert.rejects(avance(jefe, 2, 'reasignar', { responsableUid: tecnico.uid }), error('FAILED_PRECONDITION'));
    await avance(jefe, 2, 'reasignar', { responsableUid: otroTecnico.uid });
    await assert.rejects(avance(otroTecnico, 3, 'entregar', { responsableUid: oficina.uid, superficie: 0 }), error('INVALID_ARGUMENT'));
    await avance(otroTecnico, 3, 'entregar', { responsableUid: oficina.uid, superficie: 75.5 });
    const recibido = await call(oficina, 'leerExpediente', { id: caso.id });
    assert.equal(recibido.superficie, 75.5);
    assert.equal(recibido.ficha.contacto, ficha.datos.name);
    assert.equal(recibido.ficha.telefono, ficha.datos.phone);
    assert.equal(Object.hasOwn(recibido.ficha, 'dni'), false);
    assert.deepEqual(recibido.ia, { estado: 'sin_configurar', reintentar: false });
    await assert.rejects(call(comercial, 'reintentarRevision', { id: caso.id }), error('PERMISSION_DENIED'));
    await assert.rejects(call(oficina, 'reintentarRevision', { id: caso.id }), error('FAILED_PRECONDITION'));
    await assert.rejects(avance(oficina, 4, 'subsanar', { responsableUid: otroTecnico.uid, motivo: '' }), error('INVALID_ARGUMENT'));
    await avance(oficina, 4, 'subsanar', { responsableUid: otroTecnico.uid, motivo: 'Confirmar área útil del parte' });
    await avance(otroTecnico, 5, 'entregar', { responsableUid: oficina.uid, superficie: 71.25 });
    const db = getFirestore(initializeApp({ projectId: proyecto }));
    const ref = db.collection('expedientes').doc(caso.id);
    let peticiones = 0;
    const evaluar = () => evaluarParte({ db, ref, revision: 6, config: { modelo: 'prueba-local' },
      clasificar: async ({ partes }) => {
        peticiones++;
        assert.deepEqual(partes, { cambioSuperficie: 'normal', subsanaciones: 'una' });
        return 'revisar_subsanaciones';
      } });
    await Promise.all([evaluar(), evaluar()]);
    assert.equal(peticiones, 1);
    assert.equal((await refEvaluacion(ref, 6).get()).data().prioridad, 'revisar_subsanaciones');
    await avance(oficina, 6, 'validar', { responsableUid: administracion.uid });
    await avance(administracion, 7, 'cerrar', { justificante: 'CIERRE-' + etiqueta });
    const [final, admin, aviso] = await Promise.all([
      call(comercial, 'leerExpediente', { id: caso.id }), call(administracion, 'leerExpediente', { id: caso.id }),
      call(comercial, 'listarAvisos')
    ]);
    assert.equal(final.fase, 'cerrado');
    assert.equal(final.justificante, null);
    assert.equal(admin.justificante, 'CIERRE-' + etiqueta);
    assert.deepEqual(admin.ficha, { revision: 2 });
    assert.equal((await call(administracion, 'listarTareas', { resueltas: true })).items[0].estado, 'completada');
    assert.equal((await call(jefe, 'listarTareas', { equipo: true, resueltas: true })).items.some(t => t.estado === 'reasignada'), true);
    assert.equal(final.superficie, 71.25);
    assert.deepEqual(final.acciones, []);
    assert.deepEqual(final.historial.items.map(a => a.accion),
      ['cerrar', 'validar', 'entregar', 'subsanar', 'entregar', 'reasignar', 'derivar', 'crear']);
    assert.equal(aviso.items[0].tipo, 'cierre');
    await call(comercial, 'leerAviso', { id: aviso.items[0].id });
    assert.equal((await call(comercial, 'listarAvisos')).items[0].leido, true);
    assert.equal((await call(ceo, 'indicadores')).fases.cerrado, 1);
    assert.equal((await call(direccion, 'indicadores')).fases.cerrado, 1);
    await assert.rejects(call(comercial, 'indicadores'), error('PERMISSION_DENIED'));
  });

  await t.test('Ficha comercial real, traspaso y sincronización entre cuentas en Chromium', async browserTest => {
    const chrome = process.env.CHROME_BIN || execFileSync('sh', ['-c',
      'command -v google-chrome || command -v chromium || command -v chromium-browser'], { encoding: 'utf8' }).trim();
    const browser = await puppeteer.launch({ executablePath: chrome, headless: true, protocolTimeout: 18000,
      args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const app = '#konsorOperaciones';
    const dialogos = [];
    try {
      const abrir = async (persona, width) => {
        const page = await browser.newPage();
        page.setDefaultTimeout(12000);
        await page.setViewport({ width, height: 850, isMobile: width < 500, hasTouch: width < 500 });
        await page.setRequestInterception(true);
        page.on('request', req => new URL(req.url()).hostname === '127.0.0.1' ? req.continue() : req.abort());
        page.on('dialog', dialog => { dialogos.push(dialog.message()); void dialog.accept(); });
        await page.goto('http://127.0.0.1:5004/', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof window.KonsorIntegracion?.abrirSesion === 'function');
        await page.type('#authEmail', persona.correo);
        await page.type('#authPass', password);
        await page.click('#iosAuthPrimary');
        const inicio = persona.uid === comercial.uid ? '#cnvHome' : app + ' main h1';
        await page.waitForSelector(inicio, { visible: true });
        return page;
      };
      const button = async (page, label, parent = app) => {
        const handle = await page.waitForFunction((texto, raiz) => [...document.querySelectorAll(raiz + ' button')]
          .find(el => el.textContent.includes(texto) && !el.disabled && el.getClientRects().length && !el.closest('[inert]')),
        {}, label, parent);
        await handle.asElement().click();
        await handle.dispose();
      };
      const visto = (page, selector, texto) => page.waitForFunction((sel, text) =>
        [...document.querySelectorAll(sel)].some(e => e.textContent.includes(text)), {}, selector, texto);
      const faseVisible = (page, fase) => visto(page, app + ' dd', fase);
      const confirmar = async page => {
        const [resultado] = await Promise.all([
          page.waitForResponse(r => r.request().postData()?.includes('"metodo":"avanzarExpediente"')),
          page.locator(app + ' main form button[type=submit]').click()
        ]);
        assert.ok(resultado.ok(), JSON.stringify(await resultado.json()));
      };
      const comercialPage = await abrir(comercial, 390);
      const tecnicoPage = await abrir(otroTecnico, 1440);
      browserTest.diagnostic('Sesiones de Comercial y Técnicos abiertas en la misma aplicación.');
      await button(tecnicoPage, 'Avisos', app + ' nav');
      await visto(tecnicoPage, app + ' main h1', 'Avisos');
      await comercialPage.bringToFront();

      // El mapa abre el asistente comercial original. Se rellenan campos de su
      // interfaz y se espera el recibo de guardarTrabajo antes del vínculo.
      await comercialPage.waitForSelector('#cnvStartPrompt .cnv-start-close', { visible: true, timeout: 5000 });
      await comercialPage.click('#cnvStartPrompt .cnv-start-close');
      browserTest.diagnostic('Aviso de jornada cerrado.');
      await button(comercialPage, 'Mapa', '#cnvHome');
      browserTest.diagnostic('Mapa comercial visible.');
      await comercialPage.evaluate(() => startSingleHouseDirect());
      browserTest.diagnostic('Captación de vivienda seleccionada.');
      await comercialPage.click('#map');
      browserTest.diagnostic('Asistente de vivienda abierto desde el mapa comercial.');
      await button(comercialPage, 'Vivienda Individual', '#cnHouseWizard');
      await comercialPage.type('#cnHouseWizard input[placeholder="Calle y número"]', 'Calle del Navegador 42');
      await comercialPage.type('#cnHouseWizard input[placeholder="Nombre y apellidos"]', 'Cliente de recorrido');
      await comercialPage.type('#cnHouseWizard input[placeholder="Teléfono"]', '600000002');
      await button(comercialPage, 'Modificar localidad', '#cnHouseWizard');
      await comercialPage.type('#singleHouseTown', 'Pamplona');
      await button(comercialPage, 'Continuar', '#cnHouseWizard');
      await button(comercialPage, 'Continuar a revisión', '#cnHouseWizard');
      const [guardado] = await Promise.all([
        comercialPage.waitForResponse(r => r.request().postData()?.includes('"metodo":"guardarTrabajo"')),
        button(comercialPage, 'Guardar captación', '#cnHouseWizard')
      ]);
      assert.ok(guardado.ok(), JSON.stringify(await guardado.json()));
      await comercialPage.waitForSelector('#singleHouseModal.active', { hidden: true });
      browserTest.diagnostic('El guardado comercial recibió confirmación del emulador.');
      const origen = (await call(comercial, 'leerTrabajo')).docs.find(d => d.col === 'fichas' && d.datos.name === 'Cliente de recorrido');
      assert.ok(origen);
      await comercialPage.evaluate(() => window.openCnClients());
      await comercialPage.type('#cnx-clientes input[type=search]', 'Cliente de recorrido');
      await button(comercialPage, 'Ver ficha', '#cnx-clientes');
      await button(comercialPage, 'Expediente compartido', '#cnx-ficha');
      await visto(comercialPage, app + ' dd', 'Calle del Navegador 42');
      await button(comercialPage, 'Pasar a Técnicos');
      await comercialPage.waitForSelector('option[value="' + otroTecnico.uid + '"]');
      await comercialPage.select(app + ' main select', otroTecnico.uid);
      await confirmar(comercialPage);
      await faseVisible(comercialPage, 'Instalación');
      browserTest.diagnostic('Expediente derivado desde la ficha de la aplicación.');
      assert.equal(await comercialPage.$eval(app, el => el.scrollWidth <= el.clientWidth), true);

      // La otra cuenta ya tenía la bandeja abierta antes del traspaso.
      await tecnicoPage.bringToFront();
      await visto(tecnicoPage, app + ' main .list-entry', 'Instalación');
      await tecnicoPage.click(app + ' main .list-entry');
      await visto(tecnicoPage, app + ' dd', 'Calle del Navegador 42');
      await tecnicoPage.evaluate(() => document.querySelector('#konsorOperaciones main').focus());
      await call(comercial, 'guardarTrabajo', { op: randomUUID(), changes: [
        { ...origen, datos: { ...origen.datos, street: 'Calle del Navegador 44' } }
      ] });
      await visto(tecnicoPage, app + ' dd', 'Calle del Navegador 44');
      await button(tecnicoPage, 'Tareas', app + ' nav');
      await button(tecnicoPage, 'Empezar tarea');
      await visto(tecnicoPage, app + ' main .list-entry', 'En curso');
      await button(tecnicoPage, 'En curso');
      await button(tecnicoPage, 'Entregar parte a Oficina');
      await tecnicoPage.waitForSelector('option[value="' + oficina.uid + '"]');
      await tecnicoPage.select(app + ' main select', oficina.uid);
      await tecnicoPage.type(app + ' main input[type=number]', '50.5');
      await confirmar(tecnicoPage);
      await faseVisible(tecnicoPage, 'Revisión documental');

      const oficinaPage = await abrir(oficina, 1440);
      await button(oficinaPage, 'Tareas', app + ' nav');
      await button(oficinaPage, 'Pendiente');
      await visto(oficinaPage, app + ' dd', 'Cliente de recorrido');
      await button(oficinaPage, 'Validar y pasar a Administración');
      await oficinaPage.waitForSelector('option[value="' + administracion.uid + '"]');
      await oficinaPage.select(app + ' main select', administracion.uid);
      await confirmar(oficinaPage);
      await faseVisible(oficinaPage, 'Validación administrativa');

      const adminPage = await abrir(administracion, 1440);
      await button(adminPage, 'Tareas', app + ' nav');
      await button(adminPage, 'Pendiente');
      await faseVisible(adminPage, 'Validación administrativa');
      assert.equal(await adminPage.$eval(app + ' main', main => main.textContent.includes('Calle del Navegador')), false);
      await button(adminPage, 'Cerrar expediente');
      await adminPage.type(app + ' main input[maxlength="120"]', 'CIERRE-BROWSER');
      await confirmar(adminPage);
      await faseVisible(adminPage, 'Cerrado');
      await visto(adminPage, app + ' dd', 'CIERRE-BROWSER');

      const direccionPage = await abrir(direccion, 1440);
      await direccionPage.waitForFunction(() => [...document.querySelectorAll('#konsorOperaciones .card')].some(card =>
        card.querySelector('h2')?.textContent === 'Cerrado' && card.querySelector('.count')?.textContent === '2'));
      assert.deepEqual(dialogos, []);
    } catch (error) {
      const pantallas = await Promise.all((await browser.pages()).map(page => page.evaluate(() =>
        document.querySelector('#konsorOperaciones:not([hidden])')?.innerText ||
        document.querySelector('.modal-overlay.active')?.innerText || document.querySelector('#authMsg')?.innerText)));
      throw new Error(error.stack + '\n' + pantallas.filter(Boolean).join('\n') + '\n' + dialogos.join('\n'), { cause: error });
    } finally {
      await browser.close();
    }
  });
});
