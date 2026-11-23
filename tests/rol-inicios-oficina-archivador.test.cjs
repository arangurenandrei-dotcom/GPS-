'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const archiveSrc=fs.readFileSync(path.join(root,'oficina-archivador.js'),'utf8');
const design=fs.readFileSync(path.join(root,'designer-role-preview.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const browser={window:{}};vm.runInNewContext(archiveSrc,browser);
const a=browser.window.KonsorOfficeArchive;
test('Archivador consulta la ficha única y mantiene las cuatro categorías',()=>{
 const z={id:'zona1',town:'Peralta',clients:[
  {clientUid:'a',name:'Alfonso',street:'Valle Baztán 7',phone:'600123456',obraStatus:'agendada',obraDate:'2026-11-28'},
  {clientUid:'b',name:'Sara',street:'Mayor 2',obraStatus:'realizada'},
  {clientUid:'c',name:'Elena',street:'Fuente 3',obraStatus:'aplazada'},
  {clientUid:'d',name:'María',street:'Sol 4',obraStatus:'realizada',expedienteCerradoAt:123}
 ]};
 const result=a.clients([z]);
 assert.equal(result.length,4);
 assert.equal(result[0].id,'a');
 assert.deepEqual(Array.from(a.groups,x=>x.id),['nuevos','haciendo','por_llegar','terminados']);
 assert.equal(a.stage(z.clients[0]),'nuevos');
 assert.equal(a.stage(z.clients[1]),'por_llegar');
 assert.equal(a.stage(z.clients[2]),'haciendo');
 assert.equal(a.stage(z.clients[3]),'terminados');
 assert.equal(z.clients[0].obraStatus,'agendada');
});
test('Buscador localiza nombre, teléfono, dirección y pueblo sin duplicar',()=>{
 const rows=a.clients([{id:'z',town:'Peralta',clients:[{clientUid:'a',name:'Alfonso',phone:'600123456',street:'Valle Baztán 7'}]}]);
 for(const q of ['Alfonso','600123456','baztan','peralta'])assert.equal(a.find(rows,q).length,1,q);
 assert.equal(a.find(rows,'casa inexistente').length,0);
});
test('Inicio técnico una sola tarjeta; Oficina tres, con mismo armazón y controles',()=>{
 assert.ok(design.includes('cnv-home-head'));
 assert.ok(design.includes('cnv-home-welcome'));
 assert.ok(design.includes('cnv-home-hero'));
 assert.ok(design.includes('cnv-home-grid'));
 assert.ok(design.includes('cnv-home-footer'));
 assert.ok(design.includes('cnv-glass cnv-icon-action'));
 assert.ok(design.includes('Abrir avisos'));
 assert.ok(design.includes('Abrir ajustes'));
 assert.ok(design.includes('Mi jornada","Ruta, obras y cierre del día"'));
 assert.ok(design.includes('Mi jornada","Documentos, revisiones y tramitación"'));
 assert.ok(design.includes('Clientes","Buscar y consultar fichas"'));
 assert.ok(design.includes('Archivador","Nuevos, haciendo, por llegar y terminados"'));
 assert.ok(design.includes('kdp-single-tile'));
 assert.ok(!design.includes('kdp-preview-tile'));
});
test('No hay escritura en el archivador y se carga antes del selector de áreas',()=>{
 assert.ok(html.includes('oficina-archivador.js?v=1'));
 assert.ok(html.indexOf('oficina-archivador.js')<html.indexOf('designer-role-preview.js'));
 for(const s of ['saveAndSync(','KonsorBridge.save(','localStorage.setItem(','fetch('])assert.ok(!archiveSrc.includes(s),s);
});
