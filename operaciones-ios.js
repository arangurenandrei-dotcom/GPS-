/* Comercial Navarra · Pantallas operativas iOS.
 * Lee el estado real y delega las escrituras a las funciones existentes.
 */
(function(){
"use strict";
const $=(tag,cls,txt,parent)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);if(parent)parent.appendChild(n);return n;};
const b=(txt,fn,kind)=>{const n=$("button","cnx-btn "+(kind||""),txt);n.type="button";n.addEventListener("click",fn);return n;};
const norm=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").trim();
const isTeam=z=>typeof isMikelTeamMember==="function"&&isMikelTeamMember(z.comercial)===isMikelTeamMember(currentUserName);
const listZones=()=>Array.isArray(savedZones)?savedZones.map((z,idx)=>({z,idx})).filter(({z})=>z&&isTeam(z)&&(currentUserRole==="jefe"||z.comercial===currentUserName)):[];
function page(type,title,subtitle){
 let overlay=document.getElementById("cnx-"+type);
 if(!overlay){
  overlay=$("div","modal-overlay cnx-modal");overlay.id="cnx-"+type;overlay.style.zIndex="10136";
  const surface=$("div","cnx-page",undefined,overlay);
  const head=$("div","cnx-head",undefined,surface);
  const heading=$("div","",undefined,head);
  $("span","cnx-eyebrow","COMERCIAL NAVARRA",heading);
  $("h2","",title,heading);
  const close=b("Cerrar",()=>overlay.classList.remove("active"),"subtle");head.appendChild(close);
  $("div","cnx-body",undefined,surface);
  overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.classList.remove("active");});
  document.body.appendChild(overlay);
 }
 overlay.querySelector("h2").textContent=title;
 const body=overlay.querySelector(".cnx-body");body.replaceChildren();
 if(subtitle)$("p","cnx-intro",subtitle,body);
 overlay.classList.add("active");
 return {body,close:()=>overlay.classList.remove("active")};
}
function card(body,heading,detail){
 const root=$("section","cnx-card",undefined,body);
 if(heading)$("h3","",heading,root);
 if(detail)$("p","",detail,root);
 return root;
}
function metric(root,label,value){
 const m=$("div","cnx-metric",undefined,root);
 $("strong","",value,m);$("span","",label,m);
}
function chip(root,text){return $("span","cnx-chip",text,root);}
function actions(root,...buttons){const row=$("div","cnx-actions",undefined,root);row.append(...buttons);}
function streetDone(z){return Number(z.streetCompletedAt)>0 || z.status==="completada";}
function needsDump(z){return streetDone(z)&&!z.dumpDate&&z.status!=="completada";}
function zoneStatus(z){return z.status==="completada"?"Volcado terminado":needsDump(z)?"Calle terminada · Volcado pendiente":z.status==="en_proceso"?"Calle en curso":"Por hacer";}
async function markStreetDone(entry){
 const original=entry.z;
 if(currentUserName!==original.comercial||currentUserRole==="jefe"&&original.comercial!==currentUserName)throw Error("Solo el comercial responsable puede cerrar el trabajo de calle.");
 if(original.status==="completada"||original.streetCompletedAt)return;
 if(!window.KonsorBridge||window.KonsorBridge.busy)throw Error("Sin conexión de guardado disponible. Inténtalo de nuevo.");
 const candidate=JSON.parse(JSON.stringify(savedZones));
 const target=candidate.find(z=>String(z.id)===String(original.id));
 if(!target||target.comercial!==currentUserName)throw Error("La asignación ha cambiado. Actualiza el listado.");
 target.streetCompletedAt=Date.now();
 target.streetCompletedBy=currentUserName;
 // No marcar el sector completado hasta que se confirmen y guarden las fichas.
 await window.KonsorBridge.save("comercial_custom_zones",candidate);
 savedZones=candidate;
 window.cnvRefreshHome?.();
 window.refreshCnTerritory?.();
}
function openZone(entry,mode){
 const {z,idx}=entry;
 document.querySelectorAll(".cnx-modal.active").forEach(m=>m.classList.remove("active"));
 if(mode==="map"&&typeof focusMapOnTownOrZone==="function")focusMapOnTownOrZone(z.town,idx);
 else if(typeof openDumpModal==="function")openDumpModal(idx);
}
function nextWork(items){return items.slice().sort((a,b)=>{
 const now=typeof getTodayISO==="function"?getTodayISO():new Date().toISOString().slice(0,10);
 const rank=z=>z.date&&z.date<now?0:z.date===now?1:2;
 return rank(a.z)-rank(b.z)||(a.z.date||"9999").localeCompare(b.z.date||"9999");
 });}
