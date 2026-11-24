/* KONSOR · Oficina. Un recorrido operativo con los datos sincronizados existentes. */
(function(){
"use strict";
const el=window.KonsorUI.el;
const btn=(title,fn,cls)=>{const x=el("button","cn-office-btn "+(cls||""),title);x.type="button";x.onclick=fn;return x;};
const today=()=>typeof getTodayISO==="function"?getTodayISO():new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
let section="home";
function zones(){
 if(!Array.isArray(savedZones))return [];
 return savedZones.map((z,idx)=>({z,idx})).filter(({z})=>z&&!z.isNoAptoZone&&!z.isHotMission&&(currentUserRole==="jefe"?typeof isMikelTeamMember==="function"&&!isMikelTeamMember(z.comercial):z.comercial===currentUserName));
}
function clientRows(){
 return zones().flatMap(({z,idx})=>(z.clients||[]).filter(c=>c&&(c.name||c.phone||c.street)).map(c=>({c,z,idx})));
}
const booked=c=>["agendada","agendada_historica","realizada"].includes(c.obraStatus);
const excluded=c=>c.captacionInvalida||c.obraStatus==="no_apto"||["no_interesado","descartado","pendiente_visita"].includes(c.callStatus)||["no","ausente","papelito"].includes(c.captacionRespuesta);
const complete=c=>!!(String(c.name||"").trim()&&String(c.phone||"").trim()&&String(c.street||"").trim());
function state(){
 const zz=zones(),cc=clientRows(),open=zz.filter(x=>!window.konsorIsHistoricalOnlySector?.(x.z)&&x.z.status!=="completada");
 const late=zz.filter(x=>x.z.dumpDate&&x.z.dumpDate>x.z.date);
 const unuploaded=zz.filter(x=>!window.konsorIsHistoricalOnlySector?.(x.z)&&((Number(x.z.streetCompletedAt)>0&&!x.z.dumpDate) || (x.z.date&&x.z.date<today()&&!x.z.dumpDate)));
 const streetFinished=unuploaded.filter(x=>Number(x.z.streetCompletedAt)>0&&!x.z.dumpDate);
 const lateUnstarted=unuploaded.filter(x=>!x.z.streetCompletedAt);
 const ordered=streetFinished.concat(lateUnstarted).sort((a,b)=>(a.z.date||"9999").localeCompare(b.z.date||"9999"));
 const pending=cc.filter(x=>!booked(x.c)&&!excluded(x.c));
 const incomplete=pending.filter(x=>!complete(x.c));
 const invalid=cc.filter(x=>x.c.captacionInvalida);
 return {zz,cc,open,late,unuploaded:ordered,streetFinished,pending,incomplete,invalid,booked:cc.filter(x=>booked(x.c)),scheduled:cc.filter(x=>["agendada","agendada_historica"].includes(x.c.obraStatus))};
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
function openSearch(){root().classList.remove("active");(window.openKonsorClients||window.openCnClients)?.();}
function openNewClient(mode){
 const open=window.openKonsorNewClient;
 if(typeof open!=="function"){window.alert("El formulario no está disponible. Actualiza KONSOR desde el inicio.");return;}
 root().classList.remove("active");
 try{open(mode);}catch(err){root().classList.add("active");window.alert("No se pudo abrir la ficha: "+(err.message||err));}
}
function nav(body){body.append(btn("‹ Volver a Oficina",()=>{section="home";render();},"subtle"));}
function render(){
 const body=root().querySelector(".cn-office-body");body.replaceChildren();
 const s=state();
 if(section==="home"){
  const lead=card(body,"SIGUIENTE PASO","Trabajo pendiente",
   s.incomplete.length?s.incomplete.length+" fichas necesitan completar datos.":
   s.pending.length?s.pending.length+" clientes pendientes de gestionar.":"Consulta la agenda y continúa la jornada.");
  lead.append(btn("Continuar mi trabajo",()=>{root().classList.remove("active");window.konsorMotor?.openOffice?.();},"primary"));
  const grid=el("div","cn-office-home-grid",undefined,body);
  const shortcuts=[
   ["Clientes","Buscar y editar fichas",openSearch],
   ["Llamadas","Contactar y confirmar citas",openCalls],
   ["Calendario","Huecos de todos los equipos",()=>{root().classList.remove("active");window.openCnCallQueue?.();}],
   ["Obras","Agendadas, realizadas y pendientes",()=>{section="agenda";render();}]
  ];
  shortcuts.forEach(([title,description,action])=>{
   const item=btn(title,action,"cn-office-home-tile");
   el("span","cn-office-tile-desc",description,item);
   grid.append(item);
  });
  const create=card(body,"ALTA DE CLIENTES","Nuevo cliente","El sector es opcional. Una única ficha que podrás completar después.");
  create.append(btn("Proceso guiado",()=>openNewClient("guided"),"primary"));
  create.append(btn("Ficha completa",()=>openNewClient("full"),"subtle"));
  const other=el("details","cn-office-more",undefined,body);
  el("summary","","Volcados y herramientas de gestión",other);
  const advanced=el("div","cn-office-more-body",undefined,other);
  advanced.append(btn("Volcar hojas de sectores",()=>{section="volcados";render();},"subtle"));
  advanced.append(btn("Cartera de clientes",()=>{root().classList.remove("active");window.openKonsorClients?.();},"subtle"));
  advanced.append(btn("Comunidades",()=>{root().classList.remove("active");window.openKonsorComunidades?.();},"subtle"));
  advanced.append(btn("Revisar pendientes y cierre",()=>{section="review";render();},"subtle"));
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
