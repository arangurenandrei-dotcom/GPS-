'use strict';

const http = require('node:http');
const { proyectoEmulador } = require('../server/entorno.cjs');

const authPath = /^\/(identitytoolkit\.googleapis\.com\/v1\/accounts:(?:signUp|signInWithPassword|lookup|sendOobCode|resetPassword)|securetoken\.googleapis\.com\/v1\/token)$/;
const firestorePath = '/google.firestore.v1.Firestore/Listen/channel';
const functionsPath = '/__konsor/functions/konsorEmpresarial';
const firebaseHeaders = ['accept', 'authorization', 'content-type', 'origin',
  'x-client-version', 'x-firebase-gmpid', 'x-goog-api-client', 'x-http-method-override'];
const transportHeaders = new Set(['connection', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'set-cookie']);

function ruta(method, path) {
  if (method === 'POST' && authPath.test(path)) return [9109, path];
  if (method === 'POST' && path === functionsPath) {
    return [5003, '/' + proyectoEmulador + '/europe-west1/konsorEmpresarial'];
  }
  if (['GET', 'POST'].includes(method) && path === firestorePath) return [8183, path];
  if (['GET', 'HEAD'].includes(method) && !/^\/(?:__|emulator\/|v1\/|google\.|identitytoolkit\.|securetoken\.)/.test(path)) return [5004, path];
  return null;
}

function servidor() {
  return http.createServer((req, res) => {
    let url;
    try { url = new URL(req.url, 'http://127.0.0.1'); } catch {
      res.writeHead(400).end();
      return;
    }
    const destino = ruta(req.method, url.pathname);
    if (!destino) {
      res.writeHead(404).end();
      return;
    }
    const [port, path] = destino;
    const headers = Object.fromEntries(firebaseHeaders.flatMap(name =>
      req.headers[name] === undefined ? [] : [[name, req.headers[name]]]));
    const upstream = http.request({
      host: '127.0.0.1', port, method: req.method, path: path + url.search, headers
    }, response => {
      const recibidos = Object.fromEntries(Object.entries(response.headers).filter(([name]) => !transportHeaders.has(name)));
      res.writeHead(response.statusCode, { ...recibidos, 'cache-control': 'no-store' });
      response.pipe(res);
    });
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('El servicio de Firebase Emulator Suite está arrancando o no responde.');
    });
    res.on('close', () => upstream.destroy());
    req.pipe(upstream);
  });
}

if (require.main === module) {
  const port = Number(process.env.KONSOR_PREVIEW_PORT || 3000);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Puerto de vista previa inválido.');
  servidor().listen(port, '0.0.0.0', () => console.log('Vista previa de KONSOR disponible en el puerto ' + port));
}

module.exports = { servidor };
