'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { crearApi } = require('./api.cjs');
const { evaluarParte } = require('./ia.cjs');

const app = initializeApp();

function aislado() {
  return process.env.FUNCTIONS_EMULATOR === 'true' && process.env.GCLOUD_PROJECT === 'demo-konsor-empresarial' &&
    process.env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9109' &&
    process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8183';
}

function configuracionIA() {
  const { KONSOR_GEMINI_API_KEY: apiKey, KONSOR_GEMINI_MODEL: modelo } = process.env;
  return apiKey && modelo && process.env.KONSOR_AISLAR_IA !== '1' ? { apiKey, modelo } : null;
}

exports.konsorEmpresarial = onCall({ region: 'europe-west1', timeoutSeconds: 60 }, async request => {
  if (!aislado()) {
    throw new HttpsError('failed-precondition', 'El núcleo empresarial está habilitado en el entorno aislado.');
  }
  return crearApi({ db: getFirestore(app), auth: getAuth(app), HttpsError, configIA: configuracionIA() })(request);
});

exports.revisarParteKonsor = onDocumentCreated({
  document: 'expedientes/{id}/historial/{evento}', region: 'europe-west1', timeoutSeconds: 60
}, async event => {
  const config = configuracionIA();
  const movimiento = event.data?.data();
  if (!aislado() || !config || movimiento?.accion !== 'entregar') return;
  const db = getFirestore(app);
  await evaluarParte({ db, ref: db.collection('expedientes').doc(event.params.id), revision: movimiento.revision, config });
});
