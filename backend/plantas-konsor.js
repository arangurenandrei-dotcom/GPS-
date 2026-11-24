'use strict';
/* KONSOR · Flujos entre plantas. Única autoridad: Firebase Auth + perfil aprobado.
 * No aceptar roles ni propietario desde el navegador. CEO ve solo alertas críticas
 * o escaladas, y puede emitir instrucciones a cualquier planta.
 */
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {onDocumentWritten}=require('firebase-functions/v2/firestore');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {getFirestore}=require('firebase-admin/firestore');
const REGION='europe-west1',PLANTS=['comercial','oficina','tecnicos','ceo'];
const trim=x=>String(x??'').trim();
const invalid=(message,code='invalid-argument')=>{throw new HttpsError(code,message);};
const allowedId=x=>/^[a-zA-Z0-9_-]{4,160}$/.test(trim(x));
const dueValid=d=>d===null||(Number.isSafeInteger(d)&&d>Date.now()-60000&&d<Date.now()+366*86400000);
const taskRef=id=>getFirestore().collection('konsor_plant_tasks').doc(id);
const isOwner=k=>k==='jefe';
const asPlant=k=>isOwner(k)?'ceo':/^oficina(?:[0-9]+|[_-][a-z0-9_-]+)?$/.test(k)?'oficina':/^tecnicos(?:[0-9]+|[_-][a-z0-9_-]+)?$/.test(k)?'tecnicos':/^comercial[0-9]+$/.test(k)?'comercial':null;
async function identity(req){
 const uid=req.auth?.uid;if(!uid)invalid('Inicia sesión.','unauthenticated');
 const snap=await getFirestore().doc('usuarios/'+uid).get(),p=snap.data();
 const plant=p?.estado==='aprobado'?asPlant(trim(p.userKey)):null;
 if(!plant)invalid('Perfil sin autorización para mensajes entre plantas.','permission-denied');
 return {uid,plant,owner:isOwner(p.userKey),team:'andrei'};
}
function viewAllowed(plant,item){
 return item?.teamId==='andrei'&&
 (plant==='ceo'?(item.from==='ceo'||item.to==='ceo'&&item.priority==='critical'):item.to===plant||item.from===plant);
}
function safeTask(d,id){return {
 id,from:d.from,to:d.to,title:d.title,detail:d.detail||'',priority:d.priority,
 status:d.status,kind:d.kind||'task',dueAt:d.dueAt??null,
 createdAt:d.createdAt,updatedAt:d.updatedAt,
 sourceId:d.sourceId||'',acknowledgedAt:d.acknowledgedAt||null,
 completedAt:d.completedAt||null,escalatedFrom:d.escalatedFrom||'',
 replies:Array.isArray(d.replies)?d.replies.slice(-30).map(r=>({from:r.from,text:r.text,at:r.at})):[]
};}
async function post(req){
 const me=await identity(req),d=req.data||{};
 const to=trim(d.to),title=trim(d.title),detail=trim(d.detail),priority=trim(d.priority||'normal');
 const dueAt=d.dueAt===undefined||d.dueAt===null?null:Number(d.dueAt);
 if(!PLANTS.includes(to)||!title||title.length>140||detail.length>2000||
  !['normal','important','critical'].includes(priority)||!dueValid(dueAt))
  invalid('Revisa destino, asunto, prioridad y fecha límite.');
 if(me.plant==='ceo'&&!me.owner)invalid('Solo Dirección puede enviar desde CEO.','permission-denied');
 if(to==='ceo'&&priority!=='critical')invalid('Al CEO solo se envían incidencias críticas.');
 if(!me.owner&&priority==='critical'&&to!=='ceo')invalid('Las prioridades críticas deben escalarse a Dirección.');
 if(to===me.plant&&!me.owner)invalid('Elige otra planta de destino.');
 const id='t_'+require('node:crypto').randomUUID().replace(/-/g,'');
 const now=Date.now(),item={teamId:me.team,from:me.plant,to,title,detail,priority,
  kind:'task',status:'pending',dueAt,createdAt:now,updatedAt:now,createdBy:me.uid,
  acknowledgedAt:null,completedAt:null,sourceId:'',escalatedFrom:''};
 await taskRef(id).create(item);return {ok:true,item:safeTask(item,id)};
}
async function list(req){
 const me=await identity(req),db=getFirestore();
 const requested=trim(req.data?.plant),to=me.owner&&PLANTS.includes(requested)?requested:me.plant;
 // Consultas limitadas, sin índices compuestos ni acceso directo del cliente.
 const [received,sent]=await Promise.all([
  db.collection('konsor_plant_tasks').where('to','==',to).limit(300).get(),
  db.collection('konsor_plant_tasks').where('from','==',to).limit(300).get()
 ]);
 const rows=new Map();
 for(const doc of [...received.docs,...sent.docs]){
  const item=doc.data();if(viewAllowed(to,item)&&!((item.hiddenFor||[]).includes(me.uid)))rows.set(doc.id,safeTask(item,doc.id));
 }
 return {ok:true,items:[...rows.values()].sort((a,b)=>b.createdAt-a.createdAt).slice(0,200)};
}
/* Confirmar recepción, responder en el mismo hilo o retirar de MI bandeja.
 * Archivar no borra la tarea ni el historial ni altera otras cuentas.
 */
