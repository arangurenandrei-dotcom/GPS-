'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { carpeta, configuracionPruebas } = require('./config-pruebas.cjs');

try {
  const { projectId } = configuracionPruebas();
  if (process.argv[2] !== projectId) throw Error('Indica expresamente el ID del proyecto Firebase de pruebas.');
  const cli = require.resolve('firebase-tools/lib/bin/firebase.js');
  const ejecutar = (script, args = []) => execFileSync(process.execPath, [script, ...args], { cwd: carpeta, stdio: 'inherit' });
  ejecutar(path.join(__dirname, 'compilar.cjs'), ['--staging']);

  const env = path.join(carpeta, '.env.' + projectId);
  const contenido = fs.existsSync(env) ? fs.readFileSync(env, 'utf8') : '';
  const valor = 'KONSOR_STAGING_PROJECT=' + projectId;
  const lineas = contenido.split(/\r?\n/).filter(linea => /^\s*KONSOR_STAGING_PROJECT\s*=/.test(linea));
  if (lineas.some(linea => linea.trim() !== valor)) throw Error('KONSOR_STAGING_PROJECT no coincide con el proyecto de pruebas.');
  if (!lineas.length) fs.appendFileSync(env, (contenido && !contenido.endsWith('\n') ? '\n' : '') + valor + '\n', { mode: 0o600 });

  ejecutar(cli, ['deploy', '--non-interactive', '--project', projectId, '--only', 'firestore,functions:empresarial,hosting']);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
