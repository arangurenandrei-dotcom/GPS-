'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { proyectoDePruebas } = require('../server/entorno.cjs');

const carpeta = path.resolve(__dirname, '..');

function configuracionPruebas() {
  const archivo = path.join(carpeta, 'firebase-pruebas.local.json');
  if (!fs.existsSync(archivo)) throw Error('Falta firebase-pruebas.local.json con la configuración web del proyecto de pruebas.');
  const { projectId, apiKey, appId, authDomain } = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  if (!proyectoDePruebas(projectId) || authDomain !== projectId + '.firebaseapp.com' ||
      !/^AIza[A-Za-z0-9_-]{25,60}$/.test(apiKey) || !/^1:\d+:web:[a-f0-9]+$/.test(appId)) {
    throw Error('Configuración web inválida o proyecto de producción.');
  }
  return { projectId, apiKey, appId, authDomain };
}

module.exports = { carpeta, configuracionPruebas };
