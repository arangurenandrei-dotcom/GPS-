/* Comercial Navarra — Oficina guiada, sin duplicar datos ni guardados. */
(function(){
"use strict";
function node(tag,cls,text,parent){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;if(parent)parent.append(e);return e;}
function action(label,fn,variant){const b=node("button","cn-office-btn "+(variant||""),label);b.type="button";b.addEventListener("click",fn);return b;}
let paso=0;
function ownZones(){
 if(!Array.isArray(savedZones))return [];
 return savedZones.map((z,idx)=>({z,idx})).filter(({z})=>z.comercial===currentUserName&&!z.isSingleHouse&&!z.isNoAptoZone&&!z.isHotMission).sort((a,b)=>(a.z.date||"9999").localeCompare(b.z.date||"9999"));
}
function pendingCalls(){
 return ownZones().reduce((acc,{z})=>acc+(z.clients||[]).filter(c=>c&&typeof c==="object"&&c.callStatus==="pendiente"&&(c.name||c.phone||c.street)).length,0);
}
function root(){
 let modal=document.getElementById("cnOficina");
 if(modal)return modal;
 modal=node("div","modal-overlay cn-oficina");
 modal.id="cnOficina";modal.style.zIndex="10134";
 modal.innerHTML='<div class="cn-office-page" role="dialog" aria-modal="true" aria-label="Oficina guiada"><div class="cn-office-header"><div><span>ORGANIZACIÓN DEL TRABAJO</span><h2>Oficina</h2></div><button class="cn-office-exit" type="button">Cerrar</button></div><div class="cn-office-body"></div></div>';
 modal.querySelector(".cn-office-exit").onclick=()=>modal.classList.remove("active");
 modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("active");});
 document.body.append(modal);
 return modal;
}
function redraw(){
 const modal=root(),body=modal.querySelector(".cn-office-body");body.replaceChildren();
 const zones=ownZones(),incomplete=zones.filter(x=>x.z.status!=="completada");
 const steps=node("div","cn-office-stepper",undefined,body);
 ["Revisar sectores","Llamadas y citas","Finalizar"].forEach((name,i)=>{
  const b=action((i+1)+". "+name,()=>{paso=i;redraw();},i===paso?"selected":"");
  steps.append(b);
 });
 const card=node("div","cn-office-card",undefined,body);
 if(paso===0){
  node("span","cn-office-kicker","PASO 1 · SECTORES Y FICHAS",card);
  node("h3","",incomplete.length?incomplete.length+" sectores abiertos":"No hay sectores abiertos",card);
  node("p","", "Revisa el trabajo registrado y abre cada hoja para volcar o corregir fichas. Un sector abierto no implica necesariamente una hoja sin volcar.",card);
  if(incomplete.length){
   const list=node("div","cn-office-list",undefined,card);
   incomplete.slice(0,20).forEach(({z,idx})=>{
    const row=node("div","cn-office-row",undefined,list);
    node("strong","",z.town||"Pueblo sin indicar",row);
    node("span","",z.sectorName||"Sector",row);
    node("small","",z.date||"Sin fecha",row);
    row.append(action("Abrir hoja",()=>{modal.classList.remove("active");openDumpModal(idx);},"subtle"));
   });
   if(incomplete.length>20)node("p","", "Hay más sectores abiertos; puedes consultarlos en Clientes.",card);
  }
  card.append(action("Continuar a llamadas",()=>{paso=1;redraw();},"primary"));
 }else if(paso===1){
  node("span","cn-office-kicker","PASO 2 · SEGUIMIENTO",card);
  node("h3","",pendingCalls()+" contactos pendientes de llamada",card);
  node("p","", "Abre la organización de llamadas y revisa los registros pendientes. Las citas y casos que necesiten seguimiento se conservan en sus estados actuales.",card);
  card.append(action("Empezar llamadas guiadas",()=>{modal.classList.remove("active");window.openCnCallQueue?.();},"primary"));
  card.append(action("Organizar citas por jornadas",()=>{modal.classList.remove("active");openGroupedAppointments();},"subtle"));
  card.append(action("Ver todos los seguimientos",()=>{modal.classList.remove("active");openFollowUpsModal();},"subtle"));
  card.append(action("Ir a revisión final",()=>{paso=2;redraw();},"outline"));
 }else{
  node("span","cn-office-kicker","PASO 3 · REVISIÓN FINAL",card);
  node("h3","","Revisar antes de salir",card);
  node("p","", "Comprueba que los sectores trabajados estén guardados, las llamadas registradas y los pendientes identificados. Salir de Oficina no cierra el fichaje ni modifica datos.",card);
  const recap=node("div","cn-office-summary",undefined,card);
  node("div","",zones.length+" sectores asignados",recap);
  node("div","",incomplete.length+" sectores abiertos",recap);
  node("div","",pendingCalls()+" contactos por llamar",recap);
  card.append(action("Volver al mapa",()=>modal.classList.remove("active"),"primary"));
 }
}
window.openCnOffice=function(){paso=0;const m=root();redraw();m.classList.add("active");};
})();