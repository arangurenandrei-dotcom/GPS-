/* KONSOR: modelo de flujo único sobre la ficha existente.
 * Proyección pura: NO crea registros, NO migra datos, NO altera captación histórica.
 * Estado comercial, documentación y ejecución son dimensiones independientes.
 */
(function(root){
"use strict";
const text=v=>String(v??"").trim();
const validPhone=v=>/^[6789]\d{8}$/.test(text(v).replace(/\D/g,"").replace(/^34(?=\d{9}$)/,""));
const booked=c=>["agendada","agendada_historica"].includes(c?.obraStatus);
const completed=c=>c?.obraStatus==="realizada";
const dismissed=c=>c?.obraStatus==="no_apto"||["no_interesado","descartado"].includes(c?.callStatus);
const origin=c=>text(c?.captacionRespuesta)||"sin_registrar";
const area=c=>{
 const value=Number(String(c?.m2??"").replace(",","."));
 return text(c?.m2)!==""&&Number.isFinite(value)&&value>=0?value:null;
};
function status(c,zone={}){
 if(!c)return {key:"sin_ficha",label:"Sin ficha",next:"Crear ficha",terminal:false};
 if(completed(c))return {key:"realizada",label:"Obra realizada",next:"Ver documentación y cierre",terminal:false};
 if(["aplazada","no_realizada"].includes(c.obraStatus))
  return {key:c.obraStatus,label:c.obraStatus==="aplazada"?"Obra aplazada":"Obra no realizada",next:"Gestionar incidencia o reprogramar",terminal:false};
 if(dismissed(c))return {key:"descartada",label:"No continúa",next:"Consultar historial",terminal:true};
 if(booked(c))return {key:"agendada",label:"Obra agendada",next:"Comprobar fecha, equipo y documentación",terminal:false};
 if(c.callStatus==="esperando_confirmacion")
  return {key:"seguimiento",label:"En seguimiento",next:"Revisar próximo aviso o llamar",terminal:false};
 if(c.callStatus==="ya_llamado")return {key:"llamada",label:"Ya llamado",next:"Registrar respuesta o próximo contacto",terminal:false};
 if(!validPhone(c.phone)||!text(c.street)||!text(zone.town||c.locality))
  return {key:"incompleta",label:"Completar contacto",next:"Completar teléfono, calle y pueblo",terminal:false};
 if(["no","ausente","papelito"].includes(origin(c)))
  return {key:"captada",label:"Respuesta en puerta registrada",next:"Revisar captación",terminal:false};
 return {key:"por_llamar",label:"Pendiente de llamada",next:"Llamar y gestionar reserva",terminal:false};
}
function outstanding(c,zone={}){
 const missing=[];
 if(!text(c?.name))missing.push("Nombre");
 if(!validPhone(c?.phone))missing.push("Teléfono");
 if(!text(c?.street))missing.push("Dirección");
 if(!text(zone.town||c?.locality))missing.push("Pueblo");
 if(area(c)===null)missing.push("Superficie");
 if(!text(c?.buildYear))missing.push("Año de construcción");
 if(!text(c?.postalCode))missing.push("Código postal");
 if(!text(c?.cteZone))missing.push("Zona CTE");
 if(booked(c)||completed(c)){
  if(!text(c?.dni))missing.push("DNI/NIE");
  if(!text(c?.email))missing.push("Correo");
 }
 return missing;
}
const model=Object.freeze({status,outstanding,validPhone,booked,completed,dismissed,area,origin});
root.KonsorSingleFileWorkflow=model;
})(window);
