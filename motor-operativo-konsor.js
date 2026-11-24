/* KONSOR · Motor operativo guiado. Preserva los esquemas y guardados actuales. */
(function(){
"use strict";
if(window.konsorMotor)return;
const E=(tag,cls,txt,parent)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);if(parent)parent.append(n);return n;};
const B=(p,txt,fn,kind="")=>{const b=E("button","km-btn "+kind,txt,p);b.type="button";b.onclick=fn;return b;};
const norm=s=>String(s||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
const me=()=>typeof currentUserName==="string"?currentUserName:"";
const isChief=()=>typeof currentUserRole!=="undefined"&&currentUserRole==="jefe";
const isMikel=n=>String(n||"").startsWith("Mikel");
const myTeam=z=>isMikel(z.comercial)===isMikel(me());
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
const localISO=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const isoOf=ms=>ms?localISO(new Date(Number(ms))):"";
const zones=()=>typeof savedZones!=="undefined"&&Array.isArray(savedZones)?savedZones:[];
const territory=()=>zones().filter(z=>z&&!z.isSingleHouse&&!z.isNoAptoZone&&!z.isHotMission&&!z.isLegacyPortfolio&&!window.konsorIsHistoricalOnlySector?.(z)&&myTeam(z));
const own=()=>territory().filter(z=>z.comercial===me());
// Una ficha individual no se cuenta como sector, pero sí como cliente.
const workZones=team=>zones().filter(z=>z&&!z.isNoAptoZone&&!z.isHotMission&&
 myTeam(z)&&(team||z.comercial===me()));
const validClient=c=>!!c&&(c.name||c.phone||c.street);
const clients=team=>workZones(team).flatMap(z=>(z.clients||[]).filter(validClient).map(c=>({c,z})));
const shift=()=>typeof getTodayShift==="function"?getTodayShift(me()):null;
const booked=c=>["agendada","agendada_historica","realizada"].includes(c.obraStatus);
const rejected=c=>c.obraStatus==="no_apto"||["no_interesado","descartado"].includes(c.callStatus);
const isContact=c=>!["no","papelito"].includes(c.captacionRespuesta);
const validPhone=c=>/^[6789]\d{8}$/.test(String(c.phone||"").replace(/\D/g,"").replace(/^34(?=\d{9}$)/,""));
const incomplete=c=>isContact(c)&&(!c.name?.trim()||!c.street?.trim()||!validPhone(c)||!!c.captacionInvalida);
const waitDue=c=>c.callStatus==="esperando_confirmacion"&&(!Number(c.nextContactAt)||Number(c.nextContactAt)<=Date.now());
const dueCall=c=>isContact(c)&&!booked(c)&&!rejected(c)&&!incomplete(c)&&
  (!Number(c.nextContactAt)||Number(c.nextContactAt)<=Date.now())&&
  (["","pendiente","bloqueada","pendiente_visita"].includes(c.callStatus||"")||waitDue(c));
const unfinished=z=>!window.konsorIsHistoricalOnlySector?.(z)&&z.precheck?.sectorStatus!=="no_apto"&&z.status!=="completada"&&!z.streetCompletedAt;
const pendingDump=z=>!window.konsorIsHistoricalOnlySector?.(z)&&((!!z.streetCompletedAt&&!z.dumpDate)||
 (!z.streetStartedAt&&z.status==="en_proceso"&&z.date&&z.date<today()&&!z.dumpDate&&
 ["si","no","ausente","papelito"].some(k=>Number(z.stats?.[k])>0)));
const sorted=rows=>rows.slice().sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999")||String(a.town).localeCompare(String(b.town)));
function nextSector(){return sorted(own().filter(unfinished)).sort((a,b)=> {
 const priority=z=>z.date&&z.date<today()?0:z.date===today()?1:2;
 return priority(a)-priority(b)||(a.date||"9999").localeCompare(b.date||"9999");
 })[0]||null;}
function duration(t){const sec=(Number(t?.seconds)||0)+(Number(t?.activeSince)?Math.max(0,(Date.now()-Number(t.activeSince))/1000):0);return Math.round(sec/60);}
function sessionAllowed(z){if(!z||z.comercial!==me()||z.isSingleHouse||z.isNoAptoZone||z.precheck?.sectorStatus==="no_apto")return false;return true;}
async function saveZones(candidate){
 if(!window.KonsorBridge?.save||window.KonsorBridge.busy)throw Error("El guardado está ocupado o no disponible. Comprueba la conexión.");
 await window.KonsorBridge.save("comercial_custom_zones",candidate);
 savedZones=candidate;
 window.cnvRefreshHome?.();window.refreshCnTerritory?.();
}
function changeTiming(t,kind,now){
 const timer=t.streetTiming&&typeof t.streetTiming==="object"?{...t.streetTiming}:{seconds:0,activeSince:0,events:[]};
 timer.seconds=Math.max(0,Number(timer.seconds)||0);
 timer.events=Array.isArray(timer.events)?timer.events.slice(-24):[];
 if(kind==="start"&&Number(timer.activeSince)>0)return t;
 if(kind==="start"){timer.activeSince=now;timer.events.push({event:"start",at:now});}
 else if(kind==="pause"&&Number(timer.activeSince)>0){timer.seconds+=Math.max(0,(now-Number(timer.activeSince))/1000);timer.activeSince=0;timer.events.push({event:"pause",at:now});}
 else if(kind==="finish"){if(Number(timer.activeSince)>0)timer.seconds+=Math.max(0,(now-Number(timer.activeSince))/1000);timer.activeSince=0;timer.events.push({event:"finish",at:now});}
 t.streetTiming=timer;return t;
}
async function street(zoneId,action){
 const z=zones().find(z=>String(z.id)===String(zoneId));
 if(!sessionAllowed(z))throw Error("Esta zona no está asignada a tu usuario.");
 const currentShift=shift();
 if(action==="start"&&currentShift?.status!=="working")throw Error("Primero debes iniciar o reanudar la jornada.");
 if(z.streetCompletedAt&&action!=="pause")throw Error("El trabajo de calle ya figura terminado. Revisa el volcado en Oficina.");
 if(action==="finish"&&!confirm("¿Has terminado las visitas de este sector? Quedará pendiente de volcar en Oficina."))return false;
 const now=Date.now(),candidate=JSON.parse(JSON.stringify(zones()));
 for(const item of candidate)if(item.comercial===me()&&item.streetTiming?.activeSince&&String(item.id)!==String(zoneId))changeTiming(item,"pause",now);
 const target=candidate.find(z=>String(z.id)===String(zoneId));
 if(!target)throw Error("El sector ha cambiado. Recarga la aplicación.");
 if(action==="start"){changeTiming(target,"start",now);target.status="en_proceso";target.streetStartedAt??=now;}
 if(action==="pause")changeTiming(target,"pause",now);
 if(action==="finish"){changeTiming(target,"finish",now);target.streetCompletedAt=now;target.streetCompletedBy=me();target.status="en_proceso";}
 target._updatedAt=now;
 await saveZones(candidate);
 return true;
}
async function syncShift(action,confirmedShift){
 if(!["lunch","end"].includes(action))return;
 if(action==="lunch"&&confirmedShift?.status!=="lunch")return;
 const items=zones().filter(z=>z.comercial===me()&&z.streetTiming?.activeSince&&!z.streetCompletedAt);
 if(!items.length)return;
 const candidate=JSON.parse(JSON.stringify(zones()));const ids=new Set(items.map(z=>String(z.id)));
 for(const z of candidate)if(ids.has(String(z.id)))changeTiming(z,"pause",Date.now());
 await saveZones(candidate);
}
function route(z){const pts=(z.points||[]).filter(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1])));if(!pts.length){alert("Este sector no tiene coordenadas para abrir una ruta.");return;}const lat=pts.reduce((a,p)=>a+Number(p[0]),0)/pts.length,lon=pts.reduce((a,p)=>a+Number(p[1]),0)/pts.length;const co=lat.toFixed(6)+","+lon.toFixed(6);window.open(/iPhone|iPad|iPod/.test(navigator.userAgent)?"https://maps.apple.com/?daddr="+encodeURIComponent(co):"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(co),"_blank","noopener,noreferrer");}
function dismiss(){document.getElementById("km-flow")?.remove();}
function shell(section,title,desc){
 dismiss();
 let root=E("div","km-overlay",undefined,document.body);root.id="km-flow";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-label",title);
 const page=E("section","km-page",undefined,root);
 const head=E("header","km-head",undefined,page),h=E("div","",undefined,head);
 E("small","",section,h);E("h2","",title,h);
 const back=B(head,"‹",dismiss,"back km-back");back.setAttribute("aria-label","Volver");head.insertBefore(back,h);
 B(head,"×",dismiss,"close").setAttribute("aria-label","Cerrar asistente");
 const body=E("div","km-body",undefined,page);
 if(desc)E("p","km-muted",desc,body);
 root.addEventListener("click",e=>{if(e.target===root)dismiss();});
 return body;
}
function card(parent,kicker,title,detail){
 const section=E("section","km-card",undefined,parent);
 if(kicker)E("small","km-kicker",kicker,section);
 if(title)E("h3","",title,section);
 if(detail)E("p","km-muted",detail,section);
 return section;
}
function stat(parent,label,value){const x=E("div","km-stat",undefined,parent);E("strong","",String(value),x);E("small","",label,x);}
function actions(parent){return E("div","km-actions",undefined,parent);}
function count(c){return (c||[]).length;}
function safeOpen(action){dismiss();if(typeof action==="function")action();}
let returnToOffice=false,returnCheck=null;
function checkOfficeReturn(){
 if(!returnToOffice||document.getElementById("km-flow"))return;
 if(typeof isDrawingMode!=="undefined"&&isDrawingMode)return;
 const active=document.querySelector(".modal-overlay.active,.cnx-modal.active,.koc-overlay.active,.kd-overlay.active,.cn-territorio.active,#konsor-csv-wizard");
 if(active)return;
 returnToOffice=false;
 openOfficeGuide();
}
function leaveOffice(action){
 returnToOffice=true;dismiss();
 if(typeof action==="function")action();
 setTimeout(checkOfficeReturn,400);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{
 new MutationObserver(()=>{if(returnToOffice){clearTimeout(returnCheck);returnCheck=setTimeout(checkOfficeReturn,250);}}).observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"],childList:true});
},{once:true});
else new MutationObserver(()=>{if(returnToOffice){clearTimeout(returnCheck);returnCheck=setTimeout(checkOfficeReturn,250);}}).observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"],childList:true});
const openMap=()=>window.cnvShowMap?.();
const openOffice=()=>window.openCnOffice?.();
const openClient=()=>window.openCnClients?.();
const openCalls=()=>window.openKonsorOfficeClients?.();
function officeState(){
 const list=own(),cc=clients(false),pending=sorted(list.filter(pendingDump));
 const needFix=cc.filter(({c})=>isContact(c)&&incomplete(c)&&!rejected(c));
 const waits=cc.filter(({c})=>isContact(c)&&!booked(c)&&!rejected(c)&&!incomplete(c)&&waitDue(c));
 const calls=cc.filter(({c})=>dueCall(c)&&!waitDue(c));
 const deferred=cc.filter(({c})=>isContact(c)&&!booked(c)&&!rejected(c)&&Number(c.nextContactAt)>Date.now());
 const town=new Map();
 for(const z of workZones(false)){const n=z.town||"Pueblo sin indicar";if(!town.has(n))town.set(n,{name:n,yes:0,booked:0,waiting:0});const o=town.get(n);o.yes+=Math.max(0,Number(window.konsorPerformanceStats?.(z)?.si??z.stats?.si)||0);for(const c of z.clients||[]){if(booked(c))o.booked++;else if(c.callStatus==="esperando_confirmacion")o.waiting++;}}
 return {pending,needFix,waits,calls,deferred,cc,town:[...town.values()]};
}
async function leagueSummary(){
 if(typeof leagueRows!=="function"||typeof personalStatsRange!=="function"||typeof isMikelTeamMember==="function"&&isMikelTeamMember(me()))return "Puedes consultar tu clasificación en Resultados.";
 const date=today(),range=personalStatsRange("month",date),before=personalStatsRange("month",date,true);
 let totals=null;
 if(typeof currentUserRole!=="undefined"&&currentUserRole==="comercial"){
  if(typeof window.teamSummaryV2!=="function")throw Error("La clasificación del equipo no está disponible.");
  const answer=await window.teamSummaryV2({mode:"liga",range,previous:before,phase:"captadas"});
  totals=answer.data?.current||null;
 }
 const rows=leagueRows("month",date,"captadas",false,totals).filter(x=>Number(x.area)>0);
 const mine=rows.find(x=>x.name===me());
 if(!mine||!mine.rank)return "Aún no constan m² de captación para tu clasificación mensual.";
 if(mine.rank===1){
  if(rows.some(x=>x.name!==me()&&x.rank===1))return "Compartes el primer puesto del mes con "+Math.round(mine.area)+" m². Un poco más te permite desempatar.";
  const second=rows.find(x=>x.name!==me()&&x.rank>1);
  if(!second)return "Primera posición del mes: "+Math.round(mine.area)+" m². No hay otro puesto con superficie registrada.";
  return "¡Primera posición! "+Math.round(mine.area)+" m². Ventaja sobre el segundo: "+Math.max(0,Math.round(mine.area-second.area))+" m².";
 }
 const upper=rows.filter(x=>x.rank<mine.rank).sort((a,b)=>b.rank-a.rank)[0];
 if(!upper)return "Puesto "+mine.rank+" · "+Math.round(mine.area)+" m² registrados.";
 const diff=Math.max(1,Math.floor(upper.area-mine.area)+1);
 return "Puesto "+mine.rank+" · "+Math.round(mine.area)+" m². Te faltan "+diff+" m² para superar al puesto superior.";
}

function openOfficeGuide(){
 const s=officeState();const hasField=!!nextSector();
 const step=hasField&&s.pending.length?0:s.needFix.length?1:s.waits.length?2:s.calls.length?3:4;
 const phases=["Volcar si hay sector","Completar fichas","Seguimientos","Llamar y agendar","Balance"];
 const body=shell("OFICINA · RECORRIDO GUIADO",phases[step],step<4?"Continuamos automáticamente con la primera tarea pendiente. Los datos se comprueban de nuevo cada vez que abres esta guía.":"No quedan tareas vencidas del circuito principal.");
 const top=E("div","km-progress",undefined,body);phases.forEach((name,i)=>{const b=E("span",i<step?"done":i===step?"active":"",String(i+1),top);b.title=name;});
 const totals=E("div","km-stats",undefined,body);stat(totals,"Por volcar",s.pending.length);stat(totals,"Fichas incompletas",s.needFix.length);stat(totals,"Llamadas pendientes",s.waits.length+s.calls.length);
 if(step===0){
  const z=s.pending[0],position=1,total=s.pending.length;
  const c=card(body,"SECTOR "+position+" DE "+total,z.sectorName||"Sector",z.town+" · fecha de calle "+(z.date||"sin registrar"));
  E("p","km-muted","Primero los sectores antiguos. Volcar no cambia la fecha en que se trabajó la zona.",c);
  const row=actions(c);
  B(row,"Volcado manual",()=>leaveOffice(()=>{const idx=zones().findIndex(x=>String(x.id)===String(z.id));if(idx>=0&&typeof openDumpModal==="function")openDumpModal(idx);}),"primary");
  B(row,"Fotos → CSV",()=>leaveOffice(()=>window.abrirImportadorTerritorialKonsor?.()),"");
  B(row,"Abrir chat de fotos · Gemini",()=>window.open("https://share.gemini.google/S2jfiuk0c3m2","_blank","noopener,noreferrer"));
  B(row,"Ver todos los pendientes",()=>leaveOffice(openOffice),"");
 }else if(step===1){
  const first=s.needFix[0],c=card(body,"REVISIÓN",s.needFix.length+" fichas para revisar","Después de volcar, corrige nombre, calle, teléfono u otros datos señalados antes de gestionar citas.");
  E("p","km-muted","Primera ficha: "+(first.c.name||"Sin nombre")+" · "+first.z.town+" · "+(first.c.street||"Sin calle"),c);
  B(actions(c),"Revisar fichas",()=>leaveOffice(openClient),"primary");
 }else if(step===2||step===3){
  const items=step===2?s.waits:s.calls,first=items[0];
  const c=card(body,step===2?"SEGUIMIENTO PRIORITARIO":"LLAMADAS POR ANTIGÜEDAD",items.length+" contactos por resolver",
   step===2?"Hay personas esperando respuesta o una nueva llamada. Revisa primero la que corresponda hoy.":"La gestión de clientes existente agrupa llamadas por calle y conserva las reservas individuales.");
  E("p","km-muted","Primero: "+(first.c.name||"Sin nombre")+" · "+first.z.town+" · "+first.z.sectorName,c);
  B(actions(c),"Organizar pueblo y huecos de instalación",()=>leaveOffice(()=>window.openKonsorCallPlanner?.()||openCalls()),"primary");
  B(actions(c),"Ver clientes para llamar",()=>leaveOffice(openCalls));
 }else{
  const c=card(body,"AL DÍA","Recorrido principal completado","Los seguimientos futuros se conservan para la fecha fijada; no se consideran atrasados.");
  if(s.deferred.length)E("p","km-muted",s.deferred.length+" seguimientos están previstos para una fecha posterior.",c);
  for(const p of s.town){E("p","km-townline",p.name+" · "+p.yes+" respuestas Sí · "+p.booked+" citas/obras · "+p.waiting+" en espera",c);}
  const liga=E("p","km-muted","Consultando la Liga mensual…",c);
  leagueSummary().then(msg=>{if(liga.isConnected)liga.textContent=msg;}).catch(()=>{if(liga.isConnected)liga.textContent="Consulta tu clasificación actual desde Resultados.";});
  const row=actions(c);
  B(row,"Ver Liga",()=>safeOpen(()=>{if(typeof openLeagueRankingModal==="function")openLeagueRankingModal();else window.openCnResults?.();}),"primary");
  B(row,"Mis resultados",()=>safeOpen(()=>window.openCnResults?.()));
  if(isChief())B(row,"Cierre de Dirección",()=>window.konsorPlanificador?.review?.());
  else B(row,"Terminar · hasta mañana",()=>safeOpen(()=>window.cnvShowHome?.()));
 }
 const foot=card(body,"SECUENCIA","¿Qué hacemos después?","Volcar → Revisar → Esperas → Llamadas y citas → Balance. Puedes cerrar y retomarla desde Oficina.");
 B(actions(foot),"Actualizar mi progreso",openOfficeGuide);
}
function openDayGuide(){
 const z=nextSector(),s=shift();
 const body=shell("MI JORNADA · SIGUIENTE ACCIÓN",!s?"Registrar entrada":s.status==="lunch"?"Pausa de comida":s.status==="finished"?"Jornada cerrada":z?"Tu siguiente sector":"Tu trabajo del día",
  !s?"Puedes consultar KONSOR sin iniciar. El fichaje se guarda con la hora real cuando confirmas.":s.status==="lunch"?"La jornada sigue en comida hasta que pulses reanudar.":s.status==="finished"?"La jornada de hoy está terminada. Oficina puede tener tareas pendientes.":"Primero termina las zonas anteriores y luego continúa con el plan de hoy.");
 const c=card(body,"FICHAJE",!s?"Fuera de jornada":s.status==="lunch"?"En comida":s.status==="finished"?"Finalizada":"Trabajando",s?"Inicio: "+(s.startTime||"—")+" · Estado: "+s.status:"Sin hora registrada hoy");
 let row=actions(c);
 const shiftBtn=(label,action,kind)=>B(row,label,async()=>{try{const ok=typeof handleShiftAction==="function"&&await handleShiftAction(action);if(ok)openDayGuide();}catch(e){alert(e.message||e);}},kind);
 if(!s)shiftBtn("Iniciar jornada","start","primary");
 else if(s.status==="working"){shiftBtn("Pausar para comer","lunch","");shiftBtn("Finalizar jornada","end","");}
 else if(s.status==="lunch")shiftBtn("Continuar después de comer","lunch","primary");
 B(row,"Olvidé fichar o corregir hora",()=>safeOpen(()=>window.konsorCorregirJornada?.()));
 if(z){
  const last=z.date&&z.date<today();
  const d=card(body,last?"PRIORIDAD · DÍA ANTERIOR":"SIGUIENTE ZONA",z.sectorName||"Sector",z.town+" · "+(z.date||"Sin fecha"));
  E("p","km-muted",last?"Termina el sector pendiente antes de comenzar los nuevos.":"El tiempo de calle no empieza al abrir la ruta, sino al confirmar que has llegado.",d);
  const timer=z.streetTiming||{},clock=duration(timer);
  if(clock)E("p","km-muted","Tiempo registrado de calle: "+clock+" min"+(timer.activeSince?" · CONTANDO":" · EN PAUSA"),d);
  const buttons=actions(d);
  B(buttons,"Ir al sector",()=>route(z),"primary");
  B(buttons,"Mapa y Catastro",()=>safeOpen(openMap));
  if(s?.status==="working"){
   if(timer.activeSince)B(buttons,"Pausar tiempo de calle",async()=>{try{await street(z.id,"pause");openDayGuide();}catch(e){alert(e.message||e);}});
   else B(buttons,clock?"Reanudar tiempo de calle":"He llegado · Empezar calle",async()=>{try{await street(z.id,"start");openDayGuide();}catch(e){alert(e.message||e);}},"primary");
   B(buttons,"Terminar visitas del sector",async()=>{try{if(await street(z.id,"finish"))openDayGuide();}catch(e){alert(e.message||e);}});
  }
 }
 if(!z){
  const o=officeState();
  const pending=o.calls.length+o.waits.length;
  const bookedCount=o.cc.filter(x=>["agendada","agendada_historica"].includes(x.c.obraStatus)).length;
  const topTown=o.town.slice().sort((a,b)=>b.yes-a.yes)[0];
  const office=card(body,"TRABAJO DE OFICINA",pending?pending+" clientes para gestionar":"Revisa tus clientes",
   o.cc.length+" fichas visibles · "+bookedCount+" obras agendadas. No hay sectores pendientes de calle.");
  if(topTown)E("p","km-muted","Pueblo con más oportunidades registradas: "+topTown.name,office);
  B(actions(office),"Organizar llamadas y obras",()=>safeOpen(()=>window.openKonsorCallPlanner?.()||openCalls()),"primary");
  B(actions(office),"Revisar clientes",()=>safeOpen(openCalls));
 }
 const list=card(body,"TODOS LOS SECTORES","Tu planificación y pendientes","También puedes consultar los demás sectores o la zona de trabajo sin salir del recorrido.");
 B(actions(list),"Abrir Mi jornada",()=>safeOpen(()=>window.openCnDay?.()),"");
 B(actions(list),"Ir a Oficina",()=>openOfficeGuide(),"");
}
function refreshIfOpen(){const root=document.getElementById("km-flow");if(!root)return;const tag=root.querySelector(".km-head small")?.textContent||"";if(tag.startsWith("OFICINA"))openOfficeGuide();else if(tag.startsWith("MI JORNADA"))openDayGuide();}


function lunchReminder(){
 const now=shift();
 if(now?.status!=="lunch"||document.getElementById("km-lunch-reminder"))return;
 const root=E("div","km-overlay",undefined,document.body);root.id="km-lunch-reminder";
 const page=E("section","km-page km-lunch",undefined,root),head=E("header","km-head",undefined,page);
 E("small","","KONSOR · COMIDA",head);B(head,"×",()=>root.remove(),"close").setAttribute("aria-label","Ahora no");
 const body=E("div","km-body",undefined,page);
 E("h2","","¿Vuelves al trabajo después de comer?",body);
 E("p","km-muted","Sigues en pausa. Para que tu jornada se registre correctamente, confirma cuándo reanudas. Si solo entras a consultar algo, puedes cerrar.",body);
 const row=actions(body);
 B(row,"Sí, continuar jornada",async()=>{
  if(typeof handleShiftAction!=="function")return;
  try{const ok=await handleShiftAction("lunch");if(ok){root.remove();window.cnvRefreshHome?.();}}
  catch(e){alert("No se ha podido confirmar la reanudación: "+(e.message||e));}
 },"primary");
 B(row,"Ahora no",()=>root.remove());
}
window.konsorLunchReminder=lunchReminder;

window.konsorMotor={
 openDay:openDayGuide,openOffice:openOfficeGuide,
 openPlan:()=>window.konsorPlanificador?.open?.(),
 openReview:()=>window.konsorPlanificador?.review?.(),
 startStreet:id=>street(id,"start"),pauseStreet:id=>street(id,"pause"),finishStreet:id=>street(id,"finish"),
 onShiftAction:syncShift,checkLunch:()=>window.konsorLunchReminder?.(),
 refresh:refreshIfOpen,nextSector,officeState,duration
};
})();
