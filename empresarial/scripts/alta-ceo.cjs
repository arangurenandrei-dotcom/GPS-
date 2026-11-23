'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { configuracionPruebas } = require('./config-pruebas.cjs');
const { proyectoEmulador } = require('../server/entorno.cjs');

async function main() {
  const args = process.argv.slice(2);
  const staging = args[0] === '--staging';
  const destino = staging ? args[1] : null;
  const [uid, ...nombrePartes] = args.slice(staging ? 2 : 0);
  const nombre = nombrePartes.join(' ').trim();
  if (!uid || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid) || /^__.*__$/.test(uid) || !nombre || nombre.length > 80) {
    throw new Error('Uso: npm run ceo -- UID "Nombre visible"');
  }

  const projectId = staging ? configuracionPruebas().projectId : proyectoEmulador;
  if (staging) {
    if (destino !== projectId || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) {
      throw Error('El destino de alta no coincide con el proyecto de pruebas o hay un emulador configurado.');
    }
  } else {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9109';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8183';
  }
  const app = initializeApp({ projectId });
  const db = getFirestore(app);
  const cuenta = await getAuth(app).getUser(uid);
  if (cuenta.disabled) throw new Error('La cuenta está desactivada.');
  const control = db.doc('control/organizacion');
  const perfil = db.collection('miembros').doc(uid);
  await db.runTransaction(async tx => {
    const [actual, miembro] = await tx.getAll(control, perfil);
    if (actual.data()?.ceoUid === uid && miembro.data()?.puesto === 'ceo') return;
    if (actual.exists || miembro.exists) throw new Error('Dirección general ya se ha inicializado o el UID tiene otro perfil.');
    tx.create(control, { ceoUid: uid, fecha: new Date() });
    tx.create(perfil, { nombre, departamento: 'direccion', puesto: 'ceo', equipoId: null, activo: true });
  });
  console.log('Dirección general habilitada en ' + projectId + '.');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
