/* KONSOR · Vista de diseño del propietario.
 * Navegación demostrativa únicamente. Nunca se cambia la identidad,
 * el perfil Firebase, los permisos, los datos de otro equipo ni la sesión.
 * Las vistas sin backend operativo muestran ejemplos inequívocamente ficticios.
 */
(function(){
"use strict";
const ID="konsorDesignerPreview";
const roles=[
 {id:"comercial",name:"Comercial",subtitle:"Trabajo habitual",icon:"briefcase"},
 {id:"ceo",name:"CEO",subtitle:"Visión global",icon:"chart"},
 {id:"jefe",name:"Jefe",subtitle:"Coordinación de área",icon:"users"},
 {id:"oficina",name:"Oficina",subtitle:"Expedientes y llamadas",icon:"folder"},
 {id:"tecnicos",name:"Técnicos",subtitle:"Ejecución y fotografías",icon:"wrench"},
 {id:"trabajador",name:"Trabajador",subtitle:"Jornada guiada",icon:"clock"}
];
const panels={
 ceo:{kicker:"DIRECCIÓN GENERAL",title:"Vista del CEO",description:"Ejemplo de navegación empresarial. Los módulos financieros y los permisos de Dirección General todavía no están conectados.",
 groups:[
  {name:"Producción y rentabilidad",actions:["Producción por equipo","Costes de combustible, transporte y nóminas","Ingresos y margen por obra"]},
  {name:"Control de la empresa",actions:["Estado de áreas","Incidencias prioritarias","Planificación de crecimiento","Previsiones y objetivos"]}
 ]},
 jefe:{kicker:"RESPONSABLE DE ÁREA",title:"Vista de jefe",description:"Recorrido modelo del responsable. No suplanta a otro jefe ni abre las zonas de su equipo.",
 groups:[
  {name:"Planificar",actions:["Asignar trabajadores y zonas","Organizar equipos y jornadas","Comprobar carga semanal"]},
  {name:"Supervisar",actions:["Resultados de mi equipo","Tareas vencidas y pendientes","Incidencias y prioridades"]}
 ]},
 oficina:{kicker:"ADMINISTRACIÓN",title:"Vista de Oficina",description:"Propuesta de recorrido guiado sobre la ficha única. Los cambios de estado y los documentos requieren reglas de servidor propias.",
 groups:[
  {name:"Hoy",actions:["Expedientes por revisar","Documentos que faltan","Obras sin cierre confirmado"]},
  {name:"Seguimiento",actions:["Recordatorios de clientes","Obras aplazadas o rechazadas","Preparar expediente terminado"]}
 ]},
 tecnicos:{kicker:"EQUIPO DE INSTALACIÓN",title:"Vista de técnicos",description:"Vista prototipo; todavía no hay alta real de perfiles técnicos ni subida documental autorizada.",
 groups:[
  {name:"Mis obras",actions:["Consultar dirección y franja","Ver material y documentación","Marcar llegada e inicio"]},
  {name:"Cerrar intervención",actions:["Fotografías antes y después","Acta, firma y observaciones","Realizada · Aplazada · No realizada"]}
 ]},
 trabajador:{kicker:"PERSONAL",title:"Vista de trabajador",description:"Modelo de recorrido cotidiano. No registra fichajes ni modifica tareas al previsualizar.",
 groups:[
  {name:"Mi jornada",actions:["Iniciar y pausar trabajo","Mis tareas en orden","Continuar siguiente tarea"]},
  {name:"Incidencias",actions:["Informar bloqueo","Solicitar material o ayuda","Confirmar tarea realizada"]}
 ]}
};
function permitted(){
 // Doble comprobación de la cuenta realmente autenticada y perfil asignado.
 // IMPORTANTE: esto solo gobierna una vista de diseño; no es una regla de seguridad.
 return !!(window.auth?.currentUser?.uid&&
  typeof currentUserRole!=="undefined"&&currentUserRole==="jefe"&&
  typeof currentUserName!=="undefined"&&currentUserName==="Andrei (Jefe)"&&
  sessionStorage.getItem("auth_user_key")==="jefe"&&
  document.getElementById("appContainer")?.style.display!=="none");
}
const e=(tag,cls,txt,parent)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);parent?.append(x);return x;};
function close(){document.getElementById(ID)?.remove();}
function roleCard(parent,role,selected){
 const btn=e("button","kdp-tab"+(selected?" selected":""),undefined,parent);
 btn.type="button";btn.setAttribute("aria-pressed",String(selected));
 e("strong","",role.name,btn);e("small","",role.subtitle,btn);
 btn.onclick=()=>open(role.id);
 return btn;
}
function notice(parent,txt){return e("p","kdp-notice",txt,parent);}
function open(roleId){
 if(!permitted()){close();return false;}
 if(roleId==="comercial"){close();window.cnvShowHome?.();return true;}
 const selected=panels[roleId];if(!selected)return false;
 close();
 const overlay=e("div","kdp-overlay",undefined,document.body);overlay.id=ID;overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
 overlay.setAttribute("aria-label",selected.title);
 const page=e("section","kdp-page",undefined,overlay);
 const head=e("header","kdp-head",undefined,page);
 const home=e("button","kdp-back","‹",head);home.type="button";home.setAttribute("aria-label","Volver al trabajo comercial");home.onclick=()=>open("comercial");
 const heading=e("div","",undefined,head);
 e("small","",selected.kicker,heading);e("h2","",selected.title,heading);
 const x=e("button","kdp-back","×",head);x.type="button";x.setAttribute("aria-label","Cerrar vista de diseño");x.onclick=close;
 const body=e("div","kdp-body",undefined,page);
 e("span","kdp-mode","MODO DISEÑO · SOLO PREVISUALIZACIÓN",body);
 notice(body,selected.description);
 const entry=e("section","kdp-entry",undefined,body);
 e("strong","","Así empezaría esta persona su jornada",entry);
 e("p","","KONSOR mostrará la primera tarea pendiente y continuará por una secuencia guiada. Aquí solo puedes inspeccionar la estructura.",entry);
 selected.groups.forEach(group=>{
  const block=e("section","kdp-group",undefined,body);e("h3","",group.name,block);
  group.actions.forEach((label,index)=>{
   const item=e("div","kdp-step",undefined,block);
   e("span","kdp-num",String(index+1),item);
   e("span","",label,item);
  });
 });
 const footer=e("div","kdp-foot",undefined,body);
 const goto=e("button","kdp-action","Volver a mi trabajo comercial",footer);
 goto.onclick=()=>open("comercial");
 const strip=e("nav","kdp-tabs",undefined,page);
 strip.setAttribute("aria-label","Vistas de diseñador");
 roles.forEach(r=>roleCard(strip,r,r.id===roleId));
 overlay.addEventListener("click",ev=>{if(ev.target===overlay)close();});
 return true;
}
function mount(home){
 if(!home||!permitted()){home?.querySelector("#konsorDesignerAccess")?.remove();close();return;}
 const old=home.querySelector("#konsorDesignerAccess");if(old)old.remove();
 const section=e("section","kdp-home-access",undefined,home);section.id="konsorDesignerAccess";
 e("div","kdp-access-title","VISTAS DE DISEÑO",section);
 e("p","kdp-access-description","Tu trabajo predeterminado es Comercial. Puedes examinar las otras vistas sin cambiar de cuenta ni modificar datos.",section);
 const strip=e("nav","kdp-home-tabs",undefined,section);
 strip.setAttribute("aria-label","Acceso a vistas de la aplicación");
 roles.forEach(r=>roleCard(strip,r,r.id==="comercial"));
 e("small","kdp-disclaimer","Las vistas no implementadas se muestran como prototipos, no como módulos operativos.",section);
}
window.konsorDesigner={mount,open,close,permitted,roles:roles.map(r=>r.id)};
})();
