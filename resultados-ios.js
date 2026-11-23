/* KONSOR Resultados — panel único con cifras y Liga. No altera cálculos ni datos. */
(function(){
"use strict";
let period="month",date="",tab="mine",metric="captadas",scope="me",request=0;
let historicalIndependent=[],historicalLoading=false,historicalError="",historicalUserUid="",historicalRequest=0;
async function loadHistorical(){
 const uid=window.auth?.currentUser?.uid||"";
 const token=++historicalRequest;
 if(historicalUserUid!==uid){historicalIndependent=[];historicalUserUid=uid;}
 historicalLoading=true;historicalError="";
 try{
  if(!uid)throw Error("Inicia sesión para consultar clientes antiguos.");
  if(typeof window.listarClientesAntiguos!=="function"){historicalIndependent=[];return;}
  const r=await window.listarClientesAntiguos({});
  if(r.data?.ok!==true||!Array.isArray(r.data.rows))throw Error("Firebase no ha confirmado la cartera.");
  if(token!==historicalRequest||window.auth?.currentUser?.uid!==uid)return;
  historicalIndependent=r.data.rows;
 }catch(e){
  if(token===historicalRequest)historicalError=e.message||String(e);
 }finally{
  if(token===historicalRequest){
   historicalLoading=false;
   const modal=document.getElementById("konsorResultsV3");
   if(modal?.classList.contains("active")&&tab==="mine")render();
  }
 }
}
const $=window.KonsorUI.el;
const btn=(t,fn,cls="")=>{const b=$("button","kr-btn "+cls,t);b.type="button";b.onclick=fn;return b;};
const fmt=n=>Number(n||0).toLocaleString("es-ES",{maximumFractionDigits:1});
const cash=n=>Number(n||0).toLocaleString("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:2});
const today=()=>typeof getTodayISO==="function"?getTodayISO():new Date().toISOString().slice(0,10);
const teamAllowed=()=>typeof currentUserRole!=="undefined"&&currentUserRole==="jefe";
const range=()=>period==="all"?["2000-01-01",date]:personalStatsRange(period,date);
function panel(){
 let o=document.getElementById("konsorResultsV3");if(o)return o;
 o=$("div","kr-overlay",undefined,document.body);o.id="konsorResultsV3";
 const p=$("section","kr-page",undefined,o);p.setAttribute("role","dialog");p.setAttribute("aria-modal","true");
 const h=$("header","kr-head",undefined,p),col=$("div","",undefined,h);
 $("small","","KONSOR · RENDIMIENTO",col);$("h2","","Resultados",col);
 h.append(btn("Cerrar",()=>o.classList.remove("active"),"quiet"));
 $("div","kr-main",undefined,p);
 return o;
}
function segment(container,items,selected,fn){
 const row=$("div","kr-segment",undefined,container);
 items.forEach(([v,label])=>row.append(btn(label,()=>{fn(v);render();},v===selected?"on":"")));
}
function stat(parent,label,value,detail){
 const c=$("div","kr-stat",undefined,parent);$("small","",label,c);$("strong","",value,c);$("span","",detail,c);return c;
}
function caption(parent,text){return $("p","kr-note",text,parent);}
function open(which="mine"){
 if(!date)date=today();
 tab=which==="league"?"league":"mine";
 const o=panel();o.classList.add("active");render();loadHistorical();
}
async function league(container){
 const token=++request;
 const cards=$("section","kr-panel",undefined,container);
 $("h3","","Clasificación del equipo",cards);
 caption(cards,"Metros cuadrados por fase. La clasificación no equivale a dinero cobrado.");
 segment(cards,[["captadas","Captaciones"],["citas","Agendadas"],["realizadas","Realizadas"]],metric,v=>metric=v);
 const rows=$("div","kr-list",undefined,cards);
 $("p","kr-note","Consultando la clasificación…",rows);
 try{
  const r=range(),prev=period==="all"?["2000-01-01",date]:personalStatsRange(period,date,true);
  let data;
  if(currentUserRole==="comercial"){
   if(typeof window.teamSummaryV2!=="function")throw Error("El resumen del equipo no está disponible.");
   const response=await window.teamSummaryV2({mode:"liga",range:r,previous:prev,phase:metric});
   data=response.data?.current;
   if(!data)throw Error("El servidor no devolvió los datos de la Liga.");
  }
  if(token!==request||tab!=="league")return;
  const names=typeof getActiveTeamUsers==="function"?getActiveTeamUsers(false):[];
  const [areaKey,countKey]=({captadas:["m2Captado","validas"],citas:["m2Citas","citas"],realizadas:["m2Hechas","hechas"]})[metric];
  const records=names.map(name=>{
   const d=data?data[name]:personalStatsMetrics(name,...r);
   return{name,area:Number(d?.[areaKey]||0),count:Number(d?.[countKey]||0)};
  }).sort((a,b)=>b.area-a.area||a.name.localeCompare(b.name,"es"));
  rows.replaceChildren();
  if(!records.length){caption(rows,"No hay comerciales con resultados disponibles.");return;}
  const sum=records.reduce((n,x)=>n+x.area,0);
  const top=$("div","kr-league-top",undefined,rows);
  stat(top,"Metros del equipo",fmt(sum)+" m²",records.length+" comerciales");
  let prevArea=null,rank=0;
  records.forEach((x,i)=>{
   if(x.area!==prevArea)rank=i+1;prevArea=x.area;
   const row=$("div","kr-person "+(x.name===currentUserName?"myself":""),undefined,rows);
   $("b","",x.area>0?"#"+rank:"—",row);
   const txt=$("div","kr-person-name",undefined,row);
   $("strong","",typeof getDisplayAlias==="function"?getDisplayAlias(x.name):x.name,txt);
   $("small","",x.count+" fichas/obras · "+fmt(x.area)+" m²",txt);
   if(x.name===currentUserName)$("span","kr-you","Tú",row);
  });
 }catch(err){if(token===request){rows.replaceChildren();caption(rows,"No se pudo comprobar la Liga: "+(err.message||err));}}
}
function render(){
 const o=panel(),main=o.querySelector(".kr-main");main.replaceChildren();request++;
 const isMikel=typeof isMikelTeamMember==="function"&&isMikelTeamMember(currentUserName);
 if(isMikel){caption(main,"Esta vista corresponde al equipo Andrei. Utiliza el resumen de tu equipo.");return;}
 const switcher=$("div","kr-top-tabs",undefined,main);
 segment(switcher,[["mine","Mi rendimiento"],["league","Liga comercial"]],tab,v=>tab=v);
 const filters=$("section","kr-panel kr-filters",undefined,main);
 segment(filters,[["day","Día"],["week","Semana"],["month","Mes"],["all","Total"]],period,v=>period=v);
 const picker=$("input","kr-date",undefined,filters);picker.type="date";picker.value=date;picker.max=today();picker.setAttribute("aria-label","Fecha de referencia");
 picker.onchange=()=>{if(picker.value&&picker.value<=today()){date=picker.value;render();}};
 if(tab==="league"){league(main);return;}
 if(teamAllowed())segment(filters,[["me","Yo"],["team","Mi equipo"]],scope,v=>scope=v);
 const r=range();
 const users=scope==="team"&&teamAllowed()?getActiveTeamUsers(false):[currentUserName];
 const m=users.map(n=>personalStatsMetrics(n,...r)).reduce((sum,v)=>{Object.keys(v).forEach(k=>{if(typeof v[k]==="number")sum[k]=(sum[k]||0)+v[k];});return sum;},{});
 const title=$("section","kr-section-title",undefined,main);
 $("h3","",scope==="team"?"Resultados del equipo":"Mi actividad",title);
 caption(title,r[0]+" — "+r[1]);
 // Los registros históricos no son captaciones nuevas. Se informa su stock aparte,
 // incluso cuando todavía no se ha realizado ninguna llamada o faltan datos técnicos.
 const portfolio=$("section","kr-panel",undefined,main);
 $("h3","","Cartera histórica · pendiente de llamadas",portfolio);
 caption(portfolio,"Viviendas antiguas ya registradas, independientemente del período seleccionado. No son nuevas captaciones ni obras confirmadas.");
 const snapshot=window.KonsorPortfolioResults?.summary(
  typeof savedZones!=="undefined"?savedZones:[],users,historicalIndependent,
  {team:scope==="team"&&teamAllowed(),uid:window.auth?.currentUser?.uid||""}
 );
 if(!snapshot){
  caption(portfolio,"El módulo de resultados históricos no está disponible en esta versión.");
 }else{
  const gridHistoric=$("div","kr-grid",undefined,portfolio);
  stat(gridHistoric,"Clientes sin llamar",fmt(snapshot.sinLlamar),"incluye fichas sin datos técnicos");
  stat(gridHistoric,"m² sin llamar",fmt(snapshot.m2SinLlamar)+" m²","superficie neta anotada");
  stat(gridHistoric,"Clientes antiguos registrados",fmt(snapshot.total),"toda la cartera histórica visible");
  stat(gridHistoric,"Superficie histórica registrada",fmt(snapshot.m2Total)+" m²",snapshot.conM2+" fichas con m²");
  if(snapshot.porCompletar)caption(portfolio,snapshot.porCompletar+" fichas con revisión pendiente. Se muestran sin exigir año, CP o zona CTE.");
  if(snapshot.total>snapshot.conM2)caption(portfolio,(snapshot.total-snapshot.conM2)+" fichas sin superficie registrada; no se les han estimado metros.");
  if(snapshot.towns.length){
   const streets=$("details","kr-closed",undefined,portfolio);
   $("summary","","Ver clientes y m² por pueblo",streets);
   const table=$("div","kr-details",undefined,streets);
   snapshot.towns.forEach(t=>{
    const row=$("div","kr-detail",undefined,table);
    $("span","",t.name+" · "+t.uncalled+" sin llamar",row);
    $("b","",fmt(t.m2)+" m²",row);
   });
  }
 }
 if(typeof window.listarClientesAntiguos!=="function")caption(portfolio,"La lectura de fichas independientes de sectores todavía no está activada en esta versión.");
 if(historicalLoading)caption(portfolio,"Actualizando los clientes antiguos independientes desde Firebase…");
 if(historicalError)caption(portfolio,"No se ha podido comprobar la cartera independiente de Firebase: "+historicalError+". Las cifras anteriores solo incluyen los datos históricos visibles en sectores.");

 const grid=$("div","kr-grid",undefined,main);
 stat(grid,"Captaciones nuevas",fmt(m.validas),"fichas nuevas no descartadas");
 stat(grid,"Superficie captada nueva",fmt(m.m2Captado)+" m²","excluye cartera histórica");
 stat(grid,"Obras agendadas",fmt(m.citas),fmt(m.m2Citas)+" m² previstos");
 stat(grid,"Obras realizadas",fmt(m.hechas),fmt(m.m2Hechas)+" m² ejecutados");
 const chart=$("section","kr-panel",undefined,main);
 $("h3","","Respuestas en captación",chart);
 const responseValues=[["Sí",Math.max(0,Number(m.si)||0),"#638e7a"],["No",Math.max(0,Number(m.no)||0),"#b77b7b"],["Ausentes",Math.max(0,Number(m.ausente)||0),"#a9b2bf"],["Papelitos",Math.max(0,Number(m.papelito)||0),"#7597ad"]];
 const contacts=responseValues.reduce((n,item)=>n+item[1],0);
 const visual=$("div","",undefined,chart);
 visual.style.cssText="display:flex;align-items:center;gap:20px;flex-wrap:wrap;padding:12px 0";
 const donut=$("div","",undefined,visual);
 donut.style.cssText="width:136px;height:136px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative";
 let pos=0;
 const stops=responseValues.map(item=>{const first=pos;pos+=contacts?100*item[1]/contacts:0;return item[2]+" "+first+"% "+pos+"%";});
 donut.style.background=contacts?"conic-gradient("+stops.join(",")+")":"conic-gradient(#e7edf3 0% 100%)";
 donut.setAttribute("role","img");donut.setAttribute("aria-label","Respuestas: "+responseValues.map(x=>x[0]+" "+x[1]).join(", "));
 const hole=$("div","",undefined,donut);
 hole.style.cssText="width:96px;height:96px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center";
 const big=$("strong","",String(contacts),hole);big.style.cssText="color:#26394d;font-size:23px;font-weight:760";
 const small=$("small","","visitas",hole);small.style.cssText="font-size:10px;color:#77899c";
 const legend=$("div","",undefined,visual);legend.style.cssText="display:flex;flex:1 1 145px;flex-direction:column;gap:9px";
 responseValues.forEach(([label,value,color])=>{
  const row=$("div","",undefined,legend);row.style.cssText="display:flex;align-items:center;gap:8px;font-size:12px;color:#5b6d84";
  const dot=$("span","",undefined,row);dot.style.cssText="width:9px;height:9px;border-radius:100%;background:"+color+";flex:none";
  $("span","",label,row);
  const v=$("strong","",String(value),row);v.style.cssText="margin-left:auto;color:#26394d;font-variant-numeric:tabular-nums";
 });
 caption(chart,"Distribución de respuestas registradas en el período. Los ausentes no cuentan como rechazos.");
 const trend=$("section","kr-panel",undefined,main);
 $("h3","","Tendencia semanal",trend);
 caption(trend,"Compara los m² captados esta semana con los de la semana anterior; son estimaciones de captación, no facturación.");
 if(typeof personalStatsRange==="function"&&typeof personalStatsMetrics==="function"){
  const endDate=date||today(),w1=personalStatsRange("week",endDate),w0=personalStatsRange("week",endDate,true);
  const areaFor=range=>users.reduce((n,u)=>n+Math.max(0,Number(personalStatsMetrics(u,...range).m2Captado)||0),0);
  const current=areaFor(w1),previous=areaFor(w0),max=Math.max(1,current,previous);
  [["Semana actual",current,"#6e94ac"],["Semana anterior",previous,"#b4c1cf"]].forEach(([label,value,color])=>{
   const wrap=$("div","",undefined,trend);wrap.style.cssText="margin:12px 0;display:flex;flex-direction:column;gap:5px";
   const head=$("div","",undefined,wrap);head.style.cssText="display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#52667e";
   $("span","",label,head);$("strong","",fmt(value)+" m²",head);
   const rail=$("div","",undefined,wrap);rail.style.cssText="height:11px;border-radius:999px;background:#e8edf3;overflow:hidden";
   const fill=$("span","",undefined,rail);fill.style.cssText="display:block;height:100%;width:"+(100*value/max)+"%;background:"+color+";border-radius:999px";
  });
  if(current===0&&previous===0)caption(trend,"Todavía no hay superficies registradas en estas semanas.");
 }

 const money=$("section","kr-panel",undefined,main);$("h3","","Producción estimada",money);
 const moneyGrid=$("div","kr-grid",undefined,money);
 // Potencial, previsto y generado son fases solapadas, no importes sumables.
 stat(moneyGrid,"Potencial",cash(m.potencial),"Captaciones");
 stat(moneyGrid,"Previsto",cash(m.previsto),"Obras pendientes");
 stat(moneyGrid,"Generado",cash(m.generado),"Obras realizadas");
 stat(moneyGrid,"Cobrado","Sin registro","No se registran pagos");
 caption(money,"Las fases se solapan. No se suman y no representan salario neto. Las cifras usan el motor actual de la aplicación.");
 const extras=$("details","kr-panel",undefined,main);
 $("summary","","Más datos de actividad",extras);
 const dat=$("div","kr-details",undefined,extras);
 [["Puertas registradas",m.puertas],["Respuestas sí",m.si],["Respuestas no",m.no],["Ausentes",m.ausente],["Fichas sin superficie",m.sinM2],["No aptas",m.noAptas],["Días trabajados",m.jornadas],["Horas registradas",fmt(m.horas)]].forEach(([k,v])=>{
  const line=$("div","kr-detail",undefined,dat);$("span","",k,line);$("b","",v,line);
 });
 if(m.antiguasSinFecha)caption(extras,m.antiguasSinFecha+" obras históricas no tienen fecha de ejecución y no se incluyen en periodos.");
 main.append(btn("Ver Liga comercial",()=>{tab="league";render();},"kr-primary"));
}
window.openCnResults=()=>{if(typeof isMikelTeamMember==="function"&&isMikelTeamMember(currentUserName)){if(typeof openCommercialStatsModalLegacy==="function")openCommercialStatsModalLegacy();return;}open("mine");};
window.openKonsorResults=window.openCnResults;
window.openKonsorTeamResults=()=>{scope="team";open("mine");};
window.openKonsorLeague=()=>open("league");
window.openCommercialStatsModal=window.openCnResults;
window.openLeagueRankingModal=window.openKonsorLeague;
})();