/* KONSOR · Oficina: una llamada, una decisión, una obra. */
(function () {
"use strict";
const ID="konsorOfficeCallV2";
const SLOTS=[["09:00","11:00"],["11:00","13:00"],["15:00","17:00"],["17:00","19:00"]];
let current=null, view="list", scope="mine", chosenDate="", selectedSlot="", selectedTeam=0, busy=false, seq=0;
let clusterFocus=null,clusterDate="",clusterTeam=2,clusterSeq=0,clusterReturn=false,plannedChoice=null;
const e=(t,c,txt,p)=>{let x=document.createElement(t);if(c)x.className=c;if(txt!==undefined)x.textContent=String(txt);if(p)p.append(x);return x;};
const button=(label,fn,kind="")=>{const b=e("button","koc-btn "+kind,label);b.type="button";b.onclick=fn;return b;};
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
const tomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
const owns=z=>z&&typeof isMikelTeamMember==="function"&&!isMikelTeamMember(z.comercial)&&!isMikelTeamMember(currentUserName)&&(z.comercial===currentUserName||currentUserRole==="jefe"&&scope==="team");
const valid=c=>c&&typeof c==="object"&&(String(c.name||"").trim()||String(c.phone||"").trim()||String(c.street||"").trim());
function all(){return (Array.isArray(savedZones)?savedZones:[]).flatMap((z,zi)=>owns(z)&&!z.isNoAptoZone&&!z.isHotMission?(z.clients||[]).flatMap((c,ci)=>valid(c)?[{z,c,zi,ci,key:String(z.id)+":"+String(c.clientUid||ci),date:z.dumpDate||z.date||""}]:[]):[]).sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.zi-b.zi||a.ci-b.ci);}
const booked=i=>["agendada","realizada"].includes(i.c.obraStatus);
const done=i=>booked(i)||["no_interesado","descartado"].includes(i.c.callStatus);
const pending=i=>!done(i)&&i.c.obraStatus!=="no_apto";
const callable=i=>pending(i)&&(!Number(i.c.nextContactAt)||Number(i.c.nextContactAt)<=Date.now());

/* Las oportunidades son recomendaciones, nunca reservas. Solo se usan datos del equipo visible. */
const norm=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const town=i=>norm(i?.z?.town);
function street(i){
 const original=String(i?.c?.street||"").trim();
 if(!original)return "";
 if(typeof normalizeStreetClusterKey==="function")return norm(normalizeStreetClusterKey(original));
 return norm(original).replace(/^(calle|c\/|avenida|avda\.?|plaza|paseo|travesia)\s+/,"").replace(/\b(nº|num\.?|numero|portal|piso)\b.*$/,"").replace(/\d+.*$/,"").trim();
}
const sameStreet=(a,b)=>!!(street(a)&&street(a)===street(b)&&town(a)&&town(a)===town(b));
const sameTown=(a,b)=>!!(town(a)&&town(a)===town(b));
function geo(i){
 try{if(typeof routePoint!=="function")return null;
 const p=routePoint(i.z,i.c);return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)?p:null;
 }catch{return null;}
}
function km(a,b){
 const p=geo(a),q=geo(b);
 if(!p||!q)return null;
 if(typeof routeDistance==="function")return routeDistance(p,q);
 return null;
}
function clusters(rows){
 const groups=new Map();
 rows.filter(callable).forEach(item=>{
  const k=town(item)+"|"+street(item);
  if(!town(item)||!street(item))return;
  if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push(item);
 });
 return [...groups.values()].filter(group=>group.length>=2).sort((a,b)=>b.length-a.length||String(a[0].date).localeCompare(String(b[0].date)));
}
function existing(date,team){
 if(typeof routeRecords!=="function")return [];
 return routeRecords(date).filter(r=>Number(r.c?.obraEquipoInstalacion)===team||![2,3].includes(Number(r.c?.obraEquipoInstalacion))).map(r=>({z:r.z,c:r.c,slot:r.slot}));
}
function logistics(item,date,time,team){
 const index=SLOTS.findIndex(s=>s[0]===time),rows=existing(date,team).filter(r=>r.c!==item.c);
 const nearby=rows.filter(r=>r.slot===index-1||r.slot===index+1);
 const same=nearby.find(r=>sameStreet(item,r));
 if(same)return{rank:0,label:"Misma calle",detail:"Continuidad con una obra contigua · Equipo "+team};
 const exact=nearby.map(r=>({r,dist:km(item,r)})).filter(v=>v.dist!==null).sort((a,b)=>a.dist-b.dist)[0];
 if(exact&&exact.dist<=2)return{rank:1,label:"Muy cerca",detail:"A "+exact.dist.toFixed(1).replace(".",",")+" km en línea recta de una obra contigua (no tiempo de viaje)"};
 const townMatch=nearby.find(r=>sameTown(item,r));
 if(townMatch)return{rank:2,label:"Mismo municipio",detail:"Otra obra contigua en "+(item.z.town||"el municipio")};
 if(exact&&exact.dist<=8)return{rank:3,label:"Zona próxima",detail:"A "+exact.dist.toFixed(1).replace(".",",")+" km en línea recta; revisar desplazamiento"};
 if(rows.length)return{rank:5,label:"Hueco libre",detail:"Existen otras obras del equipo ese día; comprobar desplazamiento"};
 return{rank:4,label:"Jornada nueva",detail:"Equipo sin obras locales asignadas ese día"};
}
const candidateOf=i=>!!(i&&callable(i)&&[i.c.name,i.c.street,i.c.phone,i.z.town].every(v=>String(v||"").trim()));
function firstRecommended(){
 const candidates=all().filter(candidateOf),groups=clusters(candidates);
 return groups.length?groups[0][0]:candidates[0]||null;
}
function groupRows(){
 if(!clusterFocus)return [];
 return all().filter(i=>town(i)===clusterFocus.town&&street(i)===clusterFocus.street).sort((a,b)=>{
  const na=Number(String(a.c.street||"").match(/\d+/)?.[0]||0),nb=Number(String(b.c.street||"").match(/\d+/)?.[0]||0);
  return na-nb||String(a.c.street||"").localeCompare(String(b.c.street||""),"es");
 });
}
function startGroup(item){
 if(!item)return;
 clusterFocus={town:town(item),street:street(item)};
 clusterDate=clusterDate&&clusterDate>=tomorrow()?clusterDate:tomorrow();
 clusterTeam=Number(clusterTeam)||2;view="group";draw();
}
function clusterStatus(item){
 if(booked(item))return "confirmed";
 if(item.c.obraStatus==="no_apto"||["no_interesado","descartado"].includes(item.c.callStatus))return "rejected";
 if(!callable(item))return "deferred";
 return "ready";
}
function preferGroupDate(item,date,time,team){
 plannedChoice={key:item.key,date,time,team};clusterReturn=true;
 current={key:item.key};view="client";draw();
}
function groupDateLabel(date){
 try{return new Date(date+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}catch{return date;}
}
async function renderGroupAgenda(body,insertBefore=null){
 const ticket=++clusterSeq,group=groupRows();
 const host=e("section","koc-card koc-group-schedule",undefined,body);
 if(insertBefore&&insertBefore.parentNode===body)body.insertBefore(host,insertBefore);
 e("h3","","Agenda del equipo",host);
 e("p","koc-muted","Primero se muestran las reservas confirmadas. Las propuestas azules aún no son citas: confirma cada cliente por teléfono.",host);
 const controls=e("div","koc-group-controls",undefined,host);
 const dateInput=e("input","koc-input",undefined,controls);dateInput.type="date";dateInput.min=tomorrow();dateInput.value=clusterDate;
 const teamInput=e("select","koc-input",undefined,controls);
 for(const num of [2,3]){const option=e("option","","Equipo "+num,teamInput);option.value=String(num);}
 teamInput.value=String(clusterTeam);
 const reload=()=>{clusterDate=dateInput.value;clusterTeam=Number(teamInput.value);renderGroupAgendaReplace(body,host);};
 dateInput.onchange=reload;teamInput.onchange=reload;
 const summary=e("p","koc-muted","Comprobando las cuatro franjas…",host);
 const grid=e("div","koc-group-grid",undefined,host);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(clusterDate)||clusterDate<tomorrow()||new Date(clusterDate+"T12:00:00").getDay()===0){
  summary.textContent="Elige una fecha futura de lunes a sábado.";return;
 }
 let remote=null,error=null;
 try{remote=await consultarKonsorFecha(clusterDate);}
 catch(err){error=err;}
 if(ticket!==clusterSeq||view!=="group"||!host.isConnected)return;
 const slots=Array.isArray(remote?.[String(clusterTeam)])?remote[String(clusterTeam)]:[];
 const allBooked=typeof routeRecords==="function"?routeRecords(clusterDate):[];
 const teamBooked=allBooked.filter(r=>Number(r.c?.obraEquipoInstalacion)===clusterTeam||![2,3].includes(Number(r.c?.obraEquipoInstalacion)));
 let confirmed=0,proposed=0;
 const used=new Set();
 SLOTS.forEach(([from,to],idx)=>{
  const cell=e("section","koc-group-slot",undefined,grid);
  e("span","koc-slot-hour",from+" – "+to,cell);
  const reservation=teamBooked.find(r=>r.slot===idx);
  const server=slots.find(r=>r.horario===from+"-"+to);
  if(reservation){
   const isOwn=group.find(x=>x.c===reservation.c);
   cell.classList.add("confirmed");confirmed++;
   e("strong","",reservation.c?.name||"Obra confirmada",cell);
   e("small","",(reservation.c?.street||"Sin dirección")+" · "+(reservation.z?.town||""),cell);
   e("span","koc-slot-state","CONFIRMADA",cell);
   if(isOwn)cell.append(button("Ver ficha",()=>open(isOwn),"koc-quiet"));
   return;
  }
  if(!remote){cell.classList.add("unverified");e("strong","","Sin verificar",cell);e("small","",error?.message||"No se pudo consultar KONSOR",cell);return;}
  if(server?.libre!==true){cell.classList.add("occupied");e("strong","","Ocupado / no disponible",cell);e("small","","La disponibilidad del equipo no permite reservar.",cell);return;}
  const eligible=group.filter(x=>clusterStatus(x)==="ready"&&candidateOf(x)&&!used.has(x.key));
  const candidate=eligible[0];
  if(candidate){
   used.add(candidate.key);proposed++;
   cell.classList.add("suggested");
   e("strong","",candidate.c.name||"Cliente pendiente",cell);
   e("small","",candidate.c.street||"Sin dirección",cell);
   e("span","koc-slot-state","PROPUESTA · POR LLAMAR",cell);
   cell.append(button("Llamar para esta franja",()=>preferGroupDate(candidate,clusterDate,from,clusterTeam),"koc-primary"));
  }else{
   cell.classList.add("free");e("strong","","Hueco libre",cell);e("small","","Disponible según KONSOR. Sin cliente asignado.",cell);
  }
 });
 summary.textContent=error?"No se pudo verificar la disponibilidad: no se propondrán reservas.":confirmed+" obras confirmadas · "+proposed+" propuestas para llamar · Equipo "+clusterTeam;
 const remainder=group.filter(x=>clusterStatus(x)==="ready"&&!used.has(x.key));
 if(remainder.length){
  const rest=e("div","koc-group-remainder",undefined,host);
  e("strong","",remainder.length+" viviendas pendientes para otras franjas o días",rest);
  remainder.forEach(x=>{const r=e("div","koc-remain-row",undefined,rest);e("span","",(x.c.name||"Sin nombre")+" · "+x.c.street,r);r.append(button("Ver ficha",()=>open(x),"koc-quiet"));});
 }
 if(group.some(x=>clusterStatus(x)==="deferred"))e("p","koc-muted","Algunos vecinos tienen un seguimiento programado para más adelante y no se proponen para llamar ahora.",host);
}
function renderGroupAgendaReplace(body,previous){
 const next=previous?.nextSibling||null;
 if(previous)previous.remove();
 renderGroupAgenda(body,next);
}
function renderGroup(body){
 const group=groupRows();
 if(!group.length){clusterFocus=null;view="list";draw();return;}
 nav(body,"Todas las oportunidades",()=>{clusterFocus=null;clusterReturn=false;view="list";draw();});
 const heading=card(body);
 e("span","koc-group-eyebrow","AGRUPACIÓN POR CALLE",heading);
 title(heading,group[0].c.street.replace(/\d+.*$/,"").trim()+" · "+(group[0].z.town||"Municipio"),group.length+" viviendas identificadas. Solo se agendan las que aceptan la fecha.");
 const stats=e("div","koc-group-metrics",undefined,heading);
 const bookedHere=group.filter(x=>booked(x)),ready=group.filter(x=>clusterStatus(x)==="ready");
 [["Viviendas",group.length],["Confirmadas",bookedHere.length],["Por llamar",ready.length]].forEach(([label,v])=>{const box=e("div","koc-group-metric",undefined,stats);e("strong","",v,box);e("small","",label,box);});
 renderGroupAgenda(body);
 const clients=card(body);title(clients,"Quiénes son los vecinos","Verde = agendado · Azul = pendiente · Gris = seguimiento u otra respuesta");
 group.forEach(item=>{
  const status=clusterStatus(item),line=e("div","koc-group-client "+status,undefined,clients);
  const content=e("div","koc-group-client-content",undefined,line);
  e("strong","",(item.c.name||"Sin nombre")+" · "+(item.c.street||"Sin dirección"),content);
  let desc=status==="confirmed"?"CONFIRMADA · "+(item.c.obraDate||"")+" "+(item.c.obraTime||"")+" · Equipo "+(item.c.obraEquipoInstalacion||"?"):status==="ready"?"PENDIENTE DE LLAMADA":status==="deferred"?"SEGUIMIENTO PENDIENTE":"NO DISPONIBLE";
  if(status==="ready"&&!candidateOf(item))desc="FICHA INCOMPLETA · Revisa nombre, teléfono y dirección";
  e("small","",desc,content);
  if(status==="ready")line.append(button("Llamar",()=>open(item),"koc-primary"));
  else if(status==="confirmed")line.append(button("Ver",()=>open(item),"koc-quiet"));
 });
}
function proximityLeads(candidates){
 if(typeof routeRecords!=="function")return [];
 const dates=[];let d=new Date(tomorrow()+"T12:00:00");
 while(dates.length<7){const iso=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");if(d.getDay()!==0)dates.push(iso);d.setDate(d.getDate()+1);}
 const options=[];
 dates.forEach(date=>{
  const records=routeRecords(date);
  for(const team of [2,3]){
   const bookings=records.filter(x=>Number(x.c?.obraEquipoInstalacion)===team&&x.slot>=0);
   if(!bookings.length||bookings.length>=4)continue;
   candidates.forEach(item=>{
    const adj=bookings.filter(x=>sameStreet(item,x)||sameTown(item,x)||((()=>{const dist=km(item,x);return dist!==null&&dist<=2;})()));
    if(!adj.length)return;
    const same=adj.some(x=>sameStreet(item,x));
    const adjacentSlots=adj.flatMap(x=>[x.slot-1,x.slot+1]).filter(n=>n>=0&&n<4);
    const empty=adjacentSlots.filter(n=>!records.some(x=>x.slot===n&&(![2,3].includes(Number(x.c?.obraEquipoInstalacion))||Number(x.c.obraEquipoInstalacion)===team)));
    if(!empty.length)return;
    options.push({item,date,team,slot:empty[0],rank:same?0:adj.some(x=>sameTown(item,x))?1:2});
   });
  }
 });
 return options.sort((a,b)=>a.rank-b.rank||a.date.localeCompare(b.date)).filter((o,i,arr)=>arr.findIndex(x=>x.item.key===o.item.key)===i).slice(0,3);
}
function opportunityCards(parent,candidates){
 const groups=clusters(candidates),leads=proximityLeads(candidates);
 if(!groups.length&&!leads.length)return;
 const block=card(parent);title(block,"Oportunidades detectadas","Prioridades logísticas, no citas reservadas. El servidor verificará cada hueco antes de confirmarlo.");
 groups.slice(0,4).forEach(group=>{
  const first=group[0],line=e("div","koc-opportunity",undefined,block);
  const wrap=e("div","koc-opportunity-text",undefined,line);
  e("strong","",first.c.street.replace(/\d+.*$/,"").trim()+" · "+(first.z.town||"Localidad"),wrap);
  e("small","",group.length+" viviendas de la misma calle por llamar · Concentrar hasta cuatro franjas seguidas por equipo",wrap);
  line.append(button("Ver jornada",()=>startGroup(group[0]),"koc-quiet"));
 });
 const covered=new Set(groups.flat().map(x=>x.key));
 leads.filter(x=>!covered.has(x.item.key)).forEach(x=>{
  const line=e("div","koc-opportunity",undefined,block),wrap=e("div","koc-opportunity-text",undefined,line);
  e("strong","","Completar ruta · "+(x.item.z.town||"Municipio"),wrap);
  e("small","",x.item.c.street+" · "+x.date+" · Equipo "+x.team+" · posible "+SLOTS[x.slot][0]+" (sin verificar)",wrap);
  line.append(button("Ver cliente",()=>open(x.item),"koc-quiet"));
 });
}

function resolve(){if(!current)return null;return all().find(x=>x.key===current.key)||null;}
function root(){
 let r=document.getElementById(ID);if(r)return r;
 r=e("div","koc-overlay",undefined,document.body);r.id=ID;
 const pg=e("section","koc-page",undefined,r);pg.setAttribute("role","dialog");pg.setAttribute("aria-modal","true");pg.setAttribute("aria-label","Gestión de clientes");
 const head=e("header","koc-header",undefined,pg),h=e("div","",undefined,head);
 e("small","","KONSOR · OFICINA",h);e("h2","","Gestionar clientes",h);
 head.append(button("Cerrar",()=>r.classList.remove("active"),"koc-quiet"));
 e("main","koc-body",undefined,pg);
 r.addEventListener("click",ev=>{if(ev.target===r)r.classList.remove("active");});
 return r;
}
function title(p,heading,detail){e("h3","",heading,p);if(detail)e("p","koc-muted",detail,p);}
function card(p){return e("section","koc-card",undefined,p);}
function show(msg){const t=e("p","koc-error",msg);return t;}
function nav(body,label,fn){body.append(button("‹ "+label,fn,"koc-quiet"));}
function open(item){if(plannedChoice?.key!==item.key)plannedChoice=null;current={key:item.key};view="client";draw();}
function next(){if(clusterFocus){plannedChoice=null;view="group";draw();return;}const remaining=all().filter(i=>callable(i)&&i.key!==current?.key);const origin=resolve();const row=(origin&&remaining.find(i=>sameStreet(origin,i)))||(origin&&remaining.find(i=>sameTown(origin,i)))||remaining.find(i=>i.key===firstRecommended()?.key)||remaining[0];if(row)open(row);else{view="list";draw();}}
function row(body,item){const b=button("",()=>open(item),"koc-row");
 const txt=e("span","koc-row-text",undefined,b);e("strong","",item.c.name||"Sin nombre",txt);
 e("small","",(item.z.town||"Sin municipio")+" · "+(item.c.street||"Sin calle"),txt);
 const status=booked(item)?"Obra agendada":item.c.callStatus==="no_interesado"?"No interesado":item.c.callStatus==="esperando_confirmacion"?"En seguimiento":item.c.callStatus==="ya_llamado"?"Volver a llamar":"Por llamar";
 e("span","koc-tag "+(booked(item)?"success":""),status,b);
 body.append(b);}
function draw(opts={}){
 ++clusterSeq;
 const r=root();r.classList.add("active");const body=r.querySelector(".koc-body");body.replaceChildren();
 const items=all(),todo=items.filter(callable),scheduled=items.filter(booked),deferred=items.filter(i=>pending(i)&&!callable(i));
 if(view==="group"){renderGroup(body);return;}
 if(view==="list"){
  title(body,"La siguiente llamada","Resuelve cada ficha antes de pasar a la siguiente. El volcado mantiene su fecha original.");
  const counts=e("div","koc-counts",undefined,body);
  [["Clientes",items.length],["Por llamar",todo.length],["Obras agendadas",scheduled.length]].forEach(([label,v])=>{const box=e("div","koc-count",undefined,counts);e("strong","",v,box);e("small","",label,box);});
  if(currentUserRole==="jefe"){const s=e("select","koc-input",undefined,body);[["mine","Mis clientes"],["team","Todo mi equipo"]].forEach(([value,label])=>{const o=e("option","",label,s);o.value=value;});s.value=scope;s.onchange=()=>{scope=s.value;draw();};}
  const suggested=firstRecommended();
  if(suggested)body.append(button("Llamar a "+(suggested.c.name||"primer cliente recomendado"),()=>open(suggested),"koc-primary"));
  opportunityCards(body,todo);
  const list=card(body);title(list,"Clientes pendientes",todo.length+" fichas para gestionar · Prioriza las agrupaciones");
  todo.forEach(i=>row(list,i));
  if(!todo.length)e("p","koc-muted","No hay llamadas vencidas. Los recordatorios futuros permanecen guardados.",list);
  if(deferred.length){const waits=e("details","koc-closed",undefined,body);e("summary","","Seguimientos futuros ("+deferred.length+")",waits);deferred.forEach(i=>row(waits,i));}
  const details=e("details","koc-closed",undefined,body);e("summary","","Gestionados ("+items.filter(i=>!pending(i)).length+")",details);items.filter(i=>!pending(i)).forEach(i=>row(details,i));
  return;
 }
 const item=resolve();if(!item){view="list";current=null;draw();return;}
 const {z,c}=item;
 if(view==="client"){
  nav(body,clusterFocus?"Volver a la jornada":"Volver a clientes",()=>{view=clusterFocus?"group":"list";draw();});
  title(body,c.name||"Cliente sin nombre",(z.town||"Sin localidad")+" · "+(c.street||"Dirección no registrada"));
  const sheet=card(body);
  const facts=[["Teléfono",c.phone||"Sin teléfono"],["Captación",item.date||"Sin fecha"],["Superficie",c.m2?String(c.m2)+" m²":"Sin superficie"],["Estado",booked(item)?"Obra agendada":c.callStatus||"Por llamar"]];
  facts.forEach(([k,v])=>{const line=e("div","koc-fact",undefined,sheet);e("span","",k,line);e("strong","",v,line);});
  const group=all().filter(x=>callable(x)&&sameStreet(item,x));
  if(group.length>1){const hint=card(body);e("strong","","Oportunidad · Misma calle",hint);e("p","koc-muted",group.length+" viviendas por llamar en esta calle. Conviene proponer franjas del mismo día y equipo antes de abrir otra ruta.",hint);hint.append(button("Ver jornada con estos clientes",()=>startGroup(item),"koc-quiet"));}
  if(plannedChoice?.key===item.key){const suggestion=card(body);e("strong","","Franja que intentamos completar",suggestion);e("p","koc-muted",plannedChoice.date+" · "+plannedChoice.time+" · Equipo "+plannedChoice.team+" (sin reservar). Propón este horario durante la llamada.",suggestion);}
  if(c.phone){const a=e("a","koc-btn koc-primary","Llamar al cliente",body);a.href="tel:"+String(c.phone).replace(/[^\d+]/g,"");}
  if(!callable(item)&&pending(item)){const nextAt=new Date(Number(c.nextContactAt)).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});e("p","koc-muted","Seguimiento programado para "+nextAt+". Puedes consultar la ficha sin adelantar la llamada.",body);}
  if(booked(item)){
   body.append(button("Ver confirmación y WhatsApp",()=>{view="whatsapp";draw();},"koc-primary"));
   body.append(button("Cambiar fecha",()=>{chosenDate=c.obraDate||tomorrow();view="calendar";draw();},"koc-quiet"));
  }else{
   body.append(button("Acepta · Agendar obra",()=>{chosenDate=plannedChoice?.key===item.key?plannedChoice.date:clusterFocus?clusterDate:tomorrow();selectedSlot="";selectedTeam=0;view="calendar";draw({preferred:plannedChoice?.key===item.key?plannedChoice:null});},"koc-primary"));
   body.append(button("No contesta · Volver a llamar",()=>saveCall("ya_llamado"),""));
   body.append(button("Necesita pensarlo",()=>{view="waiting";draw();},""));
   body.append(button("No está interesado",()=>saveCall("no_interesado"),"koc-quiet"));
  }
  body.append(button("Saltar sin modificar",next,"koc-quiet"));return;
 }
 if(view==="waiting"){
  nav(body,"Volver a la llamada",()=>{view="client";draw();});
  title(body,"Programar seguimiento","¿Qué necesita decidir el cliente?");
  const form=card(body);
  e("label","","Motivo o comentario",form);
  const note=e("textarea","koc-input",undefined,form);note.rows=3;note.placeholder="Ej.: consultarlo con su pareja";note.value=c.waitReason||"";
  e("label","","Próxima acción en 48 horas",form);
  const type=e("select","koc-input",undefined,form);
  [["llamar","Volver a llamar"],["whatsapp","Enviar WhatsApp"]].forEach(([v,t])=>{const op=e("option","",t,type);op.value=v;});
  type.value=c.waitType||"llamar";
  form.append(button("Guardar seguimiento",async()=>{
   if(note.value.trim().length<3){alert("Indica brevemente qué queda pendiente.");return;}
   if(busy)return;busy=true;
   const row=resolve();if(!row){busy=false;return;}
   const old={...row.c},up=row.z._updatedAt;
   Object.assign(row.c,{callStatus:"esperando_confirmacion",waitReason:note.value.trim(),waitType:type.value,statusChangedAt:Date.now(),nextContactAt:Date.now()+48*3600*1000});
   row.c.callLog=[...(row.c.callLog||[]),{t:Date.now(),s:"esperando_confirmacion",r:row.c.waitReason}].slice(-20);
   row.z._updatedAt=Date.now();
   if(!await saveAndSync("comercial_custom_zones",savedZones)){Object.keys(row.c).forEach(k=>{if(!(k in old))delete row.c[k];});Object.assign(row.c,old);row.z._updatedAt=up;alert("No se ha guardado el seguimiento.");}
   else next();busy=false;
  },"koc-primary"));
  return;
 }
 if(view==="calendar"){
  nav(body,"Volver a la ficha",()=>{view="client";draw();});
  title(body,"Elegir día de obra",c.name+" · "+(z.town||"Navarra"));
  if(![c.name,c.street,c.phone].every(v=>String(v||"").trim())){body.append(show("Completa nombre, calle y teléfono desde la ficha antes de reservar."));return;}
  const dateBox=card(body);e("label","","Día de instalación",dateBox);
  const input=e("input","koc-input",undefined,dateBox);input.type="date";input.min=tomorrow();input.value=chosenDate||tomorrow();
  const advice=e("section","koc-card",undefined,body);
  e("strong","","Recomendación logística",advice);
  e("p","koc-muted","Priorizaremos los huecos junto a obras del mismo equipo y la misma calle. Puedes elegir otra fecha si el cliente no puede.",advice);
  const recButton=button("Buscar las mejores opciones de los próximos 7 días",()=>recommendDays(item,body),"koc-primary");
  advice.append(recButton);
  const proposals=e("div","koc-recommendations",undefined,advice);proposals.id="koc-recommendations";
  const board=e("div","koc-slots",undefined,body);
  const info=e("p","koc-muted","",body);
  input.onchange=()=>{chosenDate=input.value;loadSlots(board,info);};
  chosenDate=input.value;loadSlots(board,info,opts.preferred||null);
  const confirm=button("Continuar con la reserva",()=>{if(!selectedSlot||!selectedTeam)return;view="review";draw();},"koc-primary");confirm.id="koc-continue";confirm.disabled=true;body.append(confirm);
  return;
 }
 if(view==="review"){
  nav(body,"Cambiar horario",()=>{view="calendar";draw();});
  title(body,"Confirmar la obra","Comprueba con el cliente la fecha y la franja antes de guardar.");
  const rec=card(body);
  [["Cliente",c.name],["Municipio",z.town],["Dirección",c.street],["Día",chosenDate],["Hora",selectedSlot],["Instaladores","Equipo "+selectedTeam]].forEach(([k,v])=>{const line=e("div","koc-fact",undefined,rec);e("span","",k,line);e("strong","",v||"",line);});
  body.append(button(busy?"Guardando…":"Confirmar obra",()=>saveBooking(),"koc-primary"));
  e("p","koc-muted","El guardado se verifica antes de preparar el WhatsApp. La disponibilidad se vuelve a comprobar al confirmar.",body);return;
 }
 if(view==="whatsapp"){
  nav(body,clusterFocus?"Volver a la jornada":"Volver a clientes",()=>{view=clusterFocus?"group":"list";draw();});
  title(body,"Obra agendada","El mensaje está listo. WhatsApp requiere que pulses Enviar.");
  const msg=message(c,z);
  const note=card(body);e("p","koc-message",msg,note);
  const phone=normalizePhone(c.phone);
  if(phone)body.append(button("Abrir WhatsApp",()=>{const a=document.createElement("a");a.href="https://wa.me/"+phone+"?text="+encodeURIComponent(msg);a.target="_blank";a.rel="noopener noreferrer";document.body.append(a);a.click();a.remove();},"koc-green"));
  else body.append(show("El número no es válido. Corrige el teléfono antes de abrir WhatsApp."));
  body.append(button(c.whatsappObraEnviadoAt?"Enviado · "+new Date(c.whatsappObraEnviadoAt).toLocaleString("es-ES"):"Marcar WhatsApp como enviado",()=>markWhatsApp(),""));
  if(clusterFocus){body.append(button("Ver jornada y vecinos pendientes",()=>{plannedChoice=null;view="group";draw();},"koc-primary"));}
  else body.append(button("Siguiente cliente",next,"koc-primary"));
 }
}
async function availableChoices(item,d){
 const data=await consultarKonsorFecha(d);
 const old=typeof routeRecords==="function"?routeRecords(d):[];
 const choices=[];
 SLOTS.forEach(([from,to],slotIdx)=>[2,3].forEach(team=>{
  const slot=data[String(team)]?.find(x=>x.horario===from+"-"+to);
  const localBusy=old.some(x=>x.slot===slotIdx&&(![2,3].includes(Number(x.c?.obraEquipoInstalacion))||Number(x.c?.obraEquipoInstalacion)===team)&&x.c!==item.c);
  if(slot?.libre!==true||localBusy)return;
  const plan=logistics(item,d,from,team);
  choices.push({date:d,time:from,to,team,...plan});
 }));
 return choices.sort((a,b)=>a.rank-b.rank||a.time.localeCompare(b.time)||a.team-b.team);
}
async function recommendDays(item,body){
 const panel=body.querySelector("#koc-recommendations");if(!panel)return;
 const ticket=++seq;panel.replaceChildren();e("p","koc-muted","Consultando agendas de los equipos 2 y 3…",panel);
 try{
  const days=[];let day=new Date(tomorrow()+"T12:00:00");
  while(days.length<7){const d=[day.getFullYear(),String(day.getMonth()+1).padStart(2,"0"),String(day.getDate()).padStart(2,"0")].join("-");if(day.getDay()!==0)days.push(d);day.setDate(day.getDate()+1);}
  // Peticiones concurrentes controladas; cualquier fallo deja las opciones sin verificar fuera de la lista.
  const results=await Promise.allSettled(days.map(d=>availableChoices(item,d)));
  if(ticket!==seq||view!=="calendar"||resolve()?.key!==item.key)return;
  const options=results.flatMap((r,i)=>r.status==="fulfilled"?r.value.map(v=>({...v,day:i})):[])
   .sort((a,b)=>a.rank-b.rank||a.day-b.day||a.time.localeCompare(b.time)).slice(0,8);
  panel.replaceChildren();
  if(!options.length){e("p","koc-muted","No hay propuestas verificadas para los próximos siete días. Prueba otra fecha manualmente.",panel);return;}
  options.forEach(o=>{
   const b=button(o.label+" · "+o.date+" · "+o.time+" · Equipo "+o.team,()=>{
    chosenDate=o.date;selectedSlot="";selectedTeam=0;
    const picker=body.querySelector('input[type="date"]');if(picker)picker.value=o.date;
    const board=body.querySelector(".koc-slots"),info=body.querySelector(".koc-slots + .koc-muted");
    if(board&&info)loadSlots(board,info,{time:o.time,team:o.team});
   },"koc-suggestion");
   e("small","",o.detail,b);panel.append(b);
  });
  const failures=results.filter(r=>r.status==="rejected").length;
  if(failures)e("p","koc-muted",failures+" días no se pudieron verificar y no se han recomendado.",panel);
 }catch(err){if(ticket===seq){panel.replaceChildren();e("p","koc-error","No se pudo calcular el plan: "+(err.message||"Error"),panel);}}
}
async function loadSlots(board,info,preferred=null){
 const ticket=++seq;board.replaceChildren();selectedSlot="";selectedTeam=0;
 const next=document.getElementById("koc-continue");if(next)next.disabled=true;
 const d=chosenDate;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||d<tomorrow()||new Date(d+"T12:00:00").getDay()===0){info.textContent="Selecciona una fecha futura de lunes a sábado.";return;}
 info.textContent="Consultando disponibilidad real de KONSOR…";
 try{
  const item=resolve();if(!item)return;
  const options=await availableChoices(item,d);
  if(ticket!==seq||view!=="calendar")return;
  const ordered=preferred?options.sort((a,b)=>(a.time===preferred.time&&a.team===preferred.team?-1:0)-(b.time===preferred.time&&b.team===preferred.team?-1:0)):options;
  ordered.forEach(o=>{
   const b=button(o.time+"–"+o.to+" · Equipo "+o.team,()=>{
    selectedSlot=o.time;selectedTeam=o.team;
    board.querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));
    const confirm=document.getElementById("koc-continue");if(confirm)confirm.disabled=false;
   },"koc-slot");
   e("small","",o.label,b);board.append(b);
   if(preferred&&preferred.time===o.time&&preferred.team===o.team)b.click();
  });
  info.textContent=ordered.length?ordered.length+" franjas verificadas y ordenadas por proximidad; revisa el desplazamiento antes de confirmar.":"No hay equipos disponibles. Elige otro día.";
 }catch(err){if(ticket===seq)info.textContent="No se ha podido comprobar KONSOR: "+(err.message||"Error de conexión")+". No se puede reservar sin verificar.";}
}

