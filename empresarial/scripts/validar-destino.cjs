'use strict';

const { configuracionPruebas } = require('./config-pruebas.cjs');

try {
  if (process.env.GCLOUD_PROJECT !== configuracionPruebas().projectId) {
    throw Error('El destino de Firebase no coincide con el proyecto de pruebas configurado.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
