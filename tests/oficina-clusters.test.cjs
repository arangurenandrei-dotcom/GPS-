'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../oficina-llamadas-obras-v2.js'),'utf8');
const start=source.indexOf('function clusters(');
const end=source.indexOf('function firstRecommended()',start);
assert.ok(start>0&&end>start,'La agrupación de calles debe existir en el módulo real');
const town=i=>String(i?.z?.town||'').trim().toLowerCase();
const street=i=>String(i?.c?.street||'').toLowerCase().replace(/^(calle|avenida)\s+/,'').replace(/\d.*$/,'').trim();
const clusters=Function('town','street','return ('+source.slice(start,end).trim()+')')(town,street);
const item=(id,townName,road,date,ci=0)=>({key:id,z:{town:townName},c:{street:road},date,zi:0,ci});
test('la Oficina agrupa por municipio y calle, nunca mezcla calles distintas',()=>{
 const groups=clusters([
  item('a','Pamplona','Calle Mayor 2','2026-11-22'),
  item('b','Pamplona','Calle Mayor 4','2026-11-22',1),
  item('c','Barañáin','Calle Mayor 2','2026-11-22'),
  item('d','Pamplona','Calle Nueva 8','2026-11-22')
 ]);
 assert.equal(groups.length,3);
 assert.deepEqual(groups.find(g=>g.length===2).map(x=>x.key),['a','b']);
 assert.ok(groups.every(g=>g.every(x=>town(x)===town(g[0])&&street(x)===street(g[0]))));
});
test('la calle con trabajo anterior tiene prioridad cronológica',()=>{
 const groups=clusters([
  item('later1','Pamplona','Calle Mayor 2','2026-11-23'),
  item('later2','Pamplona','Calle Mayor 4','2026-11-23'),
  item('older','Pamplona','Calle Estafeta 2','2026-11-20')
 ]);
 assert.equal(groups[0][0].key,'older');
});
test('sin candidatos o datos incompletos devuelve lista vacía, sin lanzar error',()=>{
 assert.deepEqual(clusters([]),[]);
 assert.deepEqual(clusters(null),[]);
 assert.deepEqual(clusters([{c:{street:''},z:{town:'Pamplona'}}]),[]);
});
