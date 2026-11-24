'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function load(file){
 const context={window:{KonsorUI:{el(){return {};}}},console,Date,Number,Set,Map};
 vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
 return context.window;
}
const zones=[
 {id:'a',comercial:'Andrei (Jefe)',town:'Ayegui',clients:[
  {clientUid:'x',name:'Uno',street:'Mayor 1',obraStatus:'agendada',obraDate:'2026-12-04',obraTime:'09:00',obraEquipoInstalacion:2,m2:80},
  {clientUid:'y',name:'Dos',street:'Mayor 3',obraStatus:'agendada',obraDate:'2026-12-07',obraTime:'11:00',obraEquipoInstalacion:3,m2:76},
  {clientUid:'z',name:'Otro',street:'Mayor 5',obraStatus:'pendiente'}]},
 {id:'b',comercial:'Mikel (Jefe)',town:'Falces',clients:[
  {clientUid:'m',street:'Mayor 6',obraStatus:'agendada',obraDate:'2026-12-02',obraEquipoInstalacion:2}]}
];
test('dos citas de diciembre siguen siendo pendientes aunque Resultados muestre noviembre',()=>{
 const ui=load('resultados-ios.js');
 const own=ui.KonsorResultsScheduled.scheduledOpen(zones,['Andrei (Jefe)']);
 assert.equal(own.count,2);assert.equal(own.area,156);
 assert.equal(ui.KonsorResultsScheduled.scheduledOpen(zones,['Otro']).count,0);
});
test('Oficina y Técnicos proyectan exactamente las dos reservas desde las mismas fichas',()=>{
 const office=load('oficina-flujo.js').KonsorOfficeFlow;
 const tech=load('tecnicos-flujo.js').KonsorTechnicalFlow;
 const own=z=>z.comercial==='Andrei (Jefe)';
 const os=office.entries(zones,own),ts=tech.entries(zones,own);
 assert.equal(os.filter(x=>x.status==='agendada').length,2);
 assert.equal(ts.filter(x=>x.code==='agendada').length,2);
 assert.equal(ts.filter(x=>x.date>='2026-11-24').length,2);
});
test('Plan de llamadas usa selector segmentado y no un select nativo vacío',()=>{
 const js=fs.readFileSync(path.join(root,'oficina-llamadas-obras-v2.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'oficina-llamadas-obras-v2.css'),'utf8');
 assert.match(js,/koc-scope-picker/);
 assert.match(js,/aria-pressed/);
 assert.ok(!js.includes('const s=e("select","koc-input",undefined,body);[["mine"'));
 assert.match(css,/\.koc-scope-choice\.selected/);
});
test('Resultados diferencia ámbito del usuario, equipo y período de ejecución',()=>{
 const js=fs.readFileSync(path.join(root,'resultados-ios.js'),'utf8');
 assert.match(js,/kr-scope-picker/);
 assert.match(js,/scheduledOpen\(sourceZones,users\)/);
 assert.match(js,/Todo mi equipo/);
 assert.match(js,/m\.m2Citas/); // producción prevista por período permanece intacta
});
