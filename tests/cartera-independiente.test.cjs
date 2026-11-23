'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function setup(){
 const docs=new Map([
  ['usuarios/a',{estado:'aprobado',userKey:'jefe',nombre:'Andrei'}],
  ['usuarios/worker',{estado:'aprobado',userKey:'comercial1',nombre:'Comercial 1'}],
  ['usuarios/stranger',{estado:'aprobado',userKey:'comercial2',nombre:'Comercial 2'}],
  ['usuarios/m',{estado:'aprobado',userKey:'jefe_mikel',nombre:'Mikel'}],
  ['usuarios/rejected',{estado:'pendiente',userKey:'jefe'}]
 ]);
 const snap=p=>({id:p.split('/').pop(),exists:docs.has(p),data:()=>docs.get(p)});
 const ref=p=>({path:p,id:p.split('/').pop(),get:async()=>snap(p)});
 const db={
  doc:p=>ref(p),
  collection:name=>({
   doc:id=>ref(name+'/'+id),
   where:(field,op,val)=>{
    assert.equal(op,'==');
    return {limit:n=>({get:async()=>{
     const arr=[...docs.keys()].filter(p=>p.startsWith(name+'/')&&p.split('/').length===2&&docs.get(p)[field]===val).slice(0,n);
     return {size:arr.length,docs:arr.map(snap)};
    }})};
   }
  }),
  runTransaction:async(fn)=>{
   const tx={
    get:async r=>snap(r.path),
    update:(r,d)=>docs.set(r.path,{...docs.get(r.path),...d}),
    create:(r,d)=>{if(docs.has(r.path))throw Error('already exists');docs.set(r.path,{...d});},
    set:(r,d)=>docs.set(r.path,{...d}),
    delete:r=>docs.delete(r.path)
   };
   return fn(tx);
  }
 };
 class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const mod={exports:{}};
 const sandbox={module:mod,require(name){
  if(name==='firebase-functions/v2/https')return {onCall:(_options,fn)=>fn,HttpsError};
  if(name==='firebase-admin/firestore')return {getFirestore:()=>db};
  return require(name);
 },Date,Set,Map,Number,String,Array,Object,RegExp};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../backend/cartera-independiente.js'),'utf8'),sandbox);
 return {api:mod.exports,docs};
}
const request=(uid,data={})=>({auth:uid?{uid}:null,data});
const client=(id='h_11111111-2222-4333-8444-555555555555',overrides={})=>({
 id,locality:'Ayegui',street:'Calle Nueva 2',name:'Prueba',phone:'600123456',captacionRespuesta:'si',ready:true,...overrides
});
test('clientes antiguos: sin sesión ni perfil aprobado no hay acceso',async()=>{
 const {api}=setup();
 await assert.rejects(()=>api.listarClientesAntiguos(request(null)),e=>e.code==='unauthenticated');
 await assert.rejects(()=>api.guardarClienteAntiguo(request('rejected',client())),e=>e.code==='permission-denied');
});
test('alta de cliente antiguo independiente: basta identidad, teléfono y dirección',async()=>{
 const {api,docs}=setup(),payload=client();
 const first=await api.guardarClienteAntiguo(request('a',payload));
 assert.equal(first.ok,true);
 assert.equal(first.registro.legacyReviewStatus,'lista');
 assert.equal(first.registro.callStatus,'pendiente');
 assert.equal(first.registro.m2,null);
 assert.equal(first.registro.cteZone,'');
 assert.equal(first.registro.fingerprintKey.length,64);
 const all=await api.listarClientesAntiguos(request('a'));
 assert.equal(all.rows.length,1);
 assert.equal(all.rows[0].locality,'Ayegui');
 assert.equal([...docs.keys()].filter(p=>p.startsWith('zonas/')).length,0);
 const retry=await api.guardarClienteAntiguo(request('a',payload));
 assert.equal(retry.registro.rev,1);
 await assert.rejects(()=>api.guardarClienteAntiguo(request('a',client('h_00000000-2222-4333-8444-555555555555'))),e=>e.code==='already-exists');
});
test('pendiente incompleto se guarda pero no se habilita para llamadas',async()=>{
 const {api}=setup();
 const draft=client(undefined,{street:'',phone:'',ready:false});
 const result=await api.guardarClienteAntiguo(request('worker',draft));
 assert.equal(result.registro.legacyReviewStatus,'pendiente');
 assert.equal(result.registro.callStatus,'bloqueada');
 await assert.rejects(()=>api.guardarClienteAntiguo(request('worker',{...draft,ready:true,rev:1})),e=>e.code==='failed-precondition');
});
test('permisos: no se mezclan equipos ni comerciales del mismo equipo',async()=>{
 const {api}=setup();
 await api.guardarClienteAntiguo(request('worker',client()));
 assert.equal((await api.listarClientesAntiguos(request('stranger'))).rows.length,0);
 assert.equal((await api.listarClientesAntiguos(request('a'))).rows.length,1);
 assert.equal((await api.listarClientesAntiguos(request('m'))).rows.length,0);
 await assert.rejects(()=>api.guardarClienteAntiguo(request('stranger',{...client(),rev:1})),e=>e.code==='permission-denied');
});
test('una llamada requiere ficha lista, revisión vigente y se audita',async()=>{
 const {api}=setup(),id=client().id;
 await api.guardarClienteAntiguo(request('worker',client()));
 await assert.rejects(()=>api.actualizarLlamadaClienteAntiguo(request('stranger',{id,rev:1,status:'ya_llamado'})),e=>e.code==='permission-denied');
 await assert.rejects(()=>api.actualizarLlamadaClienteAntiguo(request('worker',{id,rev:0,status:'ya_llamado'})),e=>e.code==='aborted');
 const result=await api.actualizarLlamadaClienteAntiguo(request('worker',{id,rev:1,status:'ya_llamado'}));
 assert.equal(result.registro.callStatus,'ya_llamado');
 assert.equal(result.registro.rev,2);
 assert.equal(result.registro.callLog.length,1);
 await assert.rejects(()=>api.actualizarLlamadaClienteAntiguo(request('worker',{id,rev:2,status:'inventado'})),e=>e.code==='invalid-argument');
});
