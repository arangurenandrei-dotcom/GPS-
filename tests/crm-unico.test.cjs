'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const crm=require('../crm-estados');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const c=(uid,name,status,extra={})=>({clientUid:uid,name,street:'Calle 4',phone:'600111222',
  captacionRespuesta:'si',crmEstado:status,m2:100,...extra});
const zones=[
 {id:1,town:'Mendavia',clients:[
  c('a','Ana','por_llamar'),c('b','Bea','en_espera'),c('c','Celia','rechazado'),
  c('d','Dani','agendada',{obraStatus:'agendada'}),c('e','Eva','realizada',{obraStatus:'realizada'})]},
 {id:2,town:'Peralta',clients:[c('f','Fernando','no_apto',{obraStatus:'no_apto'}),c('g','Gema','por_llamar',{captacionRespuesta:'ausente'})]},
 {id:3,town:'Peralta',clients:[c('a','Ana','por_llamar')]},
];
test('cada ficha única solo se cuenta una vez y no hay migración',()=>{
 const rows=crm.rows(zones);
 assert.equal(rows.length,7);
 assert.equal(crm.dashboard(rows).total,7);
 assert.equal(rows.filter(x=>x.pueblo==='Mendavia').length,5);
 assert.equal(rows.filter(x=>x.pueblo==='Peralta').length,2);
});
test('todos los estados se excluyen mutuamente y nunca esconden clientes',()=>{
 const rows=crm.rows(zones),d=crm.dashboard(rows);
 assert.deepEqual(d.counts,{por_llamar:2,en_espera:1,agendada:1,realizada:1,rechazado:1,no_apto:1});
 assert.equal(d.pendientes,3);
 assert.equal(Object.values(d.counts).reduce((a,b)=>a+b,0),d.total);
});
test('rechazados no aptos y sin respuesta no inflan el potencial',()=>{
 const d=crm.dashboard(crm.rows(zones));
 assert.equal(d.amounts.potencial,190);
 assert.equal(d.amounts.previsto,95);
 assert.equal(d.amounts.realizado,95);
 assert.equal(d.withoutArea.potencial,0);
});
test('datos mínimos de captura distintos de requisitos de cierre',()=>{
 assert.deepEqual(crm.closeRequirements({name:'Ana',dni:'',email:''}),
  ['nombre y apellidos','DNI/NIE','correo electrónico']);
 assert.deepEqual(crm.closeRequirements({name:'Ana García',dni:'12345678Z',email:'ana@yahoo.es'}),[]);
});
test('prioridad a obra ya registrada y a rechazos históricos',()=>{
 assert.equal(crm.status({obraStatus:'realizada',crmEstado:'por_llamar'}),'realizada');
 assert.equal(crm.status({obraStatus:'agendada_historica'}),'agendada');
 assert.equal(crm.status({captacionRespuesta:'no'}),'rechazado');
 assert.equal(crm.status({obraStatus:'no_apto'}),'no_apto');
 assert.equal(crm.status({callStatus:'esperando_confirmacion'}),'en_espera');
});
test('cartera única: filtros, detalle de pueblos y ficha sin wizard',()=>{
 const js=read('cartera-antigua-ios.js');
 for(const needle of ['kha-crm-summary','kha-crm-counts','kha-town-card',
  'crmFilter="pendientes"','crmFilter="todos"','stateValue=sel(stateBar',
  'Datos del cliente','Datos de la vivienda','Cita y obra',
  'Documentos, fotografías y expediente','closeRequirements(d)',
  'window.openKonsorClients=function']){
  assert.ok(js.includes(needle),needle);
 }
 assert.ok(!js.includes('const guidedSteps=['));
 assert.ok(!js.includes('actions.append(B("Guardar y habilitar llamadas"'));
 assert.ok(js.includes('const button=B(label+" · "+count,()=>{crmFilter=state;crmTown="";render();});'));
 assert.ok(js.includes('window.KonsorBridge.save("comercial_custom_zones",candidate)'));
 assert.doesNotThrow(()=>new Function(js));
});
test('inicio tiene cuatro accesos, Dirección tiene Yo y Mi equipo',()=>{
 const home=read('inicio-ios.js'),direction=read('direccion-hub-ios.js');
 const h=home.slice(home.indexOf('const grid=el("div","cnv-home-grid"'),home.indexOf('const footer=el('));
 assert.deepEqual([...h.matchAll(/tile\(grid,"([^"]+)"/g)].map(x=>x[1]),
 ['Clientes','Mapa','Dirección','Mensajes entre plantas']);
 const open=direction.slice(direction.indexOf('function open(){'),direction.indexOf('/* Plan de Dirección:'));
 assert.deepEqual([...open.matchAll(/tile\(grid,"([^"]+)"/g)].map(x=>x[1]),['Yo','Mi equipo']);
 assert.ok(open.includes('if(!isBoss())return'));
});
test('nuevo CRM cargado desde index antes del editor',()=>{
 const html=read('index.html');
 assert.ok(html.includes('crm-estados.js?v=1'));
 assert.ok(html.indexOf('crm-estados.js?v=1')<html.indexOf('cartera-antigua-ios.js?v=13'));
});
