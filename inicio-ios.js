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
 const open=zones.filter(z=>z.status!=="completada"&&!z.streetCompletedAt);
 const waitingDump=zones.filter(z=>z.status!=="completada"&&z.streetCompletedAt&&!z.dumpDate).length;
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
function showHome(){
 if(!hasSession())return;
 screen="home";window.cnvStopLiveGps?.();document.body.classList.remove("cnv-map-active");document.body.classList.add("cnv-home-active");
 const home=root();home.replaceChildren();
 const top=el("header","cnv-home-head",undefined,home);
 const title=el("div","",undefined,top);
 el("span","cnv-eyebrow","COMERCIAL NAVARRA",title);
 el("h1","", "Mi espacio de trabajo",title);
 el("p","", "¿Qué quieres hacer hoy?",title);
 top.append(btn("Avisos",()=>window.openNotificationsCenterV2?.(),"cnv-glass"));
 top.append(btn("Ajustes",()=>openUserProfileModal(),"cnv-glass"));
 const section=el("section","cnv-home-content",undefined,home);
 const data=info();
 const hero=el("section","cnv-hero",undefined,section);
 const upper=el("div","cnv-hero-upper",undefined,hero);
 el("span","cnv-eyebrow","TU JORNADA",upper);
 let state="Sin iniciar";
 if(data.shift)state=data.shift.status==="working"?"En curso":data.shift.status==="lunch"?"En pausa":"Finalizada";
 el("span","cnv-state",state,upper);
 el("h2","",data.old?"Primero, "+data.old+" sectores pendientes":data.todayCount?"Tienes "+data.todayCount+" sectores para hoy":data.waitingDump?"Tienes "+data.waitingDump+" hojas por volcar":"Organiza tu jornada",hero);
 el("p","",data.old?data.old+" sectores anteriores pendientes · "+data.next+" próximos":"Consulta tu planificación y sigue el siguiente paso.",hero);
 const nextAction=!data.shift?"Iniciar jornada":data.shift.status==="lunch"?"Reanudar trabajo":data.shift.status==="finished"?"Revisar fichas y llamadas":data.old?"Resolver sector anterior":data.todayCount?"Ver sector de hoy":data.waitingDump?"Volcar trabajo de calle":"Abrir Oficina";
 const nextStep=!data.shift?"Empieza registrando tu entrada.":data.shift.status==="lunch"?"Al volver de comer, reanuda el fichaje.":data.shift.status==="finished"?"Comprueba que las fichas estén completas y organiza las llamadas.":data.old?"Acaba primero el trabajo anterior. Si ya lo hiciste, pasa al volcado.":data.todayCount?"Continúa con los sectores de hoy.":data.waitingDump?"Las visitas están cerradas; registra los datos en Oficina.":"Revisa las hojas pendientes y las llamadas del día.";
 el("p","cnv-next-step","Siguiente paso · "+nextStep,hero);
 hero.append(btn(nextAction,()=>{if(!data.shift||data.shift.status==="lunch"||data.old||data.todayCount&&data.shift.status==="working")window.openCnDay?.();else window.openCnOffice?.();},"cnv-dark"));
 const caption=el("div","cnv-group-label",undefined,section);el("strong","","ACCESOS PRINCIPALES",caption);
 const grid=el("div","cnv-home-grid",undefined,section);
 tile(grid,"Mi jornada","Plan y fichaje del día","calendar",()=>window.openCnDay?.());
 tile(grid,"Mapa","GPS, parcelas y medición","map",()=>showMap());
 tile(grid,"Oficina","Volcados, clientes y obras","office",()=>window.openCnOffice?.());
 tile(grid,"Resultados","Cifras y Liga comercial","results",()=>window.openCnResults?.());

 if(boss()){
  // Dirección es una tarjeta principal como Jornada, Mapa, Oficina y Resultados.
  tile(grid,andrei()?"Dirección":"Mi equipo",andrei()?"Pueblos, fichas y equipo":"Gestionar mi equipo","direction",()=>andrei()?window.openKonsorDirection?.():openAuditModal());
 }
 el("p","cnv-footer-note","Los cambios se guardan con las funciones actuales de Comercial Navarra.",section);
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
 const isChief=boss()&&["Andrei (Jefe)","Mikel (Jefe)"].includes(me());
 const items=[...(isChief?[
   ["office","Pueblos",()=>window.openCnTerritory?.()],
   ["pin","Crear sector",()=>typeof startSectorDrawing==="function"&&startSectorDrawing()],
   ["map","Dibujar pueblo",()=>typeof iniciarDibujoPueblo==="function"&&iniciarDibujoPueblo()]
 ]:[]),
  ["gps","Mi GPS",()=>typeof centerOnUser==="function"&&centerOnUser()],
  ["layers","Catastro",()=>typeof setMapDisplay==="function"&&setMapDisplay("both")],
  ["map","Satélite",()=>typeof setMapDisplay==="function"&&setMapDisplay("satellite")],
  ["ruler","Medir superficie",()=>typeof startRoofMeasureMode==="function"&&startRoofMeasureMode()],
  ["gps","Norte",()=>typeof resetMapNorth==="function"&&resetMapNorth()]
 ];
 items.filter(([key,label])=>!(typeof isMikelTeamMember==="function"&&isMikelTeamMember(me())&&(label==="Medir superficie"||(label==="Catastro"&&me()!=="Mikel (Jefe)")))).forEach(([key,label,fn])=>{
  const b=btn("",fn,"cnv-map-tool");b.title=label;b.setAttribute("aria-label",label);b.append(icon(key));controls.append(b);
 });
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
function showMap(){
 if(!hasSession())return;
 screen="map";
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
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{if(hasSession())start();},{once:true});
else if(hasSession())start();
})();