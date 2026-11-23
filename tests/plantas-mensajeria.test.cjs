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
 assert.ok(index.includes('mensajes-plantas.js?v=1'));
 assert.ok(index.indexOf('mensajes-plantas.js')<index.indexOf('designer-role-preview.js'));
 assert.ok(client.includes('listarMensajesPlantaKonsor'));
 assert.ok(client.includes('actualizarMensajePlantaKonsor'));
 assert.ok(client.includes('configurarMargenesPlantaKonsor'));
});
