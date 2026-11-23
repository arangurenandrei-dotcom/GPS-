'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'designer-role-preview.js'),'utf8');
const css=fs.readFileSync(path.join(root,'designer-role-preview.css'),'utf8');
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.style={};this.attrs={};this.className='';this.textContent='';}
 append(child){this.children.push(child);child.parent=this;return child;}
 setAttribute(key,value){this.attrs[key]=value;}
 remove(){const list=this.parent?.children;if(list){const i=list.indexOf(this);if(i>=0)list.splice(i,1);}}
 querySelector(selector){if(selector.startsWith('#'))return this.children.find(c=>c.id===selector.slice(1))||null;return null;}
 addEventListener(){}
}
function load({uid='owner',name='Andrei (Jefe)',role='jefe',key='jefe'}={}){
 const body=new Element('body'),home=new Element('section'),container={style:{display:'block'}};
 const document={body,createElement:tag=>new Element(tag),getElementById:id=>{
  if(id==='appContainer')return container;
  return body.children.find(x=>x.id===id)||null;
 }};
 const win={auth:{currentUser:uid?{uid}:null},cnvShowHome:()=>{win.homeOpened=true;}};
 const context={window:win,document,sessionStorage:{getItem:k=>k==='auth_user_key'?key:null},
  currentUserName:name,currentUserRole:role};
 vm.runInNewContext(source,context);
 return {win,body,home};
}
const flattened=node=>[node,...node.children.flatMap(flattened)];
const labels=node=>flattened(node).map(x=>x.textContent).join(' | ');
test('el selector se abre DESPUÉS del login y no se monta dentro del Inicio',()=>{
 const ctx=load();assert.equal(ctx.win.konsorDesigner.permitted(),true);
 ctx.win.konsorDesigner.mount(ctx.home);
 assert.equal(ctx.home.children.length,0);
 assert.equal(ctx.win.konsorDesigner.showChooser(),true);
 const chooser=ctx.body.children.find(x=>x.id==='konsorAreaChooser');
 assert.ok(chooser);assert.ok(labels(chooser).includes('¿Con qué perfil quieres entrar?'));
 const choices=flattened(chooser).filter(x=>x.className==='kdp-choice');
 assert.equal(choices.length,6);
 assert.ok(choices.some(x=>labels(x).includes('Comercial')));
});
test('el creador entra en Comercial con la sesión real y puede cambiar de área',()=>{
 const ctx=load();ctx.win.konsorDesigner.showChooser();
 assert.equal(ctx.win.konsorDesigner.open('comercial'),true);
 assert.equal(ctx.win.homeOpened,true);
 assert.equal(ctx.win.konsorDesigner.current(),'comercial');
 assert.equal(ctx.body.children.find(x=>x.id==='konsorAreaChooser'),undefined);
 assert.equal(ctx.win.konsorDesigner.showChooser(),true);
 assert.equal(ctx.win.konsorDesigner.open('oficina'),true);
 assert.equal(ctx.win.konsorDesigner.current(),'oficina');
 assert.ok(ctx.body.children.find(x=>x.id==='konsorDesignerPreview'));
});
test('las vistas de distintos puestos reutilizan la misma estructura del Inicio',()=>{
 const ctx=load();
 for(const role of ['ceo','jefe','oficina','tecnicos','trabajador']){
  assert.equal(ctx.win.konsorDesigner.open(role),true);
  const preview=ctx.body.children.find(x=>x.id==='konsorDesignerPreview');
  assert.ok(preview);
  const names=flattened(preview).map(x=>x.className);
  for(const classname of ['cnv-home','cnv-home-head','cnv-home-content','cnv-home-hero','cnv-home-grid','cnv-home-footer'])
   assert.ok(names.some(n=>n.split(' ').includes(classname)),role+' sin '+classname);
  assert.ok(labels(preview).includes('SIGUIENTE PASO RECOMENDADO'));
  assert.ok(labels(preview).includes('VISTA DE DISEÑO'));
  assert.ok(labels(preview).includes('Cambiar área'));
 }
});
test('nadie fuera del perfil fundador puede abrir el selector ni vistas de otros puestos',()=>{
 for(const profile of [{uid:null},{role:'comercial'},{name:'Mikel (Jefe)'},{key:'comercial1'}]){
  const ctx=load(profile);
  assert.equal(ctx.win.konsorDesigner.permitted(),false);
  assert.equal(ctx.win.konsorDesigner.showChooser(),false);
  assert.equal(ctx.win.konsorDesigner.open('ceo'),false);
  assert.equal(ctx.body.children.length,0);
 }
});
test('la selección no modifica roles, permisos ni datos',()=>{
 const ctx=load();
 assert.equal(ctx.win.konsorDesigner.open('tecnicos'),true);
 assert.ok(labels(ctx.body.children[0]).includes('Fotografías antes y después'));
 for(const key of ['KonsorBridge.save','setProfile(','sessionStorage.setItem','fetch('])
  assert.equal(source.includes(key),false,key);
 assert.equal(/currentUserRole\s*=(?!=)/.test(source),false);
 ctx.win.auth.currentUser=null;
 assert.equal(ctx.win.konsorDesigner.open('ceo'),false);
 assert.equal(ctx.body.children.length,0);
});
test('Inicio no incluye pestañas; el selector se llama después del login',()=>{
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const home=fs.readFileSync(path.join(root,'inicio-ios.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'app/legacy/comercial-app.js'),'utf8');
 assert.ok(index.indexOf('designer-role-preview.js')<index.indexOf('inicio-ios.js'));
 assert.ok(!home.includes('konsorDesigner?.mount?.(section)'));
 assert.ok(home.includes('window.konsorDesigner.showChooser()'));
 const start=app.slice(app.indexOf('function startSessionForUserKey('),app.indexOf('/* ===== PANEL DE ACCESOS',app.indexOf('function startSessionForUserKey(')));
 assert.ok(start.indexOf('window.cnvStart?.()')<start.indexOf('window.konsorDesigner?.showChooser?.()'));
 assert.ok(css.includes('.kdp-chooser')&&css.includes('.kdp-role-home'));
});
