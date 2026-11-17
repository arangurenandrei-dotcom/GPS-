'use strict';
const {google}=require('googleapis');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {getFirestore}=require('firebase-admin/firestore');
const {createHash}=require('node:crypto');
const {CALENDAR_ID}=require('./calendario-konsor');
const {validate,selectEvent}=require('./historicos-core');
function eventKey(eventId){return createHash('sha256').update(CALENDAR_ID+'|'+eventId).digest('hex');}
async function verificarReservaHistorica(data){
 let input;try{input=validate(data);}catch(e){throw new HttpsError('invalid-argument',e.message);}
 const auth=new google.auth.GoogleAuth({scopes:['https://www.googleapis.com/auth/calendar.events.readonly']});
 const calendar=google.calendar({version:'v3',auth});
 const base=Date.parse(input.date+'T00:00:00Z');let pageToken;const events=[];
 try{do{
  const result=await calendar.events.list({calendarId:CALENDAR_ID,timeMin:new Date(base-86400000).toISOString(),timeMax:new Date(base+172800000).toISOString(),singleEvents:true,showDeleted:false,maxResults:2500,pageToken});
  events.push(...result.data.items||[]);pageToken=result.data.nextPageToken;
 }while(pageToken);}catch{throw new HttpsError('unavailable','No se pudo consultar KONSOR. Reintenta sin volver a reservar.');}
 let result;try{result=selectEvent(events,data);}catch(e){throw new HttpsError('failed-precondition',e.message);}
 return {...result,eventKey:eventKey(result.eventId)};
}
const verificarHistoricoKonsor=onCall({region:'europe-west1',timeoutSeconds:60,maxInstances:3},async req=>{
 if(!req.auth)throw new HttpsError('unauthenticated','Inicia sesión.');
 const profile=(await getFirestore().doc('usuarios/'+req.auth.uid).get()).data();
 if(profile?.estado!=='aprobado'||profile.userKey!=='jefe')throw new HttpsError('permission-denied','Solo Andrei puede vincular históricos.');
 const result=await verificarReservaHistorica(req.data);
 const claim=await getFirestore().doc('vinculos_konsor/'+result.eventKey).get();
 if(claim.exists)throw new HttpsError('already-exists','La cita ya está vinculada a una ficha. Recarga la app.');
 return {ok:true,...result};
});
module.exports={verificarReservaHistorica,verificarHistoricoKonsor,eventKey};
