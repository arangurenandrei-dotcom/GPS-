(function (root) {
  'use strict';
  const ranges = {'45-60':50,'60-80':70,'80-100':90,'100-150':125,'150+':160};
  function area(value) {
    if (Object.hasOwn(ranges, value)) return ranges[value];
    const n = Number(String(value ?? '').trim().replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  function attic(total, floors, coverage = 100, wallCm = 25) {
    const gross = area(total), count = Number(floors);
    const share = Number(coverage), wall = Number(wallCm) / 100;
    if (!gross || !Number.isInteger(count) || count < 1 ||
        !Number.isFinite(share) || share <= 0 || share > 100 ||
        !Number.isFinite(wall) || wall < 0 || wall > 1) return null;
    const perFloor = gross / count;
    const footprint = perFloor * share / 100;
    // Square footprint proxy when the exterior lengths are unknown.
    const innerSide = Math.max(0, Math.sqrt(footprint) - 2 * wall);
    const net = innerSide ** 2;
    return {perFloor, footprint, walls:footprint-net, net:Math.round(net)};
  }
  function date(value) {
    const s = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s+'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === s;
  }
  const norm = v => String(v ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const phone = v => String(v || '').replace(/\D/g,'').replace(/^(0034|34)(?=\d{9}$)/,'');
  function addressKey(value) {
    return norm(value).replace(/^(?:c\/|c\.|calle\b|cl\b)\s*/, '')
      .replace(/^av(?:da)?\.?\s+/, 'avenida ')
      .replace(/^pza\.?\s+/, 'plaza ')
      .replace(/^ctra\.?\s+/, 'carretera ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function postalAddress(value) {
    const base = String(value || '').trim().replace(/(?:,\s*|\s+)(?:piso\s+.+|\d+\s*[ºª].*)$/iu, '');
    const parts = base.match(/^(.+)\s*,?\s+(?:(?:n[º°o.]|núm\.?)\s*)?(\d+\s*(?:bis|ter|[a-z](?=\s|,|$))?)(?=$|[\s,;\/ªº-])/iu);
    return parts ? {street:addressKey(parts[1]), number:norm(parts[2]).replace(/\s+/g, '')} : null;
  }
  function postalMatches(candidates, address, town = '') {
    const target = postalAddress(address);
    if (!target || !target.street) return [];

    const cleanStreet = v => addressKey(v)
      .replace(/^(?:kalea|calle|cl|avenida|etorbidea|plaza|plaz[a]?|paseo)\s+/, '')
      .replace(/\s+\d+\s*(?:bis|ter)?$/, '')
      .trim();

    return candidates.filter(item => {
      if (!item.isPortal || !/^31\d{3}$/.test(String(item.cp || ''))) return false;

      const number = norm(item.portalNumber).replace(/\s+/g, '');
      if (number !== target.number) return false;

      if (norm(town) && !Array.isArray(item.localities)) return false;
      if (norm(town) && !item.localities.some(name => {
        const valid = [name, ...String(name).split('/')].map(norm);
        return [town, ...String(town).split('/')].map(norm)
          .some(part => part && valid.includes(part));
      })) return false;

      const raw = String(item.street || '').split(',')[0];
      const variants = raw.split('/').map(cleanStreet);
      variants.push(cleanStreet(raw));
      variants.push(cleanStreet([item.streetType, raw].filter(Boolean).join(' ')));

      return variants.includes(cleanStreet(target.street));
    });
  }
  function exactPostalCode(candidates, address, town) {
    if (!norm(town)) return '';
    const matches = postalMatches(candidates,address,town);
    const codes = new Set(matches.map(item => String(item.cp || '').trim()).filter(cp => /^31\d{3}$/.test(cp)));
    return codes.size === 1 ? [...codes][0] : '';
  }
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
    if (row.id && c.crmOrigenId && norm(c.crmOrigenId)!==norm(row.id)) return null;
    return c.obraDate===row.fecha && c.obraTime===String(row.hora||'').slice(0,5) && Number(c.obraEquipoInstalacion)===Number(row.equipo) ? found[0] : null;
  }
  const api={area,attic,date,norm,phone,postalAddress,postalMatches,exactPostalCode,matches,linkable};
  if (typeof module!=='undefined') module.exports=api;
  root.ComercialCore=api;
})(typeof window!=='undefined'?window:globalThis);
