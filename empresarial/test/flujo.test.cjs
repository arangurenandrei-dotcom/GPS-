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

test('KONSOR con Auth, Functions, Firestore y Chromium', { timeout: 200000 }, async t => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8183');
  const [ceo, comercial, colega, jefe, tecnico, otroTecnico, oficina, administracion, direccion, otroEquipo, nuevo] =
    await Promise.all(['direccion-general', 'comercial', 'colega', 'jefe-tecnico',
      'tecnico', 'otro-tecnico', 'oficina', 'administracion', 'direccion', 'otro-equipo', 'nuevo'].map(cuenta));

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
    for (const [persona, area, puesto, team] of [
      [comercial, 'comercial', 'trabajador'], [colega, 'comercial', 'trabajador'], [jefe, 'tecnicos', 'jefe'],
      [oficina, 'oficina', 'trabajador'], [administracion, 'administracion', 'trabajador'],
      [direccion, 'direccion', 'jefe'], [otroEquipo, 'tecnicos', 'jefe', otroEquipoId]
    ]) {
      await mutate(ceo, 'gestionarMiembro', personaEn(persona, area, puesto, team));
    }
    await mutate(jefe, 'gestionarMiembro', personaEn(tecnico, 'tecnicos', 'trabajador'));
    await mutate(jefe, 'gestionarMiembro', personaEn(otroTecnico, 'tecnicos', 'trabajador'));
    await assert.rejects(mutate(tecnico, 'gestionarMiembro', personaEn(nuevo, 'tecnicos', 'jefe')), error('PERMISSION_DENIED'));
    await assert.rejects(mutate(jefe, 'gestionarMiembro', personaEn(nuevo, 'oficina', 'trabajador')), error('PERMISSION_DENIED'));
    await assert.rejects(mutate(jefe, 'gestionarMiembro', personaEn(nuevo, 'tecnicos', 'jefe')), error('PERMISSION_DENIED'));
    await assert.rejects(mutate(ceo, 'gestionarMiembro', personaEn(comercial, 'oficina', 'trabajador')), error('PERMISSION_DENIED'));
    const miembros = await call(jefe, 'listarMiembros', { equipoId, departamento: 'tecnicos' });
    assert.equal(miembros.items.length, 3);
    await assert.rejects(call(jefe, 'listarMiembros', { equipoId: otroEquipoId, departamento: 'tecnicos' }), error('PERMISSION_DENIED'));
    assert.deepEqual(await call(direccion, 'indicadores'), {
      fases: { captacion: 0, instalacion: 0, documentacion: 0, validacion: 0, cerrado: 0 }
    });
  });

  let caso;
  await t.test('Expediente, autorización, reintento y concurrencia', async () => {
    const input = { titulo: 'Revisión de instalación', referencia: 'OT-' + etiqueta, operacionId: randomUUID() };
    caso = await call(comercial, 'crearExpediente', input);
    assert.deepEqual(await call(comercial, 'crearExpediente', input), caso);
    await assert.rejects(call(comercial, 'crearExpediente', { ...input, titulo: 'Otro título' }), error('ALREADY_EXISTS'));
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

  await t.test('Interfaz de alta, traspaso y aviso en dos tamaños de Chromium', async () => {
    const chrome = process.env.CHROME_BIN || execFileSync('sh', ['-c',
      'command -v google-chrome || command -v chromium || command -v chromium-browser'], { encoding: 'utf8' }).trim();
    const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    try {
      const abrir = async (persona, width) => {
        const page = await browser.newPage();
        page.setDefaultTimeout(10000);
        await page.setViewport({ width, height: 850, isMobile: width < 500, hasTouch: width < 500 });
        await page.setRequestInterception(true);
        page.on('request', req => new URL(req.url()).hostname === '127.0.0.1' ? req.continue() : req.abort());
        await page.goto('http://127.0.0.1:5004/', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('input[type=email]');
        await page.type('input[type=email]', persona.correo);
        await page.type('input[type=password]', password);
        await page.click('button[type=submit]');
        await page.waitForFunction(() => document.querySelector('main h1')?.textContent === 'Expedientes');
        return page;
      };
      const button = async (page, label) => {
        const handle = await page.waitForFunction(texto => [...document.querySelectorAll('button')]
          .find(el => el.textContent.trim() === texto && !el.disabled), { timeout: 10000 }, label);
        await handle.asElement().click();
        await handle.dispose();
      };
      const confirmar = async page => {
        const form = await page.$eval('main form', el => ({
          valido: el.checkValidity(), invalidos: [...el.querySelectorAll(':invalid')].map(c => c.validationMessage)
        }));
        assert.ok(form.valido, JSON.stringify(form.invalidos));
        const response = page.waitForResponse(r =>
          r.request().postData()?.includes('"metodo":"avanzarExpediente"'));
        await page.locator('main form button[type=submit]').click();
        const resultado = await response;
        assert.ok(resultado.ok(), JSON.stringify(await resultado.json()));
      };
      const comercialPage = await abrir(comercial, 390);
      await comercialPage.type('main input[maxlength="120"]', 'Expediente desde Chromium');
      await button(comercialPage, 'Crear expediente');
      await comercialPage.waitForFunction(() => document.querySelector('main h2')?.textContent === 'Expediente desde Chromium');
      await button(comercialPage, 'Pasar a Técnicos');
      await comercialPage.waitForSelector('option[value="' + otroTecnico.uid + '"]');
      assert.deepEqual(await comercialPage.select('main select', otroTecnico.uid), [otroTecnico.uid]);
      await confirmar(comercialPage);
      await comercialPage.waitForFunction(() => Array.from(document.querySelectorAll('dd')).some(e => e.textContent === 'Instalación'));
      assert.equal(await comercialPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const tecnicoPage = await abrir(otroTecnico, 1440);
      await button(tecnicoPage, 'Avisos');
      await tecnicoPage.waitForSelector('.list-entry');
      await tecnicoPage.click('.list-entry');
      await tecnicoPage.waitForFunction(() => document.querySelector('main h2')?.textContent === 'Expediente desde Chromium');
      await button(tecnicoPage, 'Entregar parte a Oficina');
      await tecnicoPage.waitForSelector('option[value="' + oficina.uid + '"]');
      await tecnicoPage.select('main select', oficina.uid);
      await tecnicoPage.type('main input[type=number]', '50.5');
      await confirmar(tecnicoPage);
      await tecnicoPage.waitForFunction(() =>
        Array.from(document.querySelectorAll('dd')).some(e => e.textContent === 'Revisión documental'));
    } catch (error) {
      const pantallas = await Promise.all((await browser.pages()).map(page => page.evaluate(() =>
        document.querySelector('main')?.innerText)));
      throw new Error(error.message + '\n' + pantallas.filter(Boolean).join('\n'), { cause: error });
    } finally {
      await browser.close();
    }
  });
});
