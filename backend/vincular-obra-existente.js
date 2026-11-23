'use strict';
/* Vincular una reserva existente de Calendar a una ficha Firestore.
 * NO reserva una nueva franja y NO escribe ni elimina eventos.
 * El cliente no puede declarar por sí solo que el evento le pertenece.
 */
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {getFirestore}=require('firebase-admin/firestore');
const {google}=require('googleapis');
const {createHash}=require('node:crypto');
const {CALENDAR_ID}=require('./calendario-konsor');
const {selectEvent}=require('./historicos-core');
const FRANJAS=new Set(['09:00','11:00','15:00','17:00']);
const strip=v=>String(v||'').trim();
const digits=v=>String(v||'').replace(/\D/g,'').replace(/^(0034|34)(?=\d{9}$)/,'');
const clean=v=>strip(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const fail=(code,msg)=>{throw new HttpsError(code,msg);};
const validId=v=>/^[a-z0-9_-]{3,110}$/i.test(strip(v));
const validDay=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&
 Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(Date.parse(d+'T12:00:00Z')).toISOString().slice(0,10)===d;
async function loadEvents(date){
 const auth=new google.auth.GoogleAuth({scopes:['https://www.googleapis.com/auth/calendar.events.readonly']});
 const cal=google.calendar({version:'v3',auth});
 const base=Date.parse(date+'T00:00:00Z'),events=[];let pageToken;
 try{
  do {
   const {data}=await cal.events.list({calendarId:CALENDAR_ID,timeMin:new Date(base-86400000).toISOString(),
    timeMax:new Date(base+172800000).toISOString(),singleEvents:true,showDeleted:false,maxResults:2500,pageToken});
   events.push(...(data.items||[]));pageToken=data.nextPageToken;
  }while(pageToken);
 }catch(_){fail('unavailable','No se ha podido consultar Google Calendar; la ficha no se ha modificado.');}
 return events;
}
function choose(events,info){
 // selectEvent exige identidad completa y un evento inequívoco.
 // El ID original de ficha se utiliza como ID técnico de comparación.
 const data={crmOrigenId:info.clientUid,phone:info.phone,street:info.street,crmKonsorTown:info.town,
  obraDate:info.date,obraTime:info.time,obraEquipoInstalacion:info.team,
  crmKonsorEventId:info.eventId||undefined};
 try{return selectEvent(events,data);}
 catch(e){fail('failed-precondition',e.message);}
}
async function link(req){
 const uid=req.auth?.uid;if(!uid)fail('unauthenticated','Inicia sesión.');
 const data=req.data||{},fichaId=strip(data.clientUid),zoneId=strip(data.zoneId);
 const date=strip(data.date),time=strip(data.time),team=Number(data.team);
 if(!validId(fichaId)||!validId(zoneId)||!validDay(date)||!FRANJAS.has(time)||![2,3].includes(team))
  fail('invalid-argument','Revisa la ficha, el equipo, la fecha y la hora.');
 const db=getFirestore(),user=(await db.doc('usuarios/'+uid).get()).data();
 if(user?.estado!=='aprobado'||user.userKey!=='jefe')
  fail('permission-denied','Solo la dirección autorizada puede vincular citas existentes.');
 const fichaRef=db.doc('fichas/'+fichaId),zonaRef=db.doc('zonas/'+zoneId);
 const [fichaSnap,zonaSnap]=await Promise.all([fichaRef.get(),zonaRef.get()]);
 const f=fichaSnap.data(),z=zonaSnap.data();
 if(!fichaSnap.exists||!zonaSnap.exists||f.teamId!=='andrei'||z.teamId!=='andrei'||
   String(f.zonaId||f.zona||'')!==zoneId)
  fail('permission-denied','La ficha no corresponde al pueblo ni al equipo autorizado.');
 const c=f.datos||{},zone=z.datos||{};
 const phone=digits(c.phone),street=strip(c.street),town=strip(zone.town||c.locality);
 if(phone.length!==9||!street||!town||!clean(data.street)||
   clean(street)!==clean(data.street)||clean(town)!==clean(data.town)||
   digits(data.phone)!==phone)
  fail('failed-precondition','La dirección o el teléfono de la ficha no coinciden con los datos comprobados.');
 if(['realizada','no_apto'].includes(c.obraStatus))
  fail('failed-precondition','La ficha ya tiene un estado final que requiere revisión.');
 const verified=choose(await loadEvents(date),{clientUid:fichaId,phone,street,town,date,time,team,eventId:strip(data.eventId)});
 const eventId=verified.eventId,eventKey=createHash('sha256').update(CALENDAR_ID+'|'+eventId).digest('hex');
 const claimRef=db.doc('vinculos_konsor/'+eventKey);
 // Compare and swap de revisión: no pisar ediciones simultáneas del comercial.
 const expected=Number(data.rev);
 if(!Number.isSafeInteger(expected)||expected<1)fail('invalid-argument','Revisión de ficha no válida. Recarga KONSOR.');
 let result;
 await db.runTransaction(async tx=>{
  const [current,claim]=await Promise.all([tx.get(fichaRef),tx.get(claimRef)]);
  const row=current.data(),prior=claim.data();
  if(!current.exists||String(row?.zonaId||row?.zona||'')!==zoneId||
     row?.teamId!=='andrei')fail('permission-denied','La ficha ha cambiado o ya no es accesible.');
  if(prior&&prior.fichaId!==fichaId)fail('already-exists','Este evento ya está vinculado a otra ficha.');
  const old=row.datos||{};
  if(prior&&prior.fichaId===fichaId&&old.crmKonsorEventId===eventId){
   result={ok:true,linked:true,eventId,alreadyLinked:true};return;
  }
  if(row.rev!==expected)fail('aborted','La ficha cambió mientras verificabas el evento. Actualiza e inténtalo de nuevo.');
  if(['agendada','realizada'].includes(old.obraStatus)||old.crmKonsorEventId)
   fail('failed-precondition','Ya existe una reserva vinculada a esta ficha.');
  if(digits(old.phone)!==phone||clean(old.street)!==clean(street))
   fail('aborted','El teléfono o la dirección cambiaron durante la consulta.');
  const updated={...old,obraStatus:'agendada',obraDate:date,obraTime:time,
   obraEquipoInstalacion:team,callStatus:'citas',nextContactAt:null,
   calendarBookingOrigin:'google_calendar_existing',crmKonsorEventId:eventId,
   crmKonsorEventKey:eventKey,crmKonsorEtag:verified.etag||'',
   crmKonsorVerifiedAt:Date.now(),calendarEventUrl:strip(data.eventUrl).slice(0,1000),
   statusChangedAt:Date.now(),updatedAt:Date.now()};
  tx.update(fichaRef,{datos:updated,rev:row.rev+1});
  if(!prior)tx.create(claimRef,{fichaId,eventId,teamId:'andrei',createdByUid:uid,createdAt:Date.now()});
  result={ok:true,linked:true,eventId,alreadyLinked:false};
 });
 return result;
}
module.exports={
 vincularObraExistenteKonsor:onCall({region:'europe-west1',timeoutSeconds:60,maxInstances:3},link),
 __test:{choose,clean,digits,validDay,link}
};
