'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'tecnicos-flujo.js'),'utf8');
const view=fs.readFileSync(path.join(root,'tecnicos-vista.js'),'utf8');
const designer=fs.readFileSync(path.join(root,'designer-role-preview.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const context={window:{}};
vm.runInNewContext(src,context,{filename:'tecnicos-flujo.js'});
const flow=context.window.KonsorTechnicalFlow;
function example(id,state='agendada',date='2026-11-28',team=2,comercial='Andrei (Jefe)'){
 return {id:'z_'+id,town:'Peralta',comercial,clients:[{
  clientUid:'f_'+id,name:'Titular '+id,phone:'600000000',street:'Valle Baztán '+id,
  obraStatus:state,obraDate:date,obraTime:'17:00',obraEquipoInstalacion:team,m2:80
 }]};
}
test('el recorrido técnico reutiliza exactamente las fichas originales',()=>{
 const input=[example('1'),example('2','realizada'),example('3','a_poner')];
 const jobs=flow.entries(input);
 assert.equal(jobs.length,2);
 assert.equal(jobs[0].id,'f_1');
 assert.equal(jobs[0].zoneId,'z_1');
 assert.equal(jobs[0].street,'Valle Baztán 1');
 assert.equal(jobs[1].code,'realizada');
 assert.equal(input[0].clients[0].obraStatus,'agendada');
 assert.equal(input[0].clients.length,1);
});
test('filtra el equipo ajeno y no inventa obras del calendario ausentes en Firebase',()=>{
 const jobs=flow.entries([example('1'),example('m','agendada','2026-11-29',2,'Mikel (Jefe)')],
  z=>!String(z.comercial).startsWith('Mikel'));
 assert.equal(jobs.length,1);
 assert.equal(jobs[0].id,'f_1');
 assert.equal(flow.entries([]).length,0);
});
test('estados, siguientes pasos y estadísticas no contabilizan tareas futuras como hechas',()=>{
 const rows=flow.entries([example('a','agendada'),example('b','realizada'),example('c','aplazada')]);
 const summary=flow.recommend(rows,'2026-11-23');
 assert.equal(summary.jobs,3);
 assert.equal(summary.scheduled,1);
 assert.equal(summary.completed,1);
 assert.equal(summary.next.id,'f_a');
 const steps=flow.steps(rows.find(x=>x.id==='f_a'));
 assert.equal(steps.length,5);
 assert.equal(steps[0].ready,true);
 assert.equal(steps[1].ready,false);
 assert.equal(steps[2].ready,false);
 assert.equal(steps[3].ready,false);
 assert.equal(steps[4].ready,false);
});
test('sin documento verificado ni confirmación server no existe cierre automático',()=>{
 const c=example('a').clients[0];c.documentosVerificadosAt=Date.now();
 const item=flow.entries([{...example('a'),clients:[c]}])[0];
 assert.equal(flow.steps(item)[1].ready,true);
 assert.equal(flow.steps(item)[2].ready,false);
 assert.equal(flow.steps(item)[3].ready,false);
 for(const bad of ['invalid','2026-99-14',''])assert.equal(flow.validJob({...c,obraDate:bad}),false);
});
test('la vista real es navegación de solo lectura y mantiene el selector común',()=>{
 assert.ok(designer.includes('konsorTecnicosGuiado?.render?.(section)'));
 assert.ok(designer.includes('KONSOR · DATOS CONECTADOS'));
 assert.ok(view.includes('KonsorBridge?.state?.().connected'));
 assert.ok(view.includes('KonsorTechnicalFlow.entries(savedZones,own)'));
 for(const forbidden of ['KonsorBridge.save(','saveAndSync(','writeWorkV2(','setProfile(','localStorage.setItem('])
  assert.ok(!view.includes(forbidden),forbidden);
 const paths=['tecnicos-flujo.js','tecnicos-vista.js','designer-role-preview.js'];
 for(const p of paths)assert.ok(html.includes(p));
 assert.ok(html.indexOf(paths[0])<html.indexOf(paths[1]));
 assert.ok(html.indexOf(paths[1])<html.indexOf(paths[2]));
});

test('Técnicos avisa de citas registradas sin fecha o equipo en vez de decir que no hay ninguna',()=>{
 const zones=[{id:'z1',comercial:'Andrei (Jefe)',town:'Ayegui',clients:[
  {clientUid:'f_a',name:'Ana',street:'Mayor 1',obraStatus:'agendada'},
  {clientUid:'f_b',name:'Asun',street:'Mayor 2',obraStatus:'agendada',obraDate:'2026-12-03'},
  {clientUid:'f_c',name:'Pablo',street:'Mayor 3',obraStatus:'a_poner'}
 ]}];
 const pending=flow.pendingVerification(zones);
 assert.equal(pending.length,2);
 assert.equal(pending[0].reason,'Fecha sin verificar');
 assert.equal(pending[1].reason,'Equipo sin asignar');
 assert.equal(flow.entries(zones).length,1);
});
