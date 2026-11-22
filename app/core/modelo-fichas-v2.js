/*
 * KONSOR | Lectura de fichas V2 existentes — sin escrituras.
 * Preserva IDs de Firebase. No elimina fichas huérfanas ni reenumera sectores.
 * No invocar sobre datos de perfiles no autorizados por el servidor.
 */
(function(root){
'use strict';
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'?x.trim():'';
function inspeccionarV2(documents){
 const docs=Array.isArray(documents)?documents:[];
 const zones=new Set(docs.filter(d=>d?.col==='zonas').map(d=>text(d.id)).filter(Boolean));
 const seen=new Set(),duplicates=new Set();
 const stats={documentos:docs.length,zonas:zones.size,fichas:0,huérfanas:0,
  identificadoresDuplicados:0,sinIdentificador:0,sinRevision:0,referenciaZonaAusente:0,datosInvalidos:0};
 for(const d of docs){
  if(!d||!['zonas','fichas'].includes(d.col))continue;
  const key=d.col+'/'+text(d.id);
  if(!text(d.id))stats.sinIdentificador++;
  else if(seen.has(key)){if(!duplicates.has(key)){duplicates.add(key);stats.identificadoresDuplicados++;}}
  else seen.add(key);
  if(!Number.isSafeInteger(d.rev)||d.rev<1)stats.sinRevision++;
  if(!isObject(d.datos))stats.datosInvalidos++;
  if(d.col!=='fichas')continue;
  stats.fichas++;
  if(!text(d.zona))stats.referenciaZonaAusente++;
  if(!zones.has(text(d.zona)))stats.huérfanas++;
 }
 // Solo conteos: no registrar nombres, teléfonos o domicilios en telemetría.
 return Object.freeze(stats);
}
function vistaFichaAutorizada(d){
 if(!d||d.col!=='fichas'||!text(d.id)||!isObject(d.datos))
  throw new TypeError('Se requiere un documento de ficha válido');
 const x=d.datos;
 return Object.freeze({
  id:d.id,referenciaLegacy:'fichas/'+d.id,revision:d.rev,
  sectorId:text(d.zona)||null,responsableLegacy:text(d.owner)||null,
  contacto:Object.freeze({nombre:text(x.name),telefono:text(x.phone)}),
  inmueble:Object.freeze({direccion:text(x.street),localidad:text(x.locality),cp:text(x.cp),
    superficieEstimada:Number.isFinite(Number(x.m2))&&Number(x.m2)>0?Number(x.m2):null,
    tipo:text(x.type),anioConstruccion:Number.isFinite(Number(x.buildYear))?Number(x.buildYear):null}),
  proceso:Object.freeze({respuesta:text(x.captacionRespuesta),seguimiento:text(x.callStatus),
    obra:text(x.obraStatus),fechaObra:text(x.obraDate)}),
  migrada:false
 });
}
const api=Object.freeze({inspeccionarV2,vistaFichaAutorizada});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.KonsorFichasLegacy=api;
})(typeof window!=='undefined'?window:undefined);
