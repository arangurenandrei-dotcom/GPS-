/* KONSOR · Revisión guiada de Oficina para modo creador.
 * Fichas compartidas, solo lectura. Cerrar expediente requiere servidor.
 */
(function(root){
"use strict";
const add=(tag,css,value,parent)=>{
 const item=document.createElement(tag);
 if(css)item.className=css;
 if(value!==undefined)item.textContent=String(value);
 parent?.append(item);return item;
};
function canRead(){
 return !!(root.konsorDesigner?.permitted?.()&&
  root.KonsorBridge?.state?.().connected&&root.KonsorOfficeFlow&&
  typeof savedZones!=="undefined"&&Array.isArray(savedZones));
}
function rows(){
 if(!canRead())return null;
 // Las áreas ajenas no se consultan; Firestore ya ha filtrado las fichas.
 const own=z=>!String(z.comercial||"").startsWith("Mikel");
 return root.KonsorOfficeFlow.entries(savedZones,own);
}
function metric(parent,title,num){
 const n=add("div","ktf-stat",undefined,parent);
 add("strong","",num,n);add("span","",title,n);
}
function render(container){
 if(!container)return;
 if(!container)return;
 container.querySelector("#konsorOfficeLive")?.remove();
 const panel=add("section","ktf-wrapper",undefined,container);panel.id="konsorOfficeLive";
 const title=add("div","cnv-group-label",undefined,panel);
 add("strong","","EXPEDIENTES DE OFICINA",title);
 add("span","","Revisión guiada",title);
 const agenda=document.createElement("button");
 agenda.className="ktf-open-agenda";agenda.type="button";agenda.textContent="Gestionar llamadas y citas";
 agenda.onclick=()=>{window.openCnCallQueue?.();};
 panel.append(agenda);
 const list=rows();
 if(list===null){
  add("p","ktf-notice","Conectando con las fichas de Firebase. No se han creado expedientes de ejemplo.",panel);
  return;
 }
 const info=root.KonsorOfficeFlow.totals(list);
 const stats=add("div","ktf-metrics",undefined,panel);
 metric(stats,"Incidencias",info.incidences);
 metric(stats,"Revisión documental",info.documents);
 metric(stats,"Obras realizadas sin cierre",info.performed);
 const section=add("div","cnv-group-label",undefined,panel);
 add("strong","","SIGUIENTE EXPEDIENTE",section);
 add("span","",list.length+" expedientes visibles",section);
 if(!list.length){
  add("p","ktf-notice","No se han encontrado expedientes de obras en las fichas visibles. Una cita que solo esté en Google Calendar debe vincularse antes con la ficha original.",panel);
  return;
 }
 const selector=add("div","ktf-job-list",undefined,panel);
 const detail=add("section","ktf-detail",undefined,panel);
 let selected=list[0].id;
 function show(job){
  selected=job.id;
  for(const b of selector.children)b.setAttribute("aria-pressed",String(b.dataset.key===selected));
  detail.replaceChildren();
  const heading=add("div","ktf-detail-head",undefined,detail);
  const copy=add("div","",undefined,heading);
  add("h3","",job.street,copy);
  add("p","",job.town+" · "+(job.date||"Fecha pendiente")+" · "+job.client,copy);
  add("strong","ktf-state",job.category,heading);
  add("p","ktf-notice","Siguiente acción: "+job.next+". Las marcas reflejan únicamente los datos guardados en la ficha.",detail);
  for(const [i,step] of root.KonsorOfficeFlow.steps(job).entries()){
   const line=add("div","ktf-step",undefined,detail);
   add("span","ktf-step-number",i+1,line);
   const label=add("div","ktf-step-text",undefined,line);
   add("strong","",step.label,label);add("small","",step.detail,label);
   add("span","ktf-state",step.complete?"Registrado":"Pendiente",line);
  }
  if(job.missing.length)add("p","ktf-notice","Datos o verificaciones pendientes: "+job.missing.join(", ")+".",detail);
  add("p","ktf-disclaimer","No se permite cerrar expedientes ni aprobar documentación desde esta vista hasta incorporar permisos y validaciones de servidor.",detail);
 }
 for(const job of list){
  const button=add("button","ktf-job",undefined,selector);
  button.type="button";button.dataset.key=job.id;
  button.setAttribute("aria-pressed",String(job.id===selected));
  const summary=add("span","",undefined,button);
  add("strong","",job.street+" · "+job.town,summary);
  add("small","",job.next,summary);
  add("span","ktf-pill",job.category,button);
  button.onclick=()=>show(job);
 }
 show(list[0]);
}
root.konsorOficinaGuiada={render,canRead};
})(window);
