/* KONSOR · Inventario de clientes antiguos en Resultados.
 * Este stock no es captación nueva, reserva ni facturación; no depende de la fecha filtrada.
 * No altera la lógica financiera, estadísticas de puertas o ranking.
 */
(function(global){
"use strict";
const normalize=v=>String(v??"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ");
const numeric=v=>{
 if(v===null||v===undefined||String(v).trim()==="")return null;
 const n=Number(String(v).trim().replace(",","."));
 return Number.isFinite(n)&&n>=0?n:null;
};
const area=c=>{
 const net=numeric(c?.m2);
 if(net!==null)return net; // Las fichas modernas ya almacenan neto (total - 5).
 const total=numeric(c?.m2Total);
 return total===null?null:Math.max(0,total-5);
};
const isHistorical=c=>!!(c?.legacyPortfolio||c?.isLegacyClient||c?.importedLegacy||c?.importedCsv||c?.origenHoja||c?.legacyReviewStatus||c?.independentHistorical);
const isClosed=c=>["agendada","realizada","agendada_historica"].includes(c?.obraStatus)||["no_interesado","descartado","rechazado"].includes(c?.callStatus)||c?.obraStatus==="no_apto";
const isUncalled=c=>!isClosed(c)&&!["ya_llamado","llamado","contactado","esperando_confirmacion","citas","hecho"].includes(c?.callStatus);
function summary(zones,users,independent,{team=false,uid=""}={}){
 const userSet=new Set(Array.isArray(users)?users:[]);
 const seen=new Set(),towns=new Map();
 let total=0,sinLlamar=0,m2SinLlamar=0,m2Total=0,conM2=0,porCompletar=0;
 function add(c,id,fallbackTown){
  if(!c||!isHistorical(c)||seen.has(id))return;
  seen.add(id);
  const town=String(c.locality||fallbackTown||"Localidad pendiente").trim();
  const key=normalize(town);
  if(!towns.has(key))towns.set(key,{name:town,total:0,uncalled:0,m2:0});
  const t=towns.get(key),square=area(c);
  total++;t.total++;
  if(square!==null){m2Total+=square;conM2++;}
  if(c.legacyReviewStatus!=="lista")porCompletar++;
  if(isUncalled(c)){
   sinLlamar++;t.uncalled++;
   if(square!==null){m2SinLlamar+=square;t.m2+=square;}
  }
 }
 (Array.isArray(zones)?zones:[]).forEach(z=>{
  if(!z||z.isNoAptoZone||z.isHotMission||!userSet.has(z.comercial))return;
  (Array.isArray(z.clients)?z.clients:[]).forEach((c,i)=>add(c,"zone:"+z.id+":"+(c.clientUid||i),z.town));
 });
 (Array.isArray(independent)?independent:[]).forEach(c=>{
  if(!c||(!team&&c.ownerUid!==uid))return;
  add({...c,independentHistorical:true},"independent:"+c.id,c.locality);
 });
 return {total,sinLlamar,m2SinLlamar,m2Total,conM2,porCompletar,
  towns:[...towns.values()].sort((a,b)=>b.uncalled-a.uncalled||a.name.localeCompare(b.name,"es"))};
}
global.KonsorPortfolioResults=Object.freeze({summary,area,isUncalled,isHistorical});
})(window);
