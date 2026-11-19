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
 const back=button("‹",()=>{r.classList.remove("active");window.cnvShowHome?.();});back.classList.add("kd-back");back.setAttribute("aria-label","Volver a Inicio");
 head.insertBefore(back,text);
 const close=button("×",()=>r.classList.remove("active"));close.classList.add("kd-close");close.setAttribute("aria-label","Cerrar Dirección");head.append(close);
 el("main","kd-body",undefined,p);r.addEventListener("click",e=>{if(e.target===r)r.classList.remove("active");});return r;
}
function tile(body,name,desc,fn){
 const c=el("button","kd-card kd-nav-tile",undefined,body);
 c.type="button";c.onclick=fn;
 const h=el("span","kd-nav-title",undefined,c);
 el("strong","",name,h);
 el("span","kd-nav-chevron","›",h);
 el("small","kd-nav-description",desc,c);
 return c;
}
function open(){
 if(!isBoss())return;
 const r=root(),body=r.querySelector(".kd-body");body.replaceChildren();r.classList.add("active");
 const m=summary();
 el("p","kd-intro","Planifica y controla el trabajo desde un solo lugar. Se conservan los guardados actuales.",body);
 const invite=el("section","kd-card kd-plan-invite",undefined,body);
 el("small","kd-plan-kicker","TU SIGUIENTE PLANIFICACIÓN",invite);
 el("h3","","Organizar la semana, semanas o mes",invite);
 el("p","","Revisamos resultados, equipo, sectores y fechas hasta dejar el trabajo preparado.",invite);
 invite.append(button("Comenzar planificación",()=>launch(r,()=>window.konsorPlanificador?.open?.())));
 const stats=el("div","kd-stats",undefined,body);
 [["Sectores",m.total],["Sin terminar",m.pending],["Clientes",m.clients]].forEach(([label,value])=>{const cell=el("div","kd-stat",undefined,stats);el("strong","",value,cell);el("small","",label,cell);});
 const grid=el("div","kd-nav-grid",undefined,body);
 tile(grid,"Territorio","Pueblos, sectores y zonas de trabajo.",()=>launch(r,()=>window.openCnTerritory?.()));
 tile(grid,"Importar fichas","Subir CSV, revisar registros y asignar sectores.",()=>launch(r,()=>window.abrirImportadorTerritorialKonsor?.()));
 tile(grid,"Mi equipo","Comerciales, estadísticas y supervisión.",()=>launch(r,()=>typeof openAuditModal==="function"?openAuditModal():openPlan()));
 tile(grid,"Planificar","Semana, varias semanas o mes.",()=>launch(r,()=>window.konsorPlanificador?.open?.()));
 tile(grid,"Clientes","Fichas, llamadas y seguimiento de obras.",()=>launch(r,()=>window.openCnClients?.()));
 tile(grid,"Resultados","Captación, producción y rendimiento.",()=>launch(r,()=>window.openKonsorTeamResults?.()));
 tile(grid,"Cierre del día","Pueblos, comerciales y decisiones.",()=>launch(r,()=>window.konsorPlanificador?.review?.()));
 const other=el("details","kd-more",undefined,body);
 el("summary","","Análisis y supervisión avanzada",other);
 const secondary=el("div","kd-nav-secondary",undefined,other);
 tile(secondary,"Tareas y respuestas","Consultar encargos y confirmaciones.",()=>launch(r,()=>window.openNotificationsCenterV2?.("tasks")));
 tile(secondary,"Tareas del jefe","Editar tareas, prioridades y encargos.",()=>launch(r,openPlan));
 tile(secondary,"Análisis operativo","Horas, visitas y resultados.",()=>launch(r,()=>showAnalytics("operations")));
 tile(secondary,"Comparar equipos","Comparación de actividad disponible.",()=>launch(r,()=>showAnalytics("compare")));
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
 const back=button("‹",()=>{planClose();open();});back.classList.add("kd-back");back.setAttribute("aria-label","Volver a Dirección");head.insertBefore(back,t);
 const close=button("×",planClose);close.classList.add("kd-close");close.setAttribute("aria-label","Cerrar sección");head.append(close);el("main","kd-body kdp-body",undefined,page);
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
function planTaskEditor(task={}){
 if(!isBoss())return;
 let overlay=document.getElementById("konsorPlanTaskEditor");
 if(!overlay){
  overlay=el("div","kd-overlay kdp-editor-overlay",undefined,document.body);
  overlay.id="konsorPlanTaskEditor";overlay.style.zIndex="10580";
  overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.classList.remove("active");});
 }
 overlay.replaceChildren();
 const page=el("section","kd-page kdp-editor-page",undefined,overlay);
 page.setAttribute("role","dialog");page.setAttribute("aria-modal","true");page.setAttribute("aria-label","Editar tarea de Dirección");
 const head=el("header","kd-head",undefined,page),t=el("div","",undefined,head);
 el("small","","KONSOR · MI PLAN",t);el("h2","",task.id?"Editar tarea":"Nueva tarea",t);
 const back=button("‹",()=>overlay.classList.remove("active"));back.classList.add("kd-back");back.setAttribute("aria-label","Volver a Plan");head.insertBefore(back,t);
 const close=button("×",()=>overlay.classList.remove("active"));close.classList.add("kd-close");close.setAttribute("aria-label","Cerrar editor");head.append(close);
 const body=el("form","kd-body kdp-editor-form",undefined,page);
 const field=(name,value,type="text",max=200)=>{
  const label=el("label","kdp-field",undefined,body);
  el("span","",name,label);
  const input=el(type==="textarea"?"textarea":"input","",undefined,label);
  if(type!=="textarea")input.type=type;
  input.value=value||"";input.maxLength=max;
  if(type==="textarea")input.rows=3;
  return input;
 };
 const select=(name,options,value)=>{
  const label=el("label","kdp-field",undefined,body);
  el("span","",name,label);
  const input=el("select","",undefined,label);
  for(const [id,caption] of options){const option=el("option","",caption,input);option.value=id;}
  input.value=value||options[0][0];
  return input;
 };
 const name=field("Qué tienes que hacer",task.title||"","text",120);name.required=true;name.placeholder="Ej. Preparar sectores de Marcilla";
 const details=field("Instrucciones o notas",task.detail||"","textarea",2000);
 const date=field("Fecha límite",task.dueDate||planDate(),"date");
 const priority=select("Prioridad",[["medium","Normal"],["high","Alta"],["low","Baja"]],task.priority);
 const type=select("Categoría",[["territory","Pueblos y sectores"],["supervision","Supervisión"],["obras","Obras"],["management","Gestión"],["other","Otra"]],task.type);
 const people=typeof getActiveTeamUsers==="function"?getActiveTeamUsers(false):[];
 const person=select("Persona relacionada (no asigna la tarea)",[["","Ninguna"],...people.map(p=>[p,p])],task.person);
 const town=field("Pueblo relacionado",task.town||"","text",80);
 const status=el("p","kdp-form-status","Solo se marcará guardada cuando Firebase confirme la operación.",body);
 const actions=el("div","kdp-actions",undefined,body);
 const save=button("Guardar tarea",()=>{});save.classList.add("kdp-primary");save.type="submit";actions.append(save);
 actions.append(button("Cancelar",()=>overlay.classList.remove("active")));
 body.addEventListener("submit",async ev=>{
  ev.preventDefault();if(save.disabled)return;
  if(!name.value.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(date.value)){status.textContent="Introduce un título y una fecha válida.";return;}
  if(!window.bossTasksApi){status.textContent="Firebase no está disponible; no se ha guardado.";return;}
  save.disabled=true;status.textContent="Guardando en Firebase…";
  try{
   const id=task.id||(window.crypto?.randomUUID?.()||Date.now()+"-"+Math.random().toString(36).slice(2));
   const rows=await window.bossTasksApi.save({
    id,title:name.value.trim(),detail:details.value.trim(),dueDate:date.value,priority:priority.value,
    type:type.value,person:person.value,town:town.value.trim(),status:task.status||"pending",
    sourceId:task.sourceId||"",sourceAction:task.sourceAction||""
   });
   planRows=rows;if(typeof bossPlanItems!=="undefined")bossPlanItems=rows;
   planStatus="Tarea guardada en Firebase.";overlay.classList.remove("active");renderPlan();
  }catch(error){status.textContent="No se ha confirmado el guardado: "+(error.message||error);}
  finally{save.disabled=false;}
 });
 overlay.classList.add("active");
 name.focus();
}
function planRenderTask(parent,task){
 const c=planSection(parent,task.title||"Tarea sin título",[(task.dueDate||"Sin fecha"),task.town||"",task.person||""].filter(Boolean).join(" · "));
 if(task.detail)el("p","",task.detail,c);
 const row=el("div","kdp-actions",undefined,c);
 planAction(row,task.status==="done"?"Reabrir":"Marcar hecha",()=>planSet(task,task.status!=="done"),task.status!=="done");
 planAction(row,"Editar",()=>planTaskEditor(task));
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
 planAction(actions,"Dibujar pueblo",()=>{planClose();window.cnvShowMap?.();if(typeof iniciarDibujoPueblo==="function")iniciarDibujoPueblo();},true);
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
 planAction(edit,"Nueva tarea",()=>planTaskEditor(),true);
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
  const mikelVisible=typeof sectoresMikelSupervision!=="undefined"&&Array.isArray(sectoresMikelSupervision)?sectoresMikelSupervision:[];
  const ownZones=(Array.isArray(savedZones)?savedZones:[]).filter(z=>z&&!z.isSingleHouse&&!z.isNoAptoZone&&!z.isHotMission&&!(typeof isMikelTeamMember==="function"&&isMikelTeamMember(z.comercial)));
  const mkZones=mikelVisible.length?mikelVisible:(Array.isArray(savedZones)?savedZones:[]).filter(z=>z&&!z.isSingleHouse&&typeof isMikelTeamMember==="function"&&isMikelTeamMember(z.comercial));
  const metrics=rows=>{
   const count=key=>rows.reduce((n,z)=>n+Math.max(0,Number(z.stats?.[key])||0),0);
   return {zones:rows.length,done:rows.filter(z=>z.status==="completada").length,
     si:count("si"),no:count("no"),absent:count("ausente"),info:count("papelito"),
     people:new Set(rows.map(z=>z.comercial).filter(Boolean)).size};
  };
  const left=metrics(ownZones),right=metrics(mkZones),hasMikel=mkZones.length>0;
  el("p","kd-intro","Comparación de actividad registrada. No se equiparan periodos, horas ni ventas si esos datos no están disponibles para ambos equipos.",body);
  const header=el("div","kd-compare-head",undefined,body);
  for(const [name,m,sub] of [["Equipo Andrei",left,"Mis datos"],["Equipo Mikel",right,hasMikel?"Supervisión disponible":"Sin registros accesibles"]]){
   const card=el("div","kd-compare-team",undefined,header);
   el("small","",name,card);el("strong","",hasMikel||name==="Equipo Andrei"?m.si:"—",card);
   el("span","","Respuestas SÍ",card);el("p","",sub,card);
  }
  const detail=planSection(body,"Indicadores comparables","Mismas definiciones para ambos equipos. — indica datos no disponibles, no un valor cero.");
  const columns=el("div","kd-compare-caption",undefined,detail);
  el("span","","INDICADOR",columns);el("span","","ANDREI",columns);el("span","","MIKEL",columns);
  const fields=[["Sectores registrados","zones"],["Sectores terminados","done"],["Respuestas SÍ","si"],["Rechazos","no"],["Ausentes","absent"],["Información entregada","info"],["Responsables con sectores","people"]];
  fields.forEach(([label,key])=>{
   const row=el("div","kd-compare-row",undefined,detail);
   el("span","",label,row);el("strong","",String(left[key]),row);el("strong","",hasMikel?String(right[key]):"—",row);
  });
  const notes=planSection(body,"Cómo interpretar la comparación",hasMikel
    ?"Los datos de Mikel proceden de los sectores de supervisión autorizados. No incluyen fichas privadas ni confirman la misma carga horaria."
    :"No se han recibido sectores del otro equipo. El comparador no inventa resultados.");
  planAction(notes,"Actualizar datos",()=>showAnalytics("compare"));
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
window.openKonsorTeamComparison=()=>showAnalytics("compare");
window.openKonsorTeamOperations=()=>showAnalytics("operations");
})();