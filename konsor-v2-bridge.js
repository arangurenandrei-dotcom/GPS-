/**
 * Konsor Navarra · Módulo Puente v2 (Bloque D)
 * Conecta el frontend con las nuevas colecciones (zonas, fichas, jornadas)
 * con control transaccional (rev) y modo espejo seguro hacia gestion_navarra.
 */
(function(window) {
  'use strict';

  // Determinar equipo según el usuario activo
  function getTeamScope(userName) {
    if (!userName) return 'andrei';
    return userName.startsWith('Mikel') ? 'mikel' : 'andrei';
  }

  // 1. Carga de datos desde las nuevas colecciones con filtrado por rol/equipo
  async function cargarDatosBridge(key, currentUser) {
    if (!window.db || !window.getDocs || !window.collection) {
      try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
    }

    try {
      const team = getTeamScope(currentUser);
      let colName = key;
      if (key === 'comercial_custom_zones') colName = 'zonas';
      if (key === 'comercial_shifts') colName = 'jornadas';

      const qRef = window.collection(window.db, colName);
      const snapshot = await window.getDocs(qRef);
      const results = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        // Filtrado por equipo automático
        if (data.team && data.team !== team && currentUser !== 'Andrei (Jefe)' && currentUser !== 'Mikel (Jefe)') {
          return;
        }
        results.push({ id: docSnap.id, ...data });
      });

      return results.length > 0 ? results : (JSON.parse(localStorage.getItem(key)) || []);
    } catch (e) {
      console.warn('Bridge: Error leyendo de Firestore, usando caché local', e);
      return JSON.parse(localStorage.getItem(key)) || [];
    }
  }

  // 2. Guardado transaccional con control de conflicto (rev) y Modo Espejo hacia gestion_navarra
  async function guardarFichaTransaccional(zonaId, clientIndex, clientData, currentUser) {
    if (!window.db || !window.doc || !window.runTransaction) {
      console.warn('Transacciones no disponibles, ejecutando guardado estándar.');
      return false;
    }

    const team = getTeamScope(currentUser);
    const fichaId = clientData.clientUid || `${zonaId}_c${clientIndex}`;
    const fichaRef = window.doc(window.db, 'fichas', fichaId);
    const espejoRef = window.doc(window.db, 'gestion_navarra', 'datos_globales');

    try {
      await window.runTransaction(window.db, async (transaction) => {
        const docSnap = await transaction.get(fichaRef);
        const serverRev = docSnap.exists() ? (docSnap.data().rev || 1) : 1;
        const localRev = clientData.rev || 1;

        if (docSnap.exists() && serverRev > localRev) {
          throw new Error('CONFLICTO_EDICION: Otro dispositivo modificó esta ficha previamente. Actualiza para ver los cambios.');
        }

        const payload = {
          ...clientData,
          rev: serverRev + 1,
          team: team,
          updatedBy: currentUser,
          _updatedAt: Date.now()
        };

        // Escritura principal en la colección 'fichas'
        transaction.set(fichaRef, payload, { merge: true });

        // Modo espejo de respaldo hacia 'gestion_navarra' durante la transición
        transaction.set(espejoRef, {
          [zonaId]: { clients: { [clientIndex]: payload }, _updatedAt: Date.now() }
        }, { merge: true });
      });

      return true;
    } catch (e) {
      console.error('Error en guardarFichaTransaccional:', e.message);
      alert(`⚠️ ${e.message}`);
      return false;
    }
  }

  // 3. Agendar obra respetando los equipos y técnicos
  async function agendarObraEquipo(zonaId, clientIndex, obraData, currentUser) {
    const success = await guardarFichaTransaccional(zonaId, clientIndex, {
      ...obraData,
      obraStatus: 'agendada'
    }, currentUser);

    if (success && window.db && window.setDoc && window.doc) {
      try {
        const jornadaRef = window.doc(window.db, 'jornadas', `${currentUser}_${obraData.obraDate || Date.now()}`);
        await window.setDoc(jornadaRef, {
          user: currentUser,
          team: getTeamScope(currentUser),
          obraDate: obraData.obraDate,
          obraTime: obraData.obraTime,
          clientName: obraData.name,
          _updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {}
    }
    return success;
  }

  window.KonsorBridge = {
    cargarDatosBridge,
    guardarFichaTransaccional,
    agendarObraEquipo,
    getTeamScope
  };

})(window);
