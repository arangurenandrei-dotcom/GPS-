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
function zoneStatus(z){return z.status==="completada"?"Terminado":z.status==="en_proceso"?"Haciendo":"Por hacer";}
function openZone(entry,mode){
 const {z,idx}=entry;
 document.querySelectorAll(".cnx-modal.active").forEach(m=>m.classList.remove("active"));
 if(mode==="map"&&typeof focusMapOnTownOrZone==="function")focusMapOnTownOrZone(z.town,idx);
 else if(typeof openDumpModal==="function")openDumpModal(idx);
}
function zoneCard(root,entry){
 const {z}=entry;
 const c=card(root,z.town||"Pueblo sin indicar",z.sectorName||"Sector");
 const line=$("div","cnx-meta",undefined,c);
 chip(line,zoneStatus(z));chip(line,z.date||"Sin fecha");chip(line,z.comercial||"Sin asignar");
 actions(c,b("Abrir ficha",()=>openZone(entry),"primary"),b("Ver mapa",()=>openZone(entry,"map"),"outline"));
}
function currentShift(){
 try{return typeof getTodayShift==="function"?getTodayShift(currentUserName):null;}
 catch(e){return null;}
}
function openDay(){
 const {body,close}=page("jornada","Mi jornada","Tu trabajo, ordenado por fecha y estado. Sin menús innecesarios.");
 const shift=currentShift();
 const status=card(body,"Estado de jornada",!shift?"Todavía no has iniciado el fichaje.":shift.status==="finished"?"Tu jornada está cerrada.":shift.status==="lunch"?"Estás en pausa de comida.":"Jornada en curso desde "+(shift.startTime||"la hora registrada")+".");
 if(!shift)actions(status,b("Iniciar jornada",()=>{document.getElementById("btnStartShift")?.click();setTimeout(openDay,450);},"primary"));
 else if(shift.status==="working")actions(status,b("Comida",()=>{document.getElementById("btnLunchShift")?.click();setTimeout(openDay,450);},"outline"),b("Finalizar",()=>{document.getElementById("btnEndShift")?.click();setTimeout(openDay,450);},"outline"));
 else if(shift.status==="lunch")actions(status,b("Reanudar",()=>{document.getElementById("btnLunchShift")?.click();setTimeout(openDay,450);},"primary"));
 const all=listZones().filter(({z})=>!z.isNoAptoZone&&!z.isSingleHouse&&!z.isHotMission&&z.status!=="completada");
 const today=typeof getTodayISO==="function"?getTodayISO():new Date().toISOString().slice(0,10);
 const overdue=all.filter(({z})=>z.date&&z.date<today);
 const scheduled=all.filter(({z})=>z.date===today);
 const future=all.filter(({z})=>!z.date||z.date>today);
 const k=$("div","cnx-metrics",undefined,body);
 metric(k,"Atrasados",overdue.length);metric(k,"Hoy",scheduled.length);metric(k,"Próximos",future.length);
 const display=(title,items)=>{$("h3","cnx-section",title,body);if(!items.length)$("p","cnx-empty","No hay sectores en este grupo.",body);else items.sort((a,b)=>(a.z.date||"9999").localeCompare(b.z.date||"9999")).slice(0,15).forEach(x=>zoneCard(body,x));};
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
      if(!c||(typeof isClientValidFilled==="function"&&!isClientValidFilled(c)))return;
      const hay=norm([c.name,c.phone,c.street,c.locality,z.town,z.sectorName].join(" "));
      if(query&& !hay.includes(norm(query)))return;
      records.push({c,z,idx,cidx});
    });
  }
  records.sort((a,b)=>(b.z.dumpDate||b.z.date||"").localeCompare(a.z.dumpDate||a.z.date||""));
  summary.textContent=records.length+" fichas encontradas"+(records.length>80?" · mostrando las primeras 80":"");
  if(!records.length){$("p","cnx-empty","No hay coincidencias. Prueba con otra parte del nombre, teléfono o dirección.",results);return;}
  for(const item of records.slice(0,80)){
    const {c,z,idx}=item;
    const row=card(results,c.name||c.street||"Ficha sin nombre",[c.street,z.town].filter(Boolean).join(" · "));
    const badges=$("div","cnx-meta",undefined,row);
    chip(badges,z.sectorName||"Sector");
    if(c.phone)chip(badges,c.phone);
    chip(badges,c.obraStatus==="no_apto"?"No apta":c.obraStatus==="agendada"?"Cita agendada":c.obraStatus==="realizada"?"Obra realizada":"Registrada");
    actions(row,b("Abrir ficha",()=>{close();openDumpModal(idx);},"primary"),b("Localizar",()=>{close();focusMapOnTownOrZone(z.town,idx);},"outline"));
  }
 }
 input.addEventListener("input",render);render();
 const foot=card(body,"Gestión completa","Para filtros avanzados, correcciones y estados individuales, utiliza las herramientas actuales hasta terminar su migración.");
 actions(foot,b("Gestión avanzada",()=>{close();openGlobalClientSearchModal();},"outline"));
}
function openCalls(){
 const {body,close}=page("llamadas","Llamadas y citas","Elige cómo organizar la siguiente tanda de contactos.");
 const zones=listZones().sort((a,b)=>(a.z.date||"9999").localeCompare(b.z.date||"9999"));
 const pending=[];
 zones.forEach(({z,idx})=>(z.clients||[]).forEach(c=>{
  if(c&&(c.name||c.phone||c.street)&&c.callStatus==="pendiente")pending.push({z,idx,c});
 }));
 const k=$("div","cnx-metrics",undefined,body);
 metric(k,"Pendientes",pending.length);
 metric(k,"Sectores",new Set(pending.map(x=>x.idx)).size);
 metric(k,"Pueblos",new Set(pending.map(x=>x.z.town).filter(Boolean)).size);
 const first=pending[0];
 const c=card(body,first?"Empezar por "+(first.z.town||"el primer pueblo"):"Organización de llamadas",first?"El sector más antiguo con llamadas pendientes es "+(first.z.sectorName||"Sin nombre")+".":"No hay fichas con estado pendiente de llamada en tu ámbito actual.");
 actions(c,b("Organizar llamadas por jornadas",()=>{close();openGroupedAppointments();},"primary"),
         b("Ver seguimiento",()=>{close();openFollowUpsModal();},"outline"));
 const info=card(body,"Sin perder pendientes","Los estados de espera, citas y recordatorios siguen gestionándose en el sistema actual. Aquí no se marca ninguna llamada como realizada automáticamente.");
 actions(info,b("Buscar un cliente",()=>{close();openClients();},"outline"));
}
window.openCnDay=openDay;
window.openCnClients=()=>{query="";scope="mine";openClients();};
window.openCnCalls=openCalls;
})();