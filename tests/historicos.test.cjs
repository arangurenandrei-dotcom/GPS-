const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {selectEvent}=require('../backend/historicos-core');
const {patch}=require('../backend/instalar-historicos.cjs');
const {install}=require('../backend/instalar-historicos.cjs');
const os=require('node:os');
const data={crmOrigenId:'EA-123',phone:'600123456',street:'Mayor 1',crmKonsorTown:'Pamplona',obraDate:'2026-11-20',obraTime:'09:00',obraEquipoInstalacion:2};
const event={id:'evento-1',etag:'etag-1',summary:'Equipo 2',description:'Teléfono: +34 600 123 456',location:'Mayor 1, Pamplona',start:{dateTime:'2026-11-20T09:00:00+01:00'},end:{dateTime:'2026-11-20T11:00:00+01:00'}};
test('matches one historical client by phone and full location',()=>assert.equal(selectEvent([event],data).eventId,event.id));
test('labelled external identity works without exposing full calendar to app',()=>{
 assert.equal(selectEvent([{...event,description:'ID Euro Aisla: EA-123',location:''}],data).eventId,event.id);
 assert.throws(()=>selectEvent([{...event,description:'Something EA-123',location:''}],data));
});
test('permite evento antiguo sin teléfono SOLO con nombre, dirección y municipio completos',()=>{
 const appointment={...event,summary:'Equipo 2 · Pamplona · Rosa',description:'Instalación de aislamiento'};
 const info={...data,name:'Rosa'};
 assert.equal(selectEvent([appointment],info).eventId,event.id);
 for(const patch of [
  {name:'María'},{street:'Mayor 10'},{crmKonsorTown:'Tudela'}
 ])assert.throws(()=>selectEvent([appointment],{...info,...patch}));
 // Si hay teléfono contradictorio, un nombre correcto nunca justifica el vínculo.
 assert.throws(()=>selectEvent([{...appointment,description:'Teléfono: 600 999 999'}],info));
 // Un evento sin nombre, dirección o teléfono nunca acredita identidad.
 assert.throws(()=>selectEvent([{...appointment,summary:'Equipo 2'}],info));
});
test('occupied slot alone never proves identity',()=>{
 for(const override of [{phone:'600111111'},{street:'Mayor 10'},{crmKonsorTown:'Tudela'}])assert.throws(()=>selectEvent([event],{...data,...override}));
});
test('rejects ambiguous, cancelled, transparent, moved and all-day events',()=>{
 assert.throws(()=>selectEvent([event,{...event,id:'second'}],data));
 for(const override of [{status:'cancelled'},{transparency:'transparent'},{start:{date:'2026-11-20'},end:{date:'2026-11-21'}},{summary:'Equipo 3'}])assert.throws(()=>selectEvent([{...event,...override}],data));
 assert.throws(()=>selectEvent([event],{...data,crmKonsorEventId:'old-event'}));
});
test('validates real dates and known team and slot',()=>{
 for(const override of [{obraDate:'2026-02-30'},{obraTime:'10:00'},{obraEquipoInstalacion:1}])assert.throws(()=>selectEvent([event],{...data,...override}));
});
function callable(profile,events=[event]){
 const calls=[];
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const db={doc:p=>({get:async()=>({data:()=>profile,exists:p.startsWith('usuarios/')})})};
 const google={auth:{GoogleAuth:class{}},calendar:()=>({events:{list:async opts=>{calls.push(opts);return {data:{items:events}};}}})};
 const sandbox={module:{exports:{}},require:name=>{
  if(name==='googleapis')return {google};
  if(name==='firebase-functions/v2/https')return {onCall:(opts,fn)=>fn,HttpsError};
  if(name==='firebase-admin/firestore')return {getFirestore:()=>db};
  if(name==='./calendario-konsor')return {CALENDAR_ID:'test-calendar'};
  if(name==='./historicos-core')return require('../backend/historicos-core');
  return require(name);
 }};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../backend/historicos-konsor.js'),'utf8'),sandbox);
 return {api:sandbox.module.exports,calls};
}
test('preview rejects anonymous, Mikel and commercial before reading Calendar',async()=>{
 for(const profile of [{estado:'aprobado',userKey:'jefe_mikel'},{estado:'aprobado',userKey:'comercial1'},{estado:'pendiente',userKey:'jefe'}]){
  const c=callable(profile);await assert.rejects(()=>c.api.verificarHistoricoKonsor({auth:{uid:'u'},data}),e=>e.code==='permission-denied');assert.equal(c.calls.length,0);
 }
 const c=callable({estado:'aprobado',userKey:'jefe'});await assert.rejects(()=>c.api.verificarHistoricoKonsor({data}),e=>e.code==='unauthenticated');assert.equal(c.calls.length,0);
});
test('approved Andrei preview reads Calendar and returns verified event identity',async()=>{
 const c=callable({estado:'aprobado',userKey:'jefe'});
 const r=await c.api.verificarHistoricoKonsor({auth:{uid:'u'},data});
 assert.equal(r.ok,true);assert.equal(r.eventId,event.id);assert.equal(c.calls.length,1);assert.equal(c.calls[0].calendarId,'test-calendar');assert.match(r.eventKey,/^[a-f0-9]{64}$/);
});
const fixture=`const { comprobarHueco } = require('./calendario-konsor');
async function commit(){
  const pendientes = new Map();
  for(const cambio of batch.changes){
    if (!mismaReserva) { void 0; }
  }
  for(const c of batch.changes){
      const data = c.datos;
  }
    for (const [path,c] of changes) if (c.col==='fichas'){ void 0; }
    for(const [ref,d] of reservations)tx.set(ref,d);
}`;
test('installer fails on unexpected source and is idempotent on patched source',()=>{
 assert.throws(()=>patch('unexpected source'));
 const s=patch(fixture);new vm.Script(s);assert.equal(patch(s),s);
 assert.ok(s.includes("requireAccess(userKey === 'jefe')"));assert.ok(s.includes('await verificarReservaHistorica(datos)'));
 assert.ok(s.indexOf('await tx.get(ref)')<s.indexOf('tx.create(ref,d)'));
});
async function claimTest(entries,existing=false){
 const s=patch(fixture),start=s.indexOf('    // Leer todas las reclamaciones'),end=s.indexOf("    for (const [path,c] of changes) if",start);
 const fn=new (Object.getPrototypeOf(async function(){}).constructor)('historicosVerificados','tx','db','next','now','uid','requireAccess','fail',s.slice(start,end)+'\nreturn historicalClaims;');
 const next=new Map([['fichas/f1',{teamId:'andrei',zonaId:'z1',datos:{crmKonsorTown:'Pamplona'}}],['fichas/f2',{teamId:'andrei',zonaId:'z1',datos:{crmKonsorTown:'Pamplona'}}],['zonas/z1',{datos:{town:'Pamplona'}}]]);
 const tx={get:async()=>({data:()=>existing?{fichaId:'someone'}:undefined})};
 return fn(new Map(entries),tx,{doc:p=>p},next,123,'uid',ok=>{if(!ok)throw Error('no access');},(code,msg)=>{throw Error(code+': '+msg);});
}
test('transaction prepares a single claim; same event in same batch or registry is rejected',async()=>{
 const v={eventKey:'key',eventId:'event'};
 assert.equal((await claimTest([['f1',v]])).length,1);
 await assert.rejects(()=>claimTest([['f1',v],['f2',v]]),/already-exists/);
 await assert.rejects(()=>claimTest([['f1',v]],true),/already-exists/);
});
test('installer validates sources before write, backs up and supports rerun',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'historicos-install-'));
 try{
  const originals={'persistencia.js':fixture,'index.js':"'use strict';",'calendario-konsor.js':"const CALENDAR_ID='test';function comprobarHueco(){}\nmodule.exports = {comprobarHueco};",'operaciones-v2.js':"function edit(changes){const {\n        obraAgendadaEn,\n        ...camposSeguros\n}=changes;}"};
  for(const [n,s] of Object.entries(originals))fs.writeFileSync(path.join(dir,n),s);
  install(dir);const first=fs.readFileSync(path.join(dir,'persistencia.js'),'utf8');
  assert.ok(first.includes('HISTORICOS_KONSOR_V1'));
  assert.ok(fs.readdirSync(dir).some(n=>n.startsWith('.historicos-backup-')));
  assert.ok(fs.readFileSync(path.join(dir,'operaciones-v2.js'),'utf8').includes('crmKonsorEventId'));
  install(dir);assert.equal(fs.readFileSync(path.join(dir,'persistencia.js'),'utf8'),first);
 }finally{fs.rmSync(dir,{recursive:true});}
});
