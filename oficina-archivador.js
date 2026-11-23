/* KONSOR: consulta de clientes y archivador de Oficina.
 * Ficha única / solo lectura. No crea otras fichas ni modifica estados.
 */
(function(w){
"use strict";
const trim=v=>String(v??"").trim();
const norm=v=>trim(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function stage(c){
 if(c.expedienteCerradoAt)return "terminados";
 if(["aplazada","no_realizada"].includes(c.obraStatus))return "haciendo";
 if(["realizada"].includes(c.obraStatus)){
  if(c.documentosVerificadosAt||c.documentosCompletosAt)return "haciendo";
  return "por_llegar";
 }
 if(["agendada","agendada_historica"].includes(c.obraStatus))return "nuevos";
 return "nuevos";
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
    status:trim(c.obraStatus),group:stage(c),
    hasDocumentCheck:!!(c.documentosVerificadosAt||c.documentosCompletosAt),
    archived:!!c.expedienteCerradoAt});
  }
 }
 return out;
}
const groups=Object.freeze([
 {id:"nuevos",title:"Nuevos",description:"Obras agendadas pendientes de preparación"},
 {id:"haciendo",title:"Haciendo",description:"Incidencias, tramitación y revisiones en curso"},
 {id:"por_llegar",title:"Por llegar",description:"Pendientes de documentos o información"},
 {id:"terminados",title:"Terminados",description:"Expedientes con cierre confirmado"}
]);
function find(rows,q){const term=norm(q);return !term?rows:rows.filter(r=>norm([r.name,r.street,r.town,r.phone].join(" ")).includes(term));}
w.KonsorOfficeArchive=Object.freeze({clients,groups,find,stage});
})(window);
