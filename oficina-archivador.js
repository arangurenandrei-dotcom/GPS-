/* KONSOR: consulta de clientes y archivador de Oficina.
 * Ficha única / solo lectura. No crea otras fichas ni modifica estados.
 */
(function(w){
"use strict";
const trim=v=>String(v??"").trim();
const norm=v=>trim(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const booked=c=>["agendada","agendada_historica"].includes(c?.obraStatus);
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||""))&&new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v;
const scheduled=c=>booked(c)&&validDate(c.obraDate);
function stage(c){
 if(c.expedienteCerradoAt)return "terminados";
 if(["aplazada","no_realizada"].includes(c.obraStatus))return "haciendo";
 if(c.obraStatus==="realizada")return (c.documentosVerificadosAt||c.documentosCompletosAt)?"haciendo":"por_llegar";
 if(booked(c))return (c.documentosVerificadosAt||c.documentosCompletosAt)?"por_llegar":"nuevos";
 return "total_leads";
}
function belongs(row,group){return group==="total_leads"||row.group===group;}
function displayDate(row){
 if(row.bookingNeedsReview)return "Cita registrada · fecha pendiente de verificar en Calendar";
 if(!row.date)return "Sin cita de obra";
 const d=new Date(row.date+"T12:00:00");
 if(Number.isNaN(d.getTime()))return "Fecha pendiente de verificar";
 const label=d.toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
 return "Obra: "+label+(row.time?" · "+row.time:" · Franja pendiente")+(row.team?" · Equipo "+row.team:" · Equipo pendiente");
}
function clients(zones,allow){
 const seen=new Set(),out=[];
 for(const z of Array.isArray(zones)?zones:[]){
  if(!z||z.isNoAptoZone||z.isHotMission||typeof allow==="function"&&!allow(z))continue;
  for(const [i,c] of (Array.isArray(z.clients)?z.clients:[]).entries()){
   if(!c)continue;
   const id=trim(c.clientUid)||String(z.id)+":"+i;
   if(seen.has(id))continue;seen.add(id);
   out.push({id,zoneId:String(z.id),name:trim(c.name)||"Titular pendiente",
    street:trim(c.street)||"Dirección pendiente",town:trim(z.town||c.locality)||"Pueblo pendiente",
    phone:trim(c.phone),date:trim(c.obraDate),time:trim(c.obraTime),
    status:trim(c.obraStatus),group:stage(c),team:Number(c.obraEquipoInstalacion)||null,
    scheduled:scheduled(c),bookingNeedsReview:booked(c)&&!scheduled(c),
    hasDocumentCheck:!!(c.documentosVerificadosAt||c.documentosCompletosAt),
    archived:!!c.expedienteCerradoAt});
  }
 }
 return out;
}
const groups=Object.freeze([
 {id:"total_leads",title:"Total leads",description:"Todos los contactos y fichas de KONSOR, con o sin cita"},
 {id:"nuevos",title:"Nuevos",description:"Fichas marcadas con reserva de obra; revisar fecha y equipo cuando falten"},
 {id:"haciendo",title:"Haciendo",description:"Obras con incidencia o expediente en revisión"},
 {id:"por_llegar",title:"Por llegar",description:"Documentación pendiente o expediente listo a la espera de ejecución"},
 {id:"terminados",title:"Terminados",description:"Expedientes con cierre confirmado"}
]);
function find(rows,q){const term=norm(q);return !term?rows:rows.filter(r=>norm([r.name,r.street,r.town,r.phone].join(" ")).includes(term));}
w.KonsorOfficeArchive=Object.freeze({clients,groups,find,stage,booked,scheduled,belongs,displayDate});
})(window);
