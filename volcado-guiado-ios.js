/* KONSOR · Volcado secuencial. Un SI no equivale a una ficha completada. */
(function(){
"use strict";
let step=0, plan=null, planKey="", groupIndex=0;
const groups=[{key:"urbanizacion",name:"Urbanización de unifamiliares"},{key:"comunidad",name:"Comunidades"},{key:"vivienda",name:"Unifamiliares individuales"}];
const el=(tag,cls,txt,parent)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);if(parent)parent.append(x);return x;};
const button=(label,fn,cls)=>{const x=el("button","cng-btn "+(cls||""),label);x.type="button";x.onclick=fn;return x;};
const original=id=>document.getElementById(id);
const boxes=()=>[...document.querySelectorAll("#clientsContainer .client-box,#clientsContainer .comunidad-box")];
const number=id=>Math.max(0,parseInt(original(id)?.value,10)||0);
const phoneOk=s=>{let p=String(s||"").replace(/[\s()\-.]/g,"");if(p.startsWith("+34"))p=p.slice(3);else if(p.startsWith("0034"))p=p.slice(4);return /^[6789]\d{8}$/.test(p);};
function valid(b){
 const v=q=>b.querySelector(q)?.value?.trim()||"";
 return Boolean(v(".client-street")&&v(".client-name")&&phoneOk(v(".client-phone"))&&v(".client-type"));
}
function invalid(b){return b.dataset.konsorInvalidPhone==="1" && Boolean(b.querySelector(".client-street")?.value.trim()&&b.querySelector(".client-name")?.value.trim());}
const completed=()=>boxes().filter(valid).length;
const resolved=()=>boxes().filter(b=>valid(b)||invalid(b)).length;
function field(parent,id,label,type="number"){
 const orig=original(id);if(!orig)return null;
 const row=el("label","cng-field",undefined,parent);el("span","",label,row);
 let node;
 if(orig.tagName==="SELECT"){node=orig.cloneNode(true);node.removeAttribute("id");node.removeAttribute("onchange");row.append(node);node.value=orig.value;
  node.addEventListener("change",()=>{orig.value=node.value;orig.dispatchEvent(new Event("change",{bubbles:true}));if(id==="dumpProgressState")render();});
 }else{node=el("input","",undefined,row);node.type=type;node.value=orig.value;node.placeholder=type==="number"?"0":"";
  node.addEventListener("input",()=>{orig.value=node.value;orig.dispatchEvent(new Event("input",{bubbles:true}));});
  node.addEventListener("change",()=>{orig.dispatchEvent(new Event("change",{bubbles:true}));});
 }
 return node;
}
function sectorStatusControl(parent){
 const orig=original("dumpProgressState");if(!orig)return;
 const section=el("section","cng-state",undefined,parent);
 el("strong","cng-state-heading","Estado del sector",section);
 el("p","cng-state-caption","Indica si queda trabajo pendiente o si el sector está terminado.",section);
 const row=el("div","cng-state-options",undefined,section);
 const options=[
  ["sin_comprobar","Por hacer","No iniciado"],
  ["en_proceso","En proceso","Queda trabajo"],
  ["completada","Terminado","Trabajo cerrado"]
 ];
 options.forEach(([value,label,detail])=>{
  const choice=button(label,()=>{
   orig.value=value;orig.dispatchEvent(new Event("change",{bubbles:true}));
   render();
  },"cng-state-option"+(orig.value===value?" selected":""));
  choice.setAttribute("aria-pressed",String(orig.value===value));
  el("small","",detail,choice);
  row.append(choice);
 });
 if(orig.value==="en_proceso"){
  const real=original("dumpPendingNote");
  if(real){
   const label=el("label","cng-field",undefined,section);
   el("span","","Qué queda por terminar",label);
   const input=el("input","",undefined,label);
   input.type="text";input.value=real.value||"";
   input.placeholder="Ej. Falta la acera de los números pares";
   input.addEventListener("input",()=>{real.value=input.value;real.dispatchEvent(new Event("input",{bubbles:true}));});
  }
 }
}
function resetPlanIfChanged(){
 const key=String(typeof selectedZoneIndexToDump==="number"?savedZones[selectedZoneIndexToDump]?.id||selectedZoneIndexToDump:"no-zone");
 if(planKey!==key){planKey=key;plan=null;groupIndex=0;step=0;}
}
function planTotal(){return groups.reduce((n,g)=>n+(plan?.[g.key]||0),0);}
function planGroups(){return groups.filter(g=>Number(plan?.[g.key])>0);}
function initializePlan(){
 if(plan)return;
 const existing=boxes(), hasEntries=existing.some(b=>b.querySelector(".client-name")?.value||b.querySelector(".client-phone")?.value||b.querySelector(".client-street")?.value);
 if(hasEntries){plan={urbanizacion:0,comunidad:0,vivienda:0};
  for(const b of existing){const t=b.querySelector(".client-type")?.value||"vivienda";plan[t]=(plan[t]||0)+1;}
 }else{plan={urbanizacion:0,comunidad:0,vivienda:0};}
}
function setField(box,selector,value){
 const node=box.querySelector(selector);if(!node||!value||node.value.trim()===String(value).trim())return;
 node.value=String(value);node.dispatchEvent(new Event("input",{bubbles:true}));node.dispatchEvent(new Event("change",{bubbles:true}));
}
function applyTypes(){
 if(planTotal()!==number("dumpSi"))throw Error("Los tipos deben sumar exactamente los síes registrados.");
 const all=boxes();
 if(all.length!==number("dumpSi"))throw Error("El número de formularios no coincide. Reabre el volcado.");
 let pos=0;
 groups.forEach(g=>{for(let j=0;j<(plan[g.key]||0);j++){
  const b=all[pos];if(!b)throw Error("Falta un formulario.");
  const prior=(typeof selectedZoneIndexToDump==="number"?savedZones[selectedZoneIndexToDump]?.clients?.[pos]:null);
  if(prior&&["agendada","realizada"].includes(prior.obraStatus)&&prior.type!==g.key)
   throw Error("La ficha "+(pos+1)+" ya tiene una cita u obra. No se puede cambiar su tipo mediante un reparto nuevo.");
  const select=b.querySelector(".client-type");
  if(!select||![...select.options].some(o=>o.value===g.key))throw Error("El tipo de vivienda no está disponible.");
  if(select.value!==g.key){select.value=g.key;if(typeof switchClientTypeView!=="function")throw Error("No se puede cambiar el tipo de ficha.");switchClientTypeView(select,pos);}
  pos++;
 }});
}
function members(group){
 let from=0;
 for(const g of groups){const len=plan?.[g.key]||0;if(g.key===group.key)return boxes().slice(from,from+len);from+=len;}
 return [];
}
function summary(parent,main,detail){const x=el("div","cng-summary",undefined,parent);el("strong","",main,x);if(detail)el("p","",detail,x);return x;}
function render(){
 const body=original("dumpModalBodyContent");if(!body||!body.querySelector(".cng-original"))return;
 resetPlanIfChanged();
 let ui=body.querySelector("#cngGuidedSheet");if(!ui){ui=el("section","cng-sheet");ui.id="cngGuidedSheet";body.prepend(ui);}
 ui.replaceChildren();
 const titles=["Resultados de calle","Distribuir los interesados","Organizar direcciones","Completar las fichas","Revisar y guardar"];
 el("span","cng-eyebrow","VOLCADO GUIADO · PASO "+(step+1)+" DE 5",ui);
 el("h3","",titles[step],ui);
 const progress=el("div","cng-progress",undefined,ui);for(let i=0;i<5;i++)el("span",i<=step?"active":"",undefined,progress);
 if(step===0){
  el("p","cng-info","Primero copia los resultados de tu hoja. Escribe los interesados al final; cada uno tendrá su propia ficha.",ui);
  const grid=el("div","cng-grid",undefined,ui);
  field(grid,"dumpNo","No");field(grid,"dumpAusente","Ausentes");
  field(grid,"dumpPapelito","Información / papelitos");
  field(ui,"dumpYaAislado","Ya aislados");
  field(ui,"dumpSi","Sí · interesados");
  field(ui,"dumpDate","Fecha real del trabajo","date");
  summary(ui,(number("dumpNo")+number("dumpAusente")+number("dumpPapelito")+number("dumpYaAislado")+number("dumpSi"))+" respuestas registradas","Los síes son personas interesadas, NO fichas completadas.");
  ui.append(button("Continuar · Distribuir viviendas",()=>{if(number("dumpSi")<0){alert("Revisa el recuento.");return;}initializePlan();step=1;render();},"primary"));
 }else if(step===1){
  initializePlan();const total=number("dumpSi");
  el("p","cng-info","Indica cuántos de los "+total+" interesados corresponden a cada tipo. Ejemplo: 3 unifamiliares y 1 comunidad.",ui);
  groups.forEach(g=>{
   const row=el("label","cng-field",undefined,ui);el("span","",g.name,row);
   const input=el("input","",undefined,row);input.type="number";input.min="0";input.max=String(total);input.step="1";input.value=String(plan[g.key]||0);
   input.addEventListener("input",()=>{plan[g.key]=Math.max(0,Math.min(total,Math.floor(Number(input.value)||0)));const stat=ui.querySelector("#cngTotalTipos");if(stat)stat.textContent=planTotal()+" de "+total+" interesados distribuidos";const next=ui.querySelector("#cngNextTypes");if(next)next.disabled=planTotal()!==total;});
  });
  const state=summary(ui,planTotal()+" de "+total+" interesados distribuidos","La suma debe coincidir con los síes.");state.querySelector("strong").id="cngTotalTipos";
  const next=button("Continuar · Direcciones",()=>{try{applyTypes();groupIndex=0;step=2;render();}catch(e){alert(e.message);}},"primary");next.id="cngNextTypes";next.disabled=planTotal()!==total;ui.append(next);
 }else if(step===2){
  const active=planGroups();if(!active.length){step=3;render();return;}
  const g=active[Math.min(groupIndex,active.length-1)],set=members(g);
  el("p","cng-info","Grupo "+(groupIndex+1)+" de "+active.length+": "+g.name+" · "+set.length+" fichas. Si comparten calle, escríbela una sola vez y añade los números separados por comas.",ui);
  const baseLabel=el("label","cng-field",undefined,ui);el("span","","Calle compartida (sin número)",baseLabel);
  const street=el("input","",undefined,baseLabel);street.type="text";street.placeholder="Calle Mayor";
  const numsLabel=el("label","cng-field",undefined,ui);el("span","","Números o portales, separados por comas",numsLabel);
  const nums=el("input","",undefined,numsLabel);nums.type="text";nums.placeholder=set.map((_,i)=>String(i+1)).join(", ");
  summary(ui,set.length+" fichas de "+g.name,"Si las viviendas están en calles distintas, deja estos campos vacíos y completa cada dirección en su propia ficha.");
  ui.append(button("Aplicar direcciones y continuar",()=>{
   const names=nums.value.split(",").map(n=>n.trim()).filter(Boolean);const base=street.value.trim();
   if(base&&(names.length!==set.length)){alert("Introduce exactamente "+set.length+" números, o deja los dos campos vacíos para escribir las direcciones una a una.");return;}
   if(!base&&names.length){alert("Indica primero la calle compartida.");return;}
   if(base){set.forEach((b,i)=>setField(b,".client-street",base+" "+names[i]));}
   if(groupIndex+1<active.length){groupIndex++;render();}else{step=3;render();}
  },"primary"));
 }else if(step===3){
  const all=boxes(),needed=number("dumpSi"),ready=completed(),done=resolved();
  summary(ui,done+" de "+needed+" interesados revisados",ready+" contactables · "+(done-ready)+" sin teléfono válido. Una ficha vacía nunca cuenta como completada.");
  if(!needed)el("p","cng-info","No hay interesados en este sector. Puedes pasar a revisar.",ui);
  all.slice(0,needed).forEach((b,i)=>{
   const type=b.querySelector(".client-type")?.selectedOptions?.[0]?.textContent?.trim()||"Vivienda";
   const full=valid(b),bad=invalid(b),name=b.querySelector(".client-name")?.value?.trim(),street=b.querySelector(".client-street")?.value?.trim();
   const row=el("div","cng-summary",undefined,ui);
   el("strong","","Ficha "+(i+1)+" · "+(full?"Contacto válido":bad?"Teléfono no válido · registrada sin llamada":"Pendiente"),row);
   el("p","",type+" · "+[name,street].filter(Boolean).join(" · "),row);
   row.append(button(full||bad?"Revisar ficha":"Completar ficha",()=>{if(typeof abrirAsistenteCaptacion==="function")abrirAsistenteCaptacion(i);else alert("No se ha cargado el asistente de captación.");},"outline"));
  });
  if(done!==needed)el("p","cn-house-warning","Quedan "+Math.max(0,needed-done)+" interesados sin revisar. Indica los datos o marca expresamente si el teléfono es ilegible.",ui);
  ui.append(button("Comprobar todas las fichas",()=>{step=4;render();},"primary"));
 }else{
  const expected=number("dumpSi"),ready=completed(),done=resolved(),all=boxes();
  const doors=["dumpNo","dumpAusente","dumpPapelito","dumpYaAislado","dumpSi"].reduce((n,id)=>n+number(id),0);
  summary(ui,doors+" resultados de calle",expected+" interesados · "+ready+" contactables · "+(done-ready)+" sin teléfono · "+(expected-done)+" pendientes");
  sectorStatusControl(ui);
  if(done!==expected){
   el("p","cn-house-warning","No puedes cerrar el volcado con fichas pendientes. Cada sí necesita una ficha con contacto válido o una marca explícita de teléfono no válido.",ui);
  }
  const save=button("Guardar volcado",async()=>{
   const actual=resolved(),total=number("dumpSi");
   if(actual!==total){alert("Hay "+(total-actual)+" interesados sin ficha válida. Revisa las fichas antes de guardar.");step=3;render();return;}
   if(typeof saveDumpData==="function")await saveDumpData();
  },"primary");
  save.disabled=done!==expected;ui.append(save);
  ui.append(button("Volver a las fichas",()=>{step=3;render();},"outline"));
 }
 if(step>0)ui.append(button("‹ Volver al paso anterior",()=>{if(step===2){if(groupIndex>0){groupIndex--;}else{step=1;}}else step--;render();},"subtle"));
}
function enhance(){
 const body=original("dumpModalBodyContent");if(!body||!original("dumpSi"))return;
 if(body.querySelector(".cng-original")){step=0;plan=null;render();return;}
 const advanced=el("details","cng-advanced");advanced.open=false;
 el("summary","","Datos adicionales y edición técnica",advanced);
 const wrap=el("div","cng-original",undefined,advanced);
 while(body.firstChild)wrap.append(body.firstChild);
 body.append(advanced);step=0;plan=null;render();
}
window.cnEnhanceDump=enhance;
window.cnDumpProgress=()=>({declared:number("dumpSi"),valid:completed(),resolved:resolved(),forms:boxes().length});
window.cnRefreshDumpWizard=()=>{if(original("dumpModal")?.classList.contains("active"))render();};
window.cnDumpHasGroups=()=>Boolean(plan&&planTotal()===number("dumpSi")&&boxes().length===number("dumpSi"));
})();