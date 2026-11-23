'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { entornoActivo, proyectoDePruebas, proyectoEmulador } = require('../server/entorno.cjs');

test('En cloud requiere coincidencia exacta con el proyecto de pruebas y rechaza destinos conocidos de producción', () => {
  const destino = 'konsor-pruebas-unitario';
  const base = { GCLOUD_PROJECT: destino, KONSOR_STAGING_PROJECT: destino, FIREBASE_CONFIG: JSON.stringify({ projectId: destino }) };
  assert.equal(entornoActivo(base), true);
  assert.equal(entornoActivo({ ...base, KONSOR_STAGING_PROJECT: undefined }), false);
  assert.equal(entornoActivo({ ...base, GCLOUD_PROJECT: 'otro-proyecto' }), false);
  assert.equal(entornoActivo({ ...base, FIREBASE_CONFIG: '{"projectId":"otro-proyecto"}' }), false);
  assert.equal(entornoActivo({ ...base, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8183' }), false);
  for (const projectId of ['gestion-comercial-navarr-3b028', 'konsor-calendar', '[PEGA AQUÍ EL ID REAL]', proyectoEmulador]) {
    assert.equal(proyectoDePruebas(projectId), false);
    assert.equal(entornoActivo({ GCLOUD_PROJECT: projectId, KONSOR_STAGING_PROJECT: projectId,
      FIREBASE_CONFIG: JSON.stringify({ projectId }) }), false);
  }
});

test('El arranque local selecciona Auth y Firestore del mismo emulador', () => {
  const env = { GCLOUD_PROJECT: proyectoEmulador, FUNCTIONS_EMULATOR: 'true',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9109', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8183' };
  assert.equal(entornoActivo(env), true);
  assert.equal(entornoActivo({ ...env, FIREBASE_AUTH_EMULATOR_HOST: undefined }), false);
  assert.equal(entornoActivo({ ...env, GCLOUD_PROJECT: 'konsor-pruebas-unitario' }), false);
});

test('Hosting sirve el acceso y el formulario comercial con un único inicializador de pruebas', () => {
  const dist = path.resolve(__dirname, '../dist');
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  assert.match(html, /id="loginScreen"/);
  assert.match(html, /id="singleHouseModal"/);
  assert.match(html, /type="module" src="\.\/integracion\.js"/);
  assert.doesNotMatch(html, /firebase-init\.js|avisos-app\.js/);
  assert.equal(fs.existsSync(path.join(dist, 'app/legacy/firebase-init.js')), false);
  assert.equal(fs.existsSync(path.join(dist, 'firebase-messaging-sw.js')), false);
});
