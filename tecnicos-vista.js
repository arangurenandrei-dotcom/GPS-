/* KONSOR · Vista técnica guiada para el creador.
 * Consulta las mismas fichas que Comercial con autorización actual.
 * Nunca permite cambiar de estado sin operación validada del servidor.
 */
(function(root){
"use strict";
const el=(tag,cls,txt,parent)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(txt!==undefined)node.textContent=String(txt);
 if(parent)parent.append(node);
 return node;
};
function today(){
 const d=new Date();
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
function permitted(){
 return !!(root.konsorDesigner?.permitted?.()&&root.KonsorTechnicalFlow&&
  typeof savedZones!=="undefined"&&Array.isArray(savedZones));
}
function workEntries(){
 if(!permitted())return null;
 // No se consulta a los equipos ajenos: las reglas de Firebase limitan el
 // snapshot ya disponible al usuario auténtico.
 const key=sessionStorage.getItem("auth_user_key");
 const own=key==="jefe"?z=>!String(z.comercial||"").startsWith("Mikel"):z=>false;
 return root.KonsorTechnicalFlow.entries(savedZones,own);
}
function card(parent,title,value,detail){
 const box=el("div","ktf-stat",undefined,parent);
 el("strong","",value,box);el("span","",title,box);
 if(detail)el("small","",detail,box);
 return box;
}
function render(container){
 if(!container)return;
 if(!container)return;
 const existing=container.querySelector("#konsorTechnicalLive");
 existing?.remove();
 const main=el("section","ktf-wrapper",undefined,container);main.id="konsorTechnicalLive";
 const head=el("div","cnv-group-label",undefined,main);
 el("strong","","OBRAS DEL EQUIPO",head);
 el("span","","Datos de las fichas actuales",head);
 if(!root.KonsorBridge?.state?.().connected)
  el("p","ktf-notice","Mostrando fichas cargadas en esta sesión, pendientes de confirmar con Firebase. Actualiza los datos antes de actuar.",main);
 const list=workEntries();
 if(!list){
  el("p","ktf-notice","La sesión de Firebase aún no ha cargado las fichas. No se muestran obras ni se crean datos de ejemplo.",main);
  return;
 }
 const key=sessionStorage.getItem("auth_user_key");
 const permittedOwner=key==="jefe"?z=>!String(z.comercial||"").startsWith("Mikel"):z=>false;
 const review=root.KonsorTechnicalFlow.pendingVerification(savedZones,permittedOwner);
 const refresh=el("button","ktf-open-agenda","Actualizar obras desde Firebase",main);
 refresh.type="button";refresh.onclick=async()=>{
  refresh.disabled=true;
  try{await root.KonsorBridge.refresh(true);render(container);}
  catch(err){refresh.disabled=false;el("p","ktf-notice","No se ha podido actualizar: "+(err.message||err),main);}
 };
 if(review.length){
  const warning=el("section","ktf-detail",undefined,main);
  el("strong","","Citas pendientes de verificar · "+review.length,warning);
  el("p","ktf-notice","Estas fichas constan con estado de obra agendada, pero les falta una fecha válida o equipo. No se han borrado ni se cuentan como intervenciones listas hasta verificar el evento original.",warning);
  for(const item of review.slice(0,12)){
   const line=el("div","ktf-step",undefined,warning);
   const labels=el("div","ktf-step-text",undefined,line);
   el("strong","",item.street+" · "+item.location,labels);
   el("small","",item.name+" · "+item.reason,labels);
  }
 }
 const summary=root.KonsorTechnicalFlow.recommend(list,today());
 const metrics=el("div","ktf-metrics",undefined,main);
 card(metrics,"Agendadas",summary.scheduled,"");
 card(metrics,"Realizadas",summary.completed,"");
 card(metrics,"Sin equipo",summary.withoutTeam,"Revisión pendiente");
 const head2=el("div","cnv-group-label",undefined,main);
 el("strong","","SECUENCIA GUIADA",head2);
 el("span","",list.length+" obras en ficha",head2);
 if(!list.length){
  el("p","ktf-notice",review.length?"No hay instalaciones listas para ruta hasta verificar las reservas indicadas arriba.":"No hay obras con fecha verificada en las fichas visibles. Comprueba la vinculación de Google Calendar desde Oficina; este recorrido no inventa reservas.",main);
  return;
 }
 let selected=summary.next?.id||list[0].id;
 const chooser=el("div","ktf-job-list",undefined,main);
 const details=el("section","ktf-detail",undefined,main);
 function show(job){
  selected=job.id;
  for(const b of chooser.children)b.setAttribute("aria-pressed",String(b.dataset.key===selected));
  details.replaceChildren();
  const title=el("div","ktf-detail-head",undefined,details);
  const summary=el("div","",undefined,title);
  el("h3","",job.street,summary);
  el("p","",job.location+" · "+job.date+" · "+(job.start||"Sin horario")+(job.end?"–"+job.end:""),summary);
  el("strong","ktf-state",job.status,title);
  el("p","ktf-notice","Vivienda vinculada a una única ficha de KONSOR. Las etapas son una guía de lectura: no se marcará nada completado sin confirmación del servidor.",details);
  const steps=root.KonsorTechnicalFlow.steps(job);
  steps.forEach((step,i)=>{
   const row=el("div","ktf-step",undefined,details);
   el("span","ktf-step-number",String(i+1),row);
   const copy=el("div","ktf-step-text",undefined,row);
   el("strong","",step.label,copy);
   el("small","",step.detail,copy);
   el("span","ktf-state",step.ready?"Registrado":"Por verificar",row);
  });
  el("p","ktf-disclaimer","La firma, las fotografías y la confirmación de ejecución se activarán cuando estén definidos los perfiles técnicos, las autorizaciones y el guardado documental.",details);
 }
 list.forEach(job=>{
  const b=el("button","ktf-job",undefined,chooser);
  b.type="button";b.dataset.key=job.id;b.setAttribute("aria-pressed",String(job.id===selected));
  const info=el("span","",undefined,b);
  el("strong","",job.street+" · "+job.location,info);
  el("small","",job.date+" · "+(job.start||"Sin franja")+" · "+(job.team?"Equipo "+job.team:"Equipo pendiente"),info);
  el("span","ktf-pill",job.status,b);
  b.onclick=()=>show(job);
 });
 show(list.find(x=>x.id===selected)||list[0]);
}
root.konsorTecnicosGuiado={render,permitted};
})(window);
