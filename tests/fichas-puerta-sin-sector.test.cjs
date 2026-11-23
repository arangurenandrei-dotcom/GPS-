'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../cartera-antigua-ios.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../app/legacy/comercial-app.js'),'utf8');

function fixture(){
 const stored=[],window={KonsorBridge:{state:()=>({connected:true,authenticated:true,pending:0,failed:false}),
   busy:false,save:async(name,rows)=>stored.push({name,rows})}};
 const sandbox={window,currentUserName:'Andrei (Jefe)',currentUserRole:'jefe',savedZones:[],
  crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},
  document:{},console};
 const injected=source.replace('window.openKonsorLegacyPortfolio=function(){',
  'window.__testCommit=commit;window.__testEntries=portfolioEntries;window.__testReady=validateReady;window.openKonsorLegacyPortfolio=function(){');
 assert.notEqual(injected,source);
 vm.runInNewContext(injected,sandbox);
 return {sandbox,window,stored};
}
function house(){
 return {id:'un_11111111-1111-4111-8111-111111111111',town:'Ayegui',date:'2026-11-18',
  dumpDate:'2026-11-18',comercial:'Andrei (Jefe)',sectorName:'Vivienda sin sector · Mayor 2',
  isSingleHouse:true,unassignedSector:true,singlePoint:null,points:[],stats:{no:0,si:1,ausente:0,papelito:0},
  clients:[{clientUid:'f_11111111-1111-4111-8111-111111111111',captacionSinSector:true,
    origen:'puerta',name:'Cliente',phone:'600000000',locality:'Ayegui',street:'Mayor 2',
    captacionRespuesta:'si',callStatus:'pendiente',m2:85}]};
}
test('alta sin sector usa mismo grupo Firebase y permite guardar ficha única sin coordenadas',async()=>{
 const {window,stored,sandbox}=fixture();const h=house();
 await window.__testCommit([h]);
 assert.equal(stored.length,1);
 assert.equal(stored[0].name,'comercial_custom_zones');
 assert.equal(stored[0].rows[0].points.length,0);
 assert.equal(stored[0].rows[0].isSingleHouse,true);
 assert.equal(stored[0].rows[0].singlePoint,null);
 assert.equal(sandbox.savedZones.length,1);
 assert.equal(window.__testEntries().length,1);
 assert.equal(window.konsorIsHistoricalClient(h.clients[0]),false);
 assert.equal(window.konsorPerformanceStats(h).si,1);
});
test('sin sector no puede crear un sector real o mezclar zonas en alta',async()=>{
 const {window}=fixture();
 await assert.rejects(()=>window.__testCommit([{...house(),isSingleHouse:false}]),/no es una vivienda/);
 await assert.rejects(()=>window.__testCommit([{...house(),points:[[1,2]]}]),/no es una vivienda/);
 await assert.rejects(()=>window.__testCommit([house(),{...house(),id:'otro'}]),/otra(s)? fichas|otras fichas|otras fichas o zonas|alteraría/);
});
test('una ficha marcada Sí y sin llamada es captación normal, técnica pendiente',()=>{
 const {window}=fixture();
 const candidate={name:'Cliente',phone:'600000000',street:'Mayor 2',locality:'Ayegui',captacionRespuesta:'si',
  m2Total:'',buildYear:'',cteZone:'',postalCode:''};
 assert.equal(window.__testReady(candidate).length,0);
 assert.equal(window.__testReady({...candidate,phone:'600'}).length,1);
 assert.equal(window.__testReady({...candidate,captacionRespuesta:'no'}).length,1);
 assert.ok(app.includes('window.konsorOpenFullUnassignedClient = function(clientUid)'));
 assert.ok(app.includes('void openSingleHouseModal(null,null,zi)'));
});
test('el motor sigue separando sector territorial de vivienda individual sin dibujo',()=>{
 const territory=fs.readFileSync(path.join(__dirname,'../territorio-ios.js'),'utf8');
 assert.ok(territory.includes('z.isSingleHouse'));
 const bridge=fs.readFileSync(path.join(__dirname,'../konsor-v2-bridge.js'),'utf8');
 assert.ok(bridge.includes("add('fichas',clientUid,fields,{zona:String(z.id),owner:keyFor(z.comercial),orden})"));
});
