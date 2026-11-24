/* KONSOR · Selector de área posterior a autenticación.
 * La cuenta y los permisos son inmutables: cambiar de vista NO suplanta identidades,
 * no cambia el rol de Firebase ni concede acceso a datos de otros trabajadores.
 * Las vistas aún no implementadas son prototipos visuales, sin escrituras.
 */
(function(){
"use strict";
const CHOOSER="konsorAreaChooser",VIEW="konsorDesignerPreview";
const roles=[
 {id:"comercial",name:"Comercial",subtitle:"Captación y clientes",icon:"briefcase"},
 {id:"tecnicos",name:"Técnicos",subtitle:"Instalaciones y obras",icon:"wrench"},
 {id:"oficina",name:"Oficina",subtitle:"Expedientes y documentos",icon:"folder"},
 {id:"ceo",name:"CEO",subtitle:"Dirección general",icon:"chart"}
];
const spaces={
 ceo:{hero:"Supervisar lo importante de cada planta",detail:"Recibe únicamente incidencias críticas, tareas escaladas y decisiones que requieren Dirección.",
  actions:[["Alertas críticas","Incidencias escaladas de todas las plantas","chart"],["Instrucciones","Crear tareas para cualquier planta","users"],["Márgenes y plazos","Configurar umbrales de control","wallet"],["Seguimiento","Estado de tareas y decisiones","list"]]},
 oficina:{hero:"Preparar los expedientes de obra",detail:"Revisa las citas confirmadas, documentos pendientes y expedientes que necesitan atención.",actions:[]},
 tecnicos:{hero:"Preparar la siguiente obra",detail:"Consulta los trabajos asignados y completa cada intervención paso a paso.",actions:[]}
};
const e=(tag,cls,txt,parent)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=String(txt);
 if(parent)parent.append(el);
 return el;
};
let chosen=null;
function permitted(){
 // Esta comprobación controla sólo la selección visual. La autoridad real
 // siempre corresponde a Firebase y a sus reglas del servidor.
 return !!(window.auth?.currentUser?.uid &&
  typeof currentUserRole!=="undefined" && currentUserRole==="jefe" &&
  typeof currentUserName!=="undefined" && currentUserName==="Andrei (Jefe)" &&
  sessionStorage.getItem("auth_user_key")==="jefe" &&
  document.getElementById("appContainer")?.style.display!=="none");
}
function remove(id){document.getElementById(id)?.remove();}
function close(){remove(CHOOSER);remove(VIEW);}
function button(label,fn,parent,cls=""){
 const b=e("button",cls,label,parent);b.type="button";b.onclick=fn;return b;
}
function roleTile(parent,role){
 const b=e("button","kdp-choice",undefined,parent);b.type="button";
 b.setAttribute("aria-label","Entrar como "+role.name);
 const emblem=e("span","kdp-choice-icon",undefined,b);
 e("span","",role.name.slice(0,1),emblem);
 const details=e("span","kdp-choice-text",undefined,b);
 e("strong","",role.name,details);e("small","",role.subtitle,details);
 e("span","kdp-choice-chevron","›",b);
 b.onclick=()=>open(role.id);
 return b;
}
function showChooser(){
 if(!permitted()){close();return false;}
 remove(CHOOSER);
 const previous=document.getElementById(VIEW);
 // El selector es la etapa inmediatamente posterior al login; no se inserta
 // dentro del Inicio comercial ni crea una segunda pantalla de registro.
 const overlay=e("div","kdp-overlay kdp-chooser-overlay",undefined,document.body);
 overlay.id=CHOOSER;overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
 overlay.setAttribute("aria-label","Elegir espacio de trabajo");
 const page=e("section","kdp-chooser",undefined,overlay);
 const header=e("header","kdp-chooser-head",undefined,page);
 e("span","kdp-logo","K",header);e("strong","", "KONSOR",header);
 e("small","","TU ESPACIO",header);
 const content=e("div","kdp-chooser-body",undefined,page);
 e("span","kdp-eyebrow","SESIÓN INICIADA",content);
 e("h1","","¿Con qué perfil quieres entrar?",content);
 e("p","","Utiliza una sola cuenta para acceder a tu trabajo y revisar el diseño de cada área.",content);
 const grid=e("div","kdp-choice-grid",undefined,content);
 roles.forEach(role=>roleTile(grid,role));
 e("p","kdp-chooser-note","Las cuatro áreas comparten la misma estética. Los jefes IA se añadirán dentro de los departamentos cuando sus procesos estén terminados.",content);
 if(chosen!==null||previous){
  button("Volver al espacio actual",()=>remove(CHOOSER),content,"kdp-chooser-cancel");
 }
 return true;
}
function icon(name){
 try{return window.KonsorUI?.icon?.(name)||e("span","kdp-icon-fallback","•");}
 catch(_){return e("span","kdp-icon-fallback","•");}
}
function greeting(){
 const hour=new Date().getHours();
 return hour<13?"Buenos días":hour<21?"Buenas tardes":"Buenas noches";
}
function displayName(){
 try{return typeof getDisplayAlias==="function"?getDisplayAlias(currentUserName):String(currentUserName||"");}
 catch(_){return String(currentUserName||"");}
}
function actionTile(grid,name,description,iconName,fn,full=false){
 const b=e("button","cnv-tile kdp-live-tile"+(full?" kdp-single-tile":""),undefined,grid);
 b.type="button";b.append(icon(iconName));
 const labels=e("span","cnv-tile-labels",undefined,b);
 e("strong","",name,labels);e("small","",description,labels);
 b.onclick=fn;
 return b;
}
function profileSettings(){
 const overlay=document.getElementById(VIEW);
 if(!overlay)return;
 // Los diálogos de Ajustes y Avisos de Comercial tienen z-index menor que la
 // previsualización. Reducirlo permite usar los mismos diálogos reales.
 overlay.style.zIndex="9000";
 if(typeof openUserProfileModal==="function")openUserProfileModal();
 else window.openUserProfileModal?.();
}
function notifications(){
 if(chosen==="ceo"){window.KonsorPlantMessages?.open?.("ceo");return;}
 if(chosen==="oficina"||chosen==="tecnicos"){
  window.KonsorDepartmentNotices?.open?.(chosen);return;
 }
 const overlay=document.getElementById(VIEW);
 if(overlay)overlay.style.zIndex="9000";
 window.openNotificationsCenterV2?.();
}
function contentRows(){
 if(!permitted()||!window.KonsorOfficeArchive)return null;
 try{
  if(!window.KonsorBridge?.state?.().connected||typeof savedZones==="undefined"||!Array.isArray(savedZones))return null;
  return window.KonsorOfficeArchive.clients(savedZones,z=>!String(z.comercial||"").startsWith("Mikel"));
 }catch(_){return null;}
}
function openOfficeBookings(){
 if(!permitted())return false;
 if(typeof window.openCnCallQueue!=="function"){window.alert?.("La agenda real de KONSOR no está disponible.");return false;}
 window.openCnCallQueue();
 const agenda=document.getElementById("konsorOfficeCallV2");
 if(agenda)agenda.style.zIndex="20090";
 return true;
}
function openOfficeNewLead(section){
 if(!permitted()||typeof window.KonsorOfficeLeads?.open!=="function")return false;
 window.KonsorOfficeLeads.open(section,returnHome("oficina"));
 return true;
}
function openExistingOfficeClient(item){
 if(!permitted())return false;
 if(typeof window.konsorOpenExistingClientInOffice!=="function"){
  window.alert?.("La gestión de fichas no está disponible.");return false;
 }
 const ok=window.konsorOpenExistingClientInOffice(item.zoneId,item.id);
 if(ok){const agenda=document.getElementById("konsorOfficeCallV2");if(agenda)agenda.style.zIndex="20090";}
 else window.alert?.("La ficha ha cambiado. Actualiza los datos de Oficina y vuelve a buscarla.");
 return ok;
}
function returnHome(id){return ()=>open(id);}
function officeBrowser(section,id,archive){
 section.replaceChildren();
 const bar=e("div","kdp-internal-bar",undefined,section);
 const back=button("‹ Volver",returnHome(id),bar,"cnv-glass kdp-return");
 back.setAttribute("aria-label","Volver al inicio de Oficina");
 e("span","cnv-eyebrow","OFICINA · "+(archive?"ARCHIVADOR":"CLIENTES"),bar);
 e("h1","kdp-internal-title",archive?"Archivador":"Buscar clientes",section);
 e("p","kdp-explainer","Se consulta la misma ficha original de KONSOR. Los datos y los estados no se modifican desde aquí.",section);
 const refresh=button("Actualizar desde Firebase",async()=>{
  refresh.disabled=true;refresh.textContent="Actualizando…";
  try{
   if(typeof window.KonsorBridge?.refresh!=="function")throw Error("Sin conexión con el servidor.");
   await window.KonsorBridge.refresh(true);
   officeBrowser(section,id,archive);
  }catch(err){refresh.disabled=false;refresh.textContent="Reintentar actualización";
   e("p","kdp-empty","No se ha confirmado la actualización: "+(err.message||err),section);
  }
 },section,"cnv-glass kdp-return");
 const rows=contentRows();
 if(rows===null){e("p","kdp-empty","Todavía no están disponibles los clientes autorizados de Firebase.",section);return;}
 if(!archive){
  const query=e("input","kdp-search",undefined,section);query.type="search";
  query.placeholder="Nombre, teléfono, calle o pueblo…";query.setAttribute("aria-label","Buscar clientes");
  const results=e("div","kdp-records",undefined,section);
  function draw(){
   results.replaceChildren();
   const found=window.KonsorOfficeArchive.find(rows,query.value).slice(0,100);
   if(!found.length){e("p","kdp-empty","No hay clientes para esta búsqueda.",results);return;}
   found.forEach(x=>{
    const card=e("div","kdp-record",undefined,results);
    e("strong","",x.name+" · "+x.street,card);
    e("small","",x.town+" · "+window.KonsorOfficeArchive.displayDate(x),card);
    const foot=e("div","kdp-record-actions",undefined,card);
    if(x.phone)button("Llamar",()=>{window.location.href="tel:"+x.phone.replace(/[^0-9+]/g,"");},foot,"cnv-glass");
    button("Gestionar cita",()=>openExistingOfficeClient(x),foot,"cnv-glass");
   });
  }
  query.addEventListener("input",draw);draw();
  return;
 }
 const list=e("div","kdp-archive-tabs",undefined,section);
 const results=e("div","kdp-records",undefined,section);
 let active="total_leads";
 function draw(){
  list.replaceChildren();results.replaceChildren();
  window.KonsorOfficeArchive.groups.forEach(g=>{
   const count=rows.filter(x=>window.KonsorOfficeArchive.belongs(x,g.id)).length;
   const b=button(g.title+" · "+count,()=>{active=g.id;draw();},list,active===g.id?"cnv-glass kdp-archive-active":"cnv-glass");
   b.setAttribute("aria-pressed",String(active===g.id));
  });
  const group=window.KonsorOfficeArchive.groups.find(g=>g.id===active);
  e("p","kdp-explainer",group.description,results);
  if(active==="nuevos"){
   const review=rows.filter(x=>x.bookingNeedsReview);
   if(review.length)e("p","kdp-empty",review.length+" ficha(s) con estado de obra agendada pero sin fecha válida. Aparecen aquí para no perderlas: entra en la ficha y vincula o verifica la cita original de Google Calendar.",results);
  }
  const found=rows.filter(x=>window.KonsorOfficeArchive.belongs(x,active)).slice(0,100);
  if(!found.length){e("p","kdp-empty","Todavía no hay expedientes en esta categoría.",results);return;}
  found.forEach(x=>{
   const card=e("div","kdp-record",undefined,results);
   e("strong","",x.street+" · "+x.town,card);
   e("small","",x.name+" · "+window.KonsorOfficeArchive.displayDate(x),card);
   const actions=e("div","kdp-record-actions",undefined,card);
   button(x.bookingNeedsReview?"Verificar cita":"Abrir ficha",()=>openExistingOfficeClient(x),actions,"cnv-glass");
  });
 }
 draw();
}
function open(id){
 if(!permitted()){close();chosen=null;return false;}
 if(!roles.some(r=>r.id===id))return false;
 remove(CHOOSER);chosen=id;
 if(id==="comercial"){remove(VIEW);window.cnvShowHome?.();return true;}
 const data=spaces[id];if(!data)return false;
 remove(VIEW);
 const root=e("div","kdp-role-overlay",undefined,document.body);root.id=VIEW;
 root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");
 root.setAttribute("aria-label","Vista de "+roles.find(r=>r.id===id).name);
 const page=e("main","cnv-home kdp-role-home",undefined,root);
 // Esta cabecera usa las mismas clases, iconos y acciones del Inicio comercial.
 const head=e("header","cnv-home-head",undefined,page);
 const brand=e("div","cnv-home-brand",undefined,head);
 const mark=e("div","cnv-brand-mark","K",brand);mark.setAttribute("aria-hidden","true");
 const words=e("div","cnv-brand-text",undefined,brand);
 e("strong","","KONSOR",words);e("small","","ESPACIO DE TRABAJO",words);
 const top=e("div","cnv-home-top-actions",undefined,head);
 const alerts=e("button","cnv-glass cnv-icon-action",undefined,top);
 alerts.type="button";alerts.append(icon("calendar"));alerts.title="Avisos";
 alerts.setAttribute("aria-label","Abrir avisos");alerts.onclick=notifications;
  window.KonsorIndicators?.bind?.(alerts,id,"bell");
 const settings=e("button","cnv-glass cnv-icon-action",undefined,top);
 settings.type="button";settings.append(icon("settings"));settings.title="Ajustes";
 settings.setAttribute("aria-label","Abrir ajustes");settings.onclick=profileSettings;
 const change=button("Cambiar área",showChooser,top,"cnv-glass kdp-switch");
 change.setAttribute("aria-label","Elegir otro espacio de trabajo");
 const section=e("section","cnv-home-content",undefined,page);
 const welcome=e("div","cnv-home-welcome",undefined,section);
 const role=roles.find(r=>r.id===id);
 e("span","cnv-eyebrow",id==="tecnicos"?"MI ESPACIO · TÉCNICOS":id==="oficina"?"MI ESPACIO · OFICINA":role.name.toUpperCase(),welcome);
 e("h1","",greeting(),welcome);e("p","",displayName(),welcome);
 const hero=e("section","cnv-home-hero",undefined,section);
 const heroIcon=e("span","cnv-home-hero-icon",undefined,hero);
 heroIcon.append(icon(id==="tecnicos"?"calendar":id==="oficina"?"office":"results"));
 const heroText=e("div","cnv-home-hero-content",undefined,hero);
 e("span","cnv-hero-eyebrow","SIGUIENTE PASO RECOMENDADO",heroText);
 e("h2","",data.hero,heroText);e("p","",data.detail,heroText);
 const heroAction=id==="oficina"?"Abrir mi jornada":id==="tecnicos"?"Empezar mi jornada":"Ver mi trabajo";
 const activate=()=>{
  if(id==="tecnicos"||id==="oficina"){
   section.replaceChildren();
   const returnBar=e("div","kdp-internal-bar",undefined,section);
   button("‹ Volver",returnHome(id),returnBar,"cnv-glass kdp-return");
   e("span","cnv-eyebrow",id==="tecnicos"?"TÉCNICOS":"OFICINA",returnBar);
   if(id==="tecnicos")window.konsorTecnicosGuiado?.render?.(section);
   else window.konsorOficinaGuiada?.render?.(section);
  }
 };
 const primary=button(heroAction,activate,hero,"cnv-home-primary");
 primary.append(e("span","","→"));
 const label=e("div","cnv-group-label",undefined,section);
 e("strong","","TU TRABAJO",label);e("span","","Accesos principales",label);
 const grid=e("div","cnv-home-grid kdp-role-grid",undefined,section);
 if(id==="tecnicos"){
  actionTile(grid,"Mi jornada","Ruta, obras y cierre del día","calendar",activate);
  window.KonsorIndicators?.bind?.(actionTile(grid,"Mensajes de plantas","Instrucciones, incidencias y confirmaciones","folder",()=>window.KonsorPlantMessages?.open?.("tecnicos")),"tecnicos");
 }else if(id==="oficina"){
  actionTile(grid,"Mi jornada","Documentos, revisiones y tramitación","calendar",activate);
  actionTile(grid,"Citas y llamadas","Acceso secundario a agenda y nuevas reservas","calendar",openOfficeBookings);
  window.KonsorIndicators?.bind?.(actionTile(grid,"Mensajes de plantas","Solicitudes de Técnicos y Dirección","folder",()=>window.KonsorPlantMessages?.open?.("oficina")),"oficina");
  actionTile(grid,"Nuevo cliente","Registrar lead sin sector ni planificación territorial","users",()=>openOfficeNewLead(section));
  actionTile(grid,"Clientes","Buscar y consultar fichas","office",()=>officeBrowser(section,id,false));
  actionTile(grid,"Archivador","Total leads, nuevos, haciendo, por llegar y terminados","folder",()=>officeBrowser(section,id,true),true);
 }else{
  data.actions.forEach(([name,detail,ico])=>actionTile(grid,name,detail,
   ico==="calendar"?"calendar":ico==="map"?"map":ico==="folder"?"office":"results",
   ()=>window.KonsorPlantMessages?.open?.("ceo")));
  const inbox=actionTile(grid,"Mensajes entre plantas","Bandeja de Dirección y avisos críticos","folder",()=>window.KonsorPlantMessages?.open?.("ceo"));
  window.KonsorIndicators?.bind?.(inbox,"ceo");
 }
 if(id==="ceo"){
  const management=e("section","cnv-home-management",undefined,section);
  const copy=e("div","cnv-home-management-copy",undefined,management);
  e("span","cnv-eyebrow","GESTIÓN DEL EQUIPO",copy);
  e("strong","","Dirección",copy);
  e("p","","Planificación, comerciales, territorio y resultados.",copy);
  button("Abrir gestión",()=>{
   root.style.zIndex="9000";
   window.openKonsorDirection?.();
  },management,"cnv-home-management-button");
 }
 if(id==="tecnicos"||id==="oficina"){
  e("p","kdp-explainer","Los clientes y las citas se consultan desde Firebase. Las fases técnicas y los cierres documentales permanecen sujetos a validación.",section);
 }
 const footer=e("div","cnv-home-footer",undefined,section);
 e("span","","KONSOR",footer);
 e("span","",(id==="tecnicos"||id==="oficina")?"KONSOR · DATOS CONECTADOS":"KONSOR · DIRECCIÓN",footer);
 return true;
}
// Compatibilidad con llamadas antiguas: no insertar pestañas en el Inicio.
function mount(home){home?.querySelector("#konsorDesignerAccess")?.remove();}
window.konsorDesigner={permitted,showChooser,open,close,mount,current:()=>chosen,roles:roles.map(r=>r.id)};
})();
