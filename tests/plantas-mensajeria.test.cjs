'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'..'),source=fs.readFileSync(path.join(dir,'backend/plantas-konsor.js'),'utf8');
const client=fs.readFileSync(path.join(dir,'mensajes-plantas.js'),'utf8');
const index=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const calls={};
const stub={
 'firebase-functions/v2/https':{onCall:(_cfg,fn)=>fn,HttpsError:class extends Error {constructor(code,msg){super(msg);this.code=code;}}},
 'firebase-functions/v2/firestore':{onDocumentWritten:(_cfg,fn)=>fn},
 'firebase-functions/v2/scheduler':{onSchedule:(_cfg,fn)=>fn},
 'firebase-admin/firestore':{getFirestore:()=>({doc:()=>({get:async()=>({data:()=>({estado:'aprobado',userKey:'jefe'})})})})},
 'node:crypto':require('node:crypto')
};
const context={module:{exports:{}},require:name=>stub[name]??require(name),Date,Number,Set,Map,Promise};
vm.runInNewContext(source,context,{filename:'plantas-konsor.js'});
const api=context.module.exports.__test;
test('backend define canales autenticados y funciones de automatización',()=>{
 const server=context.module.exports;
 for(const name of ['crearMensajePlantaKonsor','listarMensajesPlantaKonsor','actualizarMensajePlantaKonsor',
  'configurarMargenesPlantaKonsor','automatizarFichaPlantasKonsor','escalarPendientesPlantasKonsor'])
  assert.equal(typeof server[name],'function',name);
 assert.equal(api.asPlant('jefe'),'ceo');
 assert.equal(api.asPlant('comercial2'),'comercial');
 assert.equal(api.asPlant('oficina1'),'oficina');
 assert.equal(api.asPlant('tecnicos1'),'tecnicos');
 assert.equal(api.asPlant('jefe_mikel'),null);
});
test('CEO no recibe notificaciones ordinarias; sí críticas y tareas enviadas',()=>{
 const ordinary={teamId:'andrei',to:'ceo',from:'tecnicos',priority:'normal'};
 assert.equal(api.viewAllowed('ceo',ordinary),false);
 assert.equal(api.viewAllowed('ceo',{...ordinary,priority:'critical'}),true);
 assert.equal(api.viewAllowed('ceo',{...ordinary,to:'oficina',from:'ceo'}),true);
 assert.equal(api.viewAllowed('comercial',{...ordinary,to:'comercial'}),true);
 assert.equal(api.viewAllowed('oficina',{...ordinary,to:'comercial'}),false);
 assert.equal(api.viewAllowed('ceo',{...ordinary,teamId:'mikel',priority:'critical'}),false);
});
test('las reglas de margen no permiten valores incoherentes',()=>{
 const vals={ackHours:4,criticalOverdueHours:24,marginMinPct:20,marginWarningPct:25};
 assert.equal(api.validateLimits(vals).marginMinPct,20);
 assert.throws(()=>api.validateLimits({...vals,marginMinPct:40}),/margen mínimo/);
 assert.throws(()=>api.validateLimits({...vals,ackHours:0}),/inválido/);
});
test('agendar, aplazar y finalizar generan eventos destinados a la planta apropiada',()=>{
 const booking={obraStatus:'agendada',obraDate:'2026-12-01',obraTime:'09:00',obraEquipoInstalacion:2,street:'Mayor 1'};
 const a=api.classify({},booking,'f_123');
 assert.equal(a.length,2);
 assert.ok(a.some(x=>x.to==='oficina'&&x.title.includes('expediente')));
 assert.ok(a.some(x=>x.to==='tecnicos'));
 assert.equal(api.classify(booking,booking,'f_123').length,0);
 const incident=api.classify(booking,{...booking,obraStatus:'aplazada'},'f_123');
 assert.ok(incident.some(x=>x.to==='oficina'));
 assert.ok(incident.some(x=>x.to==='comercial'));
 const complete=api.classify(booking,{...booking,obraStatus:'realizada'},'f_123');
 assert.equal(complete[0].to,'oficina');
 assert.equal(api.autoId('f_123',a[0]),api.autoId('f_123',a[0]));
});
test('la UI conecta los módulos sin alterar el flujo comercial',()=>{
 assert.ok(index.includes('mensajes-plantas.js?v=2'));
 assert.ok(index.indexOf('mensajes-plantas.js')<index.indexOf('designer-role-preview.js'));
 assert.ok(client.includes('listarMensajesPlantaKonsor'));
 assert.ok(client.includes('actualizarMensajePlantaKonsor'));
 assert.ok(client.includes('configurarMargenesPlantaKonsor'));
});

