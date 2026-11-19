'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crearDirectorio } = require('../backend/directorio-equipos.cjs');

function fixture() {
  const rows = new Map([
    ['miembros_organizacion/creator', { nombre: 'Andrei', rol: 'creador', activo: true }]
  ]);
  let auditId = 0;
  const db = {
    collection: col => ({
      doc: (id = 'log' + ++auditId) => ({ key: col + '/' + id }),
      where: (field, operator, value) => ({ col, field, value })
    }),
    async runTransaction(job) {
      const staged = new Map(rows);
      const snapshot = key => ({ exists: staged.has(key), data: () => staged.get(key) });
      const result = await job({
        get: async ref => ref.key ? snapshot(ref.key) : ({
          docs: [...staged.keys()].filter(key => key.startsWith(ref.col + '/') &&
            staged.get(key)[ref.field] === ref.value)
            .map(key => ({ id: key.split('/')[1], ...snapshot(key) }))
        }),
        update: (ref, data) => staged.set(ref.key, { ...staged.get(ref.key), ...data }),
        create: (ref, data) => {
          assert.ok(!staged.has(ref.key));
          staged.set(ref.key, data);
        },
        set: (ref, data) => staged.set(ref.key, data)
      });
      rows.clear();
      for (const entry of staged) rows.set(...entry);
      return result;
    }
  };
  const auth = { getUser: async uid => ({ uid, disabled: uid === 'disabled' }) };
  class HttpsError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  }
  const api = crearDirectorio({ db, auth, onCall: (opts, handler) => handler, HttpsError });
  const call = (method, uid, data) => api[method]({ auth: uid ? { uid } : null, data });
  const create = (id, uid = 'creator', leader = 'jefe' + id) => call('crearEquipoOrganizacion', uid, {
    equipoId: 'equipo' + id, jefeUid: leader, nombreEquipo: 'Equipo ' + id, nombreJefe: 'Responsable ' + id
  });
  const assign = (uid, equipoId, target, activo = true) => call('gestionarComercialOrganizacion', uid, {
    equipoId, uid: target, nombre: 'Persona de prueba', activo
  });
  const read = uid => call('leerDirectorioOrganizacion', uid);
  return { rows, create, assign, read };
}

test('arranque vacío, creación de 50 equipos y directorio del creador sin contactos', async () => {
  const { rows, create, read } = fixture();
  assert.deepEqual((await read('creator')).equipos, []);
  for (let team = 1; team <= 50; team++) await create(team);
  const overview = await read('creator');
  assert.equal(overview.equipos.length, 50);
  assert.deepEqual(overview.equipos[0], { id: 'equipo1', nombre: 'Equipo 1' });
  assert.equal([...rows.keys()].filter(key => key.startsWith('auditoria_organizacion/')).length, 50);
});

test('el creador puede dirigir su propio equipo sin perder su nivel de organización', async () => {
  const { assign, create, read } = fixture();
  await create(1, 'creator', 'creator');
  await create(2);
  await assign('creator', 'equipo1', 'comercial1');
  const overview = await read('creator');
  assert.equal(overview.perfil.rol, 'creador');
  assert.equal(overview.perfil.equipoId, 'equipo1');
  assert.equal(overview.equipos.length, 2);
  await assert.rejects(create(3, 'creator', 'creator'), { code: 'already-exists' });
});

test('los jefes tienen el mismo ámbito local, los comerciales no administran y la baja conserva el vínculo', async () => {
  const { rows, create, assign, read } = fixture();
  await create(1);
  await create(2);
  await assert.rejects(read(null), { code: 'unauthenticated' });
  await assert.rejects(create(3, 'jefe2'), { code: 'permission-denied' });
  await assert.rejects(assign('jefe2', 'equipo1', 'comercial1'), { code: 'permission-denied' });
  await assert.rejects(assign('jefe1', 'equipo1', 'disabled'), { code: 'failed-precondition' });
  await assign('jefe1', 'equipo1', 'comercial1');
  await assign('jefe2', 'equipo2', 'comercial2');
  await assert.rejects(assign('comercial1', 'equipo1', 'nuevo'), { code: 'permission-denied' });
  await assert.rejects(assign('creator', 'equipo2', 'comercial1'), { code: 'permission-denied' });
  assert.deepEqual((await read('jefe1')).miembros.map(p => p.uid), ['jefe1', 'comercial1']);
  assert.deepEqual((await read('jefe2')).miembros.map(p => p.uid), ['jefe2', 'comercial2']);
  assert.equal((await read('comercial1')).miembros, undefined);
  await assign('jefe1', 'equipo1', 'comercial1', false);
  assert.equal(rows.get('miembros_organizacion/comercial1').activo, false);
  await assert.rejects(read('comercial1'), { code: 'permission-denied' });
});

