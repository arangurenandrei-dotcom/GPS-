'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=x=>fs.readFileSync(path.join(root,x),'utf8');
const assistant=require('../app/core/asistente-operativo.js');
test('sin sectores con clientes pendientes, el inicio recomienda oficina',()=>{
 const r=assistant.recommend('comercial',{shift:{status:'working'},todayCount:0,old:0,
  waitingDump:0,totalClients:37,callsDue:33,bookedJobs:4});
 assert.equal(r.id,'oficina.llamar');
 assert.match(r.title,/33 clientes/);
 assert.match(r.description,/4 obras agendadas/);
 assert.match(read('inicio-ios.js'),/officeState\?\.\(\)/);
});
test('las fichas importadas y sin sector son clientes normales sin migración',()=>{
 const src=read('cartera-antigua-ios.js');
 assert.ok(src.includes('window.konsorIsHistoricalClient=()=>false'));
 assert.ok(src.includes('window.konsorIsHistoricalOnlySector=z=>'));
 assert.ok(src.includes('window.openKonsorClients=function(filter="pendientes")'));
 assert.match(src,/kha-crm-summary/);
 assert.ok(!src.includes('Organizar en Clientes antiguos',src.indexOf('function listScreen(')));
 const office=read('oficina-ios.js');
 assert.ok(!office.includes('c.importedLegacy||c.legacyReviewStatus'));
});
test('guiada y completa invocan el mismo formulario real',()=>{
 const office=read('oficina-ios.js'),client=read('cartera-antigua-ios.js');
 assert.ok(office.includes('openNewClient("guided")'));
 assert.ok(office.includes('openNewClient("full")'));
 assert.ok(client.includes('window.openKonsorNewClient=function()'));
 assert.ok(client.includes('window.openKonsorFichaOriginal=function(clientUid,onReturn)'));
});
test('el plan usa ambos equipos, grupos de municipio y vuelve a calcular tras llamadas',()=>{
 const js=read('oficina-llamadas-obras-v2.js');
 assert.ok(js.includes('for(const team of [2,3])'));
 assert.ok(js.includes('const usedSlots=new Set(),options=[],chosenTownByTeam=new Map()'));
 assert.ok(js.includes('if(returnToPlanner){returnToPlanner=false;plannedChoice=null;view="planner";draw();return;}'));
 assert.ok(js.includes('window.openKonsorCallPlanner=function()'));
 assert.ok(js.includes('consultarKonsorFecha(date)'));
 assert.ok(!js.includes('Number(a.team!==2)-Number(b.team!==2)'));
});
test('archivar un mensaje como CEO conserva auditoría y lo excluye de la cola',()=>{
 const backend=read('backend/plantas-konsor.js'),ui=read('mensajes-plantas.js');
 assert.ok(backend.includes("if(action==='archive')"));
 assert.ok(backend.includes("if(!me.owner)invalid("));
 assert.ok(backend.includes('archivedAt:now,archivedBy:me.uid'));
 assert.ok(backend.includes('if(d.archivedAt)continue'));
 assert.ok(ui.includes("'Archivar de todas las plantas'"));
 assert.ok(ui.includes('action:\'archive\''));
 assert.ok(ui.includes('const inspecting='));
});
test('prueba local de notificaciones no afirma recepción remota',()=>{
 const source=read('avisos-app.js');
 assert.ok(source.includes('Probar aviso de este dispositivo'));
 assert.ok(source.includes('reg.showNotification('));
 assert.ok(source.includes('no confirma la entrega de mensajes desde Firebase'));
});

test('el editor se puede interpretar como JavaScript, no contiene CSS multilinea invalido',()=>{
 const source=read('cartera-antigua-ios.js');
 assert.doesNotThrow(()=>new Function(source));
 assert.ok(source.includes('const CSS=\`'));
});
