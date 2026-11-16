/**
 * Konsor Navarra · Puente v2 mediante Cloud Function Transaccional
 */
(function(window) {
  'use strict';

  const syncedTimestamps = new Map();

  function resolveOwnerKey(comercialName) {
    const authKey = sessionStorage.getItem('auth_user_key') || '';
    const nameStr = String(comercialName || '').trim();
    const map = {
      'Andrei (Jefe)': 'jefe',
      'Andrei': 'jefe',
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
    return map[nameStr] || authKey || 'jefe';
  }

  async function syncZonesToFichasV2(zonesArray) {
    if (!Array.isArray(zonesArray)) return;
    if (typeof window.callSincronizarFichaV2 !== 'function') return;

    let creadas = 0;
    let actualizadas = 0;

    for (const zona of zonesArray) {
      if (!zona || !Array.isArray(zona.clients)) continue;
      const zonaId = String(zona.id || '');
      const ownerKey = resolveOwnerKey(zona.comercial);

      for (let idx = 0; idx < zona.clients.length; idx++) {
        const cliente = zona.clients[idx];
        if (!cliente || typeof cliente !== 'object') continue;

        const hasData = (cliente.name || '').trim() || (cliente.street || '').trim() || (cliente.phone || '').trim();
        if (!hasData) continue;

        if (!cliente.clientUid || !/^f_[a-zA-Z0-9_-]+$/.test(cliente.clientUid)) {
          cliente.clientUid = `f_${zonaId}_c${idx}`;
        }

        const fichaId = cliente.clientUid;
        const stamp = cliente._updatedAt || zona._updatedAt || Date.now();

        // Evitar reenviar fichas que no han cambiado desde el último envío
        if (syncedTimestamps.get(fichaId) === stamp) continue;

        try {
          const res = await window.callSincronizarFichaV2({
            fichaId,
            zonaId,
            ownerKey,
            datos: cliente,
            clientUpdatedAt: stamp
          });

          syncedTimestamps.set(fichaId, stamp);
          if (res?.data?.action === 'created') creadas++;
          if (res?.data?.action === 'updated') actualizadas++;
        } catch (err) {
          console.warn(`Aviso sync v2 (${fichaId}):`, err.message);
        }
      }
    }

    if (creadas > 0 || actualizadas > 0) {
      if (typeof window.showCelebrationToast === 'function') {
        window.showCelebrationToast(`☁️ v2 OK: ${creadas} nuevas, ${actualizadas} editadas`);
      } else {
        alert(`✅ v2 OK: ${creadas} nuevas, ${actualizadas} editadas`);
      }
    }
  }

  window.KonsorBridge = { syncZonesToFichasV2 };

})(window);
