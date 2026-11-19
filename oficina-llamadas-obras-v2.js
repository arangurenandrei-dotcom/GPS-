/* KONSOR · Oficina: una llamada, una decisión, una obra. */
(function () {
"use strict";
const ID="konsorOfficeCallV2";
const SLOTS=[["09:00","11:00"],["11:00","13:00"],["15:00","17:00"],["17:00","19:00"]];
let current=null, view="list", scope="team", chosenDate="", selectedSlot="", selectedTeam=0, busy=false, seq=0;
let clusterFocus=null,clusterDate="",clusterTeam=2,clusterSeq=0,clusterReturn=false,plannedChoice=null,clusterAutoSearch=false,clusterSearchSeq=0,clusterPlanNotice="";
const e=(t,c,txt,p)=>{let x=document.createElement(t);if(c)x.className=c;if(txt!==undefined)x.textContent=String(txt);if(p)p.append(x);return x;};
const button=(label,fn,kind="")=>{const b=e("button","koc-btn "+kind,label);b.type="button";b.onclick=fn;return b;};
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
const tomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
const owns=z=>z&&!(typeof isMikelTeamMember==="function"&&isMikelTeamMember(z.comercial))&&!(typeof isMikelTeamMember==="function"&&isMikelTeamMember(currentUserName))&&(z.comercial===currentUserName||(currentUserRole==="jefe"&&scope==="team"));
const valid=c=>c&&typeof c==="object"&&!c.captacionInvalida&&(String(c.name||"").trim()||String(c.phone||"").trim()||String(c.street||"").trim());
function all(){return (Array.isArray(savedZones)?savedZones:[]).flatMap((z,zi)=>owns(z)&&!z.isNoAptoZone&&!z.isHotMission?(z.clients||[]).flatMap((c,ci)=>valid(c)?[{z,c,zi,ci,key:String(z.id)+":"+String(c.clientUid||ci),date:z.dumpDate||z.date||""}]:[]):[]).sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.zi-b.zi||a.ci-b.ci);}
const booked=i=>["agendada","realizada"].includes(i.c.obraStatus);
const done=i=>booked(i)||["no_interesado","descartado"].includes(i.c.callStatus);
const pending=i=>!done(i)&&i.c.obraStatus!=="no_apto";
const callable=i=>pending(i)&&(!Number(i.c.nextContactAt)||Number(i.c.nextContactAt)<=Date.now());

/* Las oportunidades son recomendaciones, nunca reservas. Solo se usan datos del equipo visible. */
const norm=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const town=i=>norm(i?.z?.town);
function street(i){
 const original=String(i?.c?.street||"").trim();
 if(!original)return "";
 if(typeof normalizeStreetClusterKey==="function")return norm(normalizeStreetClusterKey(original));
 return norm(original).replace(/^(calle|c\/|avenida|avda\.?|plaza|paseo|travesia)\s+/,"").replace(/\b(nº|num\.?|numero|portal|piso)\b.*$/,"").replace(/\d+.*$/,"").trim();
}
const sameStreet=(a,b)=>!!(street(a)&&street(a)===street(b)&&town(a)&&town(a)===town(b));
const sameTown=(a,b)=>!!(town(a)&&town(a)===town(b));
/* El nuevo motor no emplea radios arbitrarios de 2, 5 u 8 km.
   Las rutas entre municipios requieren comprobación de carretera. */
const candidateOf=i=>!!(i&&callable(i)&&[i.c.name,i.c.street,i.c.phone,i.z.town].every(v=>String(v||"").trim()));
function firstRecommended(){
 const candidates=all().filter(candidateOf),groups=clusters(candidates);
 return groups.length?groups[0][0]:candidates[0]||null;
}
function nextStreetGroup(){
 const options=clusters(all().filter(candidateOf));
 return options.find(g=>g.some(x=>town(x)!==clusterFocus?.town||street(x)!==clusterFocus?.street))||null;
}
function groupRows(){
 if(!clusterFocus)return [];
 return all().filter(i=>town(i)===clusterFocus.town&&street(i)===clusterFocus.street).sort((a,b)=>{
  const na=Number(String(a.c.street||"").match(/\d+/)?.[0]||0),nb=Number(String(b.c.street||"").match(/\d+/)?.[0]||0);
  return na-nb||String(a.c.street||"").localeCompare(String(b.c.street||""),"es");
 });
}
function startGroup(item){
 if(!item)return;
 clusterFocus={town:town(item),street:street(item)};
 clusterDate=tomorrow();clusterPlanNotice="";clusterAutoSearch=true;
 clusterTeam=Number(clusterTeam)||2;view="group";draw();
}
function clusterStatus(item){
 if(booked(item))return "confirmed";
 if(item.c.obraStatus==="no_apto"||["no_interesado","descartado"].includes(item.c.callStatus))return "rejected";
 if(!callable(item))return "deferred";
 return "ready";
}
function preferGroupDate(item,date,time,team){
 plannedChoice={key:item.key,date,time,team};clusterReturn=true;
 current={key:item.key};view="client";draw();
}
function groupDateLabel(date){
 try{return new Date(date+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}catch{return date;}
}
/* Texto de ubicación a partir de datos existentes, sin inventar pueblos. */
function occupiedLocationText(value){
 if(typeof value==="string")return value.trim().slice(0,110);
 if(!value||typeof value!=="object")return "";
 const area=[value.municipio,value.localidad,value.pueblo,value.town,value.city,value.nombreMunicipio,value.nombreLocalidad].find(v=>typeof v==="string"&&v.trim());
 const street=[value.direccion,value.dirección,value.calle,value.street,value.address,value.via,value.ubicacion].find(v=>typeof v==="string"&&v.trim());
 if(street&&area&&norm(street).includes(norm(area)))return String(street).trim().slice(0,110);
 return [street,area].filter(Boolean).map(v=>String(v).trim()).join(" · ").slice(0,110);
}
function remoteSlotLocations(slot){
 if(!slot||typeof slot!=="object")return [];
 const candidates=[slot.ubicaciones,slot.obras,slot.reservas,slot.trabajos,slot.citas,slot.localidades];
 const items=candidates.flatMap(v=>Array.isArray(v)?v:[]);
 const own=occupiedLocationText(slot);
 if(!items.length&&own)items.push(slot);
 return [...new Set(items.map(occupiedLocationText).filter(Boolean))].slice(0,3);
}

/* Motor de localidades secuenciales: una localidad puede ocupar varios turnos
   seguidos, pero nunca se vuelve a ella tras visitar otra. Solo equipos 2 y 3.
   El horario es una franja de llegada, NO una duración exacta de obra. */
function remoteTown(slot){
 if(!slot||typeof slot!=="object")return "";
 const primary=[slot.municipio,slot.localidad,slot.pueblo,slot.town,slot.city,slot.nombreMunicipio,slot.nombreLocalidad].find(v=>typeof v==="string"&&v.trim());
 if(primary)return norm(primary);
 const found=[slot.ubicaciones,slot.obras,slot.reservas,slot.trabajos,slot.citas,slot.localidades].flatMap(v=>Array.isArray(v)?v:[]);
 const known=new Set();
 found.forEach(value=>{
  if(value&&typeof value==="object"){
   const v=[value.municipio,value.localidad,value.pueblo,value.town,value.city,value.nombreMunicipio,value.nombreLocalidad].find(x=>typeof x==="string"&&x.trim());
   if(v)known.add(norm(v));
  }else if(typeof value==="string"){
   const raw=value.trim();
   const segments=raw.split(",").map(x=>x.trim()).filter(Boolean);
   const postal=segments.map(x=>x.match(/^\d{5}\s+(.+)$/)).find(Boolean);
   if(postal){known.add(norm(postal[1]));return;}
   const provinces=/^(navarra|españa|spain|zaragoza|huesca|aragon|aragón)$/i;
   const last=segments.filter(x=>!provinces.test(x));
   const likely=last[last.length-1]||"";
   if(likely&&!/\d/.test(likely)&&!/\b(calle|avenida|avda|paseo|plaza|carretera|callejon|camino|cl\b)\b/i.test(likely)&&likely.length<50){
    known.add(norm(likely));
   }
  }
 });
 return known.size===1?[...known][0]:"";
}
function crewSequence(date,team,remote,localRows,extraSuggested=[],replace=null){
 const cells=[];
 for(let idx=0;idx<SLOTS.length;idx++){
  const here=replace&&replace.idx===idx?replace.item:null;
  const found=localRows.filter(r=>r.slot===idx&&(![2,3].includes(Number(r.c?.obraEquipoInstalacion))||Number(r.c.obraEquipoInstalacion)===team));
  const placed=extraSuggested.find(p=>p.team===team&&p.idx===idx);
  const [start,end]=SLOTS[idx];
  const server=remote?.[String(team)]?.find(x=>x.horario===start+"-"+end);
  let place="";
  if(here)place=town(here);
  else if(placed)place=town(placed.item);
  else if(found.length)place=found.length===1?town({z:found[0].z}):"";
  else if(server?.libre===false)place=remoteTown(server);
  const occupied=!!(here||placed||found.length||server?.libre===false);
  cells.push({idx,town:place,occupied,unknown:occupied&&!place,confirmed:found.length>0||server?.libre===false});
 }
 return cells;
}
function noTownReturn(cells){
 const seen=new Set();let last="";
 for(const row of cells){
  if(!row.town)continue;
  if(row.town!==last&&seen.has(row.town))return false;
  seen.add(row.town);last=row.town;
 }
 return true;
}
function slotRouteFit(item,date,team,slotIdx,remote,localRows,extraSuggested=[]){
 if(!item||!town(item)||!Number.isInteger(slotIdx)||slotIdx<0||slotIdx>=SLOTS.length)return{ok:false,reason:"Faltan datos de la franja o el municipio"};
 const source=remote?.[String(team)];
 if(!Array.isArray(source))return{ok:false,reason:"Sin disponibilidad del equipo"};
 const id=SLOTS[slotIdx].join("-");
 if(source.find(x=>x.horario===id)?.libre!==true)return{ok:false,reason:"Franja no disponible en KONSOR"};
 const previous=crewSequence(date,team,remote,localRows||[],extraSuggested,{idx:slotIdx,item});
 const before=previous.slice(0,slotIdx).filter(x=>x.occupied).at(-1)||null;
 const after=previous.slice(slotIdx+1).find(x=>x.occupied)||null;
 const name=town(item);
 // No inferir rutas a través de trabajos cuya localidad no conste.
 if((before?.unknown)||(after?.unknown))return{ok:false,reason:"La ubicación de otra obra del equipo no está verificada"};
 if(!noTownReturn(previous))return{ok:false,reason:"La secuencia volvería a un pueblo ya abandonado"};
 if(before&&after&&before.town!==after.town&&name!==before.town&&name!==after.town)
  return{ok:false,reason:"La propuesta introduciría una tercera localidad entre dos obras"};
 // Un municipio completamente diferente necesita un cálculo de ruta vial.
 // Sin servicio de carreteras verificado, no se recomienda automáticamente.
 const adjacent=before||after;
 if(adjacent&&name!==before?.town&&name!==after?.town)
  return{ok:false,reason:"La nueva localidad requiere comprobar el trayecto por carretera"};
 // No existe un margen artificial de 5 km ni se impone que la obra dure dos horas.
 const category=!adjacent?3:after?.town===name&&before?.town!==name?0:before?.town===name&&after?.town===name?0:before?.town===name?1:2;
 return{ok:true,category,reason:category===0?"Continúa con la localidad de la siguiente obra":category===1?"Completa el bloque de la localidad actual":"Abre una jornada sin desplazamientos verificados pendientes"};
}
function buildSafeClusterAssignments(group,date,remote,local){
 const free=group.filter(x=>clusterStatus(x)==="ready"&&candidateOf(x));
 const used=new Set(),suggestions=[];
 const available=[];
 for(const team of [2,3]){
  for(let idx=0;idx<SLOTS.length;idx++){
   const [from,to]=SLOTS[idx],status=remote?.[String(team)]?.find(x=>x.horario===from+"-"+to);
   const occupied=local.some(r=>r.slot===idx&&(![2,3].includes(Number(r.c?.obraEquipoInstalacion))||Number(r.c.obraEquipoInstalacion)===team));
   if(status?.libre===true&&!occupied)available.push({team,idx});
  }
 }
 // Escoge por equipo y en orden de franjas para llenar bloques de pueblo.
 for(const spot of available){
  const choices=free.filter(x=>!used.has(x.key)).map(item=>({item,fit:slotRouteFit(item,date,spot.team,spot.idx,remote,local,suggestions)})).filter(x=>x.fit.ok).sort((a,b)=>a.fit.category-b.fit.category||String(a.item.c.street).localeCompare(String(b.item.c.street),"es"));
  const choice=choices[0];if(!choice)continue;
  used.add(choice.item.key);suggestions.push({...spot,item:choice.item});
 }
 return suggestions;
}

/* Busca fechas que permiten agrupar hasta cuatro vecinos por un mismo equipo.
   No confirma ni guarda reservas; solo consume la disponibilidad del servidor. */
async function findClusterDay(body,host,indicator,automatic=false){
 if(!clusterFocus||!host.isConnected)return;
 const token=++clusterSearchSeq,focusKey=clusterFocus.town+"|"+clusterFocus.street;
 const rows=groupRows().filter(candidateOf);
 if(!rows.length){indicator.textContent="No quedan clientes con teléfono y dirección completos para programar.";return;}
 indicator.textContent="Buscando una jornada con hasta "+Math.min(rows.length,4)+" franjas para el mismo equipo…";
 const days=[];let day=new Date(tomorrow()+"T12:00:00");
 while(days.length<9){if(day.getDay()!==0)days.push([day.getFullYear(),String(day.getMonth()+1).padStart(2,"0"),String(day.getDate()).padStart(2,"0")].join("-"));day.setDate(day.getDate()+1);}
 let checked=0;const options=[];
 // Limitamos la concurrencia para no saturar el servicio de disponibilidad.
 for(let offset=0;offset<days.length;offset+=3){
  const batch=await Promise.allSettled(days.slice(offset,offset+3).map(async(date)=>{
   const remote=await consultarKonsorFecha(date);
   const previous=typeof routeRecords==="function"?routeRecords(date):[];
   const teamFree={};
   for(const team of [2,3]){
    teamFree[team]=SLOTS.map(([from,to],idx)=>{
     const state=remote[String(team)]?.find(x=>x.horario===from+"-"+to);
     const occupied=previous.some(p=>p.slot===idx&&(![2,3].includes(Number(p.c?.obraEquipoInstalacion))||Number(p.c?.obraEquipoInstalacion)===team));
     return state?.libre===true&&!occupied;
    });
   }
   const plans=buildSafeClusterAssignments(rows, date,remote,previous);
   const planCounts={2:plans.filter(p=>p.team===2).length,3:plans.filter(p=>p.team===3).length};
   return{date,teamFree,planCounts,alreadyBusy:previous.length};
  }));
  batch.forEach((result,i)=>{
   if(result.status!=="fulfilled")return;
   checked++;
   const {date,teamFree,planCounts,alreadyBusy}=result.value;
   for(const team of [2,3]){
    const free=teamFree[team],count=free.filter(Boolean).length;
    let current=0,maxRun=0;
    free.forEach(yes=>{current=yes?current+1:0;maxRun=Math.max(maxRun,current);});
    const total=teamFree[2].filter(Boolean).length+teamFree[3].filter(Boolean).length;
    options.push({date,team,count,total,maxRun,safe:planCounts[team]||0,alreadyBusy,dayIndex:offset+i});
   }
  });
  if(token!==clusterSearchSeq||view!=="group"||!host.isConnected||clusterFocus?.town+"|"+clusterFocus?.street!==focusKey)return;
 }
 if(!options.length){indicator.textContent="No se pudieron verificar fechas. Mantengo el día actual; no se ofrecen huecos sin confirmar disponibilidad.";return;}
 // Primero completar el día anterior viable, evitando abrir otro mientras sea posible.
 // En esa fecha, aprovechar el equipo con más huecos compatibles y continuidad.
 options.sort((a,b)=>(a.safe===0)-(b.safe===0)||a.dayIndex-b.dayIndex||b.safe-a.safe||b.maxRun-a.maxRun||b.alreadyBusy-a.alreadyBusy||a.team-b.team);
 const best=options[0],target=Math.min(4,rows.length);
 if(best.safe===0){clusterPlanNotice="No se han encontrado franjas con proximidad verificable en los "+checked+" días consultados. No recomendaré desplazamientos sin conocer las ubicaciones de las otras obras.";indicator.textContent=clusterPlanNotice;return;}
 const msg=best.safe>=target?"Jornada agrupable de cuatro viviendas":"Completar primera jornada compatible";
 clusterPlanNotice=msg+": "+best.date+" · Equipo "+best.team+" · "+best.safe+" propuestas del mismo pueblo de "+best.count+" huecos disponibles. Se priorizan las fechas anteriores. Son propuestas, no reservas.";
 indicator.textContent=clusterPlanNotice;
 if(best.date!==clusterDate||automatic){clusterDate=best.date;clusterTeam=best.team;renderGroupAgendaReplace(body,host);}
}

async function renderGroupAgenda(body,insertBefore=null){
 const ticket=++clusterSeq,group=groupRows();
 const host=e("section","koc-card koc-group-schedule",undefined,body);
 if(insertBefore&&insertBefore.parentNode===body)body.insertBefore(host,insertBefore);
 e("h3","","Plan del día · Dos equipos",host);
 e("p","koc-muted","Azul: franja libre y cercanía preliminar. Gris: bloqueado o ruta no verificable. No se usan huecos que obliguen a desplazamientos desconocidos entre pueblos; se debe comprobar además la conducción real.",host);
 const controls=e("div","koc-group-controls koc-group-date-only",undefined,host);
 const dateInput=e("input","koc-input",undefined,controls);
 dateInput.type="date";dateInput.min=tomorrow();dateInput.value=clusterDate;dateInput.setAttribute("aria-label","Día de las obras");
 const dButtons=e("div","koc-day-actions",undefined,controls);
 const shiftDate=delta=>{
   const d=new Date((clusterDate||tomorrow())+"T12:00:00");d.setDate(d.getDate()+delta);
   const next=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
   if(next<tomorrow())return;++clusterSearchSeq;clusterPlanNotice="";clusterDate=next;renderGroupAgendaReplace(body,host);
 };
 dButtons.append(button("‹ Día anterior",()=>shiftDate(-1),"koc-quiet"));
 dButtons.append(button("Día siguiente ›",()=>shiftDate(1),"koc-quiet"));
 dateInput.onchange=()=>{++clusterSearchSeq;clusterPlanNotice="";clusterDate=dateInput.value;renderGroupAgendaReplace(body,host);};
 const planSearch=button("Buscar jornada para agrupar 4 viviendas",()=>{clusterPlanNotice="";findClusterDay(body,host,searchInfo,false);},"koc-primary");
 host.append(planSearch);
 const searchInfo=e("p","koc-muted",clusterPlanNotice||"",host);
 if(clusterAutoSearch){
  clusterAutoSearch=false;
  Promise.resolve().then(()=>findClusterDay(body,host,searchInfo,true));
 }
 const summary=e("p","koc-muted","Comprobando disponibilidad de ambos equipos…",host);
 const board=e("div","koc-dual-board",undefined,host);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(clusterDate)||clusterDate<tomorrow()||new Date(clusterDate+"T12:00:00").getDay()===0){
  summary.textContent="Elige una fecha futura de lunes a sábado.";return;
 }
 let remote=null,error=null;
 try{if(typeof consultarKonsorFecha!=="function")throw Error("No está disponible la consulta de KONSOR.");remote=await consultarKonsorFecha(clusterDate);}
 catch(err){error=err;}
 if(ticket!==clusterSeq||view!=="group"||!host.isConnected)return;
 const allBooked=typeof routeRecords==="function"?routeRecords(clusterDate):[];
 const occupiedBy=(slot,team)=>allBooked.find(r=>r.slot===slot&&(![2,3].includes(Number(r.c?.obraEquipoInstalacion))||Number(r.c?.obraEquipoInstalacion)===team));
 const calendar=new Map();
 for(const team of [2,3])for(let idx=0;idx<SLOTS.length;idx++){
  const [from,to]=SLOTS[idx],server=remote?.[String(team)]?.find(x=>x.horario===from+"-"+to);
  const confirmed=occupiedBy(idx,team);
  calendar.set(team+"|"+idx,{team,idx,from,to,confirmed,server,available:!confirmed&&server?.libre===true&&!!remote});
 }
 const freeCandidates=group.filter(x=>clusterStatus(x)==="ready"&&candidateOf(x));
 // Solamente se proponen franjas con continuidad geográfica preliminar.
 const plans=remote?buildSafeClusterAssignments(group,clusterDate,remote,allBooked):[];
 const proposed=new Map(plans.map(p=>[p.team+"|"+p.idx,p.item]));
 const used=new Set(plans.map(p=>p.item.key));
 const header=e("div","koc-dual-head",undefined,board);
 e("span","","Horario",header);e("strong","","Equipo 2",header);e("strong","","Equipo 3",header);
 let confirmedCount=0,proposalCount=0;
 SLOTS.forEach(([from,to],idx)=>{
  const row=e("div","koc-dual-row",undefined,board);
  e("div","koc-dual-time",from+" – "+to,row);
  for(const team of [2,3]){
   const pos=calendar.get(team+"|"+idx);
   const cell=e("section","koc-dual-cell",undefined,row);
   if(pos.confirmed){
    const client=pos.confirmed.c,own=group.find(x=>x.c===client);
    confirmedCount++;
    cell.classList.add("confirmed");
    e("strong","",client?.name||"Obra confirmada",cell);
    e("small","",[client?.street,pos.confirmed.z?.town].filter(Boolean).join(" · ")||"Dirección no registrada",cell);
    e("span","koc-dual-state","CONFIRMADA",cell);
    if(own)cell.append(button("Ver ficha",()=>open(own),"koc-quiet"));
   }else if(!remote){
    cell.classList.add("unverified");e("strong","","Sin verificar",cell);
   }else if(!pos.available){
    cell.classList.add("occupied");
    const locations=remoteSlotLocations(pos.server);
    e("strong","",locations.length?"Ocupado · Otra obra":"No disponible",cell);
    if(locations.length){
     locations.forEach(loc=>e("small","koc-occupied-location",loc,cell));
    }else{
     e("small","","KONSOR no indica la localidad de esta franja.",cell);
    }
    e("span","koc-dual-state","FRANJA BLOQUEADA",cell);
   }else{
    const item=proposed.get(team+"|"+idx);
    if(item){
     proposalCount++;cell.classList.add("suggested");
     e("strong","",item.c.name||"Sin nombre",cell);
     e("small","",item.c.street||"Sin calle",cell);
     e("span","koc-dual-state","POR LLAMAR",cell);
     cell.append(button("Llamar",()=>preferGroupDate(item,clusterDate,from,team),"koc-primary"));
    }else{
     const unplaced=freeCandidates.filter(x=>!used.has(x.key));
     if(unplaced.length){
      const reason=slotRouteFit(unplaced[0],clusterDate,team,idx,remote,allBooked,plans).reason;
      cell.classList.add("unverified");e("strong","","Libre, sin propuesta",cell);
      e("small","",reason||"No hay ruta cercana comprobada",cell);
     }else{cell.classList.add("free");e("strong","","Libre",cell);e("small","","Sin vecinos pendientes",cell);}
    }
   }
  }
 });
 summary.textContent=error?"No hay disponibilidad verificada: "+(error.message||"Fallo de conexión")+". No se proponen huecos.":proposalCount+" de "+freeCandidates.length+" vecinos propuestos · "+confirmedCount+" obras confirmadas · "+[...calendar.values()].filter(x=>x.available).length+" de 8 franjas libres en KONSOR. Las demás no están disponibles para esa fecha.";
 const remainder=group.filter(x=>clusterStatus(x)==="ready"&&!used.has(x.key));
 if(remainder.length){
  const extra=e("div","koc-group-remainder",undefined,host);
  e("strong","",remainder.length+" vecinos para intentar en otro día o hueco",extra);
  remainder.forEach(item=>{
   const line=e("div","koc-remain-row",undefined,extra);
   e("span","",(item.c.name||"Sin nombre")+" · "+(item.c.street||"Sin dirección"),line);
   line.append(button("Llamar",()=>open(item),"koc-quiet"));
  });
 }
 const bookedElsewhere=group.filter(x=>booked(x)&&x.c.obraDate!==clusterDate);
 if(bookedElsewhere.length){
  const other=e("details","koc-other-days",undefined,host);
  e("summary","",bookedElsewhere.length+" vecinos ya agendados en otros días",other);
  bookedElsewhere.forEach(item=>{const line=e("p","koc-muted",(item.c.name||"Sin nombre")+" · "+item.c.obraDate+" "+(item.c.obraTime||"")+" · Equipo "+(item.c.obraEquipoInstalacion||"sin asignar"),other);});
 }
 if(group.some(x=>clusterStatus(x)==="deferred"))e("p","koc-muted","Los contactos con seguimiento futuro no ocupan propuestas hasta que llegue su fecha de llamada.",host);
}
function renderGroupAgendaReplace(body,previous){
 const next=previous?.nextSibling||null;
 if(previous)previous.remove();
 renderGroupAgenda(body,next);
}

function renderGroup(body){
 const group=groupRows();
 if(!group.length){clusterFocus=null;view="list";draw();return;}
 nav(body,"Todas las oportunidades",()=>{clusterFocus=null;clusterReturn=false;view="list";draw();});
 const heading=card(body);
 e("span","koc-group-eyebrow","AGRUPACIÓN POR CALLE",heading);
 title(heading,group[0].c.street.replace(/\d+.*$/,"").trim()+" · "+(group[0].z.town||"Municipio"),group.length+" viviendas identificadas. Solo se agendan las que aceptan la fecha.");
 const stats=e("div","koc-group-metrics",undefined,heading);
 const bookedHere=group.filter(x=>booked(x)),ready=group.filter(x=>clusterStatus(x)==="ready");
 [["Viviendas",group.length],["Confirmadas",bookedHere.length],["Por llamar",ready.length]].forEach(([label,v])=>{const box=e("div","koc-group-metric",undefined,stats);e("strong","",v,box);e("small","",label,box);});
 renderGroupAgenda(body);
 const nextGroup=nextStreetGroup();
 if(nextGroup){const nextBox=card(body);e("strong","","Siguiente calle prioritaria",nextBox);e("p","koc-muted",nextGroup.length+" viviendas pendientes · "+nextGroup[0].c.street.replace(/\d+.*$/,"").trim()+" · "+nextGroup[0].z.town,nextBox);nextBox.append(button("Preparar siguiente grupo",()=>startGroup(nextGroup[0]),"koc-quiet"));}
 const clients=e("details","koc-card koc-neighbors-details",undefined,body);e("summary","","Ver las "+group.length+" fichas de la calle",clients);
 group.forEach(item=>{
  const status=clusterStatus(item),line=e("div","koc-group-client "+status,undefined,clients);
  const content=e("div","koc-group-client-content",undefined,line);
  e("strong","",(item.c.name||"Sin nombre")+" · "+(item.c.street||"Sin dirección"),content);
  let desc=status==="confirmed"?"CONFIRMADA · "+(item.c.obraDate||"")+" "+(item.c.obraTime||"")+" · Equipo "+(item.c.obraEquipoInstalacion||"?"):status==="ready"?"PENDIENTE DE LLAMADA":status==="deferred"?"SEGUIMIENTO PENDIENTE":"NO DISPONIBLE";
  if(status==="ready"&&!candidateOf(item))desc="FICHA INCOMPLETA · Revisa nombre, teléfono y dirección";
  e("small","",desc,content);
  if(status==="ready")line.append(button("Llamar",()=>open(item),"koc-primary"));
  else if(status==="confirmed")line.append(button("Ver",()=>open(item),"koc-quiet"));
 });
}
function proximityLeads(candidates){
 if(typeof routeRecords!=="function")return [];
 const dates=[];let d=new Date(tomorrow()+"T12:00:00");
 while(dates.length<7){const iso=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");if(d.getDay()!==0)dates.push(iso);d.setDate(d.getDate()+1);}
 const options=[];
 dates.forEach(date=>{
  const records=routeRecords(date);
  for(const team of [2,3]){
   const bookings=records.filter(x=>Number(x.c?.obraEquipoInstalacion)===team&&x.slot>=0);
   if(!bookings.length||bookings.length>=4)continue;
   candidates.forEach(item=>{
    const adj=bookings.filter(x=>sameStreet(item,x)||sameTown(item,x));
    if(!adj.length)return;
    const same=adj.some(x=>sameStreet(item,x));
    const adjacentSlots=adj.flatMap(x=>[x.slot-1,x.slot+1]).filter(n=>n>=0&&n<4);
    const empty=adjacentSlots.filter(n=>!records.some(x=>x.slot===n&&(![2,3].includes(Number(x.c?.obraEquipoInstalacion))||Number(x.c.obraEquipoInstalacion)===team)));
    if(!empty.length)return;
    options.push({item,date,team,slot:empty[0],rank:same?0:1});
   });
  }
 });
 return options.sort((a,b)=>a.rank-b.rank||a.date.localeCompare(b.date)).filter((o,i,arr)=>arr.findIndex(x=>x.item.key===o.item.key)===i).slice(0,3);
}
function opportunityCards(parent,candidates){
 const groups=clusters(candidates),leads=proximityLeads(candidates);
 if(!groups.length&&!leads.length)return;
 const block=card(parent);title(block,"Oportunidades detectadas","Prioridades logísticas, no citas reservadas. El servidor verificará cada hueco antes de confirmarlo.");
 groups.slice(0,6).forEach((group,index)=>{
  const first=group[0],line=e("div","koc-opportunity",undefined,block);
  const wrap=e("div","koc-opportunity-text",undefined,line);
  e("strong","",(index===0?"PRIMERA PRIORIDAD · ":index===1?"DESPUÉS · ":"AGRUPACIÓN · ")+first.c.street.replace(/\d+.*$/,"").trim()+" · "+(first.z.town||"Localidad"),wrap);
  e("small","",group.length+" vecinos pendientes · Intentar primero "+Math.min(group.length,4)+" de esta calle en la jornada más próxima compatible",wrap);
  line.append(button("Ver jornada",()=>startGroup(group[0]),"koc-quiet"));
 });
 const covered=new Set(groups.flat().map(x=>x.key));
 leads.filter(x=>!covered.has(x.item.key)).forEach(x=>{
  const line=e("div","koc-opportunity",undefined,block),wrap=e("div","koc-opportunity-text",undefined,line);
  e("strong","","Completar ruta · "+(x.item.z.town||"Municipio"),wrap);
  e("small","",x.item.c.street+" · "+x.date+" · Equipo "+x.team+" · posible "+SLOTS[x.slot][0]+" (sin verificar)",wrap);
  line.append(button("Ver cliente",()=>open(x.item),"koc-quiet"));
 });
}

function resolve(){if(!current)return null;return all().find(x=>x.key===current.key)||null;}
function root(){
 let r=document.getElementById(ID);if(r)return r;
 r=e("div","koc-overlay",undefined,document.body);r.id=ID;
 const pg=e("section","koc-page",undefined,r);pg.setAttribute("role","dialog");pg.setAttribute("aria-modal","true");pg.setAttribute("aria-label","Gestión de clientes");
 const head=e("header","koc-header",undefined,pg),h=e("div","",undefined,head);
 e("small","","KONSOR · OFICINA",h);e("h2","","Gestionar clientes",h);
 head.append(button("Cerrar",()=>r.classList.remove("active"),"koc-quiet"));
 e("main","koc-body",undefined,pg);
 r.addEventListener("click",ev=>{if(ev.target===r)r.classList.remove("active");});
 return r;
}
function title(p,heading,detail){e("h3","",heading,p);if(detail)e("p","koc-muted",detail,p);}
function card(p){return e("section","koc-card",undefined,p);}
function show(msg){const t=e("p","koc-error",msg);return t;}
function nav(body,label,fn){body.append(button("‹ "+label,fn,"koc-quiet"));}
function open(item){if(plannedChoice?.key!==item.key)plannedChoice=null;current={key:item.key};view="client";draw();}
function next(){if(clusterFocus){plannedChoice=null;view="group";draw();return;}const remaining=all().filter(i=>callable(i)&&i.key!==current?.key);const origin=resolve();const oldest=remaining[0]?.date||"";const eligible=remaining.filter(i=>(i.date||"")===oldest);const row=(origin&&eligible.find(i=>sameStreet(origin,i)))||(origin&&eligible.find(i=>sameTown(origin,i)))||eligible[0]||remaining[0];if(row)open(row);else{view="list";draw();}}
function row(body,item){const b=button("",()=>open(item),"koc-row");
 const txt=e("span","koc-row-text",undefined,b);e("strong","",item.c.name||"Sin nombre",txt);
 e("small","",(item.z.town||"Sin municipio")+" · "+(item.c.street||"Sin calle"),txt);
 const status=booked(item)?"Obra agendada":item.c.callStatus==="no_interesado"?"No interesado":item.c.callStatus==="esperando_confirmacion"?"En seguimiento":item.c.callStatus==="ya_llamado"?"Volver a llamar":"Por llamar";
 e("span","koc-tag "+(booked(item)?"success":""),status,b);
 body.append(b);}
function draw(opts={}){
 ++clusterSeq;
 const r=root();r.classList.add("active");const body=r.querySelector(".koc-body");body.replaceChildren();
 const items=all(),todo=items.filter(callable),scheduled=items.filter(booked),deferred=items.filter(i=>pending(i)&&!callable(i));
 if(view==="group"){renderGroup(body);return;}
 if(view==="list"){
  title(body,"Plan de llamadas por calles","Primero completa los días anteriores; dentro de cada jornada, concentra hasta cuatro viviendas de la misma calle por equipo. Cada reserva sigue siendo individual.");
  const counts=e("div","koc-counts",undefined,body);
  [["Clientes",items.length],["Por llamar",todo.length],["Obras agendadas",scheduled.length]].forEach(([label,v])=>{const box=e("div","koc-count",undefined,counts);e("strong","",v,box);e("small","",label,box);});
  if(currentUserRole==="jefe"){const s=e("select","koc-input",undefined,body);[["mine","Mis clientes"],["team","Todo mi equipo"]].forEach(([value,label])=>{const o=e("option","",label,s);o.value=value;});s.value=scope;s.onchange=()=>{scope=s.value;draw();};}
  const suggested=firstRecommended();
  if(suggested)body.append(button("Planificar primera calle · "+(suggested.z.town||""),()=>startGroup(suggested),"koc-primary"));
  opportunityCards(body,todo);
  const list=card(body);title(list,"Clientes pendientes",todo.length+" fichas para gestionar · Prioriza las agrupaciones");
  todo.forEach(i=>row(list,i));
  if(!items.length){
    const zones=(Array.isArray(savedZones)?savedZones:[]).filter(z=>owns(z)&&!z.isNoAptoZone&&!z.isHotMission);
    const recorded=zones.reduce((n,z)=>n+(Array.isArray(z.clients)?z.clients.length:0),0);
    e("p","koc-muted",!zones.length
      ?"No hay sectores del alcance seleccionado. Revisa Pueblos y sectores o cambia el filtro de equipo."
      :!recorded
      ?"Hay "+zones.length+" sectores, pero aún no contienen clientes volcados. Primero registra las fichas de captación."
      :"Hay "+recorded+" registros, pero no cumplen los requisitos mínimos de ficha (nombre, teléfono o dirección). Revisa las fichas originales.",list);
  } else if(!todo.length)e("p","koc-muted","No hay llamadas vencidas. Los recordatorios futuros permanecen guardados.",list);
  const incomplete=items.filter(i=>!i.c.name||!i.c.phone||!i.c.street);
  if(incomplete.length){
    const warning=card(body);title(warning,"Fichas por completar",incomplete.length+" registros sin nombre, teléfono o calle. Se muestran para corregirlos, pero no permiten reservar hasta completarlos.");
    incomplete.slice(0,15).forEach(i=>row(warning,i));
  }
  if(deferred.length){const waits=e("details","koc-closed",undefined,body);e("summary","","Seguimientos futuros ("+deferred.length+")",waits);deferred.forEach(i=>row(waits,i));}
  const details=e("details","koc-closed",undefined,body);e("summary","","Gestionados ("+items.filter(i=>!pending(i)).length+")",details);items.filter(i=>!pending(i)).forEach(i=>row(details,i));
  return;
 }
 const item=resolve();if(!item){view="list";current=null;draw();return;}
 const {z,c}=item;
 if(view==="client"){
  nav(body,clusterFocus?"Volver a la jornada":"Volver a clientes",()=>{view=clusterFocus?"group":"list";draw();});
  title(body,c.name||"Cliente sin nombre",(z.town||"Sin localidad")+" · "+(c.street||"Dirección no registrada"));
  const sheet=card(body);
  const facts=[["Teléfono",c.phone||"Sin teléfono"],["Captación",item.date||"Sin fecha"],["Superficie",c.m2?String(c.m2)+" m²":"Sin superficie"],["Estado",booked(item)?"Obra agendada":c.callStatus||"Por llamar"]];
  facts.forEach(([k,v])=>{const line=e("div","koc-fact",undefined,sheet);e("span","",k,line);e("strong","",v,line);});
  const group=all().filter(x=>callable(x)&&sameStreet(item,x));
  if(group.length>1){const hint=card(body);e("strong","","Oportunidad · Misma calle",hint);e("p","koc-muted",group.length+" viviendas por llamar en esta calle. Conviene proponer franjas del mismo día y equipo antes de abrir otra ruta.",hint);hint.append(button("Ver jornada con estos clientes",()=>startGroup(item),"koc-quiet"));}
  if(plannedChoice?.key===item.key){const suggestion=card(body);e("strong","","Franja que intentamos completar",suggestion);e("p","koc-muted",plannedChoice.date+" · "+plannedChoice.time+" · Equipo "+plannedChoice.team+" (sin reservar). Propón este horario durante la llamada.",suggestion);}
  if(c.phone){const a=e("a","koc-btn koc-primary","Llamar al cliente",body);a.href="tel:"+String(c.phone).replace(/[^\d+]/g,"");}
  if(!callable(item)&&pending(item)){const nextAt=new Date(Number(c.nextContactAt)).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});e("p","koc-muted","Seguimiento programado para "+nextAt+". Puedes consultar la ficha sin adelantar la llamada.",body);}
  if(booked(item)){
   body.append(button("Ver confirmación y WhatsApp",()=>{view="whatsapp";draw();},"koc-primary"));
   body.append(button("Cambiar fecha",()=>{chosenDate=c.obraDate||tomorrow();view="calendar";draw();},"koc-quiet"));
  }else{
   body.append(button("Acepta · Agendar obra",()=>{chosenDate=plannedChoice?.key===item.key?plannedChoice.date:clusterFocus?clusterDate:tomorrow();selectedSlot="";selectedTeam=0;view="calendar";draw({preferred:plannedChoice?.key===item.key?plannedChoice:null});},"koc-primary"));
   body.append(button("No contesta · Volver a llamar",()=>saveCall("ya_llamado"),""));
   body.append(button("Necesita pensarlo",()=>{view="waiting";draw();},""));
   body.append(button("No está interesado",()=>saveCall("no_interesado"),"koc-quiet"));
  }
  body.append(button("Saltar sin modificar",next,"koc-quiet"));return;
 }
 if(view==="waiting"){
  nav(body,"Volver a la llamada",()=>{view="client";draw();});
  title(body,"Programar seguimiento","¿Qué necesita decidir el cliente?");
  const form=card(body);
  e("label","","Motivo o comentario",form);
  const note=e("textarea","koc-input",undefined,form);note.rows=3;note.placeholder="Ej.: consultarlo con su pareja";note.value=c.waitReason||"";
  e("label","","Próxima acción en 48 horas",form);
  const type=e("select","koc-input",undefined,form);
  [["llamar","Volver a llamar"],["whatsapp","Enviar WhatsApp"]].forEach(([v,t])=>{const op=e("option","",t,type);op.value=v;});
  type.value=c.waitType||"llamar";
  form.append(button("Guardar seguimiento",async()=>{
   if(note.value.trim().length<3){alert("Indica brevemente qué queda pendiente.");return;}
   if(busy)return;busy=true;
   const row=resolve();if(!row){busy=false;return;}
   const old={...row.c},up=row.z._updatedAt;
   Object.assign(row.c,{callStatus:"esperando_confirmacion",waitReason:note.value.trim(),waitType:type.value,statusChangedAt:Date.now(),nextContactAt:Date.now()+48*3600*1000});
   row.c.callLog=[...(row.c.callLog||[]),{t:Date.now(),s:"esperando_confirmacion",r:row.c.waitReason}].slice(-20);
   row.z._updatedAt=Date.now();
   if(!await saveAndSync("comercial_custom_zones",savedZones)){Object.keys(row.c).forEach(k=>{if(!(k in old))delete row.c[k];});Object.assign(row.c,old);row.z._updatedAt=up;alert("No se ha guardado el seguimiento.");}
   else next();busy=false;
  },"koc-primary"));
  return;
 }
 if(view==="calendar"){
  nav(body,"Volver a la ficha",()=>{view="client";draw();});
  title(body,"Elegir día de obra",c.name+" · "+(z.town||"Navarra"));
  if(![c.name,c.street,c.phone].every(v=>String(v||"").trim())){body.append(show("Completa nombre, calle y teléfono desde la ficha antes de reservar."));return;}
  const dateBox=card(body);e("label","","Día de instalación",dateBox);
  const input=e("input","koc-input",undefined,dateBox);input.type="date";input.min=tomorrow();input.value=chosenDate||tomorrow();
  const advice=e("section","koc-card",undefined,body);
  e("strong","","Recomendación logística",advice);
  e("p","koc-muted","Priorizaremos los huecos junto a obras del mismo equipo y la misma calle. Puedes elegir otra fecha si el cliente no puede.",advice);
  const recButton=button("Buscar las mejores opciones de los próximos 7 días",()=>recommendDays(item,body),"koc-primary");
  if(!clusterFocus)advice.append(recButton);
  const proposals=e("div","koc-recommendations",undefined,advice);proposals.id="koc-recommendations";
  const board=e("div","koc-slots",undefined,body);
  const info=e("p","koc-muted","",body);
  input.onchange=()=>{chosenDate=input.value;loadSlots(board,info);};
  chosenDate=input.value;loadSlots(board,info,opts.preferred||null);
  const confirm=button("Continuar con la reserva",()=>{if(!selectedSlot||!selectedTeam)return;view="review";draw();},"koc-primary");confirm.id="koc-continue";confirm.disabled=true;body.append(confirm);
  return;
 }
 if(view==="review"){
  nav(body,"Cambiar horario",()=>{view="calendar";draw();});
  title(body,"Confirmar la obra","Comprueba con el cliente la fecha y la franja antes de guardar.");
  const rec=card(body);
  [["Cliente",c.name],["Municipio",z.town],["Dirección",c.street],["Día",chosenDate],["Hora",selectedSlot],["Instaladores","Equipo "+selectedTeam]].forEach(([k,v])=>{const line=e("div","koc-fact",undefined,rec);e("span","",k,line);e("strong","",v||"",line);});
  body.append(button(busy?"Guardando…":"Confirmar obra",()=>saveBooking(),"koc-primary"));
  e("p","koc-muted","El guardado se verifica antes de preparar el WhatsApp. La disponibilidad se vuelve a comprobar al confirmar.",body);return;
 }
 if(view==="whatsapp"){
  nav(body,clusterFocus?"Volver a la jornada":"Volver a clientes",()=>{view=clusterFocus?"group":"list";draw();});
  title(body,"Obra agendada","El mensaje está listo. WhatsApp requiere que pulses Enviar.");
  const msg=message(c,z);
  const note=card(body);e("p","koc-message",msg,note);
  const phone=normalizePhone(c.phone);
  if(phone)body.append(button("Abrir WhatsApp",()=>{const a=document.createElement("a");a.href="https://wa.me/"+phone+"?text="+encodeURIComponent(msg);a.target="_blank";a.rel="noopener noreferrer";document.body.append(a);a.click();a.remove();},"koc-green"));
  else body.append(show("El número no es válido. Corrige el teléfono antes de abrir WhatsApp."));
  body.append(button(c.whatsappObraEnviadoAt?"Enviado · "+new Date(c.whatsappObraEnviadoAt).toLocaleString("es-ES"):"Marcar WhatsApp como enviado",()=>markWhatsApp(),""));
  if(clusterFocus){body.append(button("Ver jornada y vecinos pendientes",()=>{plannedChoice=null;view="group";draw();},"koc-primary"));}
  else body.append(button("Siguiente cliente",next,"koc-primary"));
 }
}
async function availableChoices(item,d){
 const data=await consultarKonsorFecha(d);
 const old=typeof routeRecords==="function"?routeRecords(d):[];
 const choices=[];
 SLOTS.forEach(([from,to],slotIdx)=>[2,3].forEach(team=>{
  const slot=data[String(team)]?.find(x=>x.horario===from+"-"+to);
  const localBusy=old.some(x=>x.slot===slotIdx&&(![2,3].includes(Number(x.c?.obraEquipoInstalacion))||Number(x.c?.obraEquipoInstalacion)===team)&&x.c!==item.c);
  if(slot?.libre!==true||localBusy)return;
  const fit=slotRouteFit(item,d,team,slotIdx,data,old);
  if(!fit.ok)return;
  choices.push({date:d,time:from,to,team,rank:fit.category,label:fit.category===0?"Encaja con la siguiente obra":fit.category===1?"Completar localidad":"Jornada nueva",detail:fit.reason});
 }));
 return choices.sort((a,b)=>a.rank-b.rank||a.time.localeCompare(b.time)||a.team-b.team);
}
async function recommendDays(item,body){
 const panel=body.querySelector("#koc-recommendations");if(!panel)return;
 const ticket=++seq;panel.replaceChildren();e("p","koc-muted","Consultando agendas de los equipos 2 y 3…",panel);
 try{
  const days=[];let day=new Date(tomorrow()+"T12:00:00");
  while(days.length<7){const d=[day.getFullYear(),String(day.getMonth()+1).padStart(2,"0"),String(day.getDate()).padStart(2,"0")].join("-");if(day.getDay()!==0)days.push(d);day.setDate(day.getDate()+1);}
  // Peticiones concurrentes controladas; cualquier fallo deja las opciones sin verificar fuera de la lista.
  const results=await Promise.allSettled(days.map(d=>availableChoices(item,d)));
  if(ticket!==seq||view!=="calendar"||resolve()?.key!==item.key)return;
  const options=results.flatMap((r,i)=>r.status==="fulfilled"?r.value.map(v=>({...v,day:i})):[])
   .sort((a,b)=>a.day-b.day||a.rank-b.rank||a.time.localeCompare(b.time)).slice(0,8);
  panel.replaceChildren();
  if(!options.length){e("p","koc-muted","No hay propuestas verificadas para los próximos siete días. Prueba otra fecha manualmente.",panel);return;}
  options.forEach(o=>{
   const b=button(o.label+" · "+o.date+" · "+o.time+" · Equipo "+o.team,()=>{
    chosenDate=o.date;selectedSlot="";selectedTeam=0;
    const picker=body.querySelector('input[type="date"]');if(picker)picker.value=o.date;
    const board=body.querySelector(".koc-slots"),info=body.querySelector(".koc-slots + .koc-muted");
    if(board&&info)loadSlots(board,info,{time:o.time,team:o.team});
   },"koc-suggestion");
   e("small","",o.detail,b);panel.append(b);
  });
  const failures=results.filter(r=>r.status==="rejected").length;
  if(failures)e("p","koc-muted",failures+" días no se pudieron verificar y no se han recomendado.",panel);
 }catch(err){if(ticket===seq){panel.replaceChildren();e("p","koc-error","No se pudo calcular el plan: "+(err.message||"Error"),panel);}}
}
async function loadSlots(board,info,preferred=null){
 const ticket=++seq;board.replaceChildren();selectedSlot="";selectedTeam=0;
 const next=document.getElementById("koc-continue");if(next)next.disabled=true;
 const d=chosenDate;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||d<tomorrow()||new Date(d+"T12:00:00").getDay()===0){info.textContent="Selecciona una fecha futura de lunes a sábado.";return;}
 info.textContent="Consultando disponibilidad real de KONSOR…";
 try{
  const item=resolve();if(!item)return;
  const options=await availableChoices(item,d);
  if(ticket!==seq||view!=="calendar")return;
  const ordered=preferred?options.sort((a,b)=>(a.time===preferred.time&&a.team===preferred.team?-1:0)-(b.time===preferred.time&&b.team===preferred.team?-1:0)):options;
  ordered.forEach(o=>{
   const b=button(o.time+"–"+o.to+" · Equipo "+o.team,()=>{
    selectedSlot=o.time;selectedTeam=o.team;
    board.querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));
    const confirm=document.getElementById("koc-continue");if(confirm)confirm.disabled=false;
   },"koc-slot");
   e("small","",o.label,b);board.append(b);
   if(preferred&&preferred.time===o.time&&preferred.team===o.team)b.click();
  });
  info.textContent=ordered.length?ordered.length+" franjas verificadas y ordenadas por proximidad; revisa el desplazamiento antes de confirmar.":"No hay equipos disponibles. Elige otro día.";
 }catch(err){if(ticket===seq)info.textContent="No se ha podido comprobar KONSOR: "+(err.message||"Error de conexión")+". No se puede reservar sin verificar.";}
}

