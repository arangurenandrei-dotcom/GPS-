'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const m=require('../expediente-unico');
const src=fs.readFileSync(path.join(__dirname,'../cartera-antigua-ios.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('ID de ficha original es estable e independiente del sector',()=>{
 assert.equal(m.reference({clientUid:'f_123'}),'f_123');
 assert.equal(m.reference({clientUid:'f_123',zoneId:'sectorX'}),'f_123');
});
test('una ficha admite varias viviendas y no inventa superficie',()=>{
 const v=m.validateHomes([{id:'v1',direccion:'Vivienda A',m2Total:'80,5'},
 {id:'v2',direccion:'Vivienda B',m2Total:''}]);
 assert.equal(v.length,2);assert.equal(v[0].m2,75.5);assert.equal(v[1].m2,null);
 const full=m.homes({street:'Principal 1',m2:70,viviendas:v});
 assert.equal(full.length,3);assert.equal(full[0].m2,70);assert.equal(full[1].m2,75.5);
 assert.throws(()=>m.validateHomes([{id:'a',m2Total:5},{id:'a',m2Total:6}]),/duplicada/);
 assert.throws(()=>m.validateHomes([{id:'a',m2Total:-8}]),/inválida/);
});
test('cada planta revisa solo sus campos sin bloquear una captura inicial',()=>{
 const c={clientUid:'f_1',name:'Eva',phone:'600123456',street:'Calle Mayor 4',locality:'Marcilla'};
 assert.equal(m.complete(c,{town:'Marcilla'}).comercial,true);
 assert.equal(m.complete(c,{town:'Marcilla'}).tecnico,false);
 assert.deepEqual(m.missing(c,{town:'Marcilla'},'comercial'),[]);
 assert.equal(m.missing(c,{town:'Marcilla'},'tecnico')[0],'Medición vivienda 1');
});
test('tres entradas, pasos guiados y ficha original con guardado real',()=>{
 for(const q of ['Proceso guiado','Ficha completa','Volcar hoja de sector','Siguiente ›',
 'Guardar cambios','Guardar pendiente','window.openKonsorFichaOriginal','openSelectZoneToDump()'])
  assert.ok(src.includes(q),q);
 assert.ok(src.includes('await commit(data)'));
 assert.ok(src.includes('isSectorlessCapture:true'));
 assert.ok(src.includes('isSectorless(z)&&c.callStatus==="bloqueada"'));
 assert.match(app,/expediente-unico\.js\?v=1/);
});
test('editar sin sector no bloquea por defecto una ficha ya habilitada',()=>{
 assert.ok(src.includes(':(oldClient.callStatus||"bloqueada")'));
 assert.ok(src.includes('window.openKonsorClients=function()'));
 assert.ok(src.includes('["","Pendiente de respuesta"]'));
});
