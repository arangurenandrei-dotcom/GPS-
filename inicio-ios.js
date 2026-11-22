/* Comercial Navarra — Inicio independiente y Mapa de calle.
   Navegación visual: los datos y las operaciones siguen en el motor existente. */
(function(){
"use strict";
const el=(tag,cl,txt,parent)=>{
 const o=document.createElement(tag);if(cl)o.className=cl;if(txt!==undefined)o.textContent=String(txt);
 if(parent)parent.append(o);return o;
};
const btn=(txt,fn,cl)=>{const b=el("button","cnv-button "+(cl||""),txt);b.type="button";b.addEventListener("click",fn);return b;};
const icons={
 map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15h3"/>',
 office:'<path d="M3 21V7l9-4 9 4v14M9 21v-6h6v6"/>',
 clients:'<circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2M4 3h16"/>',
 results:'<path d="M3 20h18M6 16V9M12 16V4M18 16v-5"/>',
 direction:'<path d="M3 20h18M6 20V9l6-5 6 5v11M9 20v-6h6v6"/>',
 calls:'<path d="M6 3h4l1 5-2 2a15 15 0 0 0 5 5l2-2 5 1v4a3 3 0 0 1-3 3C9 21 3 15 3 6a3 3 0 0 1 3-3Z"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
 ruler:'<path d="m21 7-4-4L3 17l4 4L21 7zM14 6l4 4M11 9l3 3M8 12l3 3"/>',
 gps:'<circle cx="12" cy="12" r="7"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2"/>'
};
const icon=(name)=>{
 const box=el("span","cnv-icon");
 box.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.map)+'</svg>';
 return box;
};
let screen="home";
let mapBar=null;
function me(){return typeof currentUserName==="string"?currentUserName:"";}
function boss(){return typeof currentUserRole!=="undefined"&&currentUserRole==="jefe";}
function andrei(){return me()==="Andrei (Jefe)";}
function hasSession(){return Boolean(me()&&document.getElementById("appContainer")?.style.display!=="none");}
function myZones(){
 if(typeof savedZones==="undefined"||!Array.isArray(savedZones))return [];
 return savedZones.filter(z=>z&&z.comercial===me()&&!z.isNoAptoZone&&!z.isHotMission&&!z.isSingleHouse);
}
function info(){
 const zones=myZones(),today=typeof getTodayISO==="function"?getTodayISO():new Date().toISOString().slice(0,10);
 const open=zones.filter(z=>z.precheck?.sectorStatus!=="no_apto"&&z.status!=="completada"&&!z.streetCompletedAt);
 const waitingDump=zones.filter(z=>z.precheck?.sectorStatus!=="no_apto"&&z.status!=="completada"&&z.streetCompletedAt&&!z.dumpDate).length;
 const todayCount=open.filter(z=>z.date===today).length;
 const old=open.filter(z=>z.date&&z.date<today).length;
 const next=open.filter(z=>!z.date||z.date>today).length;
 const shift=typeof getTodayShift==="function"?getTodayShift(me()):null;
 return {todayCount,old,next,shift,waitingDump};
}
function root(){
 let root=document.getElementById("cnvHome");
 if(root)return root;
 root=el("main","cnv-home",undefined,document.body);root.id="cnvHome";root.setAttribute("aria-label","Inicio Comercial Navarra");
 return root;
}
function tile(grid,label,detail,name,fn){
 const card=btn("",fn,"cnv-tile");
 card.append(icon(name));
 const wrap=el("span","cnv-tile-labels",undefined,card);
 el("strong","",label,wrap);el("small","",detail,wrap);
 grid.append(card);
}
function go(fn){return ()=>{if(typeof fn==="function")fn();};}
function openDay(){if(window.konsorMotor?.openDay)window.konsorMotor.openDay();else window.openCnDay?.();}
function openOffice(){if(window.konsorMotor?.openOffice)window.konsorMotor.openOffice();else window.openCnOffice?.();}
function greeting(){
 const h=new Date().getHours();
 return h<13?"Buenos días":h<21?"Buenas tardes":"Buenas noches";
}
function nextAction(data){
 const engine=window.KonsorOperativo;
 if(!engine||typeof engine.recommend!=='function')
   throw Error('El asistente operativo de KONSOR no se ha cargado correctamente.');
 const recommendation=engine.recommend('comercial',data);
 if(!recommendation)throw Error('No se ha podido preparar la siguiente acción.');
 const actions={
  'jornada.reanudar':openDay,
  'jornada.sector':openDay,
  'jornada.iniciar':openDay,
  'oficina.volcados':openOffice,
  'resultados.consultar':()=>window.openCnResults?.()
 };
 const action=actions[recommendation.id];
 if(!action)throw Error('Acción desconocida: '+recommendation.id);
 return {title:recommendation.title,description:recommendation.description,
  button:recommendation.button,icon:recommendation.icon,action};
}
function showHome(){
 if(!hasSession())return;
 screen="home";window.cnvStopLiveGps?.();document.body.classList.remove("cnv-map-active");document.body.classList.add("cnv-home-active");
 const home=root();home.replaceChildren();
 const data=info(),next=nextAction(data);
 const top=el("header","cnv-home-head",undefined,home);
 const brand=el("div","cnv-home-brand",undefined,top);
 const symbol=el("div","cnv-brand-mark","K",brand);symbol.setAttribute("aria-hidden","true");
 const brandText=el("div","cnv-brand-text",undefined,brand);
 el("strong","","KONSOR",brandText);el("small","","ESPACIO DE TRABAJO",brandText);
 const topActions=el("div","cnv-home-top-actions",undefined,top);
 const alerts=btn("",()=>window.openNotificationsCenterV2?.(),"cnv-glass cnv-icon-action");alerts.append(icon("calendar"));alerts.title="Avisos";alerts.setAttribute("aria-label","Abrir avisos");topActions.append(alerts);
 const settings=btn("",()=>openUserProfileModal(),"cnv-glass cnv-icon-action");settings.append(icon("settings"));settings.title="Ajustes";settings.setAttribute("aria-label","Abrir ajustes");topActions.append(settings);
 const section=el("section","cnv-home-content",undefined,home);
 const welcome=el("div","cnv-home-welcome",undefined,section);
 el("span","cnv-eyebrow",boss()?"PANEL DE RESPONSABLE":"MI ESPACIO",welcome);
 el("h1","",greeting(),welcome);
 el("p","",getDisplayAlias(me()),welcome);
 const hero=el("section","cnv-home-hero",undefined,section);
 const iconBox=el("span","cnv-home-hero-icon",undefined,hero);iconBox.append(icon(next.icon));
 const heroText=el("div","cnv-home-hero-content",undefined,hero);
 el("span","cnv-hero-eyebrow","SIGUIENTE PASO RECOMENDADO",heroText);
 el("h2","",next.title,heroText);
 el("p","",next.description,heroText);
 const heroButton=btn(next.button,next.action,"cnv-home-primary");heroButton.append(el("span","", "→"));hero.append(heroButton);
 const caption=el("div","cnv-group-label",undefined,section);
 el("strong","","TU TRABAJO",caption);el("span","","Accesos principales",caption);
 const grid=el("div","cnv-home-grid",undefined,section);
 tile(grid,"Mi jornada","Ruta, actividad y fichaje","calendar",openDay);
 tile(grid,"Mapa","Satélite, GPS y Catastro","map",()=>showMap(true));
 tile(grid,"Oficina","Volcados, llamadas y citas","office",openOffice);
 tile(grid,"Resultados","Tu progreso y clasificación","results",()=>window.openCnResults?.());
 if(boss()){
  const director=el("section","cnv-home-management",undefined,section);
  const t=el("div","cnv-home-management-copy",undefined,director);
  el("span","cnv-eyebrow","GESTIÓN DEL EQUIPO",t);
  el("strong","","Dirección",t);
  el("p","","Planificación, territorio, supervisión y análisis.",t);
  const access=btn("Abrir dirección",()=>andrei()?window.openKonsorDirection?.():window.konsorPlanificador?.open?.(),"cnv-home-management-button");
  director.append(access);
 }
 const footer=el("div","cnv-home-footer",undefined,section);
 el("span","","KONSOR",footer);
 el("span","","Los cambios se confirman al guardarse en el servidor.",footer);
}
/* Pregunta de entrada: no inicia la jornada por sí sola ni reaparece tras cerrar
   o si hoy ya existe un fichaje, incluido uno finalizado. */
let startPromptPending=false;
function maybePromptStartShift(){
 if(startPromptPending||!hasSession())return;
 const date=typeof getTodayISO==="function"?getTodayISO():new Date().toLocaleDateString("en-CA");
 const userKey=(sessionStorage.getItem("auth_user_key")||me()).replace(/[^a-zA-Z0-9_-]/g,"_");
 const dismissedKey="konsor_start_prompt_dismissed_"+userKey+"_"+date;
 if(localStorage.getItem(dismissedKey)==="1")return;
 if(info().shift)return;
 startPromptPending=true;
 window.setTimeout(()=>{
  startPromptPending=false;
  if(!hasSession()||info().shift||localStorage.getItem(dismissedKey)==="1")return;
  const veil=el("div","cnv-start-overlay",undefined,document.body);
  veil.id="cnvStartPrompt";
  veil.setAttribute("role","dialog");veil.setAttribute("aria-modal","true");
  veil.setAttribute("aria-label","Confirmar inicio de jornada");
  const card=el("section","cnv-start-card",undefined,veil);
  const top=el("div","cnv-start-top",undefined,card);
  el("span","cnv-eyebrow","KONSOR · JORNADA",top);
  const done=()=>{
   localStorage.setItem(dismissedKey,"1");
   veil.remove();
  };
  const x=btn("×",done,"cnv-start-close");x.setAttribute("aria-label","Cerrar aviso");
  top.append(x);
  el("h2","","¿Vas a empezar a trabajar?",card);
  el("p","","Si vas a iniciar tu jornada, registra tu entrada. Si solo quieres consultar KONSOR, puedes cerrar este aviso.",card);
  const actions=el("div","cnv-start-actions",undefined,card);
  const start=btn("Iniciar jornada",async()=>{
   if(info().shift){done();return;}
   if(typeof handleShiftAction!=="function"){alert("El registro de jornada no está disponible.");return;}
   start.disabled=true;
   try{
    const success=await handleShiftAction("start");
    if(success){done();window.cnvRefreshHome?.();}
    else start.disabled=false;
   }catch(error){start.disabled=false;alert("No se ha confirmado el inicio: "+(error?.message||error));}
  },"cnv-dark");
  actions.append(start,btn("Ahora no",done,"cnv-glass"));
  const styleId="cnv-start-prompt-css";
  if(!document.getElementById(styleId)){
   const style=document.createElement("style");style.id=styleId;
   style.textContent=".cnv-start-overlay{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(23,37,56,.30);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}.cnv-start-card{width:min(100%,430px);border:1px solid #e5eaf1;border-radius:25px;background:#f8fafc;color:#27374a;padding:24px;box-shadow:0 20px 70px #14213440;box-sizing:border-box}.cnv-start-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.cnv-start-close{width:36px!important;height:36px!important;border-radius:50%!important;background:#ecf0f5!important;color:#354860!important;border:1px solid #e0e6ee!important;padding:0!important;font-size:24px!important}.cnv-start-card h2{font-size:23px;line-height:1.18;letter-spacing:-.5px;margin:13px 0 9px;color:#233449}.cnv-start-card p{font-size:13px;color:#758397;line-height:1.5;margin:0 0 17px}.cnv-start-actions{display:flex;flex-direction:column;gap:9px}.cnv-start-actions button{min-height:47px!important;border-radius:14px!important;font-size:14px!important}.cnv-start-actions .cnv-dark{background:#273b53!important;color:#fff!important}.cnv-start-actions .cnv-glass{background:#edf1f6!important;color:#3a4c63!important}";
   document.head.append(style);
  }
 },700);
}

function makeMapBar(){
 if(mapBar)return mapBar;
 mapBar=el("nav","cnv-map-toolbar",undefined,document.body);
 mapBar.id="cnvMapToolbar";mapBar.setAttribute("aria-label","Herramientas del mapa");
 const head=el("div","cnv-map-head",undefined,mapBar);
 head.append(btn("Inicio",()=>showHome(),"cnv-glass"));
 const t=el("div","",undefined,head);el("strong","","Mapa de trabajo",t);el("small","","Catastro · Satélite · Sectores",t);
 const searchRow=el("form","cnv-map-search",undefined,mapBar);
 const townInput=el("input","",undefined,searchRow);townInput.type="search";townInput.placeholder="Buscar pueblo o dirección";
 townInput.setAttribute("aria-label","Buscar lugar en el mapa");
 searchRow.append(btn("Buscar",()=>{
  const term=townInput.value.trim();if(!term)return;
  const original=document.getElementById("searchInput");
  if(original)original.value=term;
  if(typeof searchLocation==="function")searchLocation();
 },"cnv-glass"));
 searchRow.addEventListener("submit",e=>{
  e.preventDefault();
  const term=townInput.value.trim();if(!term)return;
  const original=document.getElementById("searchInput");if(original)original.value=term;
  if(typeof searchLocation==="function")searchLocation();
 });
 const oldDropdown=document.getElementById("searchCandidatesDropdown");
 if(oldDropdown)mapBar.appendChild(oldDropdown);
 const controls=el("div","cnv-map-controls",undefined,mapBar);
 // Cuatro controles estables. Las opciones de organización permanecen en Dirección.
 const controlsLabel=el("span","cnv-sr-only","Catastro, medir, norte y ubicación",controls);
 const tools=[
  ["layers","Catastro",()=>{
   const active=typeof isCatastroActive!=="undefined"&&isCatastroActive;
   if(typeof setMapDisplay==="function")setMapDisplay(active?"satellite":"both");
   refreshTools();
  }],
  ["ruler","Medir",()=>{if(typeof startRoofMeasureMode==="function")startRoofMeasureMode()}],
  ["map","Norte",()=>{if(typeof resetMapNorth==="function")resetMapNorth()}],
  ["gps","Mi ubicación",()=>{window.cnvFollowGps?.(true);if(typeof centerOnUser==="function")centerOnUser()}]
 ];
 for(const [name,label,fn] of tools){
  const b=btn("",fn,"cnv-map-tool");b.dataset.tool=label;b.title=label;b.setAttribute("aria-label",label);
  b.append(icon(name));controls.append(b);
 }
 function refreshTools(){
  const active=typeof isCatastroActive!=="undefined"&&isCatastroActive;
  const button=controls.querySelector('[data-tool="Catastro"]');
  if(button){button.classList.toggle("is-active",active);button.setAttribute("aria-pressed",String(active));}
 }
 window.cnvRefreshMapControls=refreshTools;
 refreshTools();
 const draw=el("section","cnv-drawing-panel",undefined,mapBar);
 draw.id="cnvDrawingPanel";
 const status=el("div","cnv-drawing-status",undefined,draw);
 el("strong","cnv-drawing-title","Dibujando",status);
 el("span","cnv-drawing-details","Marca al menos tres esquinas",status);
 const row=el("div","cnv-drawing-buttons",undefined,draw);
 const finish=btn("Confirmar",()=>{
   const legacy=document.getElementById("btnConfirmSectorPoly");
   if(legacy&&typeof legacy.onclick==="function")legacy.click();
   else if(typeof finishSectorDrawing==="function")finishSectorDrawing();
 },"cnv-dark");
 finish.id="cnvDrawingFinish";finish.disabled=true;
 row.append(finish,btn("Cancelar",()=>{if(typeof cancelDrawing==="function")cancelDrawing();},"cnv-glass"));
 el("p","cnv-map-tip","Toca una parcela para consultar Catastro. Para medir, marca las esquinas del tejado.",mapBar).id="cnvMapInstruction";
 return mapBar;
}
function showMap(followGps=false){
 if(!hasSession())return;
 screen="map";
 window.cnvFollowGps?.(followGps === true);
 document.body.classList.remove("cnv-home-active");document.body.classList.add("cnv-map-active");
 makeMapBar();
 window.cnvStartLiveGps?.();
 if(typeof map!=="undefined"&&map&&typeof map.invalidateSize==="function"){
  requestAnimationFrame(()=>map.invalidateSize());
 }
}
function start(){
 if(!hasSession())return;
 showHome();
 maybePromptStartShift();
}
window.cnvMapDrawingState=function(state){
 const bar=makeMapBar(),panel=bar.querySelector("#cnvDrawingPanel");
 if(!panel)return;
 const active=!!state?.mode;
 panel.classList.toggle("active",active);
 if(!active)return;
 const name=state.mode==="roof"?"Medir tejado":state.mode==="town"?"Delimitar pueblo":state.mode==="sector"?"Crear sector":"Delimitar zona";
 const title=panel.querySelector(".cnv-drawing-title");
 const details=panel.querySelector(".cnv-drawing-details");
 const finish=panel.querySelector("#cnvDrawingFinish");
 const points=Number(state.points)||0;
 title.textContent=name;
 details.textContent=points<3?"Esquinas: "+points+" de 3 necesarias":state.mode==="roof"?"Superficie aproximada: "+(Number(state.m2)||0)+" m² · "+points+" esquinas":points+" esquinas seleccionadas · listo para confirmar";
 finish.textContent=state.mode==="roof"?"Ver resultado":state.mode==="town"?"Guardar pueblo":state.mode==="sector"?"Continuar · Asignar":"Confirmar zona";
 finish.disabled=points<3;
};
window.cnvRefreshHome=function(){if(document.body.classList.contains("cnv-home-active"))showHome();};
window.cnvShowHome=showHome;
window.cnvShowMap=showMap;
window.cnvStart=start;

/* Acceso y ayuda comparten los mismos patrones visuales y mensajes seguros. */
function syncAuthMode(){
 const screen=document.getElementById("loginScreen");
 const heading=document.getElementById("authHeading");
 if(!screen||!heading)return;
 const registering=heading.textContent.trim()==="Crear cuenta";
 screen.classList.toggle("cnv-register-mode",registering);
}
function installAuthAndHelp(){
 syncAuthMode();
 const authHeading=document.getElementById("authHeading");
 if(authHeading)new MutationObserver(syncAuthMode).observe(authHeading,{childList:true,characterData:true,subtree:true});

 const openLegacyGuide=window.openHelpGuide;
 if(typeof openLegacyGuide==="function")window.openHelpGuide=function(){
  openLegacyGuide();
  const modal=document.getElementById("helpGuideModal");
  if(!modal)return;
  modal.classList.add("cnv-help-guide");
  modal.innerHTML=`<div class="modal-card cnv-help-card">
   <header class="cnv-help-head"><div><span>AYUDA KONSOR</span><h2>Guía de uso</h2></div>
    <button type="button" aria-label="Cerrar guía" onclick="closeModal('helpGuideModal')">×</button></header>
   <div class="modal-scrollable-content cnv-help-body">
    <p class="cnv-help-intro">Sigue el recorrido de tu rol. Si una opción no aparece, consulta con tu responsable.</p>
    <details open><summary>1. Acceso y permisos</summary><p>Entra con el correo y la contraseña de tu cuenta aprobada. Las solicitudes nuevas quedan pendientes hasta que las apruebe un administrador. Tu cuenta solo debe mostrar las herramientas de su rol y equipo.</p></details>
    <details><summary>2. Trabajo de calle</summary><p>En <strong>Mi jornada</strong>, revisa la asignación, registra el inicio y las pausas, y trabaja la zona indicada. Guarda el resultado del día desde el flujo de volcado antes de cerrar la jornada.</p></details>
    <details><summary>3. Mapa y territorio</summary><p>En <strong>Mapa</strong> puedes buscar lugares, consultar la capa pública del Catastro y medir superficies. La creación o asignación de territorio depende de tu rol. Confirma el resultado antes de salir del dibujo.</p></details>
    <details><summary>4. Fichas y seguimiento</summary><p>En <strong>Oficina</strong>, revisa los volcados y el seguimiento de clientes. Completa los datos necesarios, registra el resultado de cada llamada y vuelve a abrir la ficha para comprobar que el guardado quedó confirmado.</p></details>
    <details><summary>5. Citas y CRM</summary><p>Al agendar, revisa la fecha, la franja y la dirección antes de confirmar. La transferencia a la CRM de la empresa requiere el proceso manual disponible en esta versión. KONSOR no sincroniza automáticamente con la CRM ni con Google Calendar.</p></details>
    <details><summary>6. Sincronización y privacidad</summary><p>Espera la confirmación del servidor después de guardar. Si aparece un guardado pendiente, revisa la conexión y confirma el estado antes de repetir la acción. Usa solo los datos necesarios y no compartas datos de clientes en WhatsApp ni en mensajes de soporte.</p></details>
    <details><summary>7. Ayuda y avisos</summary><p>En Ajustes puedes abrir los avisos y los mensajes preparados para sugerencias, fallos o dudas. Los mensajes de soporte están pensados para describir la pantalla y el problema sin nombres, teléfonos, direcciones, documentos ni capturas con datos personales.</p></details>
   </div></div>`;
 };

 document.addEventListener("click",event=>{
  const link=event.target?.closest?.("a.cn-help-link");
  if(!link)return;
  const label=(link.textContent||"").toLocaleLowerCase("es");
  if(!/(sugerir una mejora|informar de un fallo|resolver una duda)/.test(label))return;
  let phone="";
  try{phone=new URL(link.href,location.href).pathname.replace(/\\D/g,"");}catch{}
  if(!phone)return;
  let alias="equipo KONSOR";
  try{if(typeof currentUserName!=="undefined"&&typeof getDisplayAlias==="function")alias=getDisplayAlias(currentUserName)||alias;}catch{}
  const date=new Intl.DateTimeFormat("es-ES",{dateStyle:"medium"}).format(new Date());
  let title,questions;
  if(label.includes("mejora")){
   title="SUGERENCIA SOBRE KONSOR";
   questions="¿Qué te gustaría mejorar?\\n\\n¿En qué tarea te ayudaría?";
  }else if(label.includes("fallo")){
   title="FALLO EN KONSOR";
   questions="Pantalla o sección:\\n\\nQué hice antes:\\n\\nQué ocurrió:\\n\\nQué esperaba que ocurriera:\\n\\nDispositivo y navegador:";
  }else{
   title="CONSULTA SOBRE KONSOR";
   questions="Pantalla o sección:\\n\\n¿Qué intentas hacer?\\n\\n¿Qué parte necesitas que te expliquemos?";
  }
  const message=`${title}\\nDe: ${alias}\\nFecha: ${date}\\n\\n${questions}\\n\\nNo incluyas datos de clientes ni capturas con información personal.`;
  event.preventDefault();
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
 },true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installAuthAndHelp,{once:true});
else installAuthAndHelp();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{if(hasSession())start();},{once:true});
else if(hasSession())start();
})();
