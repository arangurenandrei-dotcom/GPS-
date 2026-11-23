'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const { carpeta, configuracionPruebas } = require('./config-pruebas.cjs');
const { proyectoEmulador } = require('../server/entorno.cjs');

const staging = process.argv.includes('--staging');
const preview = process.argv.includes('--preview');
if (staging && preview) throw Error('Selecciona una sola modalidad de compilación.');
const raiz = path.resolve(carpeta, '..');
const salida = path.join(carpeta, 'dist');
const moduloLegacy = '<script type="module" src="./app/legacy/firebase-init.js?v=1"></script>';
const avisosLegacy = '<script src="./avisos-app.js?v=9"></script>';
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
if (!html.includes(moduloLegacy) || !html.includes(avisosLegacy)) {
  throw Error('La entrada comercial cambió. Revisa los puntos de integración.');
}
const firebase = staging ? configuracionPruebas() : { projectId: proyectoEmulador, apiKey: 'konsor-emulator-only' };
let integrado = html.replace(moduloLegacy, '<script type="module" src="./integracion.js"></script>')
  .replace(avisosLegacy, '')
  .replaceAll('https://unpkg.com/leaflet@1.9.4/dist/', './vendor/leaflet/')
  .replace('https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js', './vendor/leaflet/leaflet-rotate-src.js')
  .replace('</head>', '<link rel="stylesheet" href="./operaciones-empresariales.css">\n</head>');
if (preview) {
  integrado = integrado.replace(/<title>[^<]+<\/title>/, '<title>KONSOR · Vista previa de pruebas</title>')
    .replace('</head>', '<link rel="icon" href="data:,">\n</head>');
}
fs.mkdirSync(salida, { recursive: true });
const recursos = [...html.matchAll(/\b(?:src|href)="(?!https?:|#)([A-Za-z0-9./_-]+)(?:\?[^"]*)?"/g)]
  .map(([, url]) => url.replace(/^\.\//, ''))
  .filter(url => !['app/legacy/firebase-init.js', 'avisos-app.js', 'firebase-messaging-sw.js'].includes(url));
recursos.push('comunidades-guiadas-ios.js'); // La vista de Oficina lo carga dinámicamente.

for (const recurso of new Set(recursos)) {
  if (recurso.startsWith('/') || recurso.split('/').includes('..')) throw Error('Recurso fuera de la aplicación.');
  const origen = path.join(raiz, recurso);
  if (!fs.existsSync(origen) || !fs.statSync(origen).isFile()) continue;
  const destino = path.join(salida, recurso);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origen, destino);
}

const integradoViejo = path.join(salida, 'app/legacy/firebase-init.js');
const swViejo = path.join(salida, 'firebase-messaging-sw.js');
const avisosViejo = path.join(salida, 'avisos-app.js');
for (const fuera of [integradoViejo, swViejo, avisosViejo]) fs.rmSync(fuera, { force: true });
const leaflet = path.join(salida, 'vendor/leaflet');
fs.mkdirSync(leaflet, { recursive: true });
const dependencias = path.join(carpeta, 'node_modules');
for (const recurso of ['leaflet.js', 'leaflet.css', 'images']) {
  fs.cpSync(path.join(dependencias, 'leaflet/dist', recurso), path.join(leaflet, recurso), { recursive: true });
}
fs.copyFileSync(path.join(dependencias, 'leaflet-rotate/dist/leaflet-rotate-src.js'), path.join(leaflet, 'leaflet-rotate-src.js'));
for (const dependencia of ['leaflet', 'leaflet-rotate']) {
  fs.copyFileSync(path.join(dependencias, dependencia, 'LICENSE'), path.join(leaflet, dependencia + '.LICENSE'));
}
fs.writeFileSync(path.join(salida, 'index.html'), integrado);
fs.copyFileSync(path.join(carpeta, 'public/styles.css'), path.join(salida, 'operaciones-empresariales.css'));
buildSync({
  entryPoints: [path.join(carpeta, 'client/integracion.js')], outfile: path.join(salida, 'integracion.js'),
  bundle: true, platform: 'browser', format: 'esm',
  minify: staging,
  define: { __CONFIG_KONSOR__: JSON.stringify({ staging, preview, firebase }) },
  logLevel: 'info'
});
