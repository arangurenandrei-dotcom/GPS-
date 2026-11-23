'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'oficina-leads.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
function load({connected=true,failed=false,pending=0}={}){
 const saves=[];
 const old={id:123,comercial:'Andrei (Jefe)',town:'Estella',clients:[{
  clientUid:'f_old',name:'Cliente anterior',phone:'600111111',street:'Calle Vieja 1'
 }]};
 const bridge={busy:false,state:()=>({connected,failed,pending}),
  save:async(group,zones)=>{saves.push({group,zones});}};
 const ctx={window:{konsorDesigner:{permitted:()=>true},KonsorBridge:bridge},
  currentUserName:'Andrei (Jefe)',savedZones:[old],Date,crypto:{randomUUID:()=> '1234-5678'},document:{}};
 vm.runInNewContext(src,ctx,{filename:'oficina-leads.js'});
 return {ctx,saves,api:ctx.window.KonsorOfficeLeads};
}
const lead={name:'María López',phone:'600123456',street:'Calle Mayor 12',
 locality:'Ayegui',email:'',notes:'Llamar a las 17:00'};
test('Alta directa se carga antes del selector y trabaja con el Bridge V2',()=>{
 assert.ok(index.indexOf('oficina-leads.js')>0);
 assert.ok(index.indexOf('oficina-leads.js')<index.indexOf('designer-role-preview.js'));
 const {api}=load();assert.equal(typeof api.create,'function');
});
test('Crea una ficha real individual SIN sector geográfico ni captación falsa',async()=>{
 const {api,ctx,saves}=load();
 const result=await api.create(lead);
 assert.equal(saves.length,1);
 assert.equal(saves[0].group,'comercial_custom_zones');
 const zone=saves[0].zones.at(-1),client=zone.clients[0];
 assert.equal(ctx.savedZones.length,2);
 assert.equal(String(result.zoneId),String(zone.id));
 assert.equal(result.clientUid,client.clientUid);
 assert.equal(zone.isOfficeLead,true);
 assert.equal(zone.isSingleHouse,true);
 assert.equal(zone.singlePoint,null);
 assert.equal(zone.points.length,0);
 assert.equal(zone.stats.si,0);
 assert.equal(client.captacionRespuesta,'');
 assert.equal(client.origen,'oficina');
 assert.equal(client.callStatus,'pendiente');
 assert.equal(client.obraStatus,'a_poner');
 assert.equal(client.locality,'Ayegui');
 assert.equal(zone.comercial,'Andrei (Jefe)');
});
test('No crea duplicados ni escribe si faltan campos o conexión',async()=>{
 const {api,ctx,saves}=load();
 await assert.rejects(()=>api.create({...lead,phone:'123'}),/Teléfono/);
 await assert.rejects(()=>api.create({...lead,street:'Calle Vieja 1',locality:'Estella',phone:'600111111'}),/existe una ficha/);
 assert.equal(saves.length,0);
 const disconnected=load({connected:false});
 await assert.rejects(()=>disconnected.api.create(lead),/conexión/);
 assert.equal(disconnected.saves.length,0);
 assert.equal(ctx.savedZones.length,1);
});
test('No presenta una ficha como guardada si Firestore rechaza la escritura',async()=>{
 const {api,ctx}=load();
 ctx.window.KonsorBridge.save=async()=>{throw Error('revisión simultánea');};
 await assert.rejects(()=>api.create(lead),/revisión simultánea/);
 assert.equal(ctx.savedZones.length,1);
});
