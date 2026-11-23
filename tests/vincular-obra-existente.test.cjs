'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const core=require('../backend/historicos-core');
const src=fs.readFileSync(path.join(__dirname,'../backend/vincular-obra-existente.js'),'utf8');
const event={id:'calendar-event-one',etag:'rev123',status:'confirmed',summary:'Equipo 2 · Peralta · Alfonso',
 description:'Nombre: Alfonso\nTeléfono: 639565653\nEquipo: Equipo 2',
 location:'Valle baztan, 7, 31350, Peralta/Azkoien, Navarra',
 start:{dateTime:'2026-11-28T17:00:00+01:00'},end:{dateTime:'2026-11-28T19:00:00+01:00'}};
function fixture({phone='639565653',owner='jefe',eventList=[event],claim=null}={}){
 const docs={
  'usuarios/u':{estado:'aprobado',userKey:owner},
  'fichas/f_test':{rev:2,teamId:'andrei',zonaId:'z_test',datos:{
   name:'Alfonso',phone,street:'Valle baztan 7',obraStatus:'a_poner',callStatus:'pendiente'
  }},
  'zonas/z_test':{teamId:'andrei',datos:{town:'Peralta'}}
 };
 if(claim)docs['vinculos_konsor/'+claim.key]=claim.value;
 const writes=[];
 const db={
  doc:key=>({key,get:async()=>({exists:key in docs,data:()=>docs[key]})}),
  runTransaction:async fn=>{
   const tx={
    get:async ref=>({exists:ref.key in docs,data:()=>docs[ref.key]}),
    update:(ref,patch)=>{writes.push(['update',ref.key]);docs[ref.key]={...docs[ref.key],...patch};},
    create:(ref,data)=>{writes.push(['create',ref.key]);docs[ref.key]=data;},
    set:(ref,patch)=>{writes.push(['set',ref.key]);docs[ref.key]={...docs[ref.key],...patch};}
   };
   return fn(tx);
  }
 };
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const google={auth:{GoogleAuth:class{}},calendar:()=>({events:{list:async()=>({data:{items:eventList}})}})};
 const sandbox={module:{exports:{}},require: name=>{
  if(name==='googleapis')return {google};
  if(name==='firebase-admin/firestore')return {getFirestore:()=>db};
  if(name==='firebase-functions/v2/https')return {onCall:(options,fn)=>fn,HttpsError};
  if(name==='./calendario-konsor')return {CALENDAR_ID:'test-konsor'};
  if(name==='./historicos-core')return core;
  return require(name);
 }};
 vm.runInNewContext(src,sandbox,{filename:'vincular-obra-existente.js'});
 const request={auth:{uid:'u'},data:{
  clientUid:'f_test',zoneId:'z_test',rev:2,date:'2026-11-28',time:'17:00',team:2,
  phone:'639565653',street:'Valle baztan 7',town:'Peralta'
 }};
 return {link:sandbox.module.exports.vincularObraExistenteKonsor,request,docs,writes};
}
test('encuentra la obra original y vincula sin crear otra reserva de Calendar',async()=>{
 const t=fixture(),r=await t.link(t.request);
 assert.equal(r.ok,true);assert.equal(r.linked,true);assert.equal(r.eventId,event.id);
 assert.equal(t.docs['fichas/f_test'].datos.obraStatus,'agendada');
 assert.equal(t.docs['fichas/f_test'].datos.obraTime,'17:00');
 assert.equal(t.docs['fichas/f_test'].datos.obraEquipoInstalacion,2);
 assert.equal(t.docs['fichas/f_test'].datos.callStatus,'citas');
 assert.equal(t.docs['fichas/f_test'].rev,3);
 assert.equal(t.writes.filter(x=>x[0]==='create').length,1);
 assert.equal(t.writes.filter(x=>x[1].startsWith('fichas/')).length,1);
 assert.ok(!t.writes.some(x=>x[1].startsWith('reservas/')));
});
test('no vincula una coincidencia de nombre sin teléfono o dirección',async()=>{
 for(const patch of [{phone:'600111111'},{eventList:[{...event,location:'Otra calle, Tudela'}]}]){
  const t=fixture(patch);
  await assert.rejects(t.link(t.request));
  assert.equal(t.writes.length,0);
 }
});
test('no permite vincular siendo otro perfil ni con una revisión desactualizada',async()=>{
 let t=fixture({owner:'comercial1'});
 await assert.rejects(t.link(t.request),e=>e.code==='permission-denied');
 assert.equal(t.writes.length,0);
 t=fixture();t.request.data.rev=1;
 await assert.rejects(t.link(t.request),e=>e.code==='aborted');
 assert.equal(t.writes.length,0);
});
test('requiere cita válida inequívoca; no acepta franja solo por estar ocupada',async()=>{
 const t=fixture({eventList:[event,{...event,id:'calendar-event-two'}]});
 await assert.rejects(t.link(t.request),e=>e.code==='failed-precondition');
 assert.equal(t.writes.length,0);
});
test('la misma cita puede reintentarse de forma idempotente',async()=>{
 const t=fixture();
 const one=await t.link(t.request);assert.equal(one.alreadyLinked,false);
 const two=await t.link(t.request);assert.equal(two.alreadyLinked,true);
 assert.equal(t.writes.filter(x=>x[0]==='create').length,1);
});
test('el frontend recarga estado servidor sin escribir dos veces la reserva',()=>{
 const office=fs.readFileSync(path.join(__dirname,'../oficina-llamadas-obras-v2.js'),'utf8');
 const segment=office.slice(office.indexOf('if(view==="existingCalendar"){'),office.indexOf('if(view==="waiting"){'));
 assert.ok(segment.includes('window.vincularObraExistenteKonsor('));
 assert.ok(segment.includes('KonsorBridge?.refresh?.(true)'));
 assert.ok(!segment.includes('saveAndSync("comercial_custom_zones",savedZones)'));
 assert.ok(!segment.includes('elegirEquipoInstaladorKonsor('));
});