test('los indicadores están cargados antes de mensajes y de las vistas y usan tareas reales',()=>{
 const home=fs.readFileSync(path.join(dir,'inicio-ios.js'),'utf8');
 const designer=fs.readFileSync(path.join(dir,'designer-role-preview.js'),'utf8');
 const direction=fs.readFileSync(path.join(dir,'direccion-hub-ios.js'),'utf8');
 const alerts=fs.readFileSync(path.join(dir,'avisos-app.js'),'utf8');
 const styles=fs.readFileSync(path.join(dir,'indicadores-plantas.css'),'utf8');
 assert.ok(index.indexOf('indicadores-plantas.js')<index.indexOf('mensajes-plantas.js'));
 assert.ok(index.indexOf('indicadores-plantas.js')<index.indexOf('inicio-ios.js'));
 assert.ok(home.includes('tile(grid,"Mensajes entre plantas"'));
 assert.ok(!home.includes('cnv-plant-messages-link'));
 assert.ok(designer.includes('const inbox=actionTile(grid,"Mensajes entre plantas"'));
 assert.ok(direction.includes('const messages=tile(grid,"Mensajes entre plantas"'));
 assert.ok(alerts.includes('KonsorIndicators?.setGeneral?.(n)'));
 assert.ok(styles.includes('data-konsor-level="blue"'));
 assert.ok(styles.includes('data-konsor-level="yellow"'));
 assert.ok(styles.includes('data-konsor-level="red"'));
});
test('señaliza solamente tareas entrantes sin confirmar y combina avisos por cantidad',()=>{
 const script=fs.readFileSync(path.join(dir,'indicadores-plantas.js'),'utf8');
 const listeners={};
 const win={addEventListener:()=>{},setInterval:()=>{},auth:{currentUser:{uid:'uid1'}},
  KonsorBridge:{state:()=>({connected:true})}};
 const doc={addEventListener:()=>{},hidden:false};
 vm.runInNewContext(script,{window:win,document:doc,Date,console});
 const indicator=win.KonsorIndicators;
 const all=[
  {to:'comercial',from:'oficina',status:'pending',priority:'normal'},
  {to:'oficina',from:'comercial',status:'pending',priority:'critical'},
  {to:'comercial',from:'oficina',status:'acknowledged',priority:'critical'},
  {to:'comercial',from:'oficina',status:'completed',priority:'important'}
 ];
 assert.equal(indicator.severity(all,'comercial').level,'blue');
 assert.equal(indicator.severity(all,'comercial').count,1);
 assert.equal(indicator.severity(all,'oficina').level,'red');
 assert.equal(indicator.severity(all,'ceo').level,'none');
 assert.equal(indicator.bellLevel(0),'none');
 assert.equal(indicator.bellLevel(1),'blue');
 assert.equal(indicator.bellLevel(3),'blue');
 assert.equal(indicator.bellLevel(4),'yellow');
 assert.equal(indicator.bellLevel(7),'yellow');
 assert.equal(indicator.bellLevel(8),'red');
 assert.equal(indicator.bellLevel(1,true),'red');
});

test('responder confirma lectura, conserva hilo y quitar archiva solo para su usuario',async()=>{
 let task={teamId:'andrei',from:'ceo',to:'oficina',title:'Revisar expediente',detail:'',
  status:'pending',priority:'normal',createdAt:100,updatedAt:100,acknowledgedAt:null,
  completedAt:null,replies:[],hiddenFor:[]};
 let profile={estado:'aprobado',userKey:'oficina1'};
 const db={
  doc:path=>({path,get:async()=>({data:()=>profile})}),
  runTransaction:async job=>job({
   get:async()=>({data:()=>({...task})}),
   update:(_ref,patch)=>{task={...task,...patch};}
  }),
  collection:()=>({
   where:()=>({limit:()=>({get:async()=>({docs:[{id:'t_task0001',data:()=>task}]})})})
  })
 };
 const stubbed={
  ...stub,'firebase-admin/firestore':{getFirestore:()=>db}
 };
 const ctx={module:{exports:{}},require:name=>stubbed[name]??require(name),Date,Number,Set,Map,Promise};
 vm.runInNewContext(source,ctx);
 const service=ctx.module.exports.__test,auth={uid:'oficina-uid'};
 let result=await service.change({auth,data:{id:'t_task0001',action:'reply',text:'Revisado, me encargo.'}});
 assert.equal(result.item.replies.length,1);
 assert.equal(result.item.replies[0].from,'oficina');
 assert.equal(result.item.status,'acknowledged');
 assert.ok(result.item.acknowledgedAt);
 result=await service.change({auth,data:{id:'t_task0001',action:'dismiss'}});
 assert.ok(task.hiddenFor.includes(auth.uid));
 assert.equal(result.item.replies[0].text,'Revisado, me encargo.');
 const inbox=await service.list({auth,data:{}});
 assert.equal(inbox.items.length,0,'La tarea archivada no debe reaparecer al recargar');
 // El emisor conserva la tarea en su propia bandeja.
 profile={estado:'aprobado',userKey:'jefe'};
 const sender=await service.list({auth:{uid:'ceo-uid'},data:{plant:'ceo'}});
 assert.equal(sender.items.length,1);
 assert.equal(sender.items[0].replies[0].text,'Revisado, me encargo.');
});
test('responder exige participación y no permite falsear el autor',async()=>{
 let profile={estado:'aprobado',userKey:'comercial1'};
 const task={teamId:'andrei',from:'ceo',to:'oficina',status:'pending',priority:'normal'};
 const db={
  doc:path=>({path,get:async()=>({data:()=>profile})}),
  runTransaction:async job=>job({get:async()=>({data:()=>task}),update:()=>{throw Error('No debe escribir')}})
 };
 const ctx={module:{exports:{}},require:name=>name==='firebase-admin/firestore'?{getFirestore:()=>db}:stub[name]??require(name),Date,Number,Set,Map,Promise};
 vm.runInNewContext(source,ctx);
 await assert.rejects(
  ctx.module.exports.__test.change({auth:{uid:'comercial-uid'},data:{id:'t_task0001',action:'reply',text:'Suplantación'}}),
  /No tienes acceso/
 );
});
