/**
 * Konsor Navarra · Puente v2 Conectado a operaciones-v2.js y firestore.rules
 */
(function(window) {
  'use strict';

  function resolveOwnerAndTeam(comercialName) {
    const authKey = sessionStorage.getItem('auth_user_key') || '';
    const nameStr = String(comercialName || '').trim();

    // Si es del equipo Mikel
    if (nameStr.startsWith('Mikel') || authKey === 'jefe_mikel' || authKey.startsWith('mikel_')) {
      const mikelMap = {
        'Mikel (Jefe)': 'jefe_mikel',
        'Mikel Com. 1': 'mikel_com1',
        'Mikel Com. 2': 'mikel_com2',
        'Mikel Com. 3': 'mikel_com3',
        'Mikel Com. 4': 'mikel_com4',
        'Mikel Com. 5': 'mikel_com5'
      };
      return {
        teamId: 'mikel',
        ownerKey: mikelMap[nameStr] || (authKey.startsWith('mikel_') || authKey === 'jefe_mikel' ? authKey : 'jefe_mikel')
      };
    }

    // Equipo Andrei
    const andreiMap = {
      'Andrei (Jefe)': 'jefe',
      'Andrei': 'jefe',
      'Comercial 1': 'comercial1',
      'Comercial 2': 'comercial2',
      'Comercial 3': 'comercial3',
      'Comercial 4': 'comercial4',
      'Comercial 5': 'comercial5'
    };
    return {
      teamId: 'andrei',
      ownerKey: andreiMap[nameStr] || authKey || 'jefe'
    };
  }

  async function syncZonesToFichasV2(zonesArray) {
    if (!Array.isArray(zonesArray)) return;
    if (!window.db || !window.doc || !window.getDoc || !window.setDoc) return;

    const uid = window.auth?.currentUser?.uid || '';
    if (!uid) return;

    let creadas = 0;
    let actualizadas = 0;

    for (const zona of zonesArray) {
      if (!zona || !Array.isArray(zona.clients)) continue;
      const zonaId = String(zona.id || '');
      const { teamId, ownerKey } = resolveOwnerAndTeam(zona.comercial);

      for (let idx = 0; idx < zona.clients.length; idx++) {
        const cliente = zona.clients[idx];
        if (!cliente || typeof cliente !== 'object') continue;

        const hasData = (cliente.name || '').trim() || (cliente.street || '').trim() || (cliente.phone || '').trim();
        if (!hasData) continue;

        if (!cliente.clientUid || !/^f_[a-zA-Z0-9_-]+$/.test(cliente.clientUid)) {
          cliente.clientUid = `f_${zonaId}_c${idx}`;
        }

        const fichaId = cliente.clientUid;
        const fichaRef = window.doc(window.db, 'fichas', fichaId);

        try {
          const snap = await window.getDoc(fichaRef);

          if (!snap.exists()) {
            const { atticPhoto, ...datosSinFoto } = cliente;
            await window.setDoc(fichaRef, {
              fichaId,
              zonaId,
              teamId,
              ownerKey,
              ownerUid: uid,
              rev: 1,
              createdAt: cliente.createdAt || Date.now(),
              updatedAt: Date.now(),
              datos: {
                ...datosSinFoto,
                _updatedAt: Date.now()
              }
            });
            creadas++;
          } else {
            const serverDoc = snap.data();
            const serverUpdated = serverDoc.datos?._updatedAt || serverDoc.updatedAt || 0;
            const localUpdated = cliente._updatedAt || 0;

            if (localUpdated > serverUpdated && typeof window.callGuardarFichaTransaccional === 'function') {
              const { atticPhoto, ...cambiosSinFoto } = cliente;
              await window.callGuardarFichaTransaccional({
                fichaId,
                expectedRev: serverDoc.rev || 1,
                cambiosDatos: cambiosSinFoto
              });
              actualizadas++;
            }
          }
        } catch (err) {
          alert(`❌ Error Firestore v2 en ${fichaId}: ${err.message}`);
          return;
        }
      }
    }

    if (creadas > 0 || actualizadas > 0) {
      if (typeof window.showCelebrationToast === 'function') {
        window.showCelebrationToast(`☁️ v2 OK: ${creadas} nuevas, ${actualizadas} editadas`);
      } else {
        alert(`✅ v2 OK: ${creadas} fichas creadas, ${actualizadas} actualizadas`);
      }
    }
  }

  window.KonsorBridge = {
    syncZonesToFichasV2,
    resolveOwnerAndTeam
  };

})(window);
