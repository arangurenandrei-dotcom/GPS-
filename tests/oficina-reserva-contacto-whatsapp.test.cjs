'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const office=fs.readFileSync(path.join(__dirname,'../oficina-llamadas-obras-v2.js'),'utf8');
const slice=(start,end)=>{const a=office.indexOf(start),b=office.indexOf(end,a+1);assert.ok(a>=0&&b>a,start+' no encontrado');return office.slice(a,b);};
test('el paso de revisión pide datos del titular sin alterar el contacto antes de reservar',()=>{
 const review=slice('if(view==="review"){','if(view==="whatsapp"){');
 for(const label of ['Nombre y apellidos','DNI / NIE','Correo electrónico','Guardar datos y confirmar obra'])
  assert.ok(review.includes(label),label);
 assert.ok(review.includes('bookingContact=d;saveBooking();'));
 assert.ok(!review.includes('Object.assign(c,'), 'No debe escribir datos antes de verificar la reserva');
});
test('la reserva guarda el nombre DNI y correo en el MISMO cliente',()=>{
 const save=slice('async function saveBooking(){','function normalizePhone(p)');
 assert.match(save,/bookingContact\.key!==row\.key/);
 assert.match(save,/draft=\{\.\.\.c,name:details\.name,dni:details\.dni,email:details\.email/);
 assert.match(save,/ensureCrmUpload\(draft/);
 assert.match(save,/saveAndSync\("comercial_custom_zones",savedZones\)/);
 assert.ok(save.indexOf('Object.assign(c,draft)')<save.indexOf('saveAndSync('));
 assert.match(save,/whatsappObraEnviadoAt:null,whatsappReminderSentAt:null/);
});
test('los WhatsApps de confirmación y recordatorio se envían manualmente por separado',()=>{
 const draw=slice('if(view==="whatsapp"){','async function availableChoices');
 assert.ok(draw.includes('message(c,z)'));
 assert.ok(draw.includes('reminderMessage(c,z)'));
 assert.ok(draw.includes('markWhatsApp("confirmation")'));
 assert.ok(draw.includes('markWhatsApp("reminder")'));
 const mark=slice('async function markWhatsApp(','window.openCnCallQueue=');
 assert.ok(mark.includes('if(!confirm('));
 assert.ok(mark.includes('whatsappReminderSentAt'));
 assert.ok(mark.includes('whatsappObraEnviadoAt'));
 assert.ok(mark.includes('saveAndSync("comercial_custom_zones",savedZones)'));
});
test('el recordatorio incluye fecha, franja, dirección y municipio, sin DNI ni correo sensibles',()=>{
 const code=slice('function reminderMessage(c,z){','function openWhatsApp(');
 const obj={SLOTS:[['09:00','11:00']],Date};
 vm.runInNewContext(code+'this.build=reminderMessage;',obj);
 const msg=obj.build({name:'Prueba',obraDate:'2026-12-01',obraTime:'09:00',street:'Mayor 2',dni:'00000000T',email:'test@example.com'},{town:'Ayegui'});
 assert.match(msg,/Mayor 2/);assert.match(msg,/Ayegui/);assert.match(msg,/09:00/);
 assert.ok(!msg.includes('00000000T'));assert.ok(!msg.includes('test@example.com'));
});

test('el mensaje de llamada sin respuesta identifica al comercial y no simula un envío',()=>{
 const code=slice('function senderName(){','function reminderMessage(c,z){');
 const vmctx={SLOTS:[['09:00','11:00']],Date,currentUserName:'Andrei (Jefe)',getDisplayAlias:()=> 'Andrei Aranguren'};
 vm.runInNewContext(code+'this.noAnswer=unansweredMessage;this.confirm=message;',vmctx);
 const c={name:'María López',phone:'600000000',street:'Mayor 2',obraDate:'2026-12-01',
  obraTime:'09:00',dni:'00000000T',email:'test@example.com'};
 const unanswered=vmctx.noAnswer(c,{town:'Ayegui'});
 assert.match(unanswered,/María/);assert.match(unanswered,/Andrei Aranguren/);
 assert.match(unanswered,/KONSOR Energía/);assert.match(unanswered,/prefieres que te llame/);
 const confirmation=vmctx.confirm(c,{town:'Ayegui'});
 for(const part of ['Andrei Aranguren','KONSOR Energía','Mayor 2','Ayegui','09:00','01'])
  assert.ok(confirmation.includes(part),part);
 assert.ok(!confirmation.includes(c.dni)&&!confirmation.includes(c.email));
 const view=slice('if(view==="noAnswer"){','if(view==="waiting"){');
 assert.ok(view.includes('openWhatsApp(phone,draft)'));
 assert.ok(view.includes('saveCall("ya_llamado")'));
 assert.ok(!view.includes('saveAndSync('),'Abrir WhatsApp no debe guardar un envío automáticamente');
});
