/* Captación individual iOS — 4 pasos sobre el formulario original, sin guardar datos paralelos. */
(function(){
"use strict";
let step=0;
const $=(tag,cl,txt,parent)=>{const x=document.createElement(tag);if(cl)x.className=cl;if(txt!==undefined)x.textContent=String(txt);if(parent)parent.append(x);return x;};
function original(){return document.getElementById("singleHouseModalBody");}
function get(sel){return original()?.querySelector(".cn-house-original "+sel);}
const b=(txt,handler,cl)=>{const x=$("button","cn-house-btn "+(cl||""),txt);x.type="button";x.onclick=handler;return x;};
function field(root,label,selector,type="text"){
 const value=get(selector);if(!value)return;
 const wrap=$("label","cn-house-field",undefined,root);
 $("span","",label,wrap);
 const input=$("input","",undefined,wrap);input.type=type;input.value=value.value||"";input.placeholder=label;
 input.addEventListener("input",()=>{value.value=input.value;value.dispatchEvent(new Event("input",{bubbles:true}));});
 input.addEventListener("change",()=>{value.dispatchEvent(new Event("change",{bubbles:true}));});
 input.addEventListener("blur",()=>value.dispatchEvent(new Event("blur",{bubbles:false})));
 return input;
}
function summary(parent,label,value){const row=$("div","cn-house-summary-row",undefined,parent);$("span","",label,row);$("strong","",value||"Pendiente",row);}
function advance(){
 const details=original()?.querySelector(".cn-house-advanced");if(details)details.open=true;
}
function render(){
 const body=original();
 if(!body||!body.querySelector(".cn-house-original"))return;
 let ui=body.querySelector("#cnHouseWizard");
 if(!ui){ui=$("section","cn-house-wizard");ui.id="cnHouseWizard";body.prepend(ui);}
 ui.replaceChildren();
 const steps=["Tipo de vivienda","Contacto y dirección","Catastro y medición","Revisar y guardar"];
 $("span","cn-house-eyebrow","CAPTACIÓN · PASO "+(step+1)+" DE 4",ui);
 $("h3","",steps[step],ui);
 const progress=$("div","cn-house-progress",undefined,ui);
 for(let i=0;i<4;i++)$("span",i<=step?"active":"",undefined,progress);
 if(step===0){
  $("p","cn-house-description","Selecciona el tipo de inmueble. La siguiente pantalla solo pedirá los datos necesarios.",ui);
  const type=get(".client-type");
  if(type){
   for(const option of [...type.options]){
    const choice=b(option.textContent.trim(),()=>{
     type.value=option.value;
     type.dispatchEvent(new Event("change",{bubbles:true}));
     step=1;render();
    },"cn-house-choice"+(type.value===option.value?" selected":""));
    ui.append(choice);
   }
  }
 }else if(step===1){
  $("p","cn-house-description","Introduce los datos del cliente y confirma la dirección. La localidad y el código postal se completan cuando se encuentra una coincidencia fiable.",ui);
  field(ui,"Calle y número",".client-street");
  field(ui,"Nombre y apellidos",".client-name");
  field(ui,"Teléfono",".client-phone","tel");
  const auto=$("div","cn-house-summary",undefined,ui);
  summary(auto,"Pueblo",get("#singleHouseTown")?.value||original()?.querySelector("#singleHouseTown")?.value);
  summary(auto,"Código postal",get(".client-cp")?.value);
  summary(auto,"Zona CTE",get(".client-cte-zone")?.value);
  const foot=$("div","cn-house-actions",undefined,ui);
  foot.append(b("Comprobar dirección",async()=>{
   const addr=get(".client-street");
   if(addr&&typeof fillPostalCodeFromStreet==="function"){
    const job=fillPostalCodeFromStreet(addr);if(job&&typeof job.then==="function")await job;
   }
   render();
  },"outline"));
  foot.append(b("Continuar",()=>{step=2;render();},"primary"));
  const correction=b("Modificar localidad o CP",()=>{advance();original()?.querySelector("#singleHouseTown")?.focus();},"subtle");
  ui.append(correction);
 }else if(step===2){
  $("p","cn-house-description","Consulta el catastro e introduce los datos técnicos. Las deducciones por plantas se calculan utilizando las reglas actuales.",ui);
  const cat=get('button[onclick*="openCadastreFromClientBox"]');
  if(cat){
   const consult=b("Consultar Catastro",async()=>{
    result.replaceChildren();
    const status=$("p","cn-house-description","Buscando la ficha oficial…",result);
    consult.disabled=true;
    try{
     if(typeof openCadastreFromClientBox==="function")await openCadastreFromClientBox(cat);else cat.click();
     const slot=cat.parentElement?.querySelector(".inline-catastro-link-slot");
     const link=slot?.querySelector("a[href]");
     if(link){
      const anchor=$("a","cn-house-btn outline","Ver ficha catastral",result);
      anchor.href=link.href;anchor.target="_blank";anchor.rel="noopener noreferrer";
      status.textContent="Consulta los m² y el año en la ficha oficial.";
     }else status.textContent=slot?.textContent?.trim()||"No se encontró la parcela. Revisa la dirección y número.";
    }catch(error){status.textContent="No se ha podido consultar Catastro: "+(error.message||error);}
    finally{consult.disabled=false;}
   },"outline");
   consult.classList.add("cn-inline-catastro-button");
   ui.append(consult);
   const result=$("div","cn-inline-catastro-result",undefined,ui);
  }
  field(ui,"Año de construcción",".client-build-year","number");
  field(ui,"Superficie catastral (m²)",".client-total-m2","number");
  field(ui,"Número de plantas",".client-floors","number");
  if(get(".client-num-attics"))field(ui,"Viviendas de última planta",".client-num-attics","number");
  const result=$("div","cn-house-summary",undefined,ui);
  summary(result,"Superficie neta estimada",get(".client-m2")?.value?get(".client-m2").value+" m²":null);
  summary(result,"CTE",get(".client-cte-zone")?.value);
  const year=Number(get(".client-build-year")?.value)||0;
  const cte=get(".client-cte-zone")?.value||"";
  if(year>2006||cte&&!/^[DE][123]$/.test(cte)&&cte!=="Sin detectar"&&cte!=="Auto por CP"){
   $("p","cn-house-warning","Posible no aptitud: "+[year>2006?"año posterior a 2006":"",cte&&!/^[DE][123]$/.test(cte)?"zona CTE a revisar":""].filter(Boolean).join(" y ")+". Revisa los datos y confirma el estado en edición avanzada.",ui);
  }
  ui.append(b("Continuar a revisión",()=>{step=3;render();},"primary"));
 }else{
  $("p","cn-house-description","Revisa la información antes de utilizar el guardado existente. No se descartará una vivienda sin confirmación.",ui);
  const data=$("div","cn-house-summary",undefined,ui);
  for(const [label,selector] of [["Tipo de inmueble",".client-type"],["Calle y número",".client-street"],["Nombre",".client-name"],["Teléfono",".client-phone"],["CP",".client-cp"],["Zona CTE",".client-cte-zone"],["Año",".client-build-year"],["m² estimados",".client-m2"]]){
   const item=get(selector);summary(data,label,item?.selectedOptions?.[0]?.textContent||item?.value||"Pendiente");
  }
  const controls=$("div","cn-house-actions",undefined,ui);
  controls.append(b("Guardar captación",async()=>{if(typeof saveSingleHouseData==="function")await saveSingleHouseData();},"primary"));
  controls.append(b("Editar detalles",()=>{advance();},"outline"));
 }
 if(step>0)ui.append(b("Volver al paso anterior",()=>{step--;render();},"subtle"));
}
window.cnEnhanceSingleHouse=function(){
 const body=original();if(!body)return;
 if(!body.querySelector(".cn-house-original")){
  const details=$("details","cn-house-advanced");
  $("summary","","Edición avanzada · datos adicionales",details);
  const wrap=$("div","cn-house-original",undefined,details);
  while(body.firstChild)wrap.append(body.firstChild);
  body.append(details);
 }
 step=0;render();
};
})();