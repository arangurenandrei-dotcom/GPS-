'use strict';
// Pruebas autónomas del núcleo de roles y de la compatibilidad V2.
const assert=require('node:assert/strict');
const roles=require('../app/core/konsor-modulos.js');
const fichas=require('../app/core/modelo-fichas-v2.js');

const menu=(assignedRoles,serverGrants,suspended=false)=>roles.menuFor({assignedRoles,serverGrants,suspended});
assert.ok(roles.demoPreview('comercial').some(m=>m.id==='captacion'));
assert.ok(roles.demoPreview('tecnico').some(m=>m.id==='materiales'));
assert.ok(!roles.demoPreview('tecnico').some(m=>m.id==='finanzas'));
assert.ok(roles.demoPreview('ceo').some(m=>m.id==='finanzas'));
assert.deepEqual(menu(['ceo'],[]),[],'El menú debe fallar cerrado sin permisos de servidor');
assert.deepEqual(menu(['tecnico'],['materiales','finanzas']).map(m=>m.id),['materiales']);
assert.deepEqual(menu(['comercial'],['captacion'],true),[],'Cuenta suspendida no ve herramientas');
assert.deepEqual(menu(['comercial','jefe_equipo_comercial'],['captacion','plan_comercial']).map(m=>m.id),['captacion','plan_comercial']);

const records=[
 {col:'zonas',id:'z1',rev:1,datos:{town:'Localidad de prueba'}},
 {col:'fichas',id:'f1',zona:'z1',rev:4,owner:'comercial1',datos:{name:'Ficticio',street:'Calle de prueba',m2:80}},
 {col:'fichas',id:'f2',zona:'zona-no-encontrada',rev:1,datos:{name:'Ficticio 2'}},
 {col:'fichas',id:'f2',zona:'zona-no-encontrada',rev:0,datos:{}}
];
const report=fichas.inspeccionarV2(records);
assert.equal(report.fichas,3);assert.equal(report.huérfanas,2);
assert.equal(report.identificadoresDuplicados,1);assert.equal(report.sinRevision,1);
const mapped=fichas.vistaFichaAutorizada(records[1]);
assert.equal(mapped.id,'f1');
assert.equal(mapped.referenciaLegacy,'fichas/f1');
assert.equal(mapped.revision,4);
assert.equal(mapped.sectorId,'z1');
assert.equal(mapped.inmueble.superficieEstimada,80);
assert.equal(mapped.migrada,false);
assert.deepEqual(records[1].datos,{name:'Ficticio',street:'Calle de prueba',m2:80},'El adaptador no debe modificar los datos');
console.log('OK: registro de roles, permisos simulados y adaptador de fichas existentes');