async function saveCall(status){
 const row=resolve();if(!row||busy)return;busy=true;
 try{
  if(status==="ya_llamado"||status==="esperando_confirmacion"){
   if(typeof updateClientCallStatus!=="function")throw Error("No está disponible el registro de llamadas.");
   const ok=await updateClientCallStatus(row.zi,row.ci,status);if(ok!==true)throw Error("No se ha confirmado el guardado.");
  }else{
   const prev={...row.c},old=row.z._updatedAt;
   row.c.callStatus=status;row.c.statusChangedAt=Date.now();row.c.nextContactAt=null;row.c.callLog=[...(row.c.callLog||[]),{t:Date.now(),s:status,r:""}].slice(-20);
   row.z._updatedAt=Date.now();
   if(!await saveAndSync("comercial_custom_zones",savedZones)){Object.keys(row.c).forEach(k=>{if(!(k in prev))delete row.c[k];});Object.assign(row.c,prev);row.z._updatedAt=old;throw Error("El cambio no se ha guardado.");}
  }
  next();
 }catch(err){alert(err.message||"No se ha podido guardar la llamada.");}
 finally{busy=false;}
}
async function saveBooking(){
 const row=resolve();if(!row||busy)return;busy=true;draw();
 const {z,c}=row;
 try{
  if(typeof elegirEquipoInstaladorKonsor!=="function")throw Error("Falta la comprobación de instalaciones.");
  const team=await elegirEquipoInstaladorKonsor(chosenDate,selectedSlot,selectedTeam,c);
  if(team!==selectedTeam)throw Error("El equipo seleccionado ya no está libre.");
  const draft={...c,obraStatus:"agendada",obraDate:chosenDate,obraTime:selectedSlot,obraEquipoInstalacion:team,whatsappObraEnviadoAt:null,callStatus:"citas",statusChangedAt:Date.now(),nextContactAt:null};
  if(draft.dni&&typeof isValidDni==="function"&&!isValidDni(draft.dni))throw Error("Revisa el DNI/NIE.");
  if(typeof ensureCrmUpload==="function"&&!ensureCrmUpload(draft,{date:z.dumpDate||z.date,town:z.town,comercial:z.comercial})){busy=false;draw();return;}
  const oldC={...c},oldZ=z._updatedAt;Object.assign(c,draft);z._updatedAt=Date.now();
  if(!await saveAndSync("comercial_custom_zones",savedZones)){Object.keys(c).forEach(k=>{if(!(k in oldC))delete c[k];});Object.assign(c,oldC);z._updatedAt=oldZ;throw Error("No se ha confirmado el guardado de la obra.");}
  if(typeof logActivity==="function")logActivity("cita","Obra agendada: "+c.name+" · "+z.town+" · "+chosenDate+" "+selectedSlot,z.comercial);
  view="whatsapp";draw();
 }catch(err){alert(err.message||"No se pudo agendar. La cita no se ha confirmado.");view="calendar";draw();}
 finally{busy=false;}
}
function normalizePhone(p){let d=String(p||"").replace(/\D/g,"");if(d.startsWith("00"))d=d.slice(2);if(d.length===9)d="34"+d;return /^\d{10,15}$/.test(d)?d:"";}
function message(c,z){
 const date=c.obraDate?new Date(c.obraDate+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"por confirmar";
 const range=SLOTS.find(x=>x[0]===c.obraTime);
 return "Hola"+(c.name?" "+c.name.trim().split(/\s+/)[0]:"")+", te confirmamos la obra de aislamiento de tu vivienda con Konsor Energía.\n\nFecha: "+date+"\nHorario previsto: "+(range?range.join("–"):c.obraTime||"por confirmar")+"\nDirección: "+(c.street||"")+" · "+(z.town||"Navarra")+"\n\nPor favor, ten preparados el DNI y las escrituras de la vivienda para la documentación. Debe haber una persona en casa y acceso a la zona de trabajo.\n\nSi necesitas cambiar algo, responde a este mensaje. Gracias.";
}
async function markWhatsApp(){
 const row=resolve();if(!row||busy)return;busy=true;
 const old=row.c.whatsappObraEnviadoAt;row.c.whatsappObraEnviadoAt=Date.now();row.z._updatedAt=Date.now();
 if(!await saveAndSync("comercial_custom_zones",savedZones)){row.c.whatsappObraEnviadoAt=old;alert("No se pudo guardar el envío.");}draw();busy=false;
}
window.openCnCallQueue=function(){clusterFocus=null;clusterReturn=false;plannedChoice=null;view="list";draw();};
window.openKonsorOfficeClients=window.openCnCallQueue;
})();