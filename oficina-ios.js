/* KONSOR · Oficina. Un recorrido operativo con los datos sincronizados existentes. */
(function(){
"use strict";
const el=window.KonsorUI.el;
const btn=(title,fn,cls)=>{const x=el("button","cn-office-btn "+(cls||""),title);x.type="button";x.onclick=fn;return x;};
const today=()=>typeof getTodayISO==="function"?getTodayISO():new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
let section="home";
function zones(){
 if(!Array.isArray(savedZones))return [];
 return savedZones.map((z,idx)=>({z,idx})).filter(({z})=>z&&!z.isNoAptoZone&&!z.isHotMission&&!z.isSingleHouse&&(currentUserRole==="jefe"?typeof isMikelTeamMember==="function"&&!isMikelTeamMember(z.comercial):z.comercial===currentUserName));
}
function clientRows(){
 return zones().flatMap(({z,idx})=>(z.clients||[]).filter(c=>c&&(c.name||c.phone||c.street)).map(c=>({c,z,idx})));
}
const booked=c=>["agendada","realizada"].includes(c.obraStatus);
const excluded=c=>c.captacionInvalida||c.obraStatus==="no_apto"||["no_interesado","descartado","pendiente_visita"].includes(c.callStatus)||["no","ausente","papelito"].includes(c.captacionRespuesta);
const complete=c=>!!(String(c.name||"").trim()&&String(c.phone||"").trim()&&String(c.street||"").trim());
function state(){
 const zz=zones(),cc=clientRows(),open=zz.filter(x=>x.z.status!=="completada");
 const late=zz.filter(x=>x.z.dumpDate&&x.z.dumpDate>x.z.date);
 const unuploaded=zz.filter(x=>(Number(x.z.streetCompletedAt)>0&&!x.z.dumpDate) || (x.z.date&&x.z.date<today()&&!x.z.dumpDate));
 const streetFinished=unuploaded.filter(x=>Number(x.z.streetCompletedAt)>0&&!x.z.dumpDate);
 const lateUnstarted=unuploaded.filter(x=>!x.z.streetCompletedAt);
 const ordered=streetFinished.concat(lateUnstarted).sort((a,b)=>(a.z.date||"9999").localeCompare(b.z.date||"9999"));
 const pending=cc.filter(x=>!booked(x.c)&&!excluded(x.c));
 const incomplete=pending.filter(x=>!complete(x.c));
 const invalid=cc.filter(x=>x.c.captacionInvalida);
 return {zz,cc,open,late,unuploaded:ordered,streetFinished,pending,incomplete,invalid,booked:cc.filter(x=>booked(x.c)),scheduled:cc.filter(x=>x.c.obraStatus==="agendada")};
}
function root(){
 let r=document.getElementById("cnOficina");if(r)return r;
 r=el("div","modal-overlay cn-oficina",undefined,document.body);r.id="cnOficina";r.style.zIndex="10134";
 r.innerHTML='<div class="cn-office-page" role="dialog" aria-modal="true" aria-label="Oficina"><div class="cn-office-header"><div><span>KONSOR · GESTIÓN</span><h2>Oficina</h2></div><button class="cn-office-exit" type="button">Cerrar</button></div><div class="cn-office-body"></div></div>';
 r.querySelector(".cn-office-exit").onclick=()=>r.classList.remove("active");
 r.addEventListener("click",ev=>{if(ev.target===r)r.classList.remove("active");});return r;
}
function card(body,label,title,desc){
 const c=el("section","cn-office-card",undefined,body);
 if(label)el("span","cn-office-kicker",label,c);
 if(title)el("h3","",title,c);
 if(desc)el("p","",desc,c);
 return c;
}
function line(parent,main,detail,action,fn){
 const row=el("div","cn-office-row",undefined,parent);
 el("strong","",main,row);if(detail)el("span","",detail,row);
 if(action&&fn)row.append(btn(action,fn,"subtle"));
 return row;
}
function openSheet(idx){root().classList.remove("active");if(typeof openDumpModal==="function")openDumpModal(idx);}
function openCalls(){root().classList.remove("active");window.openKonsorOfficeClients?.();}
function openSearch(){root().classList.remove("active");window.openCnClients?.();}
function nav(body){body.append(btn("‹ Volver a Oficina",()=>{section="home";render();},"subtle"));}
function render(){
 const body=root().querySelector(".cn-office-body");body.replaceChildren();
 const s=state();
 if(section==="home"){
  const flow=card(body,"ASISTENTE DE OFICINA","Trabaja sin buscar pestañas","Primero las hojas antiguas, después fichas, seguimientos y llamadas. Se comprueba el progreso después de cada guardado.");
  flow.append(btn("Continuar recorrido de Oficina",()=>{root().classList.remove("active");window.konsorMotor?.openOffice?.();},"primary"));
  const lead=card(body,"TU SIGUIENTE ACCIÓN",s.unuploaded.length?"Hay "+s.unuploaded.length+" sectores que requieren revisión o volcado":s.incomplete.length?"Revisa "+s.incomplete.length+" fichas incompletas":s.pending.length?"Tienes "+s.pending.length+" clientes por gestionar":"Trabajo de Oficina al día",
   s.unuploaded.length?"Empieza por las calles ya terminadas y pendientes de volcar. Revisa después los sectores antiguos cuyo trabajo no conste como terminado.":s.incomplete.length?"Completa los datos esenciales antes de gestionar citas.":s.pending.length?"Continúa las llamadas hasta resolver la situación de cada cliente.":"Consulta las obras confirmadas o revisa el cierre.");
  lead.append(btn(s.unuploaded.length?"Volcar hojas pendientes":s.pending.length?"Continuar con clientes":"Ver agenda",()=>{if(s.unuploaded.length){section="volcados";render();}else if(s.pending.length)openCalls();else{section="agenda";render();}},"primary"));
  const comunidad=card(body,"COMUNIDADES · SISTEMA CAE","Junta y expediente en dos pasos","Contacta con presidencia, prepara la convocatoria y registra el resultado de la junta en una ficha independiente.");
  comunidad.append(btn("Gestionar comunidades",()=>{root().classList.remove("active");window.openKonsorComunidades?.();},"primary"));
  const steps=card(body,"RECORRIDO DE OFICINA","Cuatro momentos, una sola secuencia");
  [
   ["01 · Volcar hojas",s.streetFinished.length+" calles terminadas · "+s.unuploaded.length+" sectores por revisar","volcados"],
   ["02 · Revisar fichas",s.incomplete.length+" incompletas · "+s.invalid.length+" sin teléfono válido","clients"],
   ["03 · Llamar y agendar",s.pending.length+" pendientes · "+s.scheduled.length+" citas programadas","calls"],
   ["04 · Revisar y cerrar",s.booked.length+" registros con obra programada o realizada","review"]
  ].forEach(([a,b,dest])=>line(steps,a,b,"Abrir",()=>{if(dest==="clients")openSearch();else if(dest==="calls")openCalls();else{section=dest;render();}}));
  const note=card(body,"FECHAS Y REGISTROS","El volcado tardío no cambia el día trabajado","La fecha del sector y la fecha de registro deben mantenerse diferenciadas. Salir de Oficina no finaliza la jornada.");
  note.append(btn("Ver agenda de obras",()=>{section="agenda";render();},"subtle"));
 }else if(section==="volcados"){
  nav(body);
  const list=card(body,"01 · VOLCADO","Hojas pendientes","Abre el sector, comprueba los resultados y guarda con la fecha real del trabajo de calle.");
  const items=s.unuploaded.concat(s.open.filter(x=>!s.unuploaded.some(item=>String(item.z.id)===String(x.z.id))));
  el("p","",items.length+" sector(es) para revisar · empieza siempre por el más antiguo.",list);
  if(!items.length)el("p","","No quedan sectores abiertos.",list);
  items.forEach(({z,idx})=>{
   const delayed=z.date&&z.date<today()&&!z.dumpDate; const streetCompleted=Number(z.streetCompletedAt)>0&&!z.dumpDate;
   line(list,z.town||"Localidad pendiente",[z.sectorName||"Sector",z.date||"Sin fecha",streetCompleted?"Calle terminada · Volcado pendiente":delayed?"Sector antiguo · Comprueba trabajo de calle":"",z.dumpDate?"Registrado: "+z.dumpDate:""].filter(Boolean).join(" · "),"Abrir hoja",()=>openSheet(idx));
  });
 }else if(section==="agenda"){
  nav(body);
  const c=card(body,"AGENDA DE OBRAS","Obras registradas","Solo se muestran fechas guardadas. Una sugerencia de hueco no es una reserva confirmada.");
  let last="";
  s.booked.filter(x=>x.c.obraDate).sort((a,b)=>(String(a.c.obraDate).localeCompare(String(b.c.obraDate)) || String(a.c.obraTime||"").localeCompare(String(b.c.obraTime||"")))).forEach(({c:client,z})=>{
   if(client.obraDate!==last){last=client.obraDate;el("h3","",last,c);}
   line(c,(client.obraTime||"Sin hora")+" · "+(client.name||"Sin nombre"),[z.town,client.obraStatus==="realizada"?"Realizada":"Programada","Equipo "+(client.obraEquipoInstalacion||"sin asignar")].filter(Boolean).join(" · "));
  });
  if(!last)el("p","","No hay obras con fecha registrada.",c);
  c.append(btn("Gestionar llamadas y reservas",openCalls,"primary"));
 }else{
  nav(body);
  const c=card(body,"04 · REVISIÓN","Antes de terminar","Comprobación de los datos que constan ahora mismo en los sectores sincronizados.");
  [["Sectores abiertos",s.open.length],["Sectores anteriores sin volcar",s.unuploaded.length],["Fichas incompletas pendientes",s.incomplete.length],["Clientes por gestionar",s.pending.length],["Obras agendadas",s.scheduled.length]].forEach(([a,b])=>line(c,a,String(b)));
  el("p","","Esta revisión no sustituye el cierre del fichaje de jornada.",c);
  c.append(btn(s.pending.length?"Resolver clientes pendientes":"Volver a Oficina",()=>{if(s.pending.length)openCalls();else{section="home";render();}},"primary"));
 }
}
window.openCnOffice=function(){section="home";render();root().classList.add("active");};
})();

/* Módulo independiente de Comunidades, sin alterar las fichas individuales. */
(function(){const js=document.createElement('script');js.src='./comunidades-guiadas-ios.js?v=1';js.defer=true;document.head.append(js);})();
