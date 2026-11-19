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
 tile(body,"2. Plan del equipo","Tarea prioritaria, planificación de zonas, encargos y continuidad del trabajo.",()=>launch(r,openPlan));
 tile(body,"3. Tareas y respuestas","Asignar un trabajo y consultar cuándo lo recibe o completa el comercial.",()=>launch(r,()=>window.openNotificationsCenterV2?.("tasks")));
 tile(body,"4. Resultados del equipo","Captaciones, metros cuadrados, citas, producción y Liga.",()=>launch(r,()=>window.openKonsorTeamResults?.()));
 tile(body,"5. Análisis operativo","Horas efectivas, puertas, respuestas y seguimiento de productividad.",()=>launch(r,()=>showAnalytics("operations")));
 tile(body,"6. Comparación de equipos","Comparar periodos y resultados del equipo Andrei con los datos disponibles de otros equipos.",()=>launch(r,()=>showAnalytics("compare")));
}
/* Plan de Dirección: pantalla nueva, mismos encargos y guardado de Firestore. */
let planUnsubscribe=null,planRows=[],planFilter="pending",planStatus="Conectando…",planBusy=false;
function planDate(){return typeof getTodayISO==="function"?getTodayISO():new Date().toISOString().slice(0,10);}
function planClose(){const p=document.getElementById("konsorDirectorPlan");p?.classList.remove("active");if(planUnsubscribe){planUnsubscribe();planUnsubscribe=null;}}
function planSurface(){
 let p=document.getElementById("konsorDirectorPlan");if(p)return p;
 p=el("div","kd-overlay",undefined,document.body);p.id="konsorDirectorPlan";
 const page=el("section","kd-page",undefined,p);page.setAttribute("role","dialog");page.setAttribute("aria-modal","true");
 const head=el("header","kd-head",undefined,page),t=el("div","",undefined,head);
 el("small","","KONSOR · DIRECCIÓN",t);el("h2","","Plan del equipo",t);
 head.append(button("Cerrar",planClose));el("main","kd-body kdp-body",undefined,page);
 p.addEventListener("click",e=>{if(e.target===p)planClose();});
 return p;
}
function planSection(body,title,description){
 const c=el("section","kd-card kdp-card",undefined,body);
 el("h3","",title,c);if(description)el("p","",description,c);return c;
}
function planAction(parent,label,fn,primary=false){
 const b=button(label,fn);b.classList.add("kdp-action");if(primary)b.classList.add("kdp-primary");parent.append(b);return b;
}
async function planSet(task,done){
 if(planBusy||!window.bossTasksApi)return;
 planBusy=true;planStatus="Guardando cambio…";renderPlan();
 try{
  const rows=await window.bossTasksApi.save({id:task.id,status:done?"done":"pending",doneAt:done?Date.now():null});
  planRows=rows;if(typeof bossPlanItems!=="undefined")bossPlanItems=rows;planStatus="Guardado y confirmado en Firestore.";
 }catch(error){planStatus="No se ha confirmado el guardado.";alert("No se guardó la tarea: "+(error.message||error));}
 finally{planBusy=false;renderPlan();}
}
function planRenderTask(parent,task){
 const c=planSection(parent,task.title||"Tarea sin título",[(task.dueDate||"Sin fecha"),task.town||"",task.person||""].filter(Boolean).join(" · "));
 if(task.detail)el("p","",task.detail,c);
 const row=el("div","kdp-actions",undefined,c);
 planAction(row,task.status==="done"?"Reabrir":"Marcar hecha",()=>planSet(task,task.status!=="done"),task.status!=="done");
 planAction(row,"Editar",()=>{if(typeof editBossPlanTask==="function")editBossPlanTask(task);});
}
function renderPlan(){
 const p=planSurface(),body=p.querySelector(".kd-body");body.replaceChildren();
 const today=planDate(),pending=planRows.filter(t=>t.status!=="done");
 const late=pending.filter(t=>t.dueDate<=today).sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||""));
 const future=pending.filter(t=>t.dueDate>today).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
 const ownZones=(Array.isArray(savedZones)?savedZones:[]).filter(z=>z&&!z.isSingleHouse&&!z.isHotMission&&!z.isNoAptoZone&&!String(z.comercial||"").startsWith("Mikel"));
 const people=[...new Set(ownZones.map(z=>z.comercial).filter(n=>n&&n!=="Andrei (Jefe)"))];
 const unplanned=people.filter(name=>!ownZones.some(z=>z.comercial===name&&z.status!=="completada"&&z.date>=today));
 el("p","kd-intro",planStatus,body);
 const cards=el("div","kd-stats",undefined,body);
 [["Vencidas / hoy",late.length],["Próximas",future.length],["Sin próximo sector · con historial",unplanned.length]].forEach(([name,v])=>{
  const c=el("div","kd-stat",undefined,cards);el("strong","",v,c);el("small","",name,c);
 });
 const first=planSection(body,"Tu siguiente acción",late[0]?late[0].title:unplanned.length?"Planificar trabajo para "+unplanned.length+" comerciales":"Revisar las asignaciones y preparar próximos pueblos");
 if(late[0]){const row=el("div","kdp-actions",undefined,first);planAction(row,"Marcar tarea hecha",()=>planSet(late[0],true),true);}
 else if(unplanned.length)planAction(first,"Abrir territorios",()=>{planClose();window.openCnTerritory?.();},true);
 const organize=planSection(body,"Planificar territorio","Separa dibujar el perímetro de un pueblo de asignar los sectores diarios.");
 const actions=el("div","kdp-actions",undefined,organize);
 planAction(actions,"Crear pueblo",()=>{planClose();window.cnvShowMap?.();if(typeof iniciarDibujoPueblo==="function")iniciarDibujoPueblo();},true);
 planAction(actions,"Asignar sector",()=>{planClose();if(typeof startSectorDrawing==="function")startSectorDrawing();});
 planAction(actions,"Ver todos los pueblos",()=>{planClose();window.openCnTerritory?.();});
 const queue=planSection(body,"Tareas y encargos","Prioridad por fecha. La tarea solo desaparece del listado pendiente después de confirmar el guardado.");
 const tabs=el("div","kdp-actions",undefined,queue);
 for(const [key,label] of [["pending","Pendientes"],["future","Próximas"],["done","Terminadas"]]){
  const b=planAction(tabs,label,()=>{planFilter=key;renderPlan();});b.classList.toggle("kdp-primary",planFilter===key);
 }
 let items=planFilter==="done"?planRows.filter(t=>t.status==="done"):planFilter==="future"?future:late;
 if(planFilter==="pending")items=pending.slice().sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||""));
 if(!items.length)el("p","kd-intro","No hay tareas en este grupo.",queue);
 items.slice(0,40).forEach(task=>planRenderTask(queue,task));
 const edit=el("div","kdp-actions",undefined,body);
 planAction(edit,"Nueva tarea",()=>{if(typeof editBossPlanTask==="function")editBossPlanTask();},true);
 planAction(edit,"Actualizar",()=>{if(!planUnsubscribe)openPlan();else renderPlan();});
}
function openPlan(){
 if(!isBoss())return;
 const p=planSurface();p.querySelector(".kd-head h2").textContent="Plan del equipo";p.classList.add("active");planFilter="pending";
 if(!window.bossTasksApi){planStatus="Firebase todavía no ha cargado. Comprueba la conexión y vuelve a abrir.";renderPlan();return;}
 if(planUnsubscribe){renderPlan();return;}
 planStatus="Cargando tareas sincronizadas…";
 planUnsubscribe=window.bossTasksApi.watch((rows,fromCache)=>{
  planRows=rows;if(typeof bossPlanItems!=="undefined")bossPlanItems=rows;planStatus=fromCache?"Datos en caché · comprobando servidor":"Tareas sincronizadas con Firebase.";
  if(p.classList.contains("active"))renderPlan();
 },err=>{planStatus="No se pudieron cargar las tareas: "+(err.message||err);if(p.classList.contains("active"))renderPlan();});
 renderPlan();
}
/* Vista nueva y legible de métricas. No presenta previsiones como cobros. */
function analyticsRows(){
 const zones=(Array.isArray(savedZones)?savedZones:[]).filter(z=>z&&!z.isSingleHouse&&!z.isNoAptoZone&&!z.isHotMission);
 const grouped=new Map();
 for(const z of zones){
  const owner=String(z.comercial||"Sin asignar");
  if(!grouped.has(owner))grouped.set(owner,{name:owner,zones:0,done:0,si:0,no:0,ausente:0,papelito:0,yaAislado:0,appointments:0,executed:0,m2Booked:0});
  const v=grouped.get(owner),stats=z.stats||{};
  v.zones++;if(z.status==="completada")v.done++;
  for(const key of ["si","no","ausente","papelito","yaAislado"])v[key]+=Math.max(0,Number(stats[key])||0);
  for(const c of z.clients||[]){
   if(c.captacionInvalida||c.obraStatus==="no_apto")continue;
   if(["agendada","realizada"].includes(c.obraStatus)){v.appointments++;v.m2Booked+=(typeof ComercialCore!=="undefined"&&typeof ComercialCore.area==="function"?ComercialCore.area(c.m2):Number.parseFloat(String(c.m2||0).replace(",",".")))||0;}
   if(c.obraStatus==="realizada")v.executed++;
  }
 }
 return [...grouped.values()];
}
function showAnalytics(mode){
 if(!isBoss())return;
 planClose();
 const r=planSurface(),body=r.querySelector(".kd-body");
 const title=r.querySelector(".kd-head h2");
 title.textContent=mode==="compare"?"Comparación de equipos":"Análisis operativo";
 body.replaceChildren();r.classList.add("active");
 const data=analyticsRows(),team=data.filter(x=>!x.name.startsWith("Mikel")),other=data.filter(x=>x.name.startsWith("Mikel"));
 const sum=rows=>rows.reduce((t,r)=>{for(const k of ["zones","done","si","no","ausente","papelito","yaAislado","appointments","executed","m2Booked"])t[k]=(t[k]||0)+(r[k]||0);return t;},{});
 const mine=sum(team),mikel=sum(other),tot=mine;
 if(mode==="compare"){
  el("p","kd-intro","Comparación descriptiva de los registros cargados en esta sesión. No significa que se hayan consultado todos los datos del otro equipo.",body);
  const stats=el("div","kd-stats",undefined,body);
  [["Equipo Andrei",mine.si+" sí"],["Equipo Mikel",other.length?mikel.si+" sí":"Sin datos"],["Sectores totales visibles",mine.zones+mikel.zones]].forEach(([label,value])=>{
   const c=el("div","kd-stat",undefined,stats);el("strong","",value,c);el("small","",label,c);
  });
  if(!other.length)el("p","kd-intro","Para una comparación interequipos completa hay que consultar los registros autorizados del otro equipo. No se asigna un cero cuando no hay datos.",body);
  const otherCard=planSection(body,"Comparador completo","El módulo existente permite comparar periodos y equipos mediante los datos disponibles en el servicio actual.");
  planAction(otherCard,"Abrir comparación detallada",()=>{r.classList.remove("active");if(typeof openMikelRadarModal==="function")openMikelRadarModal();},true);
 }else{
  el("p","kd-intro","Resumen de los sectores visibles del equipo Andrei. Datos registrados hasta ahora, sin interpretar las citas como dinero cobrado.",body);
  const totalDoors=tot.si+tot.no+tot.ausente+tot.papelito+tot.yaAislado;
  const conversion=tot.si+tot.no?Math.round(100*tot.si/(tot.si+tot.no))+"%":"Sin datos";
  const stats=el("div","kd-stats",undefined,body);
  [["Puertas registradas",totalDoors],["Respuestas sí",tot.si],["Conversión sí / (sí + no)",conversion]].forEach(([label,value])=>{
   const c=el("div","kd-stat",undefined,stats);el("strong","",value,c);el("small","",label,c);
  });
  const metrics=planSection(body,"Fases del trabajo","Las etapas se solapan; no sumes captación, citas y obras ejecutadas.");
  [["Sectores terminados",tot.done+" / "+tot.zones],["Obras con cita registrada",tot.appointments],["Obras marcadas realizadas",tot.executed],["m² estimados asociados a citas",Math.round(tot.m2Booked)]].forEach(([label,value])=>{
   const row=el("div","kdp-metric",undefined,metrics);el("span","",label,row);el("strong","",String(value),row);
  });
 }
 const breakdown=planSection(body,"Desglose por comercial",data.length?"Datos de los sectores actualmente cargados.":"Todavía no hay sectores visibles.");
 for(const x of (mode==="compare"?data:team).sort((a,b)=>b.si-a.si)){
  const card=el("div","kdp-metric",undefined,breakdown);
  el("span","",x.name,card);
  el("strong","",x.si+" sí · "+x.done+"/"+x.zones+" sectores",card);
 }
 const actions=el("div","kdp-actions",undefined,body);
 planAction(actions,"Volver a Dirección",()=>{r.classList.remove("active");open();},true);
}
window.openKonsorDirection=open;
window.openKonsorDirectorPlan=openPlan;
})();