async function saveCall(status){
 const row=resolve();if(!row||busy)return;busy=true;
 try{
  if(status==="ya_llamado"||status==="esperando_confirmacion"){
   if(typeof updateClientCallStatus!=="function")throw Error("No está disponible el registro de llamadas.");
   const ok=await updateClientCallStatus(row.zi,row.ci,status);if(ok!==true)throw Error("No se ha confirmado el guardado.");
  }else{
   const prev={...row.c},old=row.z._updatedAt;
   row.c.callStatus=status;row.c.statusChangedAt=Date.now();row.c.nextContactAt=null;row.c.callLog=[...(row.c.callLog||[]),{t:Date.now(),s:status,r:""}].slice(-20);
   row.z._updatedAt=Date.now();
   if(!await saveAndSync("comercial_custom_zones",savedZones)){Object.keys(row.c).forEach(k=>{if(!(k in prev))delete row.c[k];});Object.assign(row.c,prev);row.z._updatedAt=old;throw Error("El cambio no se ha guardado.");}
  }
  next();
 }catch(err){alert(err.message||"No se ha podido guardar la llamada.");}
 finally{busy=false;}
}
async function saveBooking(){
 const row=resolve();if(!row||busy)return;busy=true;draw();
 const {z,c}=row;
 try{
  if(typeof elegirEquipoInstaladorKonsor!=="function")throw Error("Falta la comprobación de instalaciones.");
  const remote=await consultarKonsorFecha(chosenDate);
  const local=typeof routeRecords==="function"?routeRecords(chosenDate,c):[];
  const index=SLOTS.findIndex(x=>x[0]===selectedSlot);
  const fit=slotRouteFit(row,chosenDate,selectedTeam,index,remote,local);
  if(!fit.ok)throw Error("No se puede confirmar esta ruta: "+fit.reason);
  const team=await elegirEquipoInstaladorKonsor(chosenDate,selectedSlot,selectedTeam,c);
  if(team!==selectedTeam)throw Error("El equipo seleccionado ya no está libre.");
  const draft={...c,obraStatus:"agendada",obraDate:chosenDate,obraTime:selectedSlot,obraEquipoInstalacion:team,whatsappObraEnviadoAt:null,callStatus:"citas",statusChangedAt:Date.now(),nextContactAt:null};
  if(draft.dni&&typeof isValidDni==="function"&&!isValidDni(draft.dni))throw Error("Revisa el DNI/NIE.");
  if(typeof ensureCrmUpload==="function"&&!ensureCrmUpload(draft,{date:z.dumpDate||z.date,town:z.town,comercial:z.comercial})){busy=false;draw();return;}
  const oldC={...c},oldZ=z._updatedAt;Object.assign(c,draft);z._updatedAt=Date.now();
  if(!await saveAndSync("comercial_custom_zones",savedZones)){Object.keys(c).forEach(k=>{if(!(k in oldC))delete c[k];});Object.assign(c,oldC);z._updatedAt=oldZ;throw Error("No se ha confirmado el guardado de la obra.");}
  if(typeof logActivity==="function")logActivity("cita","Obra agendada: "+c.name+" · "+z.town+" · "+chosenDate+" "+selectedSlot,z.comercial);
  view="whatsapp";draw();
 }catch(err){alert(err.message||"No se pudo agendar. La cita no se ha confirmado.");view="calendar";draw();}
 finally{busy=false;}
}
function normalizePhone(p){let d=String(p||"").replace(/\D/g,"");if(d.startsWith("00"))d=d.slice(2);if(d.length===9)d="34"+d;return /^\d{10,15}$/.test(d)?d:"";}
function message(c,z){
 const date=c.obraDate?new Date(c.obraDate+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"por confirmar";
 const range=SLOTS.find(x=>x[0]===c.obraTime);
 const area=Number(String(c.m2||"").replace(",","."));
 const property=[c.street||"Dirección pendiente",z.town||"Navarra"].join(" · ");
 const details=[Number.isFinite(area)&&area>0?"Superficie estimada: "+area+" m²":null,
  /^\\d{4}$/.test(String(c.buildYear||""))?"Año de construcción indicado: "+c.buildYear:null].filter(Boolean).join("\\n");
 return "KONSOR ENERGÍA\\nConfirmación de instalación de aislamiento\\n\\n"+
  "Estimado/a "+(String(c.name||"cliente").trim())+":\\n"+
  "Te confirmamos la cita prevista para la vivienda situada en "+property+".\\n\\n"+
  (details?details+"\\n":"")+
  "Fecha: "+date+"\\n"+
  "Franja prevista: "+(range?range.join("–"):c.obraTime||"por confirmar")+"\\n\\n"+
  "Te recordamos que debes tener a mano tu DNI/NIE y las escrituras de la vivienda para acreditar la titularidad. "+
  "Debe haber una persona responsable en casa y acceso a la zona de trabajo.\\n\\n"+
  "Si necesitas modificar la cita, responde a este mensaje. Gracias por confiar en KONSOR Energía.";
}
async function markWhatsApp(){
 const row=resolve();if(!row||busy)return;busy=true;
 const old=row.c.whatsappObraEnviadoAt;row.c.whatsappObraEnviadoAt=Date.now();row.z._updatedAt=Date.now();
 if(!await saveAndSync("comercial_custom_zones",savedZones)){row.c.whatsappObraEnviadoAt=old;alert("No se pudo guardar el envío.");}draw();busy=false;
}
window.openCnCallQueue=function(){clusterFocus=null;clusterReturn=false;plannedChoice=null;scope=currentUserRole==="jefe"?"team":"mine";view="list";draw();};
window.openKonsorOfficeClients=window.openCnCallQueue;
})();