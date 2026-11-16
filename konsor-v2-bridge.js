/**
 * Konsor Navarra · Puente v2 Conectado a operaciones-v2.js y firestore.rules
 * Sincroniza altas nuevas en 'fichas' (rev: 1) y ediciones mediante 'guardarFichaTransaccional'.
 */
(function(window) {
  'use strict';

  function getTeamId(comercialName) {
    if (!comercialName) return 'andrei';
    return String(comercialName).startsWith('Mikel') ? 'mikel' : 'andrei';
  }

  function getOwnerKeyFromComercial(comercialName) {
    const map = {
      'Andrei (Jefe)': 'jefe',
      'Comercial 1': 'comercial1',
      'Comercial 2': 'comercial2',
      'Comercial 3': 'comercial3',
      'Comercial 4': 'comercial4',
      'Comercial 5': 'comercial5',
      'Mikel (Jefe)': 'jefe_mikel',
      'Mikel Com. 1': 'mikel_com1',
      'Mikel Com. 2': 'mikel_com2',
      'Mikel Com. 3': 'mikel_com3',
      'Mikel Com. 4': 'mikel_com4',
      'Mikel Com. 5': 'mikel_com5'
    };
    return map[comercialName] || sessionStorage.getItem('auth_user_key') || 'jefe';
  }

  // Sincroniza automáticamente todas las fichas nuevas o editadas hacia la colección 'fichas'
  async function syncZonesToFichasV2(zonesArray) {
    if (!Array.isArray(zonesArray)) return;
    if (!window.db || !window.doc || !window.getDoc || !window.setDoc) return;

    const uid = window.auth?.currentUser?.uid || '';
    if (!uid) return;

    for (const zona of zonesArray) {
      if (!zona || !Array.isArray(zona.clients)) continue;
      const zonaId = String(zona.id || '');
      const teamId = getTeamId(zona.comercial);
      const ownerKey = getOwnerKeyFromComercial(zona.comercial);

      for (let idx = 0; idx < zona.clients.length; idx++) {
        const cliente = zona.clients[idx];
        if (!cliente || typeof cliente !== 'object') continue;

        // Ignorar fichas totalmente vacías
        const hasData = (cliente.name || '').trim() || (cliente.street || '').trim() || (cliente.phone || '').trim();
        if (!hasData) continue;

        // Usar ID permanente si lo tiene, o generar uno determinista limpio (sin DNI/teléfono)
        if (!cliente.clientUid || !/^f_[a-zA-Z0-9_-]+$/.test(cliente.clientUid)) {
          cliente.clientUid = `f_${zonaId}_c${idx}`;
        }

        const fichaId = cliente.clientUid;
        const fichaRef = window.doc(window.db, 'fichas', fichaId);

        try {
          const snap = await window.getDoc(fichaRef);

          if (!snap.exists()) {
            // ALTA NUEVA: cumple exactamente puedeCrearDoc() de firestore.rules (rev == 1)
            const { atticPhoto, ...datosSinFotoBase64 } = cliente;
            const nuevoDoc = {
              fichaId,
              zonaId,
              teamId,
              ownerKey,
              ownerUid: uid,
              rev: 1,
              createdAt: cliente.createdAt || Date.now(),
              updatedAt: Date.now(),
              datos: {
                ...datosSinFotoBase64,
                _updatedAt: Date.now()
              }
            };
            await window.setDoc(fichaRef, nuevoDoc);
            cliente._v2Rev = 1;
            console.log(`✅ Ficha nueva creada en Firestore v2: ${fichaId} (rev: 1)`);
          } else {
            // EDICIÓN EXISTENTE: comprobar si cambió respecto al servidor y usar transacción
            const serverDoc = snap.data();
            const serverUpdated = serverDoc.datos?._updatedAt || serverDoc.updatedAt || 0;
            const localUpdated = cliente._updatedAt || 0;

            if (localUpdated > serverUpdated && typeof window.callGuardarFichaTransaccional === 'function') {
              const { atticPhoto, ...cambiosSinFoto } = cliente;
              const res = await window.callGuardarFichaTransaccional({
                fichaId,
                expectedRev: serverDoc.rev || 1,
                cambiosDatos: cambiosSinFoto
              });
              if (res?.data?.rev) {
                cliente._v2Rev = res.data.rev;
                console.log(`🔄 Ficha actualizada por transacción: ${fichaId} (rev: ${res.data.rev})`);
              }
            }
          }
        } catch (err) {
          console.warn(`⚠️ No se pudo sincronizar ficha ${fichaId} en v2:`, err.message);
        }
      }
    }
  }

  window.KonsorBridge = {
    syncZonesToFichasV2,
    getTeamId,
    getOwnerKeyFromComercial
  };

})(window);
