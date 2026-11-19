/* KONSOR · Correcciones auditadas de fichaje (sin ocultar el registro original). */
(function(){
"use strict";
if(window.konsorCorregirJornada)return;
const E=(t,c,txt,p)=>{const n=document.createElement(t);if(c)n.className=c;if(txt!==undefined)n.textContent=String(txt);if(p)p.append(n);return n;};
const me=()=>typeof currentUserName==="string"?currentUserName:"";
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const today=()=>iso(new Date());
function open(){
 if(!me()||typeof savedShifts==="undefined"||!Array.isArray(savedShifts)){alert("La sesión de jornadas todavía no está disponible.");return;}
 document.getElementById("km-shift-correction")?.remove();
 const overlay=E("div","km-overlay",undefined,document.body);overlay.id="km-shift-correction";
 const page=E("section","km-page",undefined,overlay),head=E("header","km-head",undefined,page),titles=E("div","",undefined,head);
 E("small","","KONSOR · JORNADAS",titles);E("h2","","Corregir fichaje",titles);
 const cancel=()=>overlay.remove(),back=E("button","km-btn back km-back","‹",head);back.type="button";back.setAttribute("aria-label","Volver");back.onclick=cancel;head.insertBefore(back,titles);
 const close=E("button","km-btn close","×",head);close.type="button";close.setAttribute("aria-label","Cerrar");close.onclick=cancel;
 const body=E("form","km-body",undefined,page);
 E("p","km-muted","Para recuperar una jornada olvidada o corregir una hora, indica el motivo. Se conserva el valor anterior y quién hizo el cambio.",body);
 const min=new Date();min.setDate(min.getDate()-31);
 const field=(name,type,value,required=false)=>{
  const label=E("label","km-field",undefined,body);
  E("span","",name,label);
  const input=E(type==="textarea"?"textarea":"input","km-input",undefined,label);
  if(type!=="textarea")input.type=type;input.value=value||"";input.required=required;
  if(type==="textarea"){input.rows=3;input.maxLength=400;}
  return input;
 };
 const date=field("Día trabajado","date",today(),true);date.min=iso(min);date.max=today();
 const start=field("Hora real de inicio","time","",true);
 const finish=field("Hora de finalización (dejar vacío si sigues trabajando)","time","");
 const lunch=field("Minutos de comida","number","0");lunch.min="0";lunch.max="300";lunch.step="1";
 const nextDay=E("label","km-checkrow",undefined,body);
 const overnight=E("input","",undefined,nextDay);overnight.type="checkbox";E("span","","El final fue al día siguiente (turno nocturno)",nextDay);
 const reason=field("Motivo de la corrección","textarea","",true);reason.placeholder="Ej.: olvidé iniciar el fichaje cuando llegué al sector";reason.minLength=10;
 const note=E("p","km-muted","Esta función modifica exclusivamente tu propia jornada. No permite corregir fichajes de otros comerciales.",body);
 const status=E("p","km-muted","",body);
 function fill(){
  const existing=savedShifts.find(s=>s.user===me()&&(s.localDate||iso(new Date(s.date)))===date.value);
  if(!existing){start.value="";finish.value="";lunch.value="0";return;}
  start.value=existing.startTime||"";finish.value=existing.endTime||"";
  lunch.value=String(existing.lunchMinutes||0);
 }
 date.onchange=fill;fill();
 const controls=E("div","km-actions",undefined,body);
 const save=E("button","km-btn primary","Guardar corrección auditada",controls);save.type="submit";
 const goBack=E("button","km-btn","Cancelar",controls);goBack.type="button";goBack.onclick=cancel;
 body.onsubmit=async event=>{
  event.preventDefault();
  if(save.disabled||!body.reportValidity())return;
  const startTime=start.value,endTime=finish.value;
  const meal=Number(lunch.value||0);
  if(!/^\d{2}:\d{2}$/.test(startTime)||endTime&&!/^\d{2}:\d{2}$/.test(endTime)){status.textContent="Revisa las horas.";return;}
  if(endTime&&endTime<startTime&&!overnight.checked){status.textContent="Marca turno nocturno si finalizaste al día siguiente.";return;}
  if(date.value<today()&&!endTime){status.textContent="Las jornadas anteriores necesitan una hora de finalización.";return;}
  if(!Number.isInteger(meal)||meal<0||meal>300){status.textContent="Revisa los minutos de comida.";return;}
  if(reason.value.trim().length<10){status.textContent="Explica brevemente el motivo (mínimo 10 caracteres).";return;}
  const candidate=JSON.parse(JSON.stringify(savedShifts));
  const existing=candidate.find(s=>s.user===me()&&(s.localDate||iso(new Date(s.date)))===date.value);
  const before=existing?{startTime:existing.startTime||"",endTime:existing.endTime||"",lunchMinutes:existing.lunchMinutes||0,status:existing.status||""}:null;
  const record=existing||{
   id:Date.now(),user:me(),date:new Date(date.value+"T12:00:00").toISOString(),
   localDate:date.value,status:"finished",startTime:null,lunchStart:null,lunchEnd:null,endTime:null,lunchMinutes:0
  };
  record.startTime=startTime;record.endTime=endTime||null;record.lunchMinutes=meal;
  record.status=endTime?"finished":"working";record.manualCorrection=true;
  record._updatedAt=Date.now();
  record.correctionHistory=Array.isArray(record.correctionHistory)?record.correctionHistory.slice(-19):[];
  record.correctionHistory.push({at:Date.now(),by:me(),reason:reason.value.trim(),before,after:{startTime,endTime:endTime||null,lunchMinutes:meal,status:record.status},overnight:overnight.checked});
  if(!existing)candidate.push(record);
  if(!confirm("¿Guardar esta corrección con el motivo indicado? El historial anterior quedará conservado."))return;
  save.disabled=true;status.textContent="Guardando en Firestore…";
  try{
   if(!window.KonsorBridge?.save||window.KonsorBridge.busy)throw Error("No hay conexión de guardado disponible.");
   await window.KonsorBridge.save("comercial_shifts",candidate);
   savedShifts=candidate;
   if(typeof updateShiftUI==="function")updateShiftUI();
   window.cnvRefreshHome?.();
   status.textContent="Jornada confirmada en Firestore.";setTimeout(cancel,700);
  }catch(e){status.textContent="No se ha confirmado: "+(e.message||e);save.disabled=false;}
 };
 overlay.onclick=e=>{if(e.target===overlay)cancel();};
}
window.konsorCorregirJornada=open;
})();
