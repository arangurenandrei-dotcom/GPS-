'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../app/legacy/comercial-app.js'),'utf8');
const start=code.indexOf('function personalStatsMetrics(user, from, to) {');
const end=code.indexOf('function openCommercialStatsModal()',start);
if(start===-1||end===-1)throw Error('No se encontró la función de resultados');
const fn=code.slice(start,end);
const historic=c=>!!(c.legacyPortfolio||c.importedLegacy||c.legacyReviewStatus);
function metrics(zones,from='2026-11-01',to='2026-11-30'){
 const context={
  savedZones:zones,savedShifts:[],
  window:{
   konsorIsHistoricalClient:historic,
   konsorIsHistoricalOnlySector:z=>!!z.clients?.length&&z.clients.every(historic),
   konsorPerformanceStats:z=>{
    const st={...z.stats};
    for(const c of z.clients||[])if(historic(c)&&['si','no','ausente','papelito'].includes(c.captacionRespuesta))
      st[c.captacionRespuesta]=Math.max(0,(st[c.captacionRespuesta]||0)-1);
    return st;
   }
  },
  isClientValidFilled:c=>!!(c?.name||c?.phone||c?.street),
  personalStatsM2:v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?Math.max(0,n):0;},
  getLocalDateISO:d=>new Date(d).toISOString().slice(0,10),
  workDayShiftDate:()=>null,workDayHours:()=>null
 };
 vm.runInNewContext(fn,context);
 return context.personalStatsMetrics('Andrei (Jefe)',from,to);
}
test('cliente marcado como Sí, sin llamar y con datos técnicos completos cuenta como captación normal',()=>{
 const z=[{id:'s1',comercial:'Andrei (Jefe)',town:'Ayegui',date:'2026-11-18',
  stats:{si:1,no:0,ausente:0,papelito:0},
  clients:[{name:'Contacto A',street:'Calle 2',captacionRespuesta:'si',callStatus:'pendiente',
    legacyPortfolio:true,createdAt:Date.parse('2026-11-18'),m2:300,obraStatus:'a_poner'}]}];
 const result=metrics(z);
 assert.equal(result.si,1);assert.equal(result.validas,1);assert.equal(result.m2Captado,300);
 assert.equal(result.citas,0);assert.equal(result.hechas,0);
});
test('clientes antiguos Sí sin datos técnicos o llamada cuentan, pero no inventan m²',()=>{
 const z=[{id:'s1',comercial:'Andrei (Jefe)',town:'Ayegui',date:'2026-11-18',
  stats:{si:2},clients:[
   {name:'Contacto A',legacyPortfolio:true,captacionRespuesta:'si',callStatus:'bloqueada',m2:null},
   {name:'Contacto B',legacyPortfolio:true,captacionRespuesta:'si',callStatus:'pendiente',m2Total:'85'}
  ]}];
 const m=metrics(z);
 assert.equal(m.si,2);assert.equal(m.validas,2);assert.equal(m.sinM2,1);assert.equal(m.m2Captado,80);
});
test('las respuestas históricas no duplican estadísticas agregadas del sector',()=>{
 const z=[{id:'s1',comercial:'Andrei (Jefe)',town:'Ayegui',date:'2026-11-18',
  stats:{si:3,no:2,ausente:5,papelito:3},clients:[
   {name:'Contacto A',legacyPortfolio:true,captacionRespuesta:'si',m2:60},
   {name:'Contacto B',legacyPortfolio:true,captacionRespuesta:'si',m2:70},
   {name:'Contacto C',legacyPortfolio:false,captacionRespuesta:'si',m2:80}
  ]}];
 const m=metrics(z);
 assert.equal(m.si,3);assert.equal(m.no,2);assert.equal(m.ausente,5);assert.equal(m.papelito,3);
 assert.equal(m.validas,3);assert.equal(m.m2Captado,210);
});
test('no suma clientes ajenos ni respuestas diferentes como captaciones Sí',()=>{
 const z=[
  {id:'s1',comercial:'Andrei (Jefe)',town:'Ayegui',date:'2026-11-18',stats:{si:1,no:1},clients:[
   {name:'Captación positiva',legacyPortfolio:true,captacionRespuesta:'si',m2:78},
   {name:'Rechazo',legacyPortfolio:true,captacionRespuesta:'no',m2:55}
  ]},
  {id:'s2',comercial:'Comercial 1',town:'Ayegui',date:'2026-11-18',stats:{si:1},clients:[
   {name:'Otro asesor',legacyPortfolio:true,captacionRespuesta:'si',m2:70}
  ]}
 ];
 const m=metrics(z);
 assert.equal(m.si,1);assert.equal(m.no,1);assert.equal(m.validas,1);assert.equal(m.m2Captado,78);
});
