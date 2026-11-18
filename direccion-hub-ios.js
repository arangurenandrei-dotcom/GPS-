/* Panel único de Dirección para el equipo de Andrei. */
(function(){
"use strict";
const el=(tag,cls,txt,parent)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);if(parent)parent.append(x);return x;};
const button=(txt,fn)=>{const x=el("button","kd-btn",txt);x.type="button";x.onclick=fn;return x;};
const isBoss=()=>typeof currentUserName!=="undefined"&&currentUserName==="Andrei (Jefe)"&&currentUserRole==="jefe";
function launch(root,fn){root.classList.remove("active");if(typeof fn==="function")fn();}
function summary(){
 const zones=(Array.isArray(savedZones)?savedZones:[]).filter(z=>z&&!z.isNoAptoZone&&!z.isHotMission&&!z.isSingleHouse&&!(typeof isMikelTeamMember==="function"&&isMikelTeamMember(z.comercial)));
 return{total:zones.length,pending:zones.filter(z=>z.status!=="completada").length,clients:zones.reduce((n,z)=>n+(z.clients||[]).filter(c=>c&&(c.name||c.phone||c.street)).length,0)};
}
function root(){
 let r=document.getElementById("konsorDirectionHub");if(r)return r;
 r=el("div","kd-overlay",undefined,document.body);r.id="konsorDirectionHub";
 const p=el("section","kd-page",undefined,r);p.setAttribute("role","dialog");p.setAttribute("aria-modal","true");
 const head=el("header","kd-head",undefined,p),text=el("div","",undefined,head);
 el("small","","KONSOR · DIRECCIÓN",text);el("h2","","Organizar equipo",text);
 head.append(button("Cerrar",()=>r.classList.remove("active")));
 el("main","kd-body",undefined,p);r.addEventListener("click",e=>{if(e.target===r)r.classList.remove("active");});return r;
}
function tile(body,name,desc,fn){
 const c=el("section","kd-card",undefined,body);el("h3","",name,c);el("p","",desc,c);c.append(button("Abrir",fn));
}
function open(){
 if(!isBoss())return;
 const r=root(),body=r.querySelector(".kd-body");body.replaceChildren();r.classList.add("active");
 const m=summary();
 el("p","kd-intro","Planifica y controla el trabajo desde un solo lugar. Se conservan los guardados actuales.",body);
 const stats=el("div","kd-stats",undefined,body);
 [["Sectores",m.total],["Sin terminar",m.pending],["Clientes",m.clients]].forEach(([label,value])=>{const cell=el("div","kd-stat",undefined,stats);el("strong","",value,cell);el("small","",label,cell);});
 tile(body,"1. Territorio y sectores","Revisar pueblos, sectores pendientes y asignar nueva zona.",()=>launch(r,()=>window.openCnTerritory?.()));
 tile(body,"2. Plan del equipo","Prioridades, encargos y organización de comerciales.",()=>launch(r,()=>window.openBossWorkMenu?.()));
 tile(body,"3. Tareas y respuestas","Asignar un trabajo y consultar cuándo lo recibe o completa el comercial.",()=>launch(r,()=>window.openNotificationsCenterV2?.("tasks")));
 tile(body,"4. Resultados del equipo","Captaciones, metros cuadrados, citas, producción y Liga.",()=>launch(r,()=>window.openCnResults?.()));
 const other=el("details","kd-more",undefined,body);el("summary","","Herramientas adicionales",other);
 other.append(button("Comerciales y permisos",()=>launch(r,()=>typeof openPeopleManagement==="function"&&openPeopleManagement())));
 other.append(button("Análisis operativo",()=>launch(r,()=>typeof openManagementAudit==="function"&&openManagementAudit("comerciales"))));
 other.append(button("Comparar equipos",()=>launch(r,()=>typeof openMikelRadarModal==="function"&&openMikelRadarModal())));
}
window.openKonsorDirection=open;
})();