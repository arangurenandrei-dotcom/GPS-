'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'flujo-ficha-unica.js'),'utf8');
const browser={window:{},Date};
vm.runInNewContext(src,browser);
const model=browser.window.KonsorSingleFileWorkflow;
const z={town:'Ayegui'};
const base={clientUid:'f_1',name:'Cristina',phone:'600123456',street:'Mayor 7',captacionRespuesta:'si',
 callStatus:'pendiente',m2:80,obraStatus:'a_poner'};
test('un único registro cambia de etapa y conserva la captación puerta a puerta',()=>{
 assert.equal(model.status(base,z).key,'por_llamar');
 const follow={...base,callStatus:'esperando_confirmacion',nextContactAt:Date.now()+3600000};
 assert.equal(model.status(follow,z).key,'seguimiento');
 const scheduled={...follow,callStatus:'citas',obraStatus:'agendada',obraDate:'2026-12-01'};
 assert.equal(model.status(scheduled,z).key,'agendada');
 assert.equal(model.status({...scheduled,obraStatus:'realizada'},z).key,'realizada');
 assert.equal(model.origin(scheduled),'si');
 assert.equal(model.area(scheduled),80);
});
test('desinterés posterior no borra respuesta Sí ni metros y no es cita',()=>{
 const declined={...base,callStatus:'no_interesado',closureReason:'No quiere continuar'};
 assert.equal(model.status(declined,z).key,'descartada');
 assert.equal(model.status(declined,z).terminal,true);
 assert.equal(model.origin(declined),'si');
 assert.equal(model.area(declined),80);
 assert.equal(model.booked(declined),false);
});
test('cliente con pueblo pero sin sector conserva siguiente acción',()=>{
 assert.equal(model.status(base,{town:'Ayegui',isSectorlessCapture:true}).key,'por_llamar');
 assert.equal(model.status({...base,phone:'600'},z).key,'incompleta');
 assert.equal(model.outstanding({...base,buildYear:'',cteZone:''},z).includes('Año de construcción'),true);
 assert.equal(model.outstanding({...base,obraStatus:'agendada'},z).includes('DNI/NIE'),true);
});
test('buscador enlaza a Oficina por identificador y no crea otra ficha',()=>{
 const srcOffice=fs.readFileSync(path.join(root,'oficina-llamadas-obras-v2.js'),'utf8');
 const srcApp=fs.readFileSync(path.join(root,'app/legacy/comercial-app.js'),'utf8');
 assert.ok(srcOffice.includes('window.konsorOpenExistingClientInOffice=function(zoneId,clientUid)'));
 assert.ok(srcOffice.includes('String(i.c.clientUid)===String(clientUid)'));
 assert.ok(srcApp.includes("window.konsorOpenExistingClientInOffice(z.id,c.clientUid)"));
 assert.ok(srcApp.includes("old.callStatus='no_interesado'"));
 assert.ok(srcApp.includes("old.closureReason=reason.trim().slice(0,500)"));
 assert.ok(srcApp.includes("await window.KonsorBridge.save('comercial_custom_zones',candidate)"));
 assert.ok(srcApp.includes('renderGlobalClientSearchResults();'));
 const i=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(i.indexOf('flujo-ficha-unica.js')<i.indexOf('app/legacy/comercial-app.js'));
});
