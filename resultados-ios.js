/* KONSOR Resultados — panel único con cifras y Liga. No altera cálculos ni datos. */
(function(){
"use strict";
let period="month",date="",tab="mine",metric="captadas",scope="me",request=0;
const $=(t,cls,txt,p)=>{const x=document.createElement(t);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);if(p)p.append(x);return x;};
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
 const o=panel();o.classList.add("active");render();
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
 const grid=$("div","kr-grid",undefined,main);
 stat(grid,"Captaciones",fmt(m.validas),"fichas no descartadas");
 stat(grid,"Superficie captada",fmt(m.m2Captado)+" m²","estimación de fichas");
 stat(grid,"Obras agendadas",fmt(m.citas),fmt(m.m2Citas)+" m² previstos");
 stat(grid,"Obras realizadas",fmt(m.hechas),fmt(m.m2Hechas)+" m² ejecutados");
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
window.openKonsorLeague=()=>open("league");
window.openCommercialStatsModal=window.openCnResults;
window.openLeagueRankingModal=window.openKonsorLeague;
})();