'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { crearApi } = require('./api.cjs');
const { evaluarParte } = require('./ia.cjs');
const { entornoActivo, proyectoDePruebas } = require('./entorno.cjs');

const app = initializeApp();
const destino = process.env.KONSOR_STAGING_PROJECT;
const opciones = { region: 'europe-west1', timeoutSeconds: 60 };
if (proyectoDePruebas(destino) && destino === process.env.GCLOUD_PROJECT) {
  opciones.serviceAccount = 'konsor-operaciones@' + destino + '.iam.gserviceaccount.com';
}

function configuracionIA() {
  const { KONSOR_GEMINI_API_KEY: apiKey, KONSOR_GEMINI_MODEL: modelo } = process.env;
  return apiKey && modelo && process.env.KONSOR_AISLAR_IA !== '1' ? { apiKey, modelo } : null;
}

exports.konsorEmpresarial = onCall(opciones, async request => {
  if (!entornoActivo(process.env)) {
    throw new HttpsError('failed-precondition', 'El proyecto de pruebas no está habilitado.');
  }
  return crearApi({ db: getFirestore(app), auth: getAuth(app), HttpsError, configIA: configuracionIA() })(request);
});

exports.revisarParteKonsor = onDocumentCreated({
  ...opciones, document: 'expedientes/{id}/historial/{evento}'
}, async event => {
  const config = configuracionIA();
  const movimiento = event.data?.data();
  if (!entornoActivo(process.env) || !config || movimiento?.accion !== 'entregar') return;
  const db = getFirestore(app);
  await evaluarParte({ db, ref: db.collection('expedientes').doc(event.params.id), revision: movimiento.revision, config });
});
