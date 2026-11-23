'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'recorridos-guiados-diseno.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const technical=fs.readFileSync(path.join(root,'tecnicos-vista.js'),'utf8');
const office=fs.readFileSync(path.join(root,'oficina-vista.js'),'utf8');
class Node{
 constructor(type){this.tagName=type;this.children=[];this.attrs={};this.value='';this.files=[];this.dataset={};this.textContent='';this.className='';}
 append(x){x.parent=this;this.children.push(x);}
 replaceChildren(...x){this.children.forEach(y=>y.parent=null);this.children=[];x.forEach(y=>this.append(y));}
 setAttribute(k,v){this.attrs[k]=v;}
 querySelector(s){if(s.startsWith('.'))return flat(this).find(x=>x.className.split(' ').includes(s.slice(1)))||null;return null;}
 remove(){if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1);}
}
const flat=n=>[n,...n.children.flatMap(flat)];
const label=n=>flat(n).map(x=>x.textContent).join(' ');
const click=(container,contains)=>{
 const x=flat(container).find(x=>x.tagName==='button'&&x.textContent.includes(contains));
 assert.ok(x,'No existe botón '+contains);x.onclick();return x;
};
function instance(){
 const host=new Node('section');
 const window={KonsorBridge:{state:()=>({connected:false})},open:()=>{window.externalOpened=true;}};
 const ctx={window,document:{createElement:t=>new Node(t)},Date};
 vm.runInNewContext(source,ctx,{filename:'recorridos-guiados-diseno.js'});
 return {host,window};
}
test('el diseño comparte la estructura y no contiene escrituras reales',()=>{
 assert.ok(!technical.includes('KonsorGuidedDesign.technician(container)'));
 assert.ok(!office.includes('KonsorGuidedDesign.office(container)'));
 assert.ok(technical.includes('KonsorTechnicalFlow.entries'));
 assert.ok(office.includes('KonsorOfficeFlow.entries'));
 assert.ok(index.includes('recorridos-guiados-diseno.css?v=1'));
 assert.ok(index.includes('recorridos-guiados-diseno.js?v=1'));
 for(const forbidden of ['KonsorBridge.save(','saveAndSync(','writeWorkV2(','httpsCallable(','fetch(','localStorage.setItem('])
  assert.equal(source.includes(forbidden),false,forbidden);
});
test('Técnicos: cuatro viviendas, jornada, llegada, aplazamiento, aviso y siguiente',()=>{
 const {host,window}=instance();
 window.KonsorGuidedDesign.technician(host);
 assert.ok(label(host).includes('Hoy tienes 4 obras'));
 click(host,'Empezar jornada');
 click(host,'Estoy en la vivienda');
 click(host,'Aplazar');
 const note=flat(host).find(x=>x.tagName==='textarea');
 assert.ok(note);note.value='Cliente ausente, reprogramar con Comercial';
 click(host,'Registrar incidencia');
 assert.ok(window.KonsorGuidedDesign.messages.some(m=>m.to==='Comercial'&&m.subject.includes('Vivienda ficticia 1')));
 assert.ok(label(host).includes('Ir a la siguiente vivienda'));
 click(host,'Ir a la siguiente vivienda');
 assert.ok(label(host).includes('Vivienda ficticia 2'));
});
test('Oficina: rechazar foto, enviar razón, recibir corrección y tramitar a espera',()=>{
 const {host,window}=instance();
 window.KonsorGuidedDesign.office(host);
 assert.ok(label(host).includes('Trabajo de hoy'));
 click(host,'No');
 const reason=flat(host).find(x=>x.tagName==='textarea');reason.value='Imagen desenfocada y falta firma';
 click(host,'Solicitar corrección');
 assert.ok(window.KonsorGuidedDesign.messages.some(m=>m.to==='Técnicos'&&m.detail.includes('desenfocada')));
 click(host,'Simular llegada');
 click(host,'Sí');
 click(host,'Pasar a tramitar');
 click(host,'Documentos tramitados');
 assert.ok(label(host).includes('Pendiente de validación externa'));
 click(host,'Ir al siguiente trabajo');
 assert.ok(label(host).includes('Vivienda ficticia 2'));
});
test('no introduce obras inexistentes en la vista real cuando falla Firebase',()=>{
 const {host,window}=instance();
 window.KonsorGuidedDesign.technician(host);
 click(host,'Ver datos reales');
 assert.ok(label(host).includes('Sin conexión con las fichas de Firebase'));
 assert.ok(!label(host).includes('Vivienda ficticia 1'));
});
