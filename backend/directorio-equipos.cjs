'use strict';

// Contrato de servidor para el entorno de pruebas de la organización.
// Las colecciones quedan privadas. Los clientes pasan por las funciones callable.
function crearDirectorio({ db, auth, onCall, HttpsError }) {
  const members = db.collection('miembros_organizacion');
  const teams = db.collection('equipos_organizacion');
  const audit = db.collection('auditoria_organizacion');
  const date = () => new Date();
  const fail = (code, message) => { throw new HttpsError(code, message); };
  const documentId = (value, label) => {
    if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) {
      fail('invalid-argument', label + ' inválido.');
    }
    return value;
  };
  const name = (value, label) => {
    if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 80 ||
        /[\u0000-\u001f\u007f]/.test(value)) {
      fail('invalid-argument', label + ' inválido.');
    }
    return value.trim();
  };

  async function actor(tx, request) {
    if (!request.auth?.uid) fail('unauthenticated', 'Inicia sesión.');
    const profile = (await tx.get(members.doc(request.auth.uid))).data();
    if (!profile?.activo) fail('permission-denied', 'Acceso no autorizado.');
    return { ...profile, uid: request.auth.uid };
  }

  async function account(uid) {
    try {
      const user = await auth.getUser(uid);
      if (user.disabled) fail('failed-precondition', 'La cuenta está desactivada.');
    } catch (error) {
      if (error.code === 'auth/user-not-found') fail('failed-precondition', 'La cuenta aún no está registrada.');
      throw error;
    }
  }

  function record(tx, action, actorId, teamId, memberId) {
    tx.create(audit.doc(), { action, actorId, teamId, memberId, fecha: date() });
  }

  function requireManager(user, teamId) {
    if (user.rol !== 'creador' && !(user.rol === 'jefe' && user.equipoId === teamId)) {
      fail('permission-denied', 'El equipo queda fuera de tu ámbito.');
    }
  }

  const callable = handler => onCall({ region: 'europe-west1' }, handler);

  return {
    crearEquipoOrganizacion: callable(request => db.runTransaction(async tx => {
      const owner = await actor(tx, request);
      if (owner.rol !== 'creador') fail('permission-denied', 'Solo el creador puede dar de alta equipos.');
      const teamId = documentId(request.data?.equipoId, 'Identificador de equipo');
      const leaderId = documentId(request.data?.jefeUid, 'Identificador de cuenta');
      const teamName = name(request.data?.nombreEquipo, 'Nombre de equipo');
      const leaderName = name(request.data?.nombreJefe, 'Nombre visible');
      const team = teams.doc(teamId);
      const leader = members.doc(leaderId);
      const [teamSnap, leaderSnap] = await Promise.all([tx.get(team), tx.get(leader)]);
      const ownerLeads = leaderId === owner.uid && !owner.equipoId;
      if (teamSnap.exists || (leaderSnap.exists && !ownerLeads)) {
        fail('already-exists', 'El equipo o la asignación de la cuenta ya existen.');
      }
      await account(leaderId);
      tx.create(team, { nombre: teamName, jefeUid: leaderId, activo: true, creado: date() });
      if (ownerLeads) tx.update(leader, { equipoId: teamId });
      else tx.create(leader, { nombre: leaderName, rol: 'jefe', equipoId: teamId, activo: true });
      record(tx, 'alta_equipo', owner.uid, teamId, leaderId);
      return { equipoId: teamId };
    })),

    gestionarComercialOrganizacion: callable(request => db.runTransaction(async tx => {
      const manager = await actor(tx, request);
      const teamId = documentId(request.data?.equipoId, 'Identificador de equipo');
      requireManager(manager, teamId);
      const uid = documentId(request.data?.uid, 'Identificador de cuenta');
      const enabled = request.data?.activo;
      if (typeof enabled !== 'boolean') fail('invalid-argument', 'Indica si la cuenta debe quedar activa.');
      const member = members.doc(uid);
      const [teamSnap, memberSnap] = await Promise.all([tx.get(teams.doc(teamId)), tx.get(member)]);
      if (!teamSnap.data()?.activo) fail('not-found', 'El equipo no está activo.');
      const existing = memberSnap.data();
      if (existing && (existing.equipoId !== teamId || existing.rol !== 'comercial')) {
        fail('permission-denied', 'La cuenta ya pertenece a otro ámbito.');
      }
      if (!existing && !enabled) fail('not-found', 'El comercial no está en el equipo.');
      if (enabled) await account(uid);
      const displayName = request.data?.nombre === undefined && existing
        ? existing.nombre : name(request.data?.nombre, 'Nombre visible');
      tx.set(member, { nombre: displayName, rol: 'comercial', equipoId: teamId, activo: enabled });
      record(tx, enabled ? 'activar_comercial' : 'suspender_comercial', manager.uid, teamId, uid);
      return { uid, activo: enabled };
    })),

    leerDirectorioOrganizacion: callable(request => db.runTransaction(async tx => {
      const user = await actor(tx, request);
      if (!['creador', 'jefe', 'comercial'].includes(user.rol)) {
        fail('permission-denied', 'Acceso no autorizado.');
      }
      const perfil = { uid: user.uid, nombre: user.nombre, rol: user.rol, equipoId: user.equipoId || null };
      if (user.rol === 'creador') {
        const result = await tx.get(teams.where('activo', '==', true));
        return { perfil, equipos: result.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre })) };
      }
      if (user.rol === 'comercial') return { perfil };
      const team = documentId(user.equipoId, 'Identificador de equipo');
      const result = await tx.get(members.where('equipoId', '==', team));
      return {
        perfil,
        miembros: result.docs.map(doc => {
          const { nombre, rol, activo } = doc.data();
          return { uid: doc.id, nombre, rol, activo };
        })
      };
    }))
  };
}

module.exports = { crearDirectorio };

