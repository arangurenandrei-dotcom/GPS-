'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../resultados-cartera.js'),'utf8'),context);
const {summary,area,isUncalled}=context.window.KonsorPortfolioResults;

test('clientes antiguos sin llamar cuentan metros aunque nunca se hayan llamado',()=>{
 const zones=[
  {id:'s1',town:'Ayegui',comercial:'Andrei (Jefe)',stats:{si:0,no:2,ausente:5,papelito:3},clients:[
   {clientUid:'c1',name:'Cliente A',street:'Calle 1',locality:'Ayegui',m2:300,legacyPortfolio:true,legacyReviewStatus:'lista',callStatus:'pendiente'},
   {clientUid:'c2',name:'Cliente B',street:'Calle 2',locality:'Ayegui',m2Total:85,importedLegacy:true,legacyReviewStatus:'pendiente',callStatus:'bloqueada'},
   {clientUid:'new',street:'Calle 3',m2:100,callStatus:'pendiente'}
  ]},
  {id:'s2',town:'Pamplona',comercial:'Comercial 1',clients:[
   {clientUid:'x',m2:290,legacyPortfolio:true,callStatus:'pendiente'}
  ]}
 ];
 const result=summary(zones,['Andrei (Jefe)'],[],{uid:'andrei'});
 assert.equal(result.total,2);
 assert.equal(result.sinLlamar,2);
 assert.equal(result.m2SinLlamar,380);
 assert.equal(result.m2Total,380);
 assert.equal(result.porCompletar,1);
 assert.equal(result.towns[0].name,'Ayegui');
 assert.equal(result.towns[0].m2,380);
});
test('un cliente ya llamado sigue inventariado, pero sale de metros sin llamar',()=>{
 const zones=[{id:'s',comercial:'Andrei (Jefe)',town:'Ayegui',clients:[
  {clientUid:'c1',m2:74,legacyPortfolio:true,callStatus:'ya_llamado',legacyReviewStatus:'lista'},
  {clientUid:'c2',m2:120,legacyPortfolio:true,callStatus:'pendiente',obraStatus:'agendada',legacyReviewStatus:'lista'}
 ]}];
 const r=summary(zones,['Andrei (Jefe)'],[],{uid:'1'});
 assert.equal(r.total,2);assert.equal(r.sinLlamar,0);assert.equal(r.m2Total,194);assert.equal(r.m2SinLlamar,0);
 assert.equal(isUncalled({callStatus:'esperando_confirmacion'}),false);
});
test('colección independiente se suma con permisos visibles y sin dobles conteos',()=>{
 const rows=[
  {id:'h_11111111-1111-4111-8111-111111111111',locality:'Ayegui',ownerUid:'a',m2:65,callStatus:'pendiente',legacyReviewStatus:'lista'},
  {id:'h_22222222-2222-4222-8222-222222222222',locality:'Ayegui',ownerUid:'b',m2Total:105,callStatus:'pendiente',legacyReviewStatus:'lista'},
  {id:'h_22222222-2222-4222-8222-222222222222',locality:'Ayegui',ownerUid:'b',m2Total:105,callStatus:'pendiente',legacyReviewStatus:'lista'}
 ];
 const mine=summary([],['Andrei (Jefe)'],rows,{uid:'a'});
 assert.equal(mine.total,1);assert.equal(mine.m2SinLlamar,65);
 const team=summary([],['Andrei (Jefe)','Comercial 1'],rows,{team:true,uid:'a'});
 assert.equal(team.total,2);assert.equal(team.m2SinLlamar,165);
});
test('fichas sin metros no reciben estimación inventada',()=>{
 const zones=[{id:1,town:'Ayegui',comercial:'Andrei (Jefe)',clients:[
  {clientUid:'1',legacyPortfolio:true,callStatus:'pendiente',m2:null},
  {clientUid:'2',legacyPortfolio:true,callStatus:'pendiente',m2:'',m2Total:''},
  {clientUid:'3',legacyPortfolio:true,callStatus:'pendiente',m2Total:75}
 ]}];
 const s=summary(zones,['Andrei (Jefe)'],[],{uid:'u'});
 assert.equal(s.total,3);assert.equal(s.conM2,1);assert.equal(s.m2SinLlamar,70);
 assert.equal(area({m2:70,m2Total:75}),70);
});
