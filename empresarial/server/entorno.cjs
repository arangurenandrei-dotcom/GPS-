'use strict';

const proyectoEmulador = 'demo-konsor-empresarial';
const proyectosProduccion = new Set(['gestion-comercial-navarr-3b028', 'konsor-calendar']);

function proyectoDePruebas(projectId) {
  return typeof projectId === 'string' && /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) &&
    !projectId.startsWith('demo-') && !proyectosProduccion.has(projectId);
}

function entornoActivo(env) {
  if (env.FUNCTIONS_EMULATOR === 'true') {
    return env.GCLOUD_PROJECT === proyectoEmulador &&
      env.FIREBASE_AUTH_EMULATOR_HOST === '127.0.0.1:9109' &&
      env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8183';
  }
  if (env.FIREBASE_AUTH_EMULATOR_HOST || env.FIRESTORE_EMULATOR_HOST) return false;
  let configurado;
  try { configurado = JSON.parse(env.FIREBASE_CONFIG).projectId; } catch { return false; }
  return proyectoDePruebas(configurado) && configurado === env.GCLOUD_PROJECT &&
    configurado === env.KONSOR_STAGING_PROJECT;
}

module.exports = { proyectoEmulador, proyectoDePruebas, entornoActivo };
