(function (root) {
  'use strict';
  const ranges = {'45-60':50,'60-80':70,'80-100':90,'100-150':125,'150+':160};
  function area(value) {
    if (Object.hasOwn(ranges, value)) return ranges[value];
    const n = Number(String(value ?? '').trim().replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  function attic(total, floors) {
    const gross = area(total), count = Number(floors);
    if (!gross || !Number.isInteger(count) || count < 1) return null;
    const perFloor = gross / count;
    const walls = Math.min(perFloor, Math.max(5, Math.min(10, 5 + (perFloor - 55) / 15)));
    return {perFloor, walls, net: Math.round((perFloor - walls) * 100) / 100};
  }
  function date(value) {
    const s = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s+'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === s;
  }
  const norm = v => String(v ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const phone = v => String(v || '').replace(/\D/g,'').replace(/^(0034|34)(?=\d{9}$)/,'');
  function matches(row, zones) {
    const found=[];
    for (const z of zones) for (const c of z.clients || []) {
      const ids=[c.crmOrigenId,c.euroAislaId,c.externalId].filter(Boolean).map(norm);
      const byId=Boolean(norm(row.id) && ids.includes(norm(row.id)));
      const byPlace=phone(row.telefono).length===9 && phone(row.telefono)===phone(c.phone) && norm(row.municipio)===norm(z.town) && norm(row.direccion)===norm(c.street);
      if (byId || byPlace) found.push({z,c});
    }
    return found;
  }
  function linkable(row, zones) {
    const found=matches(row,zones);
    if (found.length!==1) return null;
    const {z,c}=found[0];
    if (String(z.comercial||'').startsWith('Mikel') || c.obraStatus!=='agendada' || !c.clientUid) return null;
    if (c.crmOrigenId && norm(c.crmOrigenId)!==norm(row.id)) return null;
    return c.obraDate===row.fecha && c.obraTime===String(row.hora||'').slice(0,5) && Number(c.obraEquipoInstalacion)===Number(row.equipo) ? found[0] : null;
  }
  const api={area,attic,date,norm,phone,matches,linkable};
  if (typeof module!=='undefined') module.exports=api;
  root.ComercialCore=api;
})(typeof window!=='undefined'?window:globalThis);
