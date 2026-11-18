/* KONSOR · Oficina unificada. Volcados, clientes, agenda y cierre del día. */
(function(){
"use strict";
const node=(tag,cl,txt,p)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=String(txt);if(p)p.append(e);return e;};
const btn=(text,fn,cl)=>{const b=node("button","cn-office-btn "+(cl||""),text);b.type="button";b.onclick=fn;return b;};
let section="home";
function zones(){
 if(!Array.isArray(savedZones))return [];
 return savedZones.map((z,idx)=>({z,idx})).filter(({z})=>z&&!z.isNoAptoZone&&!z.isHotMission&&!z.isSingleHouse&&(currentUserRole==="jefe"?typeof isMikelTeamMember==="function"&&!isMikelTeamMember(z.comercial):z.comercial===currentUserName));
}
function counts(){
 const rows=zones(),clients=rows.flatMap(x=>x.z.clients||[]).filter(c=>c&&(c.name||c.phone||c.street));
 return {zones:rows.length,open:rows.filter(x=>x.z.status!=="completada").length,clients:clients.length,booked:clients.filter(c=>c.obraStatus==="agendada").length,pending:clients.filter(c=>!["agendada","realizada","no_apto"].includes(c.obraStatus)&&!["no_interesado","descartado"].includes(c.callStatus)).length};
}
function root(){
 let r=document.getElementById("cnOficina");if(r)return r;
 r=node("div","modal-overlay cn-oficina",undefined,document.body);r.id="cnOficina";r.style.zIndex="10134";
 r.innerHTML='<div class="cn-office-page" role="dialog" aria-modal="true" aria-label="Oficina"><div class="cn-office-header"><div><span>KONSOR · TRABAJO INTERIOR</span><h2>Oficina</h2></div><button class="cn-office-exit" type="button">Cerrar</button></div><div class="cn-office-body"></div></div>';
 r.querySelector(".cn-office-exit").onclick=()=>r.classList.remove("active");
 r.addEventListener("click",ev=>{if(ev.target===r)r.classList.remove("active");});return r;
}
function back(body){body.append(btn("‹ Oficina",()=>{section="home";render();},"subtle"));}
function render(){
 const r=root(),body=r.querySelector(".cn-office-body");body.replaceChildren();const m=counts();
 if(section==="home"){
  const summary=node("section","cn-office-card",undefined,body);
  node("span","cn-office-kicker","TU OFICINA",summary);
  node("h3","",m.pending+" clientes pendientes de gestión",summary);
  node("p","","Elige qué hacer. Las llamadas y las reservas se resuelven cliente por cliente.",summary);
  const panel=node("div","cn-office-summary",undefined,summary);
  node("div","",m.open+" sectores abiertos",panel);
  node("div","",m.booked+" obras agendadas",panel);
  const work=node("section","cn-office-card",undefined,body);
  node("h3","","Tareas",work);
  work.append(btn("Volcar hojas",()=>{section="volcados";render();},"primary"));
  work.append(btn("Llamar y agendar obras",()=>{r.classList.remove("active");window.openKonsorOfficeClients?.();},"primary"));
  work.append(btn("Buscar un cliente",()=>{r.classList.remove("active");window.openCnClients?.();},"subtle"));
  work.append(btn("Consultar agenda de obras",()=>{r.classList.remove("active");if(typeof openManagementAudit==="function"&&currentUserRole==="jefe")openManagementAudit("obras");else if(typeof openFollowUpsModal==="function")openFollowUpsModal();},"subtle"));
  const closing=node("section","cn-office-card",undefined,body);
  node("h3","","Al terminar",closing);
  node("p","","Comprueba tus fichas pendientes y vuelve a Inicio. Salir de Oficina nunca cierra el fichaje.",closing);
  closing.append(btn("Revisión del trabajo",()=>{section="review";render();},"outline"));
 }else if(section==="volcados"){
  back(body);
  const card=node("section","cn-office-card",undefined,body);
  node("span","cn-office-kicker","HOJAS Y SECTORES",card);
  node("h3","","Volcar trabajo de calle",card);
  node("p","","La fecha de trabajo debe ser la del día en que captaste, aunque vuelques la hoja más tarde.",card);
  const list=node("div","cn-office-list",undefined,card);
  const unfinished=zones().filter(x=>x.z.status!=="completada");
  if(!unfinished.length)node("p","","No quedan sectores abiertos en esta selección.",list);
  unfinished.forEach(({z,idx})=>{
   const row=node("div","cn-office-row",undefined,list);
   node("strong","",z.town||"Sin pueblo",row);
   node("span","",z.sectorName||"Sector",row);
   node("small","",z.date||"Sin fecha",row);
   row.append(btn("Abrir hoja",()=>{r.classList.remove("active");openDumpModal(idx);},"subtle"));
  });
 }else{
  back(body);
  const card=node("section","cn-office-card",undefined,body);
  node("span","cn-office-kicker","REVISIÓN DE JORNADA",card);
  node("h3","","Estado del trabajo",card);
  [["Sectores",m.zones],["Sectores abiertos",m.open],["Clientes registrados",m.clients],["Clientes por gestionar",m.pending],["Obras agendadas",m.booked]].forEach(([name,val])=>{
   const row=node("div","cn-office-row",undefined,card);node("strong","",name,row);node("span","",val,row);
  });
  node("p","","Revisa los pendientes antes de cerrar. Los datos proceden de los sectores sincronizados.",card);
  card.append(btn("Continuar llamadas",()=>{r.classList.remove("active");window.openKonsorOfficeClients?.();},"primary"));
 }
}
window.openCnOffice=function(){section="home";const r=root();render();r.classList.add("active");};
})();