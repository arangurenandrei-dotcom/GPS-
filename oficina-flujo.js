/* KONSOR · Recorrido documental de Oficina (fase de consulta).
 * Basado en fichas originales. No infiere que un documento existe sin marca verificable.
 * Todas las operaciones futuras de aprobación/cierre requerirán servicio de servidor.
 */
(function(root){
"use strict";
const txt=v=>String(v??"").trim();
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||"")&&Number.isFinite(Date.parse(v+"T12:00:00Z"));
const states=new Set(["agendada","agendada_historica","realizada","aplazada","no_realizada"]);
function row(c,z){
 const verified=!!(c.documentosVerificadosAt||c.documentosCompletosAt);
 let category,priority,next;
 if(["aplazada","no_realizada"].includes(c.obraStatus)){
  category="Incidencia de obra";priority=0;next="Comprobar motivo y solicitar decisión";
 }else if(c.obraStatus==="realizada"){
  category=verified?"Revisión de cierre":"Documentación pendiente";priority=verified?2:1;
  next=verified?"Validar expediente con Oficina":"Solicitar y verificar documentos";
 }else{
  category=verified?"Agendada · documentos revisados":"Preparación documental";priority=verified?4:3;
  next=verified?"Esperar ejecución y comprobación":"Revisar documentación antes de la obra";
 }
 return {id:txt(c.clientUid)||null,zoneId:String(z.id),client:txt(c.name)||"Titular pendiente",
  town:txt(z.town||c.locality)||"Municipio pendiente",
  street:txt(c.street)||"Dirección pendiente",date:validDate(c.obraDate)?c.obraDate:"",
  time:txt(c.obraTime),team:Number(c.obraEquipoInstalacion)||null,status:c.obraStatus,
  category,priority,next,verified,hasDni:!!txt(c.dni),hasEmail:!!txt(c.email),
  hasPhone:!!txt(c.phone),hasDocumentReference:!!txt(c.documentReference),
  resultConfirmed:c.obraStatus==="realizada",
  hasClosure:!!c.expedienteCerradoAt,
  missing:([!txt(c.dni)&&"DNI/NIE",!txt(c.email)&&"Correo electrónico",
   !verified&&"Revisión documental",!txt(c.obraDate)&&"Fecha de obra",
   !Number(c.obraEquipoInstalacion)&&"Equipo"].filter(Boolean))};
}
function entries(zones,allowed){
 const out=[],seen=new Set();
 for(const z of Array.isArray(zones)?zones:[]){
  if(!z||z.isNoAptoZone||z.isHotMission||typeof allowed==="function"&&!allowed(z))continue;
  (Array.isArray(z.clients)?z.clients:[]).forEach((c,index)=>{
   if(!c||!states.has(c.obraStatus))return;
   const id=txt(c.clientUid)||"sinid_"+z.id+"_"+index;
   if(seen.has(id))return;seen.add(id);
   out.push(row(c,z));
  });
 }
 return out.sort((a,b)=>a.priority-b.priority||a.date.localeCompare(b.date)||a.street.localeCompare(b.street,"es"));
}
function steps(item){
 if(!item)return [];
 return [
  {label:"Comprobar identidad del expediente",detail:"Titular, domicilio y contacto",complete:item.hasDni&&item.hasPhone},
  {label:"Revisar documentación",detail:"Comprobar documentos, firmas y requisitos",complete:item.verified},
  {label:"Comprobar ejecución",detail:"Verificar si la obra se ha realizado o existe incidencia",complete:item.resultConfirmed},
  {label:"Validar cierre administrativo",detail:"Solo cerrar con los documentos y el resultado confirmados",complete:item.hasClosure}
 ];
}
function totals(jobs){
 return {total:jobs.length,incidences:jobs.filter(x=>x.priority===0).length,
  documents:jobs.filter(x=>x.priority===1||x.priority===3).length,
  performed:jobs.filter(x=>x.resultConfirmed&&!x.hasClosure).length};
}
root.KonsorOfficeFlow=Object.freeze({entries,steps,totals});
})(window);