function driveTo(entry){
 const {z,idx}=entry;
 const pts=Array.isArray(z.points)?z.points.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)):[];
 if(!pts.length){openZone(entry,"map");return;}
 const lat=pts.reduce((n,p)=>n+p[0],0)/pts.length,lon=pts.reduce((n,p)=>n+p[1],0)/pts.length;
 const coord=lat.toFixed(6)+","+lon.toFixed(6);
 const apple=/iPhone|iPad|iPod/i.test(navigator.userAgent);
 const url=apple?"https://maps.apple.com/?daddr="+encodeURIComponent(coord)+"&dirflg=d":"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(coord)+"&travelmode=driving";
 window.open(url,"_blank","noopener,noreferrer");
}
function zoneCard(root,entry){
 const {z}=entry;
 const c=card(root,z.town||"Pueblo sin indicar",z.sectorName||"Sector");
 if(z.isHotMission){$("p","cnx-intro","Prioridad especial · obras en curso en la zona",c);if(z.bossNote)$("p","cnx-intro",z.bossNote,c);}
 const line=$("div","cnx-meta",undefined,c);
 chip(line,zoneStatus(z));chip(line,z.date||"Sin fecha");chip(line,z.comercial||"Sin asignar");
 if(needsDump(z)){
  actions(c,b("Volcar datos pendientes",()=>openZone(entry),"primary"),b("Ver mapa",()=>openZone(entry,"map"),"outline"));
 }else if(z.status==="completada"){
  actions(c,b("Revisar volcado",()=>openZone(entry),"outline"));
 }else{
  actions(c,b("Ir · Navegación",()=>driveTo(entry),"primary"),b("Ver zona y catastro",()=>openZone(entry,"map"),"outline"));
  if(z.comercial===currentUserName){
   const finish=b("Terminar calle · Volcar después",async()=>{if(!confirm("¿Confirmas que has terminado las visitas de este sector? Después quedará pendiente el volcado de datos."))return;finish.disabled=true;
    try{await markStreetDone(entry);openDay();}catch(e){alert("No se ha confirmado el guardado: "+(e.message||e));finish.disabled=false;}
   },"outline");
   actions(c,finish);
  }
 }
 if(z.comercial===currentUserName&&z.status!=="completada"&&!z.assignmentReceivedAt){
  const receipt=b("He recibido esta zona",async()=>{
   receipt.disabled=true;try{
    await window.konsorZoneAssignment.acknowledge(z.id);
    openDay();
   }catch(error){alert("No se ha guardado la recepción: "+(error.message||error));receipt.disabled=false;}
  },"outline");
  actions(c,receipt);
 }else if(z.assignmentReceivedAt&&z.assignmentReceivedBy===z.comercial){
  $("p","cnx-meta","Asignación recibida por "+z.assignmentReceivedBy,c);
 }
}
function currentShift(){
 try{return typeof getTodayShift==="function"?getTodayShift(currentUserName):null;}
 catch(e){return null;}
}
function openDay(){
 const {body,close}=page("jornada","Mi jornada","Tu trabajo, ordenado por fecha y estado. Sin menús innecesarios.");
 const shift=currentShift();
 const status=card(body,"Estado de jornada",!shift?"Todavía no has iniciado el fichaje.":shift.status==="finished"?"Tu jornada está cerrada.":shift.status==="lunch"?"Estás en pausa de comida.":"Jornada en curso desde "+(shift.startTime||"la hora registrada")+".");
 if(!shift)actions(status,b("Iniciar jornada",async()=>{if(typeof handleShiftAction==="function"&&await handleShiftAction("start"))openDay();},"primary"));
 else if(shift.status==="working")actions(status,b("Comida",async()=>{if(typeof handleShiftAction==="function"&&await handleShiftAction("lunch"))openDay();},"outline"),b("Finalizar",async()=>{if(typeof handleShiftAction==="function"&&await handleShiftAction("end"))openDay();},"outline"));
 else if(shift.status==="lunch")actions(status,b("Reanudar",async()=>{if(typeof handleShiftAction==="function"&&await handleShiftAction("lunch"))openDay();},"primary"));
 const all=listZones().filter(({z})=>!z.isNoAptoZone&&!z.isSingleHouse&&z.status!=="completada"&&z.comercial===currentUserName);
 const dumpPending=all.filter(({z})=>needsDump(z));
 const streetPending=all.filter(({z})=>!needsDump(z));
 const today=typeof getTodayISO==="function"?getTodayISO():new Date().toISOString().slice(0,10);
 const overdue=streetPending.filter(({z})=>z.date&&z.date<today);
 const scheduled=streetPending.filter(({z})=>z.date===today).sort((a,b)=>Number(!!b.z.isHotMission)-Number(!!a.z.isHotMission));
 const future=streetPending.filter(({z})=>!z.date||z.date>today);
 const k=$("div","cnx-metrics",undefined,body);
 metric(k,"Atrasados",overdue.length);metric(k,"Hoy",scheduled.length);metric(k,"Por volcar",dumpPending.length);
 const display=(title,items)=>{$("h3","cnx-section",title,body);if(!items.length)$("p","cnx-empty","No hay sectores en este grupo.",body);else items.slice().sort((a,b)=>(a.z.date||"9999").localeCompare(b.z.date||"9999")).slice(0,15).forEach(x=>zoneCard(body,x));};
 if(dumpPending.length){
  const officeCard=card(body,"Calle terminada · Datos pendientes",dumpPending.length+" sector(es) por volcar. Puedes hacerlo al regresar a casa.");
  actions(officeCard,b("Volcar ahora",()=>openZone(dumpPending[0]),"primary"),b("Ver Oficina",()=>{close();window.openCnOffice?.();},"outline"));
 }
 const priority=nextWork([...overdue,...scheduled,...future])[0];
 if(priority){
  const current=card(body,"Tu siguiente sector",[priority.z.town||"Localidad",priority.z.sectorName||"Sector",priority.z.date||"Sin fecha"].join(" · "));
  if(priority.z.date&&priority.z.date<today) $("p","cnx-intro","Este sector estaba pendiente de un día anterior. Priorízalo antes de comenzar uno nuevo.",current);
  actions(current,b("Ir al sector",()=>driveTo(priority),"primary"),b("Abrir mapa de calle",()=>openZone(priority,"map"),"outline"),b("Volcar datos",()=>openZone(priority),"outline"));
 }
 display("Pendientes anteriores",overdue);display("Planificados para hoy",scheduled);display("Próximos",future);
 const foot=card(body,"Al regresar","Cuando termines el trabajo de calle, entra en Oficina para revisar fichas y organizar llamadas.");
 actions(foot,b("Abrir Oficina",()=>{close();window.openCnOffice?.();},"primary"));
}
let query="",scope="mine";
function openClients(){
 const {body,close}=page("clientes","Buscar clientes","Busca por nombre, teléfono, calle, localidad o sector. Los resultados se consultan directamente.");
 const bar=$("div","cnx-searchbox",undefined,body);
 const input=$("input","cnx-search",undefined,bar);input.type="search";input.placeholder="Nombre, teléfono, calle o pueblo";input.value=query;
 if(currentUserRole==="jefe"){
  const scopeRow=$("div","cnx-switch",undefined,body);
  [["mine","Mis clientes"],["team","Mi equipo"]].forEach(([key,label])=>{const x=b(label,()=>{scope=key;openClients();},key===scope?"selected":"");scopeRow.appendChild(x);});
 }
 const summary=$("p","cnx-count",undefined,body),results=$("div","cnx-results",undefined,body);
 function render(){
  query=input.value;results.replaceChildren();
  let records=[];
  for(const item of listZones()){
    const {z,idx}=item;
    if(scope==="mine"&&z.comercial!==currentUserName)continue;
    (z.clients||[]).forEach((c,cidx)=>{
      if(!c||![c.name,c.phone,c.street].some(x=>String(x||"").trim()))return;
      const hay=norm([c.name,c.phone,c.street,c.locality,z.town,z.sectorName].join(" "));
      if(query&& !hay.includes(norm(query)))return;
      records.push({c,z,idx,cidx});
    });
  }
  records.sort((a,b)=>Number(!(b.c.name&&b.c.phone&&b.c.street))-Number(!(a.c.name&&a.c.phone&&a.c.street))||(b.z.dumpDate||b.z.date||"").localeCompare(a.z.dumpDate||a.z.date||""));
  summary.textContent=records.length+" fichas encontradas"+(records.length>80?" · mostrando las primeras 80":"");
  if(!records.length){$("p","cnx-empty","No hay coincidencias. Prueba con otra parte del nombre, teléfono o dirección.",results);return;}
  for(const item of records.slice(0,80)){
    const {c,z,idx}=item;
    const row=card(results,c.name||c.street||"Ficha sin nombre",[c.street,z.town].filter(Boolean).join(" · "));
    const badges=$("div","cnx-meta",undefined,row);
    chip(badges,z.sectorName||"Sector");
    if(c.phone)chip(badges,c.phone);
    const missing=[!c.name?"nombre":null,!c.street?"calle":null,!c.phone?"teléfono":null].filter(Boolean);
    if(missing.length)chip(badges,"Faltan: "+missing.join(", "));
    chip(badges,c.obraStatus==="no_apto"?"No apta":c.obraStatus==="agendada"?"Cita agendada":c.obraStatus==="realizada"?"Obra realizada":"Registrada");
    actions(row,b(missing.length?"Completar ficha":"Abrir ficha",()=>{close();openDumpModal(idx);},"primary"),b("Localizar",()=>{close();focusMapOnTownOrZone(z.town,idx);},"outline"));
  }
 }
 input.addEventListener("input",render);render();

}
function openCalls(){
 if(typeof isMikelTeamMember==="function"&&isMikelTeamMember(currentUserName)){if(typeof openFollowUpsModal==="function")openFollowUpsModal();return;}
 if(typeof window.openCnOffice==="function")window.openCnOffice();
}
window.openCnDay=openDay;
window.openCnClients=()=>{query="";scope="mine";openClients();};
window.openCnCalls=openCalls;
})();