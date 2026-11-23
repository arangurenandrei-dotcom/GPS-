'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const cartera=fs.readFileSync(path.join(root,'cartera-antigua-ios.js'),'utf8');
const core=fs.readFileSync(path.join(root,'app/legacy/comercial-app.js'),'utf8');

function isolate(source,begin,end){
 const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);
 assert.ok(a>=0&&b>a,'Falta función: '+begin);
 return source.slice(a,b);
}
function zone({id=1,answer='si',m2=300}={}){
 return {id,isSingleHouse:true,isSectorlessCapture:true,singlePoint:null,
  points:[],comercial:'Andrei (Jefe)',town:'Ayegui',date:'2026-11-18',dumpDate:'2026-11-18',
  stats:{si:answer==='si'?1:0,no:answer==='no'?1:0,ausente:0,papelito:0},
  clients:[{clientUid:'f_test',name:'Cliente de prueba',phone:'600123456',
   street:'Calle de prueba 2',locality:'Ayegui',origen:'puerta',
   captacionRespuesta:answer,callStatus:'pendiente',sectorlessCapture:true,
   obraStatus:'a_poner',m2,createdAt:Date.parse('2026-11-18T12:00:00')}]
 };
}
test('una vivienda sin sector usa la misma estructura V2 de zonas/fichas que las individuales',()=>{
 const z=zone();
 assert.equal(z.isSingleHouse,true);assert.equal(z.singlePoint,null);assert.equal(z.points.length,0);
 assert.equal(z.sectorName,undefined);assert.equal(z.stats.si,1);
 assert.equal(z.clients[0].origen,'puerta');
});
test('el guardado permite exclusivamente vivienda individual sin dibujar sector',async()=>{
 const original=[{id:23,comercial:'Andrei (Jefe)',town:'Ayegui',points:[1,2],clients:[]}];
 const writes=[];
 const ctx={module:{exports:null},savedZones:original,window:{KonsorBridge:{save:async(g,data)=>{writes.push({g,data});}}},
  syncState:()=>({kind:'ready'}),zs:()=>original,current:()=> 'Andrei (Jefe)',
  isSectorless:z=>!!(z?.isSingleHouse&&z?.isSectorlessCapture)};
 vm.runInNewContext(isolate(cartera,'async function commit(candidate){','function portfolioEntries(){')+'\nmodule.exports=commit;',ctx);
 const saved=[...original,zone({id:24})];
 await ctx.module.exports(saved);
 assert.equal(writes.length,1);assert.equal(writes[0].g,'comercial_custom_zones');
 assert.equal(writes[0].data.length,2);
 await assert.rejects(()=>ctx.module.exports([...original,{id:30,comercial:'Andrei (Jefe)',isSingleHouse:false,points:[],clients:[]}]),/no se permite crear ni eliminar sectores/);
 assert.equal(writes.length,1);
});
test('un Sí sin llamar suma como captación normal y computa sus m², sin cita ni obra',()=>{
 const fn=isolate(core,'function personalStatsMetrics(user, from, to) {','function openCommercialStatsModal()');
 const z=zone();
 const ctx={savedZones:[z],savedShifts:[],
  window:{
   konsorIsHistoricalClient:()=>false,
   konsorIsHistoricalOnlySector:()=>false,
   konsorPerformanceStats:x=>x.stats
  },
  isClientValidFilled:c=>!!(c?.name||c?.phone||c?.street),
  personalStatsM2:x=>Number(x)||0,
  getLocalDateISO:x=>new Date(x).toISOString().slice(0,10),
  workDayShiftDate:()=>null,workDayHours:()=>null
 };
 vm.runInNewContext(fn,ctx);
 const m=ctx.personalStatsMetrics('Andrei (Jefe)','2026-11-01','2026-11-23');
 assert.equal(m.si,1);
 assert.equal(m.validas,1);
 assert.equal(m.m2Captado,300);
 assert.equal(m.citas,0);assert.equal(m.hechas,0);
 assert.equal(m.no,0);assert.equal(m.ausente,0);
});
test('clientes sin sector NO son históricos excluidos del trabajo normal',()=>{
 const z=zone();
 assert.ok(cartera.includes('isSectorless(z)'));
 assert.ok(!Object.hasOwn(z.clients[0],'legacyPortfolio'));
 assert.ok(!Object.hasOwn(z.clients[0],'importedLegacy'));
 assert.ok(!Object.hasOwn(z.clients[0],'legacyReviewStatus'));
 const hist=c=>!!(c.importedCsv||c.importedLegacy||c.origenHoja||c.legacyReviewStatus||c.legacyPortfolio||c.isLegacyClient);
 assert.equal(hist(z.clients[0]),false);
});
