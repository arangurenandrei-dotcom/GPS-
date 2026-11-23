/* KONSOR · Recorrido técnico 1/3.
 * Proyección operativa de SOLO LECTURA sobre las fichas existentes.
 * No crea una segunda ficha ni ejecuta cierre, subida de fotos o cambios en Calendar.
 * Los permisos de lectura provienen del perfil Firebase ya autenticado.
 */
(function(root){
"use strict";
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const SLOTS={"09:00":"11:00","11:00":"13:00","15:00":"17:00","17:00":"19:00"};
const trim=x=>String(x??"").trim();
const dated=x=>DATE.test(x||"")&&Number.isFinite(Date.parse(x+"T12:00:00Z"));
const validJob=c=>c&&["agendada","agendada_historica","realizada","aplazada","no_realizada"].includes(c.obraStatus)&&dated(c.obraDate);
const state=c=>({
 realizada:"Realizada",aplazada:"Aplazada",no_realizada:"No realizada",
 agendada:"Agendada",agendada_historica:"Agendada · histórica"
})[c.obraStatus]||"Pendiente";
function entries(zones,owner){
 const result=[],seen=new Set();
 for(const z of Array.isArray(zones)?zones:[]){
  if(!z||z.isNoAptoZone||z.isHotMission||typeof owner==="function"&&!owner(z))continue;
  for(const [idx,c] of (Array.isArray(z.clients)?z.clients:[]).entries()){
   if(!validJob(c))continue;
   const id=trim(c.clientUid)||"z_"+z.id+"_"+idx;
   if(seen.has(id))continue;seen.add(id);
   result.push({
    id,zoneId:String(z.id),clientName:trim(c.name)||"Titular pendiente",
    location:trim(z.town||c.locality)||"Municipio pendiente",
    street:trim(c.street)||"Dirección pendiente",
    date:c.obraDate,start:trim(c.obraTime),end:SLOTS[c.obraTime]||"",
    team:Number(c.obraEquipoInstalacion)||null,
    status:state(c),code:c.obraStatus,
    linkedCalendar:c.calendarBookingOrigin==="google_calendar_existing"||!!c.crmKonsorEventId,
    hasPhone:!!trim(c.phone),hasYear:!!trim(c.buildYear),hasArea:trim(c.m2)!=="",
    documentsKnown:!!(c.documentosVerificadosAt||c.documentosCompletosAt),
    // No se considera documentación recibida por ausencia de un campo.
    resultKnown:c.obraStatus==="realizada"||c.obraStatus==="aplazada"||c.obraStatus==="no_realizada"
   });
  }
 }
 return result.sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||String(a.team).localeCompare(String(b.team)));
}
function steps(job){
 if(!job)return [];
 const list=[
  {id:"datos",label:"Comprobar la vivienda y la franja",detail:"Confirmar dirección, equipo y horario antes de desplazarse",ready:job.street!=="Dirección pendiente"&&!!job.start&&!!job.team},
  {id:"documentacion",label:"Verificar documentación necesaria",detail:"Comprobar requisitos, autorización y documentación. No se confirma automáticamente",ready:job.documentsKnown},
  {id:"fotos",label:"Registrar fotografías antes y después",detail:"Carga documental todavía pendiente de autorización y almacenamiento",ready:false},
  {id:"ejecucion",label:"Confirmar resultado de obra",detail:"Realizada, aplazada o no realizada; exige registro validado en el servidor",ready:job.resultKnown},
  {id:"oficina",label:"Entregar expediente a Oficina",detail:"No cerrar antes de revisar la documentación y confirmar resultado",ready:false}
 ];
 return list;
}
function recommend(rows,today){
 const active=rows.filter(x=>["agendada","agendada_historica"].includes(x.code));
 const byDate=active.filter(x=>x.date>=today);
 const next=byDate[0]||active[0]||null;
 return {jobs:rows.length,scheduled:active.length,completed:rows.filter(x=>x.code==="realizada").length,
  withoutTeam:active.filter(x=>!x.team).length,next};
}
root.KonsorTechnicalFlow=Object.freeze({entries,steps,recommend,validJob});
})(window);
