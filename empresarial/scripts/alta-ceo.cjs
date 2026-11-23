'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = 'demo-konsor-empresarial';

async function main() {
  const [uid, ...nombrePartes] = process.argv.slice(2);
  const nombre = nombrePartes.join(' ').trim();
  if (!uid || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid) || /^__.*__$/.test(uid) || !nombre || nombre.length > 80) {
    throw new Error('Uso: npm run ceo -- UID "Nombre visible"');
  }

  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9109';
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8183';
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
  console.log('Dirección general habilitada en el emulador.');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
