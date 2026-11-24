/* KONSOR CRM: estados mutuamente excluyentes sobre la ficha existente.
 * Solo lectura: los cambios se guardan mediante el bridge de KONSOR.
 */
(function(root){
'use strict';
const states=Object.freeze([
 ['por_llamar','Por llamar'],['en_espera','En seguimiento'],['agendada','Agendada'],
 ['realizada','Obra realizada'],['rechazado','Rechazado'],['no_apto','No apto']
]);
const labels=Object.freeze(Object.fromEntries(states));
const clean=x=>String(x??'').trim();
function status(c={}){
 if(c.obraStatus==='realizada')return 'realizada';
 if(['agendada','agendada_historica'].includes(c.obraStatus))return 'agendada';
 if(c.obraStatus==='no_apto'||c.captacionInvalida===true)return 'no_apto';
 if(['no','rechazado'].includes(c.captacionRespuesta)||['no_interesado','descartado'].includes(c.callStatus))return 'rechazado';
 if(labels[c.crmEstado])return c.crmEstado;
 if(['esperando_confirmacion','ya_llamado','esperando_documentos','pendiente_informacion'].includes(c.callStatus))return 'en_espera';
 return 'por_llamar';
}
function area(c={}){
 const n=v=>v===null||v===undefined||String(v).trim()===''?NaN:Number(String(v).replace(',','.'));
 const m=n(c.m2);
 if(Number.isFinite(m)&&m>=0)return m;
 const total=n(c.m2Total);
 return Number.isFinite(total)&&total>=0?Math.max(0,total-5):null;
}
function rows(zones=[],allow=()=>true){
 const seen=new Set(),all=[];
 for(const [zi,z] of zones.entries()){
  if(!z||!allow(z)||z.isHotMission)continue;
  for(const [ci,c] of (z.clients||[]).entries()){
   if(!c||![c.name,c.phone,c.street].some(x=>clean(x)))continue;
   const id=clean(c.clientUid);
   const key=id?'id:'+id:'zone:'+z.id+':'+ci;
   if(seen.has(key))continue;
   seen.add(key);
   all.push({z,zi,c,ci,key,estado:status(c),pueblo:clean(c.locality||z.town)||'Sin pueblo'});
  }
 }
 return all;
}
function dashboard(items=[]){
 const counts=Object.fromEntries(states.map(([key])=>[key,0]));
 const amounts={potencial:0,previsto:0,realizado:0};
 const withoutArea={potencial:0,previsto:0,realizado:0};
 for(const r of items){
  const state=r.estado||status(r.c);
  if(counts[state]!==undefined)counts[state]++;
  const field=state==='agendada'?'previsto':state==='realizada'?'realizado':
   ['por_llamar','en_espera'].includes(state)&&r.c?.captacionRespuesta==='si'?'potencial':null;
  if(field){
   const sqm=area(r.c);
   if(sqm===null)withoutArea[field]++;
   else amounts[field]+=sqm; // Tarifa de captación estimada de 1 € por m².
  }
 }
 return {total:items.length,counts,amounts,withoutArea,pendientes:counts.por_llamar+counts.en_espera};
}
function closeRequirements(c={}){
 const missing=[];
 if(clean(c.name).split(/\s+/).filter(Boolean).length<2)missing.push('nombre y apellidos');
 if(!/^[0-9XYZ][0-9]{7}[A-Z]$/i.test(clean(c.dni)))missing.push('DNI/NIE');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(c.email)))missing.push('correo electrónico');
 return missing;
}
const api=Object.freeze({states,labels,status,area,rows,dashboard,closeRequirements});
if(root)root.KonsorCRM=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);
