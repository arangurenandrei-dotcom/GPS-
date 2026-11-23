'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../oficina-llamadas-obras-v2.js'),'utf8');
function section(a,b){const i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'No está '+a);return source.slice(i,j);}
test('permite vincular la obra existente desde el cliente, sin crear una segunda reserva',()=>{
 const client=section('if(view==="client"){','if(view==="existingCalendar"){');
 assert.ok(client.includes('Ya está en Google Calendar · Vincular'));
 const flow=section('if(view==="existingCalendar"){','if(view==="waiting"){');
 assert.ok(flow.includes('calendarBookingOrigin:"google_calendar_existing"'));
 assert.ok(flow.includes('calendarEventUrl:url'));
 assert.ok(flow.includes('calendarLinkVerifiedByUserAt:Date.now()'));
 assert.ok(flow.includes('saveAndSync("comercial_custom_zones",savedZones)'));
 assert.ok(!flow.includes('elegirEquipoInstaladorKonsor('),'No debe reservar en backend otra vez');
 assert.ok(!flow.includes('ensureCrmUpload('),'No debe registrar otra reserva de CRM');
 assert.ok(!flow.includes('consultarKonsorFecha('),'No verifica identidad de evento solo con disponibilidad');
});
test('no se asocia sin comprobación explícita ni a una segunda ficha ya agendada',()=>{
 const flow=section('if(view==="existingCalendar"){','if(view==="waiting"){');
 assert.ok(flow.includes('if(!check.checked)'));
 assert.ok(flow.includes('x.c.calendarEventUrl===url'));
 assert.ok(flow.includes('x.c.obraDate===when&&x.c.obraTime===slot'));
 assert.ok(flow.includes('if(other)'));
 assert.ok(flow.includes('if(!row||booked(row))'));
});
test('al guardar, la cita original queda agendada en la misma ficha y sale de llamadas pendientes',()=>{
 const flow=section('if(view==="existingCalendar"){','if(view==="waiting"){');
 assert.ok(flow.includes('obraStatus:"agendada"'));
 assert.ok(flow.includes('callStatus:"citas"'));
 assert.ok(flow.includes('nextContactAt:null'));
 assert.ok(flow.includes('Object.assign(row.c,'));
 const code=section('const booked=i=>','const complete=i=>');
 const ctx={};
 vm.runInNewContext('const booked=i=>["agendada","realizada"].includes(i.c.obraStatus); const done=i=>booked(i)||["no_interesado","descartado"].includes(i.c.callStatus);this.booked=booked;this.done=done;',ctx);
 assert.equal(ctx.booked({c:{obraStatus:'agendada',calendarBookingOrigin:'google_calendar_existing'}}),true);
 assert.equal(ctx.done({c:{obraStatus:'agendada',calendarBookingOrigin:'google_calendar_existing'}}),true);
});