async function change(req){
 const me=await identity(req),id=trim(req.data?.id),action=trim(req.data?.action);
 if(!allowedId(id)||!['ack','complete','reply','dismiss'].includes(action))
  invalid('Acción o tarea no válida.');
 const replyText=trim(req.data?.text);
 if(action==='reply'&&(!replyText||replyText.length>1200))
  invalid('La respuesta debe contener entre 1 y 1200 caracteres.');
 let out;
 await getFirestore().runTransaction(async tx=>{
  const ref=taskRef(id),snap=await tx.get(ref),d=snap.data();
  if(!d||!viewAllowed(me.plant,d))invalid('No tienes acceso a esta tarea.','permission-denied');
  const participant=d.from===me.plant||d.to===me.plant;
  if(!participant)invalid('No participas en esta conversación.','permission-denied');
  if((action==='ack'||action==='complete')&&d.to!==me.plant)
   invalid('Solo la planta destinataria puede confirmar o finalizar.','permission-denied');
  const now=Date.now();let patch;
  if(action==='reply'){
   const previous=Array.isArray(d.replies)?d.replies:[];
   if(previous.length>=30)invalid('Este hilo ha alcanzado el límite de respuestas. Abre una nueva solicitud.','failed-precondition');
   patch={replies:[...previous,{from:me.plant,text:replyText,at:now}],updatedAt:now};
   // Responder desde la planta receptora equivale a confirmar que se ha leído.
   if(d.to===me.plant&&d.status==='pending')
    Object.assign(patch,{status:'acknowledged',acknowledgedAt:d.acknowledgedAt||now});
  }else if(action==='dismiss'){
   // El aviso desaparece solo para quien lo archiva. Si lo archiva su destinatario,
   // deja constancia de recepción, sin marcar ejecución como completada.
   patch={hiddenFor:[...new Set([...(Array.isArray(d.hiddenFor)?d.hiddenFor:[]),me.uid])],updatedAt:now};
   if(d.to===me.plant&&d.status==='pending')
    Object.assign(patch,{status:'acknowledged',acknowledgedAt:d.acknowledgedAt||now});
  }else if(d.status==='completed'){
   out=safeTask(d,id);return;
  }else if(action==='ack'){
   patch={status:'acknowledged',acknowledgedAt:d.acknowledgedAt||now,updatedAt:now};
  }else{
   patch={status:'completed',acknowledgedAt:d.acknowledgedAt||now,completedAt:now,updatedAt:now};
  }
  tx.update(ref,patch);out=safeTask({...d,...patch},id);
 });
 return {ok:true,item:out};
}
const defaults={ackHours:4,criticalOverdueHours:24,marginMinPct:20,marginWarningPct:25};
function validateLimits(x){
 const out={};
 for(const [k,[lo,hi]] of Object.entries({ackHours:[1,72],criticalOverdueHours:[1,168],marginMinPct:[0,90],marginWarningPct:[0,95]})){
  const v=Number(x[k]);if(!Number.isFinite(v)||v<lo||v>hi)invalid('Margen o plazo inválido: '+k);
  out[k]=v;
 }
 if(out.marginMinPct>out.marginWarningPct)invalid('El margen mínimo debe ser menor o igual al aviso.');
 return out;
}
async function limits(req){
 const me=await identity(req),ref=getFirestore().doc('konsor_plant_config/andrei');
 if(req.data?.action==='save'){
  if(!me.owner)invalid('Solo CEO puede fijar márgenes.','permission-denied');
  const rules=validateLimits(req.data.values||{});
  await ref.set({...rules,updatedAt:Date.now(),updatedBy:me.uid},{merge:true});
  return {ok:true,values:rules};
 }
 const snap=await ref.get();return {ok:true,values:{...defaults,...(snap.data()||{}),updatedAt:undefined,updatedBy:undefined}};
}
async function createAuto(id,entry){
 const ref=taskRef(id),now=Date.now();
 try{await ref.create({teamId:'andrei',from:entry.from,to:entry.to,
  title:entry.title.slice(0,140),detail:entry.detail.slice(0,2000),
  kind:entry.kind||'automatic',priority:entry.priority||'normal',
  status:'pending',dueAt:entry.dueAt||null,sourceId:entry.sourceId||'',
  escalatedFrom:entry.escalatedFrom||'',createdAt:now,updatedAt:now,createdBy:'system',
  acknowledgedAt:null,completedAt:null});return true;}
 catch(e){if(e.code===6||e.code==='already-exists')return false;throw e;}
}
function classify(before,after,uid){
 const previous=before||{},c=after||{},source='fichas/'+uid,items=[];
 const key=trim(c.obraStatus),old=trim(previous.obraStatus);
 const stamp=trim(c.obraDate)+'|'+trim(c.obraTime)+'|'+trim(c.obraEquipoInstalacion);
 const oldStamp=trim(previous.obraDate)+'|'+trim(previous.obraTime)+'|'+trim(previous.obraEquipoInstalacion);
 if(['agendada','agendada_historica'].includes(key)&&
  (key!==old||stamp!==oldStamp)&&c.obraDate){
  items.push({to:'oficina',from:'comercial',priority:'normal',title:'Preparar nuevo expediente',
   detail:trim(c.street)+' · Obra '+c.obraDate+' '+trim(c.obraTime),sourceId:source,
   code:'booking_'+key+'_'+stamp});
  items.push({to:'tecnicos',from:'oficina',priority:'normal',title:'Nueva intervención programada',
   detail:trim(c.street)+' · '+c.obraDate+' '+trim(c.obraTime)+' · Equipo '+trim(c.obraEquipoInstalacion),sourceId:source,
   code:'tech_'+key+'_'+stamp});
 }
 if(['aplazada','no_realizada'].includes(key)&&key!==old){
  items.push({to:'oficina',from:'tecnicos',priority:'important',title:'Incidencia: intervención '+key,
   detail:trim(c.street)+' · Revisar y coordinar nueva fecha',sourceId:source,code:'incident_'+key});
  items.push({to:'comercial',from:'tecnicos',priority:'important',title:'Cliente pendiente de reprogramación',
   detail:trim(c.street)+' · Revisar incidencia con Oficina',sourceId:source,code:'reprogram_'+key});
 }
 if(key==='realizada'&&old!=='realizada')
  items.push({to:'oficina',from:'tecnicos',priority:'normal',title:'Revisar cierre de instalación',
   detail:trim(c.street)+' · Comprobar documentos antes de cerrar expediente',sourceId:source,code:'done'});
 return items;
}
function autoId(uid,entry){
 return 'a_'+require('node:crypto').createHash('sha256').update(uid+'|'+entry.code).digest('hex').slice(0,55);
}
async function fichaEvent(event){
 const after=event.data?.after?.data(),before=event.data?.before?.data();
 if(!after||after.teamId!=='andrei'||before?.teamId&&before.teamId!=='andrei')return;
 const uid=event.params.id;
 const items=classify(before?.datos,after.datos,uid);
 await Promise.all(items.map(x=>createAuto(autoId(uid,x),x)));
}
async function escalateAt(now=Date.now()){
 const db=getFirestore(),settings=(await db.doc('konsor_plant_config/andrei').get()).data()||{};
 const cfg={...defaults,...settings};
 const snapshot=await db.collection('konsor_plant_tasks').where('status','in',['pending','acknowledged']).limit(500).get();
 let count=0;
 for(const doc of snapshot.docs){
  const d=doc.data();
  if(d.teamId!=='andrei'||d.to==='ceo'||d.priority==='critical')continue;
  const pending=d.status==='pending'&&now-d.createdAt>=cfg.ackHours*3600000;
  const overdue=d.dueAt&&now-d.dueAt>=cfg.criticalOverdueHours*3600000;
  if(!pending&&!overdue)continue;
  const key='e_'+require('node:crypto').createHash('sha256').update(doc.id+'|'+(overdue?'overdue':'unconfirmed')).digest('hex').slice(0,55);
  const created=await createAuto(key,{from:d.to,to:'ceo',priority:'critical',
   title:overdue?'Tarea vencida sin resolver':'Tarea sin confirmar',
   detail:d.title+' · Planta '+d.to+' · '+trim(d.detail).slice(0,800),
   sourceId:d.sourceId||'',escalatedFrom:doc.id,code:'escalation'});
  if(created)count++;
 }
 return count;
}
module.exports={
 crearMensajePlantaKonsor:onCall({region:REGION},post),
 listarMensajesPlantaKonsor:onCall({region:REGION},list),
 actualizarMensajePlantaKonsor:onCall({region:REGION},change),
 configurarMargenesPlantaKonsor:onCall({region:REGION},limits),
 automatizarFichaPlantasKonsor:onDocumentWritten({document:'fichas/{id}',region:REGION},fichaEvent),
 escalarPendientesPlantasKonsor:onSchedule({schedule:'every 15 minutes',timeZone:'Europe/Madrid',region:REGION},async()=>{await escalateAt();}),
 __test:{asPlant,viewAllowed,validateLimits,classify,autoId,escalateAt,post,list,change,limits}
};
