'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const calls=fs.readFileSync(path.join(root,'oficina-llamadas-obras-v2.js'),'utf8');
const old=fs.readFileSync(path.join(root,'cartera-antigua-ios.js'),'utf8');
test('las recomendaciones de equipo no tienen preferencia artificial por el 2',()=>{
 const a=calls.indexOf('function priority(o){'),b=calls.indexOf('async function availableChoices',a);
 assert.ok(a>=0&&b>a);
 const ctx={};vm.runInNewContext(calls.slice(a,b)+'this.priority=priority;',ctx);
 assert.equal(ctx.priority({team:3,bookedSameTown:1,bookedDay:2}),0);
 assert.equal(ctx.priority({team:2,bookedSameTown:0,bookedDay:0}),2);
 assert.ok(!calls.includes('team===2?"Prioridad Equipo 2"'));
 assert.ok(!calls.includes('Number(a.team!==2)-Number(b.team!==2)'));
});
test('calendario mensual y planificación global usan disponibilidad de ambos equipos',()=>{
 assert.match(calls,/function monthCalendar\(/);
 assert.match(calls,/koc-month-grid/);
 assert.match(calls,/function fillAvailableCalendar\(/);
 assert.match(calls,/for\(const team of \[2,3\]\)/);
 assert.match(calls,/consultarKonsorFecha\(date\)/);
 assert.match(calls,/view==="planner"/);
 assert.match(calls,/preferGroupDate\(choice\.item,date,choice\.from,choice\.team\)/);
 assert.match(calls,/slotRouteFit\(item,date,team,idx,remote,records\)/);
});
test('editar ficha original está disponible en el flujo de llamadas',()=>{
 assert.match(calls,/Editar ficha completa · Catastro y datos/);
 assert.match(calls,/openKonsorLegacyClient/);
 assert.match(calls,/openKonsorFichaOriginal/);
});
test('la vinculación fuerza lectura de revisión actual y no duplica reservas',()=>{
 const a=calls.indexOf('if(view==="existingCalendar"){'),b=calls.indexOf('if(view==="waiting"){');
 const flow=calls.slice(a,b);
 assert.match(flow,/const refreshed=await window\.KonsorBridge\?\.refresh\?\.\(true\)/);
 assert.match(flow,/Number\.isSafeInteger/);
 assert.match(flow,/window\.vincularObraExistenteKonsor\(/);
 assert.ok(!flow.includes('saveAndSync("comercial_custom_zones"'));
});
test('cartera antigua mantiene datos, elimina paso manual CP/CTE y reduce ruido visual',()=>{
 assert.match(old,/Importar y organizar fichas/);
 assert.match(old,/const summary=card\(page,"Clientes"/);
 assert.match(old,/kha-net-inline/);
 assert.ok(!old.includes('const postalBtn=B("Detectar CP y zona CTE"'));
 assert.match(old,/searchPostal\(false\)/);
 assert.match(old,/Consultar Catastro oficial/);
});

test('editor universal utiliza misma ficha y no la convierte en historial',()=>{
 const start=old.indexOf('if(!isSectorless(oldZone)&&!isPort(oldZone)&&!inPortfolio(oldClient))');
 const stop=old.indexOf('}else if(isSectorless(oldZone))',start);
 assert.ok(start>=0&&stop>start);
 const edit=old.slice(start,stop);
 assert.ok(edit.includes('{...oldClient,...d,updatedAt:stamp}'));
 assert.ok(!edit.includes('importedLegacy:true'));
 assert.ok(!edit.includes('legacyPortfolio:true'));
 assert.ok(old.includes('window.openKonsorFichaOriginal=function(clientUid)'));
 assert.ok(old.includes('Guardar cambios'));
 for(const field of ['DNI / NIE','Correo electrónico','Año de construcción','Superficie total (m²)','Código postal','Zona CTE'])
  assert.ok(old.includes(field),field);
});
test('Oficina y Técnicos pueden abrir la ficha original',()=>{
 for(const file of ['oficina-vista.js','tecnicos-vista.js']){
  const js=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(js,/openKonsorFichaOriginal\?\.\(job\.id\)/);
 }
});
