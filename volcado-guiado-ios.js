/* Volcado de sectores guiado. Reutiliza el DOM, validaciones y guardado original. */
(function(){
"use strict";
let step=0;
const el=(tag,cls,txt,parent)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);if(parent)parent.append(x);return x;};
const button=(label,fn,cls)=>{const x=el("button","cng-btn "+(cls||""),label);x.type="button";x.onclick=fn;return x;};
const original=id=>document.getElementById(id);
function field(parent,id,label,type="number"){
 const orig=original(id);if(!orig)return;
 const row=el("label","cng-field",undefined,parent);el("span","",label,row);
 let node;
 if(orig.tagName==="SELECT"){
  node=orig.cloneNode(true);node.removeAttribute("id");node.removeAttribute("onchange");
  node.value=orig.value;
  node.addEventListener("change",()=>{orig.value=node.value;orig.dispatchEvent(new Event("change",{bubbles:true}));});
 }else{
  node=el("input","",undefined,row);node.type=type;
  node.value=orig.value;node.placeholder=type==="number"?"0":"";
  node.addEventListener("input",()=>{orig.value=node.value;orig.dispatchEvent(new Event("input",{bubbles:true}));});
  node.addEventListener("change",()=>{orig.dispatchEvent(new Event("change",{bubbles:true}));});
 }
 if(orig.tagName==="SELECT")row.append(node);
}
function count(){
 return [...document.querySelectorAll("#clientsContainer .client-box,#clientsContainer .comunidad-box")]
 .filter(x=>x.querySelector(".client-name")?.value||x.querySelector(".client-street")?.value||x.querySelector(".client-phone")?.value).length;
}
function render(){
 const body=original("dumpModalBodyContent");
 if(!body||!body.querySelector(".cng-original"))return;
 let ui=body.querySelector("#cngGuidedSheet");
 if(!ui){ui=el("section","cng-sheet",undefined);ui.id="cngGuidedSheet";body.prepend(ui);}
 ui.replaceChildren();
 el("span","cng-eyebrow","VOLCADO GUIADO · "+(step+1)+" DE 3",ui);
 const title=["Resultados del sector","Fichas captadas","Revisión y guardado"][step];
 el("h3","",title,ui);
 const progress=el("div","cng-progress",undefined,ui);
 for(let i=0;i<3;i++)el("span",i<=step?"active":"",undefined,progress);
 if(step===0){
  el("p","cng-info","Introduce el recuento de la hoja. Los valores actualizan los mismos campos que ya utiliza Comercial Navarra.",ui);
  const grid=el("div","cng-grid",undefined,ui);
  field(grid,"dumpNo","No interesados");
  field(grid,"dumpAusente","Ausentes");
  field(grid,"dumpPapelito","Información / papelitos");
  field(ui,"dumpYaAislado","Ya tenían aislamiento");
  field(ui,"dumpSi","Sí · quieren información u obra");
  field(ui,"dumpDate","Fecha real del trabajo de calle","date");
  el("p","cng-info","Si vuelcas la hoja un día después, conserva la fecha en que llamaste a las puertas. El sistema registra por separado cuándo guardas.",ui);
  const foot=el("div","cng-actions",undefined,ui);
  foot.append(button("Continuar a fichas",()=>{step=1;render();},"primary"));
 }else if(step===1){
  el("p","cng-info","Registra cada interesado con el asistente de cuatro pasos. El resto de campos se completan y comprueban dentro de su ficha.",ui);
  const summary=el("div","cng-summary",undefined,ui);
  const total=Number(original("dumpSi")?.value)||0;
  el("strong","",count()+" de "+total+" fichas registradas",summary);
  const remaining=Math.max(0,total-count());
  el("p","",remaining?remaining+" interesados quedan por introducir. Agrupa por calle y tipo de vivienda para evitar repetir direcciones.":"El número de fichas coincide con los síes. Revisa los datos antes de guardar.",summary);
  const actions=el("div","cng-actions",undefined,ui);
  actions.append(button("Abrir captación guiada",()=>{if(typeof abrirAsistenteCaptacion==="function")abrirAsistenteCaptacion();},"primary"));
  actions.append(button("Revisar volcado",()=>{step=2;render();},"outline"));
  ui.append(button("Volver a resultados",()=>{step=0;render();},"subtle"));
 }else{
  el("p","cng-info","Comprueba el estado del sector y guarda. Si queda algo pendiente, selecciona «Haciendo» y escribe qué falta.",ui);
  field(ui,"dumpProgressState","Estado del sector");
  if(original("dumpProgressState")?.value==="en_proceso")field(ui,"dumpPendingNote","Trabajo pendiente","text");
  const total=["dumpNo","dumpAusente","dumpPapelito","dumpSi"].reduce((v,id)=>v+(Number(original(id)?.value)||0),0);
  const rec=el("div","cng-summary",undefined,ui);
  el("strong","",total+" puertas registradas",rec);
  const si=Number(original("dumpSi")?.value)||0,actual=count();
  el("p","",si+" síes · "+actual+" fichas introducidas · "+(original("dumpProgressState")?.selectedOptions?.[0]?.textContent?.trim()||"Sin estado"),rec);
  if(si!==actual){
   el("p","cn-house-warning","Comprueba la diferencia entre los "+si+" síes y las "+actual+" fichas. El motor original puede recalcular los síes a partir de las fichas guardadas.",ui);
  }
  const actions=el("div","cng-actions",undefined,ui);
  actions.append(button("Guardar volcado",async()=>{if(typeof saveDumpData==="function")await saveDumpData();},"primary"));
  actions.append(button("Volver a fichas",()=>{step=1;render();},"outline"));
 }
}
function enhance(){
 const body=original("dumpModalBodyContent");
 if(!body||!original("dumpSi"))return;
 if(body.querySelector(".cng-original")){step=0;render();return;}
 const advanced=el("details","cng-advanced");
 advanced.open=false;
 el("summary","","Edición avanzada de la hoja",advanced);
 const wrap=el("div","cng-original",undefined,advanced);
 while(body.firstChild)wrap.append(body.firstChild);
 body.append(advanced);
 step=0;render();
}
window.cnEnhanceDump=enhance;
})();