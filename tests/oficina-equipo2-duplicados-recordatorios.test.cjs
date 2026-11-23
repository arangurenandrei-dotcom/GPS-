'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const office=fs.readFileSync(path.join(__dirname,'../oficina-llamadas-obras-v2.js'),'utf8');
const avisos=fs.readFileSync(path.join(__dirname,'../avisos-app.js'),'utf8');
function extract(start,end){
 const a=office.indexOf(start),b=office.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,start+' not found');
 return office.slice(a,b);
}
test('dos fichas del mismo Alfonso no provocan segunda llamada si teléfono, pueblo y dirección coinciden',()=>{
 const records=[
  {z:{id:1,town:'Ayegui',comercial:'Andrei (Jefe)',clients:[]},c:{clientUid:'1',name:'Alfonso',phone:'600123456',street:'Calle Mayor 2',obraStatus:'a_poner',callStatus:'pendiente'}},
  {z:{id:2,town:'Ayegui',comercial:'Andrei (Jefe)',clients:[]},c:{clientUid:'2',name:'Alfonso',phone:'600 123 456',street:'Calle Mayor, 2',obraStatus:'agendada',callStatus:'citas'}}
 ];
 records.forEach(x=>x.z.clients.push(x.c));
 const ctx={savedZones:records.map(x=>x.z),currentUserName:'Andrei (Jefe)',currentUserRole:'jefe',
 scope:'mine',isMikelTeamMember:()=>false};
 const part=extract('const owns=','const booked=');
 vm.runInNewContext(part+'const booked=i=>["agendada","realizada"].includes(i.c.obraStatus);this.results={all:all(),duplicates:duplicateGroups()};',ctx);
 assert.equal(ctx.results.all.length,1);
 assert.equal(ctx.results.duplicates.length,1);
 assert.equal(ctx.results.all[0].c.obraStatus,'agendada');
});
test('dos personas llamadas Alfonso en distintas direcciones no se fusionan',()=>{
 const ctx={savedZones:[{id:1,town:'Ayegui',comercial:'Andrei (Jefe)',clients:[
  {clientUid:'1',name:'Alfonso',street:'Mayor 2',phone:'600123456'},
  {clientUid:'2',name:'Alfonso',street:'Mayor 4',phone:'600123456'}]}],
  currentUserName:'Andrei (Jefe)',currentUserRole:'jefe',scope:'mine',isMikelTeamMember:()=>false};
 vm.runInNewContext(extract('const owns=','const booked=')+
  'const booked=i=>["agendada","realizada"].includes(i.c.obraStatus);this.rows=all();',ctx);
 assert.equal(ctx.rows.length,2);
});
test('se recomienda Equipo 2 y su jornada existente antes que Equipo 3',()=>{
 const ctx={};
 vm.runInNewContext(extract('function priority(o){','async function availableChoices')+'this.priority=priority;',ctx);
 assert.ok(ctx.priority({team:2,bookedSameTown:2,bookedDay:2})<ctx.priority({team:2,bookedDay:0,bookedSameTown:0}));
 assert.ok(ctx.priority({team:2,bookedDay:0,bookedSameTown:0})<ctx.priority({team:3,bookedSameTown:3,bookedDay:3}));
 const proposal=extract('async function recommendDays','async function loadSlots');
 assert.ok(proposal.includes('priority(a)-priority(b)'));
 const group=extract('async function findClusterDay','async function renderGroupAgenda');
 assert.ok(group.includes('Number(a.team!==2)'));
});
test('el recordatorio pide día y hora, guarda seguimiento y usa el servicio de avisos',()=>{
 const block=extract('if(view==="waiting"){','if(view==="calendar"){');
 for(const keyword of ['type="date"','type="time"','nextContactAt:dueAt',
    'saveAndSync("comercial_custom_zones",savedZones)','konsorScheduleCallReminder']){
  // inputs use property assignments, not literal attributes
  if(keyword==='type="date"')assert.ok(block.includes('dateInput.type="date"'));
  else if(keyword==='type="time"')assert.ok(block.includes('timeInput.type="time"'));
  else assert.ok(block.includes(keyword),keyword);
 }
 assert.ok(avisos.includes("api.call('guardarRecordatorio'"));
 assert.ok(avisos.includes('window.konsorScheduleCallReminder=async'));
 assert.ok(block.includes('aviso NO se ha confirmado'));
});
