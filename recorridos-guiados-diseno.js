/* KONSOR · Circuitos guiados de diseño. Interacción SOLO en memoria.
 * No guarda en Firebase, sube archivos, emite avisos ni altera Calendar.
 */
(function(w){
"use strict";
const data={tech:new Map(),office:new Map(),messages:[],started:false};
const E=(tag,cls,t,p)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(t!==undefined)e.textContent=String(t);p?.append(e);return e;};
const B=(p,t,fn,cls="")=>{const b=E("button","kg-button "+cls,t,p);b.type="button";b.onclick=fn;return b;};
const P=(p,title,desc)=>{const x=E("section","kg-card",undefined,p);E("h3","",title,x);if(desc)E("p","kg-help",desc,x);return x;};
const note=(p,t)=>E("p","kg-help",t,p);
const step=(p,t)=>E("div","kg-step",t,p);
const box=(p,label)=>{const wrap=E("label","kg-field",undefined,p);E("span","",label,wrap);const x=E("textarea","",undefined,wrap);x.rows=3;return x;};
const choice=(p,items,selected,cb)=>{const r=E("div","kg-actions",undefined,p);items.forEach(([id,name])=>{const b=B(r,name,()=>cb(id),selected===id?"kg-selected":"kg-light");b.setAttribute("aria-pressed",String(selected===id));});};
const dt=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
const demo=()=>Array.from({length:4},(_,i)=>({id:"demo-"+(i+1),street:"Vivienda ficticia "+(i+1),location:"Municipio de prueba",date:dt(),start:["09:00","11:00","15:00","17:00"][i],end:["11:00","13:00","17:00","19:00"][i],team:2,clientName:"Cliente de prueba "+(i+1),code:"agendada"}));
function state(map,id,init){if(!map.has(id))map.set(id,init());return map.get(id);}
const ts=id=>state(data.tech,id,()=>({phase:"ruta",result:"",reason:"",before:0,after:0,done:false}));
const os=id=>state(data.office,id,()=>({phase:"revisar",answer:"",reason:"",validation:""}));
const msg=(from,to,subject,detail)=>data.messages.unshift({from,to,subject,detail});
const heading=(host,title,subtitle)=>{
 host.replaceChildren();const root=E("section","kg-root",undefined,host);
 E("span","kg-kicker","KONSOR · TRABAJO GUIADO",root);
 E("h2","",title,root);note(root,subtitle);
 E("p","kg-warning","MODO DISEÑO · Las acciones son una simulación local. Ninguna confirmación se guarda, envía ni modifica expedientes reales.",root);
 return root;
};
const showJob=(p,j,i,total)=>{
 const c=P(p,(i+1)+" de "+total+" · "+j.street,j.location+" · "+j.date);
 step(c,(j.start||"Hora pendiente")+(j.end?"–"+j.end:"")+" · "+(j.team?"Equipo "+j.team:"Sin equipo"));
 return c;
};
function source(p,mode,set){
 const card=P(p,"Origen de las obras","Utiliza datos ficticios para probar acciones o consulta tus fichas reales sin modificarlas.");
 choice(card,[["demo","Probar recorrido"],["real","Ver datos reales"]],mode,set);
}
function realJobs(type){
 try{
  if(!w.KonsorBridge?.state?.().connected||!Array.isArray(savedZones))return null;
  const own=z=>!String(z.comercial||"").startsWith("Mikel");
  return (type==="tech"?w.KonsorTechnicalFlow.entries:w.KonsorOfficeFlow.entries)(savedZones,own);
 }catch(_){return null;}
}
function showReal(p,entries,type){
 const c=P(p,type==="tech"?"Mis obras registradas":"Expedientes registrados","Consulta de solo lectura de la ficha original.");
 if(entries===null){note(c,"Sin conexión con las fichas de Firebase. No se inventan registros.");return;}
 if(!entries.length){note(c,"No hay obras vinculadas a las fichas visibles. Una obra de Calendar debe asociarse primero a su vivienda.");return;}
 entries.forEach(j=>{
  const name=j.street+" · "+(j.location||j.town),date=j.date||"Fecha pendiente";
  step(c,name+" · "+date+" · "+(j.status||j.category||"Pendiente"));
 });
}
function route(p,j){
 B(p,"Abrir ruta de la vivienda",()=>w.open("https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(j.street+", "+j.location),"_blank","noopener,noreferrer"),"kg-light");
}
function finishOne(j){
 const x=ts(j.id);x.done=true;
 if(x.result==="si")msg("Técnicos","Oficina","Revisar documentación de "+j.street,"Fotos y resultado pendientes de validación");
 else msg("Técnicos","Comercial","Reprogramar "+j.street,x.reason);
}
function technician(host){
 const root=heading(host,"Mi jornada · Técnicos","Iniciar → Ruta → En vivienda → Instalación → Fotos → Resultado → Siguiente obra → Informe.");
 let mode="demo",selected=0,report=false;
 function draw(){
  root.querySelector(".kg-body")?.remove();const body=E("div","kg-body",undefined,root);
  source(body,mode,v=>{mode=v;selected=0;report=false;draw();});
  if(mode==="real"){showReal(body,realJobs("tech"),"tech");return;}
  const jobs=demo(),done=jobs.filter(j=>ts(j.id).done).length;
  const stats=P(body,"Hoy tienes 4 obras","Equipo 2 · Ejemplo de jornada");
  step(stats,done+" realizadas o con incidencia · "+(4-done)+" pendientes");
  if(!data.started){B(stats,"Empezar jornada",()=>{data.started=true;draw();},"kg-primary");return;}
  if(report){
   const c=P(body,"Informe de la jornada","Revisa lo que se ha registrado en esta demostración.");
   jobs.forEach(j=>step(c,j.street+": "+(ts(j.id).result||"Pendiente")));
   const obs=box(c,"Observaciones del equipo");
   B(c,"Finalizar trabajo",()=>{note(c,"Jornada de prueba cerrada. "+(obs.value.trim()?"Observaciones incluidas.":"Sin observaciones.")+" No se ha guardado ningún fichaje.");data.started=false;},"kg-primary");
   B(c,"Volver a las obras",()=>{report=false;draw();},"kg-light");return;
  }
  const tabs=P(body,"Obras de hoy","Elige una vivienda o sigue la recomendación.");
  choice(tabs,jobs.map((j,i)=>[String(i),(i+1)+(ts(j.id).done?" ✓":"")]),String(selected),v=>{selected=Number(v);draw();});
  const j=jobs[selected],s=ts(j.id),card=showJob(body,j,selected,4);
  if(s.phase==="ruta"){
   note(card,"Comprueba el desplazamiento y avisa cuando llegues.");
   route(card,j);B(card,"Estoy en la vivienda",()=>{s.phase="viabilidad";draw();},"kg-primary");
  }else if(s.phase==="viabilidad"){
   const c=P(card,"¿Se puede realizar la instalación?","Marca la situación real al llegar.");
   choice(c,[["si","Sí"],["aplazada","Aplazar"],["no","No"]],s.result,v=>{s.result=v;draw();});
   const obs=box(c,"Motivo u observaciones");
   if(s.result==="si")B(c,"Continuar con la documentación",()=>{s.phase="fotos";draw();},"kg-primary");
   if(s.result==="aplazada"||s.result==="no")B(c,"Registrar incidencia y notificar (prueba)",()=>{
    if(!obs.value.trim()){note(c,"Es obligatorio indicar el motivo.");return;}
    s.reason=obs.value.trim();finishOne(j);s.phase="cerrado";draw();
   },"kg-primary");
  }else if(s.phase==="fotos"){
   const c=P(card,"Documentación de la intervención","Se pedirán fotografías antes y después, y los archivos adicionales que exija Oficina.");
   [["Fotos de antes","before"],["Fotos de después","after"]].forEach(([label,key])=>{
    const l=E("label","kg-upload",label+" · Seleccionar archivos (solo prueba)",c);
    const inp=E("input","",undefined,l);inp.type="file";inp.accept="image/*";inp.multiple=true;
    inp.onchange=()=>{s[key]=inp.files?.length||0;note(c,s[key]+" archivos elegidos; no subidos.");};
   });
   B(c,"Revisar resultado",()=>{s.phase="confirmar";draw();},"kg-primary");
  }else if(s.phase==="confirmar"){
   const c=P(card,"¿Está terminada la obra?","La confirmación real exigirá fotos guardadas y validación de servidor.");
   note(c,s.before+" fotos de antes, "+s.after+" de después (solo seleccionadas en este dispositivo).");
   choice(c,[["si","Sí"],["aplazada","Aplazada"],["no","No"]],s.result,v=>{s.result=v;draw();});
   const obs=box(c,"Observaciones y motivo de incidencia");
   B(c,"Registrar resultado (prueba)",()=>{
    if(s.result==="si"&&(!s.before||!s.after)){note(c,"Selecciona fotos antes y después.");return;}
    if(s.result!=="si"&&!obs.value.trim()){note(c,"Explica el motivo.");return;}
    s.reason=obs.value.trim();finishOne(j);s.phase="cerrado";draw();
   },"kg-primary");
  }else{
   const c=P(card,"Intervención completada en la demostración",s.result==="si"?"Oficina recibiría un aviso de revisión.":"Comercial recibiría una solicitud de reprogramación.");
   const next=jobs.findIndex((x,i)=>i>selected&&!ts(x.id).done);
   B(c,next<0?"Ver informe y finalizar":"Ir a la siguiente vivienda",()=>{if(next<0)report=true;else selected=next;draw();},"kg-primary");
   if(next>=0)route(c,jobs[next]);
  }
  if(done===4)B(body,"Revisar informe de las 4 obras",()=>{report=true;draw();},"kg-light");
 }
 draw();
}
function office(host){
 const root=heading(host,"Mi jornada · Oficina","Obras de hoy → Revisar documentación → Corregir o tramitar → Esperar validación → Siguiente expediente.");
 let mode="demo",index=0,filter="todos";
 function draw(){
  root.querySelector(".kg-body")?.remove();const body=E("div","kg-body",undefined,root);
  source(body,mode,v=>{mode=v;index=0;draw();});
  if(mode==="real"){showReal(body,realJobs("office"),"office");return;}
  const jobs=demo(),pending=jobs.filter(j=>os(j.id).phase!=="cerrado").length;
  const dash=P(body,"Trabajo de hoy","Tienes 4 obras previstas. Mientras se ejecutan, sigue con los expedientes pendientes.");
  step(dash,pending+" expedientes sin cerrar · "+data.messages.filter(m=>m.to==="Oficina").length+" avisos ficticios de técnicos");
  const inbox=P(body,"Bandeja de avisos","Las solicitudes entre departamentos se registrarán realmente cuando exista el servicio de notificaciones.");
  data.messages.filter(m=>m.to==="Oficina"||m.to==="Técnicos").slice(0,4).forEach(m=>step(inbox,m.from+" → "+m.to+": "+m.subject));
  if(!data.messages.length)note(inbox,"Sin mensajes de demostración por ahora.");
  const list=P(body,"Expedientes","Selecciona una obra para continuar.");
  choice(list,jobs.map((j,i)=>[String(i),(i+1)+(os(j.id).phase==="espera"?" · En espera":"")]),String(index),v=>{index=Number(v);draw();});
  const j=jobs[index],s=os(j.id),c=showJob(body,j,index,jobs.length);
  if(s.phase==="revisar"){
   const r=P(c,"¿Fotos y documentos legibles y correctos?","Inspeccionar los documentos antes de aprobar su tramitación.");
   note(r,"Aquí se mostrarían los archivos reales del expediente. En diseño no hay documentos cargados.");
   choice(r,[["si","Sí"],["no","No"]],s.answer,v=>{s.answer=v;draw();});
   const reason=box(r,"Motivo de corrección o nota de revisión");
   if(s.answer==="si")B(r,"Pasar a tramitar (prueba)",()=>{s.phase="tramitar";draw();},"kg-primary");
   if(s.answer==="no")B(r,"Solicitar corrección a Técnicos (prueba)",()=>{
    if(!reason.value.trim()){note(r,"Especifica qué foto o documento está mal.");return;}
    s.reason=reason.value.trim();s.phase="correccion";
    msg("Oficina","Técnicos","Rehacer documentación: "+j.street,s.reason);draw();
   },"kg-primary");
  }else if(s.phase==="correccion"){
   const r=P(c,"Esperando corrección del técnico",s.reason);
   B(r,"Simular llegada de nuevas fotos",()=>{s.phase="revisar";s.answer="";draw();},"kg-primary");
   B(r,"Continuar con otro expediente",()=>{index=(index+1)%jobs.length;draw();},"kg-light");
  }else if(s.phase==="tramitar"){
   const r=P(c,"Tramitar documentos","Ya se han revisado las fotos y el expediente puede pasar a gestión.");
   const notes=box(r,"Observaciones de tramitación");
   B(r,"Documentos tramitados · Esperar validación",()=>{s.notes=notes.value.trim();s.phase="espera";draw();},"kg-primary");
  }else if(s.phase==="espera"){
   const r=P(c,"Pendiente de validación externa","No se da por terminado el expediente mientras no exista confirmación.");
   const proof=box(r,"Referencia o confirmación recibida");
   B(r,"Validación recibida (prueba)",()=>{
    if(!proof.value.trim()){note(r,"Indica qué confirmación has recibido.");return;}
    s.validation=proof.value.trim();s.phase="cerrado";draw();
   },"kg-primary");
   B(r,"Ir al siguiente trabajo mientras esperamos",()=>{
    const next=jobs.findIndex((x,i)=>i!==index&&!["espera","cerrado"].includes(os(x.id).phase));
    if(next>=0){index=next;draw();}else note(r,"Todos los expedientes disponibles están en espera o cerrados.");
   },"kg-light");
  }else{
   const r=P(c,"Expediente cerrado en demostración","La confirmación no modifica datos reales.");
   B(r,"Siguiente expediente",()=>{index=(index+1)%jobs.length;draw();},"kg-primary");
  }
 }
 draw();
}
w.KonsorGuidedDesign=Object.freeze({technician,office,demo,messages:data.messages});
})(window);
