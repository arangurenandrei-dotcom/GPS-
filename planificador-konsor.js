/* KONSOR: planificación de equipo y revisión diaria, con datos reales. */
(function(){
"use strict";
if(window.konsorPlanificador)return;
const E=(t,cl,txt,p)=>{const n=document.createElement(t);if(cl)n.className=cl;if(txt!==undefined)n.textContent=String(txt);if(p)p.append(n);return n;};
const B=(p,t,fn,variant)=>{const b=E("button","km-btn "+(variant||""),t,p);b.type="button";b.onclick=fn;return b;};
const me=()=>typeof currentUserName==="string"?currentUserName:"";
const boss=()=>typeof currentUserRole!=="undefined"&&currentUserRole==="jefe";
const mk=n=>String(n||"").startsWith("Mikel");
const sameTeam=z=>mk(z.comercial)===mk(me());
const zones=()=>typeof savedZones!=="undefined"&&Array.isArray(savedZones)?savedZones:[];
const sectors=()=>zones().filter(z=>z&&!z.isSingleHouse&&!z.isNoAptoZone&&!z.isHotMission&&sameTeam(z));
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const today=()=>iso(new Date());
const dateMs=d=>new Date(d+"T12:00:00").getTime();
const dateOf=ms=>ms?iso(new Date(Number(ms))):"";
const startDefault=()=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+((8-d.getDay())%7||7));return iso(d);};
const draftKey=()=>"konsor_plan_v1_"+String(sessionStorage.getItem("auth_user_key")||me()).replace(/[^a-zA-Z0-9_-]/g,"_");
function readDraft(){try{const d=JSON.parse(localStorage.getItem(draftKey())||"null");if(d&&d.owner===me()&&d.start&&d.period&&d.edits)return d;}catch{}return {owner:me(),step:0,start:startDefault(),period:"7",members:[me()],edits:{}};}
let draft=null,draftOwnerKey="",busy=false;
function selectDraft(){
 const key=draftKey();
 if(!draft||draftOwnerKey!==key||draft.owner!==me()){
  draft=readDraft();
  draftOwnerKey=key;
 }
}
function persist(){localStorage.setItem(draftOwnerKey,JSON.stringify(draft));}
function periodEnd(){const d=new Date(dateMs(draft.start));if(!Number.isFinite(d.getTime()))throw Error("Fecha de inicio inválida.");d.setDate(d.getDate()+(draft.period==="month"?30:Number(draft.period))-1);return iso(d);}
function activePeople(){
 const names=new Set([me()]);
 if(typeof accessProfiles!=="undefined"&&Array.isArray(accessProfiles)&&typeof CANONICAL_USER_NAMES!=="undefined"){
  for(const p of accessProfiles)if(p?.estado==="aprobado"){const n=CANONICAL_USER_NAMES[p.userKey];if(n&&mk(n)===mk(me()))names.add(n);}
 }
 sectors().forEach(z=>{if(z.comercial)names.add(z.comercial);});
 return [...names].sort((a,b)=>a===me()?-1:b===me()?1:a.localeCompare(b,"es"));
}
function periodMetrics(start,end){
 const rows=sectors().filter(z=>{
  const d=dateOf(z.streetCompletedAt)||z.dumpDate||"";
  return d>=start&&d<=end;
 });
 const sum=k=>rows.reduce((n,z)=>n+Math.max(0,Number(z.stats?.[k])||0),0);
 const yes=sum("si"),no=sum("no"),abs=sum("ausente"),paper=sum("papelito");
 return {count:rows.length,yes,no,abs,paper,total:yes+no+abs+paper,conv:yes+no?Math.round(100*yes/(yes+no)):null};
}
function recentMetrics(){
 // Períodos realmente trabajados, no la semana FUTURA que se está planificando.
 const end=new Date();end.setHours(12,0,0,0);end.setDate(end.getDate()-1);
 const start=new Date(end);start.setDate(start.getDate()-6);
 const oldEnd=new Date(start);oldEnd.setDate(oldEnd.getDate()-1);
 const oldStart=new Date(oldEnd);oldStart.setDate(oldStart.getDate()-6);
 return {now:periodMetrics(iso(start),iso(end)),old:periodMetrics(iso(oldStart),iso(oldEnd)),start:iso(start),end:iso(end)};
}
function stat(p,title,v){const c=E("div","km-stat",undefined,p);E("strong","",v,c);E("small","",title,c);}
function box(p,k,title,detail){const c=E("section","km-card",undefined,p);if(k)E("small","km-kicker",k,c);E("h3","",title,c);if(detail)E("p","km-muted",detail,c);return c;}
function actions(p){return E("div","km-actions",undefined,p);}
function field(p,label,type,options,value,onChange){
 const l=E("label","km-field",undefined,p);E("span","",label,l);
 const input=E(type==="select"?"select":"input","km-input",undefined,l);
 if(type==="select")for(const [v,t] of options){const option=E("option","",t,input);option.value=v;}
 else input.type=type;
 input.value=value;input.onchange=()=>onChange(input.value);return input;
}
function bar(p,label,yes,no){const a=E("div","km-barblock",undefined,p),header=E("div","km-barline",undefined,a);E("span","",label,header);E("strong","",yes+no?Math.round(100*yes/(yes+no))+"%":"—",header);const rail=E("div","km-bar",undefined,a);E("span","km-barfill",undefined,rail).style.width=(yes+no?100*yes/(yes+no):0)+"%";}
function page(title,detail){
 document.getElementById("km-flow")?.remove();
 const overlay=E("div","km-overlay",undefined,document.body);overlay.id="km-flow";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
 const frame=E("section","km-page",undefined,overlay),head=E("header","km-head",undefined,frame),titles=E("div","",undefined,head);
 E("small","","KONSOR · DIRECCIÓN",titles);E("h2","",title,titles);
 const back=B(head,"‹",()=>{
  if(title==="Comenzar planificación"&&draft.step>0){prev();return;}
  overlay.remove();window.openKonsorDirection?.();
 },"back km-back");back.setAttribute("aria-label","Volver");head.insertBefore(back,titles);
 B(head,"×",()=>overlay.remove(),"close").setAttribute("aria-label","Cerrar");
 const body=E("div","km-body",undefined,frame);if(detail)E("p","km-muted",detail,body);
 overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
 return body;
}
function next(){draft.step=Math.min(3,draft.step+1);persist();open();}
function prev(){draft.step=Math.max(0,draft.step-1);persist();open();}
function open(){
 if(!boss())return;
 selectDraft();
 const end=periodEnd(),body=page("Comenzar planificación","Del "+draft.start+" al "+end+" · Cuatro pasos guiados con publicación confirmada.");
 const p=E("div","km-progress",undefined,body);["Diagnóstico","Equipo","Asignación","Confirmación"].forEach((s,i)=>{const b=E("span",i<draft.step?"done":i===draft.step?"active":"",String(i+1),p);b.title=s;});
 if(draft.step===0){
  const c=box(body,"01 · REVISAR","Elige el período","Las estadísticas permiten decidir qué territorios requieren atención, sin confundir planes con trabajo ya realizado.");
  const start=field(c,"Fecha de inicio","date",[],draft.start,v=>{
   if(!v){start.value=draft.start;return;}
   draft.start=v;draft.edits={};persist();open();
  });
  start.required=true;
  field(c,"Duración","select",[["7","Una semana"],["14","Dos semanas"],["month","Un mes (30 días)"]],draft.period,v=>{draft.period=v;draft.edits={};persist();open();});
  const history=recentMetrics(),now=history.now,old=history.old;
  const report=box(body,"COMPARACIÓN","Últimos 7 días frente a los 7 anteriores","Actividad registrada del "+history.start+" al "+history.end+". No se confunde la semana futura a planificar con resultados históricos.");
  const grid=E("div","km-stats",undefined,report);
  stat(grid,"Sectores actuales",now.count);stat(grid,"Sectores anteriores",old.count);stat(grid,"Respuestas Sí",now.yes);
  bar(report,"Conversión actual",now.yes,now.no);bar(report,"Conversión anterior",old.yes,old.no);
  if(now.yes+now.no<10||old.yes+old.no<10)E("p","km-muted","Datos insuficientes para concluir si la conversión mejora o empeora.",report);
  else E("p","km-muted",now.conv>old.conv?"Mejora "+(now.conv-old.conv)+" puntos respecto al período anterior.":now.conv<old.conv?"Baja "+(old.conv-now.conv)+" puntos respecto al período anterior.":"La conversión no ha variado respecto al período anterior.",report);
  const street=box(body,"LECTURA TERRITORIAL","Dónde conviene concentrarse","Solo analizamos pueblos con suficientes respuestas para evitar conclusiones precipitadas.");
  const recent=sectors().filter(z=>{const dt=dateOf(z.streetCompletedAt)||z.dumpDate||"";return dt>=history.start&&dt<=history.end;});
  const towns=new Map();
  for(const z of recent){const key=z.town||"Sin pueblo";if(!towns.has(key))towns.set(key,{name:key,zones:0,yes:0,no:0});const x=towns.get(key);x.zones++;x.yes+=Math.max(0,Number(z.stats?.si)||0);x.no+=Math.max(0,Number(z.stats?.no)||0);}
  if(!towns.size)E("p","km-muted","No hay sectores con cierre registrado en los últimos siete días.",street);
  for(const t of [...towns.values()].sort((a,b)=>b.yes-a.yes).slice(0,8)){
   if(t.yes+t.no>=12){
    E("p","km-townline",t.name+" · "+t.zones+" sector(es) · "+t.yes+" Sí y "+t.no+" No. Conversión: "+Math.round(100*t.yes/(t.yes+t.no))+"%",street);
    if(t.yes/(t.yes+t.no)<.15)E("p","km-warning","Conversión baja en las visitas registradas de "+t.name+". Revisa horarios, accesos y calidad de la captación antes de asignar más sectores.",street);
   }else E("p","km-townline",t.name+" · "+t.zones+" sector(es) · muestra insuficiente para evaluar conversión.",street);
  }
  const links=actions(street);
  B(links,"Ver análisis operativo",()=>{document.getElementById("km-flow")?.remove();window.openKonsorTeamOperations?.();});
  B(links,"Gestionar avisos del equipo",()=>{document.getElementById("km-flow")?.remove();window.openNotificationsCenterV2?.("tasks");});
  B(actions(body),"Continuar · equipo",next,"primary");
 }else if(draft.step===1){
  const available=activePeople(),c=box(body,"02 · PERSONAS","¿A quién organizamos el trabajo?","Incluye al jefe si también sale a vender. Se muestran perfiles aprobados y personas con sectores existentes.");
  for(const name of available){
   const row=E("label","km-checkrow",undefined,c),ck=E("input","",undefined,row);ck.type="checkbox";ck.checked=(draft.members||[]).includes(name);
   ck.onchange=()=>{const set=new Set(draft.members||[]);ck.checked?set.add(name):set.delete(name);draft.members=[...set];persist();};
   E("span","",name===me()?name+" · Trabajo propio":name,row);
  }
  const row=actions(body);B(row,"Atrás",prev);
  B(row,"Continuar · sectores",()=>{if(!draft.members.length){alert("Selecciona al menos una persona.");return;}next();},"primary");
 }else if(draft.step===2){
  const all=sectors().filter(z=>z.status!=="completada");
  const inRange=all.filter(z=>z.date>=draft.start&&z.date<=end||draft.edits[String(z.id)]);
  const visible=inRange.length?inRange:all;
  const c=box(body,"03 · SECTORES","Asignar territorio y fecha","No se crea geometría automáticamente. Elige sectores ya dibujados o utiliza el mapa para crear otros.");
  if(!all.length)E("p","km-warning","Todavía no hay sectores abiertos. Dibuja uno en Territorio y vuelve para asignar fechas.",c);
  if(all.length&&!inRange.length)E("p","km-muted","No hay sectores en este período. Puedes asignar los que ya existen.",c);
  for(const z of visible.slice(0,80)){
   const base={date:z.date||draft.start,owner:z.comercial},edited={...base,...(draft.edits[String(z.id)]||{})};
   const wrapper=E("div","km-zoneform",undefined,c);E("strong","",z.sectorName||"Sector",wrapper);E("small","",z.town,wrapper);
   const grid=E("div","km-formgrid",undefined,wrapper);
   const set=(k,v)=>{const current={...edited,...(draft.edits[String(z.id)]||{})};current[k]=v;draft.edits[String(z.id)]=current;persist();};
   field(grid,"Día","date",[],edited.date,v=>set("date",v));
   const members=[...new Set([...(draft.members||[]),edited.owner])].filter(Boolean);
   field(grid,"Comercial","select",members.map(n=>[n,n]),edited.owner,v=>set("owner",v));
  }
  const row=actions(c);B(row,"Dibujar nuevo sector",()=>{document.getElementById("km-flow")?.remove();window.cnvShowMap?.();if(typeof startSectorDrawing==="function")startSectorDrawing();});
  B(row,"Abrir pueblos",()=>{document.getElementById("km-flow")?.remove();window.openCnTerritory?.();});
  const foot=actions(body);B(foot,"Atrás",prev);B(foot,"Revisar planificación",next,"primary");
 }else{
  const c=box(body,"04 · PUBLICAR","Validación final","Una asignación se confirma solo cuando Firestore responde que la ha guardado. La recepción se confirma después en la app del comercial.");
  const members=new Set(draft.members||[]);
  const entries=sectors().filter(z=>z.status!=="completada").map(z=>{
   const e=draft.edits[String(z.id)];const date=e?.date||z.date||"",owner=e?.owner||z.comercial||"";
   return {z,date,owner,changed:!!e&&(date!==z.date||owner!==z.comercial)};
  });
  const selected=entries.filter(x=>x.date>=draft.start&&x.date<=end&&members.has(x.owner));
  const errors=[];
  if(!members.size)errors.push("Selecciona comerciales activos.");
  if(!selected.length)errors.push("No hay sectores asignados dentro del período.");
  const noWork=[...members].filter(name=>!selected.some(x=>x.owner===name));
  if(noWork.length)errors.push("Sin asignación: "+noWork.join(", ")+".");
  for(const x of entries.filter(x=>x.changed))if(!members.has(x.owner)||x.date<draft.start||x.date>end)errors.push("Revisa la nueva fecha o responsable de "+x.z.sectorName+".");
  const stats=E("div","km-stats",undefined,c);
  stat(stats,"Sectores",selected.length);stat(stats,"Personas",members.size);stat(stats,"Cambios",entries.filter(x=>x.changed).length);
  for(const member of members)E("p","km-townline",member+" · "+selected.filter(x=>x.owner===member).length+" sector(es)",c);
  const perDay=new Map();selected.forEach(x=>{const k=x.owner+" · "+x.date;perDay.set(k,(perDay.get(k)||0)+1);});
  for(const [k,n] of perDay)if(n>2)E("p","km-warning",k+": "+n+" sectores, comprueba si son viables.",c);
  for(const msg of errors)E("p","km-error",msg,c);
  if(!errors.length)E("p","km-good","Plan preparado para publicación.",c);
  const row=actions(body);B(row,"Modificar",()=>{draft.step=2;persist();open();});
  const save=B(row,"Guardar planificación",async()=>{
   if(busy||errors.length)return;
   if(!window.KonsorBridge?.save||window.KonsorBridge.busy){alert("Servidor ocupado. Inténtalo más tarde.");return;}
   if(!confirm("¿Confirmar las fechas y responsables de los sectores mostrados?"))return;
   const publicationKey=draftOwnerKey,publicationOwner=me();
   busy=true;save.disabled=true;save.textContent="Guardando…";
   try{
    const candidate=JSON.parse(JSON.stringify(zones()));
    for(const entry of entries.filter(x=>x.changed)){
     const z=candidate.find(z=>String(z.id)===String(entry.z.id));
     if(!z||!sameTeam(z)||z.status==="completada"||!members.has(entry.owner)||entry.date<draft.start||entry.date>end)throw Error("Un sector o la asignación han cambiado.");
     z.comercial=entry.owner;z.date=entry.date;
     z.assignmentReceivedAt=null;z.assignmentReceivedBy="";
     z.planPublishedAt=Date.now();z.planPublishedBy=me();
    }
    await window.KonsorBridge.save("comercial_custom_zones",candidate);
    if(draftKey()!==publicationKey||me()!==publicationOwner)return;
    savedZones=candidate;window.refreshCnTerritory?.();window.cnvRefreshHome?.();
    localStorage.removeItem(draftOwnerKey);draft=readDraft();
    const done=box(body,"PLANIFICACIÓN CONFIRMADA","Plan guardado",selected.length+" sectores distribuidos en el período. La recepción de cada asignación se confirma desde Mi jornada.");
    E("p","km-muted","La entrega de notificaciones push depende del motor de avisos y de los permisos del dispositivo; esta confirmación acredita el guardado, no la recepción de una notificación.",done);
    B(actions(done),"Volver a Dirección",()=>{document.getElementById("km-flow")?.remove();window.openKonsorDirection?.();},"primary");
    save.remove();
   }catch(e){alert("No se ha confirmado el guardado: "+(e.message||e));save.disabled=false;save.textContent="Guardar planificación";}
   finally{busy=false;}
  },"primary");save.disabled=errors.length>0;
 }
}
function review(){
 if(!boss())return;
 const d=today(),all=sectors(),done=all.filter(z=>dateOf(z.streetCompletedAt)===d),started=all.filter(z=>dateOf(z.streetStartedAt)===d),uploaded=all.filter(z=>z.dumpDate===d);
 const totals=E("div","km-stats",undefined,page("Cierre diario","Resumen del "+d+" · Solo hechos registrados; no confundir respuestas Sí con facturación."));
 const body=totals.parentElement;
 stat(totals,"Sectores iniciados",started.length);stat(totals,"Visitas terminadas",done.length);stat(totals,"Hojas volcadas",uploaded.length);
 const towns=new Map(),people=new Map();
 for(const z of all){
  const town=z.town||"Pueblo sin indicar";if(!towns.has(town))towns.set(town,{name:town,total:0,finished:0,started:0,todayFinished:0,yes:0,no:0});
  const t=towns.get(town);t.total++;if(z.streetCompletedAt||z.status==="completada")t.finished++;if(dateOf(z.streetStartedAt)===d)t.started++;if(dateOf(z.streetCompletedAt)===d)t.todayFinished++;t.yes+=Number(z.stats?.si)||0;t.no+=Number(z.stats?.no)||0;
  const person=z.comercial||"Sin responsable";if(!people.has(person))people.set(person,{name:person,started:0,finished:0,uploaded:0,booked:0,pending:0});
  const p=people.get(person);if(dateOf(z.streetStartedAt)===d)p.started++;if(dateOf(z.streetCompletedAt)===d)p.finished++;if(z.dumpDate===d)p.uploaded++;
  for(const c of z.clients||[]){if(["agendada","realizada"].includes(c.obraStatus)&&dateOf(c.statusChangedAt)===d)p.booked++;if(!["agendada","realizada","no_apto"].includes(c.obraStatus)&&!["no_interesado","descartado"].includes(c.callStatus))p.pending++;}
 }
 const place=box(body,"01 · PUEBLOS","Progreso territorial","Un pueblo terminado en captación puede seguir teniendo clientes pendientes de llamar o agendar.");
 let found=false;
 for(const t of [...towns.values()].sort((a,b)=>b.todayFinished-a.todayFinished)){
  if(!t.started&&!t.todayFinished)continue;
  found=true;E("p","km-townline",t.name+" · "+t.started+" iniciados · "+t.todayFinished+" visitas terminadas hoy · "+t.finished+"/"+t.total+" trabajados",place);
  if(t.yes+t.no>=12)bar(place,"Respuestas positivas de "+t.name,t.yes,t.no);
  else E("p","km-muted","Datos insuficientes para juzgar su conversión.",place);
 }
 if(!found)E("p","km-muted","Todavía no constan visitas iniciadas o terminadas hoy.",place);
 const team=box(body,"02 · EQUIPO","Actividad de los comerciales","No mostramos horas exactas de volcado si la fecha se guarda sin hora.");
 for(const p of people.values())E("p","km-townline",p.name+" · "+p.started+" iniciados · "+p.finished+" terminados · "+p.uploaded+" volcados · "+p.booked+" citas modificadas hoy · "+p.pending+" fichas activas",team);
 if(me()==="Andrei (Jefe)"&&typeof sectoresMikelSupervision!=="undefined"&&Array.isArray(sectoresMikelSupervision)&&sectoresMikelSupervision.length){
  const other=box(body,"SUPERVISIÓN DISPONIBLE · MIKEL","Sectores del otro equipo","Lectura de sectores autorizados. No se incluyen fichas privadas ni se atribuyen visitas de hoy sin fecha verificada.");
  const places=new Map();
  for(const z of sectoresMikelSupervision){
   const n=z.town||"Pueblo sin indicar";
   if(!places.has(n))places.set(n,{town:n,total:0,done:0,yes:0});
   const p=places.get(n);p.total++;if(z.status==="completada")p.done++;p.yes+=Math.max(0,Number(z.stats?.si)||0);
  }
  for(const p of [...places.values()].sort((a,b)=>b.yes-a.yes).slice(0,8))
   E("p","km-townline",p.town+" · "+p.done+"/"+p.total+" sectores terminados · "+p.yes+" respuestas Sí registradas",other);
 }
 const advice=box(body,"03 · SIGUIENTES ACCIONES","Conclusiones y revisión","Un Sí es una oportunidad. No se considera ingreso cobrado sin información económica verificada.");
 const late=all.filter(z=>z.streetCompletedAt&&!z.dumpDate).length;
 if(late)E("p","km-warning",late+" sector(es) terminados en calle siguen pendientes de volcar.",advice);
 const noFuture=[...people.keys()].filter(name=>!all.some(z=>z.comercial===name&&z.status!=="completada"&&z.date>=d));
 if(noFuture.length)E("p","km-warning","Sin próxima zona registrada: "+noFuture.join(", "),advice);
 if(!late&&!noFuture.length)E("p","km-good","No se detectan sectores terminados sin volcar ni personas con historial sin próximas zonas.",advice);
 const row=actions(advice);B(row,"Planificar",()=>{selectDraft();draft.step=0;open();},"primary");
 B(row,"Asignar tarea a un comercial",()=>{document.getElementById("km-flow")?.remove();window.openNotificationsCenterV2?.("tasks");});
 B(row,"Análisis operativo",()=>{document.getElementById("km-flow")?.remove();window.openKonsorTeamOperations?.();});
 B(row,"Terminar",()=>{document.getElementById("km-flow")?.remove();window.cnvShowHome?.();});
}
window.konsorPlanificador={open,review,metrics:periodMetrics};
})();
