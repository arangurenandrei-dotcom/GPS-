/* KONSOR | Una ficha por expediente, con viviendas y procedimientos por planta.
 * Proyección y validación puras, sin migrar ni escribir datos existentes. */
(function(root){
"use strict";
const str=x=>String(x??"").trim();
const safeId=x=>str(x).replace(/[^a-zA-Z0-9_-]/g,"");
function reference(c){return safeId(c?.clientUid)||null;}
function homes(c){
 const a=Array.isArray(c?.viviendas)?c.viviendas:[];
 if(a.length)return a.map((v,i)=>({
  id:safeId(v.id)||"v"+(i+1),direccion:str(v.direccion||v.street||c.street),
  m2Total:v.m2Total??null,m2:v.m2??null,notas:str(v.notas)
 }));
 return [{id:"principal",direccion:str(c?.street),m2Total:c?.m2Total??null,m2:c?.m2??null,notas:""}];
}
const complete=(c,z={})=>({
 comercial:!!(str(c?.name)&&str(c?.phone)&&str(c?.street)&&str(z.town||c?.locality)),
 tecnico:homes(c).every(v=>v.m2!==null&&v.m2!==undefined),
 oficina:!!(str(c?.name)&&str(c?.street)&&str(z.town||c?.locality)&&str(c?.obraDate)),
});
function missing(c,z={},role="comercial"){
 const items=[];
 if(role==="comercial"){if(!str(c?.name))items.push("Nombre");if(!str(c?.phone))items.push("Teléfono");if(!str(c?.street))items.push("Dirección");if(!str(z.town||c?.locality))items.push("Pueblo");}
 if(role==="tecnico")homes(c).forEach((v,i)=>{if(v.m2===null||v.m2===undefined)items.push("Medición vivienda "+(i+1));});
 if(role==="oficina"){if(!str(c?.obraDate))items.push("Fecha de obra");if(!str(c?.name))items.push("Titular");}
 return items;
}
function validateHomes(items){
 if(!Array.isArray(items)||!items.length||items.length>50)throw Error("Debe haber entre 1 y 50 viviendas.");
 const seen=new Set();
 return items.map((v,i)=>{
  const id=safeId(v.id)||"v"+(i+1);
  if(seen.has(id))throw Error("Vivienda duplicada.");seen.add(id);
  const n=str(v.m2Total).replace(",",".");
  const total=n===""?null:Number(n);
  if(total!==null&&(!Number.isFinite(total)||total<0))throw Error("Superficie inválida en vivienda "+(i+1));
  return {id,direccion:str(v.direccion),m2Total:total,
   m2:total===null?null:Math.round(Math.max(0,total-5)*100)/100,notas:str(v.notas)};
 });
}
const api=Object.freeze({reference,homes,complete,missing,validateHomes});
if(root)root.KonsorExpediente=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:null);
