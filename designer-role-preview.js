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
 {id:"ceo",name:"CEO",subtitle:"Dirección general",icon:"chart"},
 {id:"jefe",name:"Jefe de área",subtitle:"Planificación y equipo",icon:"users"},
 {id:"oficina",name:"Oficina",subtitle:"Expedientes y seguimiento",icon:"folder"},
 {id:"tecnicos",name:"Técnicos",subtitle:"Ejecución de obras",icon:"wrench"},
 {id:"trabajador",name:"Trabajador",subtitle:"Jornada y tareas",icon:"clock"}
];
const spaces={
 ceo:{hero:"Supervisar el funcionamiento de KONSOR",detail:"Consulta el rendimiento, las prioridades y los costes de toda la empresa.",
  actions:[["Producción","Resultados y obras","chart"],["Equipos","Áreas y responsables","users"],["Economía","Gastos y previsiones","wallet"],["Prioridades","Incidencias y decisiones","list"]]},
 jefe:{hero:"Organizar el trabajo del equipo",detail:"Planifica las jornadas y revisa los resultados y las incidencias de tu área.",
  actions:[["Planificar","Asignar trabajo y equipos","calendar"],["Territorio","Zonas y repartos","map"],["Seguimiento","Tareas y avisos","list"],["Resultados","Rendimiento del equipo","chart"]]},
 oficina:{hero:"Continuar con los expedientes",detail:"Comprueba documentos y gestiona las obras pendientes de cierre.",
  actions:[["Expedientes","Documentos pendientes","folder"],["Obras","Agendadas y ejecutadas","calendar"],["Llamadas","Clientes por contactar","phone"],["Incidencias","Revisiones y bloqueos","list"]]},
 tecnicos:{hero:"Preparar la siguiente obra",detail:"Consulta los trabajos asignados y completa cada intervención paso a paso.",
  actions:[["Mis obras","Dirección y horarios","calendar"],["Documentación","Requisitos de la vivienda","folder"],["Fotos","Antes y después","camera"],["Resultado","Realizada, aplazada o no","check"]]},
 trabajador:{hero:"Empezar mi jornada",detail:"Sigue las tareas asignadas y comunica cualquier incidencia.",
  actions:[["Mi jornada","Entrada, pausa y salida","clock"],["Mis tareas","Trabajo guiado","list"],["Avisos","Recordatorios","bell"],["Incidencias","Problemas y solicitudes","wrench"]]}
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
 e("p","kdp-chooser-note","Comercial es tu trabajo habitual. Las áreas aún no desarrolladas se muestran como prototipos sin acceso adicional a datos.",content);
 if(chosen!==null||previous){
  button("Volver al espacio actual",()=>remove(CHOOSER),content,"kdp-chooser-cancel");
 }
 return true;
}
function open(id){
 if(!permitted()){close();chosen=null;return false;}
 if(!roles.some(r=>r.id===id))return false;
 remove(CHOOSER);
 chosen=id;
 if(id==="comercial"){
  remove(VIEW);
  window.cnvShowHome?.();
  return true;
 }
 const data=spaces[id];if(!data)return false;
 remove(VIEW);
 const root=e("div","kdp-role-overlay",undefined,document.body);root.id=VIEW;
 root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");
 root.setAttribute("aria-label","Vista de "+roles.find(r=>r.id===id).name);
 const page=e("main","cnv-home kdp-role-home",undefined,root);
 const head=e("header","cnv-home-head",undefined,page);
 const brand=e("div","cnv-home-brand",undefined,head);
 e("span","cnv-brand-mark","K",brand);
 const words=e("div","cnv-brand-text",undefined,brand);
 e("strong","","KONSOR",words);e("small","","ESPACIO DE TRABAJO",words);
 const actions=e("div","cnv-home-top-actions",undefined,head);
 button("Cambiar área",showChooser,actions,"cnv-glass kdp-switch");
 const section=e("section","cnv-home-content",undefined,page);
 const welcome=e("div","cnv-home-welcome",undefined,section);
 e("span","cnv-eyebrow",roles.find(r=>r.id===id).name.toUpperCase(),welcome);
 e("h1","","Mi espacio",welcome);
 e("p","","KONSOR · "+roles.find(r=>r.id===id).name,welcome);
 const hero=e("section","cnv-home-hero",undefined,section);
 const heroText=e("div","cnv-home-hero-content",undefined,hero);
 e("span","cnv-hero-eyebrow","SIGUIENTE PASO RECOMENDADO",heroText);
 e("h2","",data.hero,heroText);e("p","",data.detail,heroText);
 e("span","kdp-preview-label","VISTA DE DISEÑO · SIN DATOS OPERATIVOS",hero);
 const label=e("div","cnv-group-label",undefined,section);
 e("strong","","TU TRABAJO",label);e("span","","Accesos principales",label);
 const grid=e("div","cnv-home-grid kdp-role-grid",undefined,section);
 data.actions.forEach(([name,detail])=>{
  const tile=e("div","cnv-tile kdp-preview-tile",undefined,grid);
  const labels=e("span","cnv-tile-labels",undefined,tile);
  e("strong","",name,labels);e("small","",detail,labels);
 });
 e("p","kdp-explainer","Estas pantallas conservan el estilo de tu Inicio comercial. Sus acciones quedarán operativas cuando estén conectadas al backend y a los permisos de cada puesto.",section);
 const footer=e("div","cnv-home-footer",undefined,section);
 e("span","","KONSOR",footer);e("span","","Modo de diseño sin cambios en Firebase.",footer);
 return true;
}
// Compatibilidad con llamadas antiguas: no insertar pestañas en el Inicio.
function mount(home){home?.querySelector("#konsorDesignerAccess")?.remove();}
window.konsorDesigner={permitted,showChooser,open,close,mount,current:()=>chosen,roles:roles.map(r=>r.id)};
})();
