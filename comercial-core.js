(function (root) {
  'use strict';
  const ranges = {'45-60':50,'60-80':70,'80-100':90,'100-150':125,'150+':160};
  function area(value) {
    if (Object.hasOwn(ranges, value)) return ranges[value];
    const n = Number(String(value ?? '').trim().replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  function attic(total, floors = 1) {
    const gross = area(total);
    const count = Number(floors);
    if (!gross || !Number.isInteger(count) || count < 1) return null;
    // Regla comercial fija: restar 5 m² al total introducido.
    // No dividir por plantas ni aplicar porcentajes o descuentos geométricos.
    const deduction = Math.min(gross, 5);
    const net = Math.round((gross - deduction) * 100) / 100;
    return {perFloor:gross / count, footprint:gross / count, walls:deduction, net};
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
  function evaluarAptitud(cliente = {}) {
    const m2 = area(cliente.m2);
    const zona = String(cliente.cteZone || '').trim().toUpperCase();
    const anio = Number(cliente.buildYear);
    const conjunta = Boolean(cliente.urbanizacionId);
    const cantidad = Number(cliente.viviendasAptasUrbanizacion || 0);

    if (m2 > 0 && m2 < (conjunta ? 50 : 60))
      return {estado:'no_apto',motivo:'Superficie insuficiente'};

    if (cliente.buildYear && anio > 2006)
      return {estado:'no_apto',motivo:'Construcción posterior a 2006'};

    if (zona && !/^[DE][123]$/.test(zona))
      return {estado:'no_apto',motivo:'Zona CTE no admitida'};

    if (!m2 || !zona)
      return {estado:'pendiente',motivo:'Falta superficie o zona CTE'};

    if (conjunta && cantidad < 6)
      return {estado:'revisar',motivo:'Urbanización: faltan viviendas para llegar a 6'};

    return {estado:'apto',motivo:'Cumple los criterios registrados'};
  }

  function planUrbanizacion(viviendas = []) {
  const grupos = new Map();
  const vistos = new Set();

  for (const c of viviendas) {
    if (!c || typeof c !== 'object') continue;

    const grupo = norm(c.urbanizacionId || c.urbanizacionNombre || '');
    if (!grupo) continue;

    const identidad = String(c.id || c.clientUid || c.clientId ||
      [c.street, c.postalCode, c.name].join('|')).trim();

    if (!identidad || identidad === '||') continue;

    const clave = grupo + '|' + norm(identidad);
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const resultado = evaluarAptitud({
      ...c,
      urbanizacionId: grupo,
      viviendasAptasUrbanizacion: 6
    });

    if (resultado.estado !== 'apto') continue;

    if (!grupos.has(grupo)) grupos.set(grupo, []);
    grupos.get(grupo).push(c);
  }

  const viviendasGrupo = [...grupos.values()]
    .sort((a, b) => b.length - a.length)[0] || [];

  const aptas = viviendasGrupo.length;

  return {
    aptas,
    minimo: 6,
     recomendado: 8,
    lista: aptas >= 6,
    bloques: aptas >= 6
      ? [viviendasGrupo.slice(0, 4), viviendasGrupo.slice(4, Math.min(8, aptas))]
      : []
  };
}

function opcionesAgendaUrbanizacion(viviendas = []) {
    const plan = planUrbanizacion(viviendas);
    if (!plan.lista) return [];

    return [
      {
        id: 'mismo_dia',
        nombre: 'Mismo día · equipos 2 y 3',
        bloques: [
          {equipo:2, dia:1, viviendas:plan.bloques[0]},
          {equipo:3, dia:1, viviendas:plan.bloques[1]}
        ]
      },
      {
        id: 'mismo_equipo',
        nombre: 'Dos días consecutivos · mismo equipo',
        bloques: [
          {equipo:2, dia:1, viviendas:plan.bloques[0]},
          {equipo:2, dia:2, viviendas:plan.bloques[1]}
        ]
      },
      {
        id: 'equipos_distintos',
        nombre: 'Dos días consecutivos · equipos distintos',
        bloques: [
          {equipo:2, dia:1, viviendas:plan.bloques[0]},
          {equipo:3, dia:2, viviendas:plan.bloques[1]}
        ]
      }
    ];
  }

  async function validarAgendaUrbanizacion(opcion, fechaInicio, consultar) {
    const horas=['09:00','11:00','15:00','17:00'];
    if(!opcion || !Array.isArray(opcion.bloques) ||
       opcion.bloques.length!==2 ||
       opcion.bloques.some(b=>(!Array.isArray(b.viviendas) || b.viviendas.length<2 || b.viviendas.length>4) || ![2,3].includes(b.equipo) || ![1,2].includes(b.dia)))
      throw Error('Plan de urbanización inválido');

    const viviendas=opcion.bloques.flatMap(b=>b.viviendas);
    const plan=planUrbanizacion(viviendas);

    if(!plan.lista || plan.aptas!==viviendas.length || viviendas.length<6 || viviendas.length>8)
      throw Error('El plan requiere entre 6 y 8 viviendas distintas de una misma urbanización');

    const identidad=c=>String(
      c.id ?? c.clientUid ?? c.clientId ??
      [c.street,c.postalCode,c.name].join('|')
    ).trim();

    const claves=viviendas.map(c=>
      norm(c.urbanizacionId || c.urbanizacionNombre || '')+'|'+norm(identidad(c))
    );

    if(new Set(claves).size!==viviendas.length)
      throw Error('Hay viviendas duplicadas en el plan');

    const ocupaciones=opcion.bloques.map(b=>b.dia+'|'+b.equipo);
    if(new Set(ocupaciones).size!==2)
      throw Error('Dos bloques intentan ocupar el mismo equipo y día');

    const inicio=new Date(fechaInicio+'T12:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) ||
       isNaN(inicio) || inicio.toISOString().slice(0,10)!==fechaInicio)
      throw Error('Fecha inválida');

    const fechas=[fechaInicio,new Date(inicio.getTime()+86400000).toISOString().slice(0,10)];
    const consultas=new Map();
    const reservas=[];

    for(const bloque of opcion.bloques){
      const fecha=fechas[bloque.dia-1];
      if(!consultas.has(fecha))consultas.set(fecha,consultar(fecha));
      const disponibilidad=await consultas.get(fecha);
      const lista=disponibilidad[String(bloque.equipo)];
      if(!Array.isArray(lista))throw Error('Disponibilidad incompleta');
      for(let i=0;i<bloque.viviendas.length;i++){
        const hora=horas[i];
        const fin=['11:00','13:00','17:00','19:00'][i];
        if(!lista.some(x=>x.horario===hora+'-'+fin && x.libre===true))
          return {disponible:false,fecha,equipo:bloque.equipo,hora};
        reservas.push({fecha,equipo:bloque.equipo,hora,vivienda:bloque.viviendas[i]});
      }
    }
    return {disponible:true,reservas};
  }

  const api={area,attic,date,evaluarAptitud,planUrbanizacion,opcionesAgendaUrbanizacion,validarAgendaUrbanizacion,norm,phone,postalAddress,postalMatches,exactPostalCode,matches,linkable};
  if (typeof module!=='undefined') module.exports=api;
  root.ComercialCore=api;
})(typeof window!=='undefined'?window:globalThis);
