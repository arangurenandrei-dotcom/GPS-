'use strict';
/* KONSOR: cartera histórica independiente de zonas/sectores.
   Todas las operaciones se autorizan en servidor; nunca confiar en roles del navegador. */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { createHash } = require('node:crypto');

const COLLECTION='clientes_antiguos_independientes';
const ALLOWED=new Set(['jefe','jefe_mikel','comercial1','comercial2','comercial3','comercial4','comercial5','mikel_com1','mikel_com2','mikel_com3','mikel_com4','mikel_com5']);
const KEY=/^h_[a-f0-9-]{36}$/i;
const LIMIT=500;
const phone=v=>String(v||'').replace(/\D/g,'').replace(/^34(?=\d{9}$)/,'');
const tidy=(value,max=150)=>String(value??'').trim().slice(0,max);
const norm=v=>tidy(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
const fingerprint=(uid,d)=>phone(d.phone).length===9&&d.locality&&d.street?createHash('sha256').update([uid,norm(d.locality),norm(d.street),phone(d.phone)].join('|')).digest('hex'):null;
const team=key=>key==='jefe_mikel'||key.startsWith('mikel_')?'mikel':'andrei';
const boss=key=>key==='jefe'||key==='jefe_mikel';
function failure(code,message){throw new HttpsError(code,message);}
async function identity(req,db){
  if(!req.auth?.uid)failure('unauthenticated','Inicia sesión para trabajar con clientes antiguos.');
  const snap=await db.doc('usuarios/'+req.auth.uid).get(),profile=snap.data();
  if(!snap.exists||profile?.estado!=='aprobado'||!ALLOWED.has(profile.userKey))failure('permission-denied','El perfil no tiene permiso para esta cartera.');
  return {uid:req.auth.uid,key:profile.userKey,teamId:team(profile.userKey),chief:boss(profile.userKey),name:tidy(profile.nombre||profile.userKey,90)};
}
function canAccess(me,client){
  return client&&client.teamId===me.teamId&&(me.chief||client.ownerUid===me.uid);
}
function normalize(data,ready){
  if(!data||typeof data!=='object'||Array.isArray(data))failure('invalid-argument','Datos de ficha no válidos.');
  const d={
    name:tidy(data.name,120),phone:tidy(data.phone,32),locality:tidy(data.locality,120),
    street:tidy(data.street,180),postalCode:tidy(data.postalCode,10),
    buildYear:tidy(data.buildYear,8),m2Total:tidy(data.m2Total,20),
    cteZone:tidy(data.cteZone,5),observaciones:tidy(data.observaciones,1500),
    captacionRespuesta:tidy(data.captacionRespuesta,12),
    type:tidy(data.type||'vivienda',40)
  };
  if(!d.locality)failure('invalid-argument','Indica el pueblo.');
  if(!(d.name||d.street||d.phone))failure('invalid-argument','Indica nombre, dirección o teléfono.');
  if(!['si','no','ausente','papelito'].includes(d.captacionRespuesta))failure('invalid-argument','Respuesta comercial inválida.');
  if(d.buildYear&&(!/^\d{4}$/.test(d.buildYear)||Number(d.buildYear)<1800||Number(d.buildYear)>new Date().getFullYear()))failure('invalid-argument','Revisa el año de construcción.');
  if(d.m2Total&&(!Number.isFinite(Number(d.m2Total.replace(',','.')))||Number(d.m2Total.replace(',','.'))<=0))failure('invalid-argument','Revisa la superficie.');
  if(d.postalCode&&!/^\d{5}$/.test(d.postalCode))failure('invalid-argument','Código postal inválido.');
  if(d.cteZone&&!/^[DE][123]$/.test(d.cteZone))failure('invalid-argument','Zona CTE inválida.');
  if(ready&&(!d.name||!d.street||!/^[6789]\d{8}$/.test(phone(d.phone))||d.captacionRespuesta!=='si'))
    failure('failed-precondition','Para habilitar llamadas: nombre, calle, teléfono válido y respuesta Sí. Los datos técnicos pueden quedar pendientes.');
  d.m2=d.m2Total?Math.round(Math.max(0,Number(d.m2Total.replace(',','.'))-5)*100)/100:null;
  return d;
}
function output(doc){return {id:doc.id,...doc.data()};}
async function list(req){
  const db=getFirestore(),me=await identity(req,db);
  const snapshot=await db.collection(COLLECTION).where('teamId','==',me.teamId).limit(LIMIT+1).get();
  if(snapshot.size>LIMIT)failure('resource-exhausted','La cartera supera el límite de consulta; se necesita paginación para mostrarla completa.');
  return {ok:true,rows:snapshot.docs.filter(d=>canAccess(me,d.data())).map(output)};
}
async function save(req){
  const db=getFirestore(),me=await identity(req,db);
  const input=req.data||{},id=tidy(input.id,100);
  if(!KEY.test(id))failure('invalid-argument','Identificador de ficha incorrecto.');
  const ready=input.ready===true,fields=normalize(input,ready);
  const ref=db.collection(COLLECTION).doc(id);
  let stored;
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref),old=snap.exists?snap.data():null,now=Date.now();
    if(old&&!canAccess(me,old))failure('permission-denied','No tienes permiso para modificar esta ficha.');
    if(old&&(input.rev===undefined||input.rev===null)){
      const same=old.ownerUid===me.uid&&old.legacyReviewStatus===(ready?'lista':'pendiente')&&
        Object.keys(fields).every(k=>JSON.stringify(fields[k])===JSON.stringify(old[k]));
      if(same){stored={id,...old};return;} // Reintento seguro tras confirmación perdida.
      failure('already-exists','Esta ficha ya existe. Abre la cartera antes de volver a crearla.');
    }
    if(old&&Number(input.rev)!==old.rev)failure('aborted','La ficha ha cambiado en otro dispositivo. Actualiza antes de guardar.');
    if(old&&['agendada','realizada','agendada_historica'].includes(old.obraStatus)&&ready)
      failure('failed-precondition','La ficha ya tiene obra o cita.');
    // Reserva de unicidad: mismo propietario + pueblo + dirección + teléfono.
    // La transacción evita registros duplicados si dos dispositivos guardan a la vez.
    const newKey=fingerprint(old?.teamId||me.teamId,fields),oldKey=old?.fingerprintKey||null;
    const refForKey=key=>db.collection('clientes_antiguos_claves').doc(key);
    if(newKey&&newKey!==oldKey){
      const existing=await tx.get(refForKey(newKey));
      if(existing.exists&&existing.data()?.clientId!==id)failure('already-exists','Ya existe una ficha con esa dirección y teléfono.');
    }
    const payload={
      ...fields,fingerprintKey:newKey,teamId:old?.teamId||me.teamId,ownerUid:old?.ownerUid||me.uid,
      ownerKey:old?.ownerKey||me.key,ownerName:old?.ownerName||me.name,
      importedLegacy:true,legacyPortfolio:true,independentHistorical:true,
      legacyReviewStatus:ready?'lista':'pendiente',
      callStatus:ready?(old?.callStatus&&old.callStatus!=='bloqueada'?old.callStatus:'pendiente'):(old?.callStatus==='pendiente'?'bloqueada':old?.callStatus||'bloqueada'),
      obraStatus:old?.obraStatus||'a_poner',createdAt:old?.createdAt||now,updatedAt:now,
      rev:old?old.rev+1:1
    };
    if(ready)payload.legacyReviewedAt=now;
    else if(old?.legacyReviewedAt)payload.legacyReviewedAt=old.legacyReviewedAt;
    if(oldKey&&oldKey!==newKey)tx.delete(refForKey(oldKey));
    if(newKey&&newKey!==oldKey)tx.set(refForKey(newKey),{clientId:id,teamId:payload.teamId,ownerUid:payload.ownerUid});
    if(old)tx.update(ref,payload);else tx.create(ref,payload);
    stored={id,...payload};
  });
  return {ok:true,registro:stored};
}
async function updateCall(req){
  const db=getFirestore(),me=await identity(req,db),input=req.data||{},id=tidy(input.id,100);
  if(!KEY.test(id))failure('invalid-argument','Ficha no válida.');
  const status=tidy(input.status,32);
  if(!['ya_llamado','esperando_confirmacion','pendiente'].includes(status))failure('invalid-argument','Estado de llamada inválido.');
  const ref=db.collection(COLLECTION).doc(id);let stored;
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref),old=snap.data();
    if(!snap.exists||!canAccess(me,old))failure('permission-denied','Ficha inexistente o sin permiso.');
    if(Number(input.rev)!==old.rev)failure('aborted','La ficha fue modificada. Recarga las llamadas.');
    if(old.legacyReviewStatus!=='lista'||!/^\d{9}$/.test(phone(old.phone))||['agendada','realizada','agendada_historica'].includes(old.obraStatus))
      failure('failed-precondition','Esta ficha no está disponible para llamadas.');
    const now=Date.now();
    const next={callStatus:status,rev:old.rev+1,updatedAt:now,statusChangedAt:now,statusChangedByUid:me.uid,
      nextContactAt:status==='esperando_confirmacion'?now+48*3600*1000:null,
      callLog:[...(old.callLog||[]),{t:now,s:status,by:me.uid}].slice(-30)};
    tx.update(ref,next);stored={id,...old,...next};
  });
  return {ok:true,registro:stored};
}
module.exports={
  listarClientesAntiguos:onCall({region:'europe-west1',maxInstances:4,timeoutSeconds:60},list),
  guardarClienteAntiguo:onCall({region:'europe-west1',maxInstances:4,timeoutSeconds:60},save),
  actualizarLlamadaClienteAntiguo:onCall({region:'europe-west1',maxInstances:4,timeoutSeconds:60},updateCall),
  __test:{normalize,phone,norm,team,canAccess,list,save,updateCall}
};
