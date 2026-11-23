'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(dir,'oficina-flujo.js'),'utf8');
const view=fs.readFileSync(path.join(dir,'oficina-vista.js'),'utf8');
const designer=fs.readFileSync(path.join(dir,'designer-role-preview.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const context={window:{}};
vm.runInNewContext(src,context);
const api=context.window.KonsorOfficeFlow;
const zone=(id,entries,who='Andrei (Jefe)')=>({id,town:'Peralta',comercial:who,clients:entries});
const client=(id,state,other={})=>({clientUid:id,name:'Alfonso',street:'Valle Baztán 7',
 phone:'600123456',obraDate:'2026-11-28',obraTime:'17:00',
 obraEquipoInstalacion:2,obraStatus:state,...other});
test('Oficina reutiliza exactamente los expedientes de obra sin crear registros',()=>{
 const inputs=[zone('z1',[client('a','realizada'),client('b','agendada'),client('c','a_poner')])];
 const list=api.entries(inputs);
 assert.equal(list.length,2);
 assert.equal(list[0].id,'a');
 assert.equal(list[0].zoneId,'z1');
 assert.equal(list[0].street,'Valle Baztán 7');
 assert.equal(inputs[0].clients[0].obraStatus,'realizada');
 assert.equal(inputs[0].clients.length,3);
});
test('incidencias, documentos pendientes y cierre no se confunden',()=>{
 const list=api.entries([zone('z1',[
  client('i','aplazada'),client('r','realizada'),client('a','agendada'),
  client('verified','realizada',{documentosVerificadosAt:Date.now()})
 ])]);
 assert.equal(list[0].category,'Incidencia de obra');
 assert.equal(api.totals(list).incidences,1);
 assert.equal(api.totals(list).documents,2);
 assert.equal(api.totals(list).performed,2);
 const performed=list.find(x=>x.id==='r');
 assert.equal(api.steps(performed)[1].complete,false);
 assert.equal(api.steps(performed)[2].complete,true);
 assert.equal(api.steps(performed)[3].complete,false);
});
test('no presume DNI, correo, firmas, documentos ni cierre por tener fecha de obra',()=>{
 const item=api.entries([zone('z2',[client('a','agendada')])])[0];
 assert.ok(item.missing.includes('DNI/NIE'));
 assert.ok(item.missing.includes('Correo electrónico'));
 assert.ok(item.missing.includes('Revisión documental'));
 assert.equal(api.steps(item)[0].complete,false);
 assert.equal(api.steps(item)[1].complete,false);
 assert.equal(api.steps(item)[3].complete,false);
});
test('filtra por equipo y no muestra datos ficticios o de otras zonas',()=>{
 const list=api.entries([
  zone('z1',[client('a','agendada')]),
  zone('z2',[client('m','realizada')],'Mikel (Jefe)')
 ],z=>!String(z.comercial).startsWith('Mikel'));
 assert.equal(list.length,1);assert.equal(list[0].id,'a');
 assert.equal(api.entries([]).length,0);
});
test('integración con creador es solo lectura y no altera el flujo de comercial',()=>{
 assert.ok(designer.includes('konsorOficinaGuiada?.render?.(section)'));
 assert.ok(view.includes('KonsorOfficeFlow.entries(savedZones,own)'));
 for(const forbidden of ['saveAndSync(','KonsorBridge.save(','writeWorkV2(','setProfile(','localStorage.setItem('])
  assert.ok(!view.includes(forbidden),forbidden);
 for(const file of ['oficina-flujo.js','oficina-vista.js'])assert.ok(html.includes(file));
 assert.ok(html.indexOf('oficina-flujo.js')<html.indexOf('oficina-vista.js'));
 assert.ok(html.indexOf('oficina-vista.js')<html.indexOf('designer-role-preview.js'));
});
