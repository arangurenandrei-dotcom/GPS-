'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'avisos-departamentos.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
function load(){const ctx={window:{},Date};vm.runInNewContext(src,ctx);return ctx.window.KonsorDepartmentNotices;}
test('avisos departamentales están cargados antes del inicio de rol',()=>{
 assert.ok(index.includes('avisos-departamentos.js'));
 assert.ok(index.indexOf('avisos-departamentos.js')<index.indexOf('designer-role-preview.js'));
});
test('Oficina: alerta real de cita próxima, expediente incompleto e incidencia',()=>{
 const api=load(),z=[{id:9,town:'Ayegui',clients:[
  {clientUid:'one',street:'Calle A 1',obraStatus:'agendada',obraDate:'2026-11-24',obraTime:'09:00',obraEquipoInstalacion:2},
  {clientUid:'two',street:'Calle A 2',obraStatus:'aplazada'},
  {clientUid:'three',street:'Calle A 3',obraStatus:'a_poner'}]}];
 const notices=api.notices(z,'oficina','2026-11-23');
 assert.ok(notices.some(x=>x.label==='Obra próxima'));
 assert.ok(notices.some(x=>x.label==='Documentación pendiente'));
 assert.ok(notices.some(x=>x.label==='Incidencia de instalación'));
 assert.ok(!notices.some(x=>x.clientUid==='three'));
 assert.equal(api.notices(z,'oficina','2026-11-23').length,notices.length);
});
test('Técnicos: solo intervenciones vinculadas y equipo sin asignar',()=>{
 const api=load(),z=[{id:9,town:'Ayegui',clients:[
  {clientUid:'one',street:'A 1',obraStatus:'agendada',obraDate:'2026-11-24'},
  {clientUid:'two',street:'A 2',obraStatus:'a_poner'}
 ]}];
 const rows=api.notices(z,'tecnicos','2026-11-23');
 assert.ok(rows.some(x=>x.label==='Intervención próxima'));
 assert.ok(rows.some(x=>x.label==='Obra sin equipo asignado'));
 assert.ok(rows.every(x=>x.clientUid==='one'));
});
