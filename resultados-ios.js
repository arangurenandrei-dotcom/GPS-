/* Resultados iOS: totales obtenidos de sectores visibles, sin escrituras. */
(function(){
"use strict";
const n=(t,c,s,p)=>{let e=document.createElement(t);if(c)e.className=c;if(s!==undefined)e.textContent=String(s);if(p)p.appendChild(e);return e;};
function open(){
 let panel=document.getElementById("cnResultsIOS");
 if(!panel){
  panel=n("div","modal-overlay cnx-modal",undefined,document.body);panel.id="cnResultsIOS";panel.style.zIndex="10137";
  const page=n("div","cnx-page",undefined,panel),head=n("div","cnx-head",undefined,page),heading=n("div","",undefined,head);
  n("span","cnx-eyebrow","COMERCIAL NAVARRA",heading);n("h2","","Mis resultados",heading);
  const close=n("button","cnx-btn subtle","Cerrar",head);close.type="button";close.onclick=()=>panel.classList.remove("active");
  n("div","cnx-body",undefined,page);
  panel.addEventListener("click",e=>{if(e.target===panel)panel.classList.remove("active");});
 }
 const body=panel.querySelector(".cnx-body");body.replaceChildren();
 const team=typeof isMikelTeamMember==="function"&&isMikelTeamMember(currentUserName);
 const data=Array.isArray(savedZones)?savedZones.filter(z=>z&&z.comercial===currentUserName&&typeof isMikelTeamMember==="function"&&isMikelTeamMember(z.comercial)===team&&!z.isHotMission&&!z.isNoAptoZone):[];
 const stats=data.reduce((a,z)=>{
  const v=z.stats||{};
  for(const k of ["si","no","ausente","papelito"])a[k]+=Math.max(0,Number(v[k])||0);
  if(!z.isSingleHouse){a.sectores++;if(z.status==="completada")a.terminados++;}
  return a;
 },{si:0,no:0,ausente:0,papelito:0,sectores:0,terminados:0});
 const visitadas=stats.si+stats.no+stats.ausente+stats.papelito;
 n("p","cnx-intro","Resumen de tu trabajo registrado en los sectores sincronizados. Los resultados reflejan datos existentes, no estimaciones.",body);
 const grid=n("div","cnx-metrics",undefined,body);
 function metric(label,value){const box=n("div","cnx-metric",undefined,grid);n("strong","",value,box);n("span","",label,box);}
 metric("Puertas registradas",visitadas);metric("Respuestas sí",stats.si);metric("Respuestas no",stats.no);
 const card=n("section","cnx-card",undefined,body);
 n("h3","","Eficacia comercial",card);
 const yesNo=stats.si+stats.no;
 const acceptance=yesNo?Math.round(stats.si/yesNo*100):null;
 const rate=n("div","cnx-result-big",acceptance===null?"Sin datos":acceptance+"%",card);
 n("p","",yesNo?"Porcentaje de respuestas afirmativas sobre las respuestas sí y no.":"Todavía no hay respuestas sí o no para calcular una tasa.",card);
 const bar=n("div","cnx-result-track",undefined,card),filled=n("div","cnx-result-fill",undefined,bar);filled.style.width=(acceptance||0)+"%";
 const coverage=n("section","cnx-card",undefined,body);
 n("h3","","Sectores completados",coverage);
 n("div","cnx-result-big",stats.terminados+" de "+stats.sectores,coverage);
 n("p","","Avance de sectores. No equivale al porcentaje de superficie del territorio.",coverage);
 const pbar=n("div","cnx-result-track",undefined,coverage);
 const pfill=n("div","cnx-result-fill",undefined,pbar);
 pfill.style.width=(stats.sectores?Math.round(stats.terminados/stats.sectores*100):0)+"%";
 const extras=n("section","cnx-card",undefined,body);
 n("h3","","Otras respuestas",extras);
 n("p","","Ausentes: "+stats.ausente+" · Papelitos: "+stats.papelito,extras);
 const button=n("button","cnx-btn primary","Ver analítica completa",extras);
 button.type="button";button.onclick=()=>{panel.classList.remove("active");openCommercialStatsModal();};
 panel.classList.add("active");
}
window.openCnResults=open;
})();