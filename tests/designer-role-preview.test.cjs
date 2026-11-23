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
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.style={};this.attrs={};this.textContent='';this.className='';}
 append(el){this.children.push(el);el.parent=this;return el;}
 setAttribute(k,v){this.attrs[k]=v;}
 remove(){this.parent?.children.splice(this.parent.children.indexOf(this),1);}
 querySelector(selector){if(selector==='#konsorDesignerAccess')return this.children.find(x=>x.id==='konsorDesignerAccess')||null;return null;}
 addEventListener(){}
}
function load({uid='creator',name='Andrei (Jefe)',role='jefe',key='jefe'}={}){
 const body=new Element('body'),home=new Element('section');
 const container={style:{display:'block'}};
 const byId=id=>id==='appContainer'?container:(id==='konsorDesignerPreview'?body.children.find(x=>x.id===id):null);
 const window={auth:{currentUser:uid?{uid}:null},cnvShowHome:()=>{window.homeOpened=true;}};
 const context={window,document:{body,createElement:tag=>new Element(tag),getElementById:byId},
   sessionStorage:{getItem:k=>k==='auth_user_key'?key:null},
   currentUserName:name,currentUserRole:role};
 vm.runInNewContext(source,context);
 return {window,home,body,container};
}
test('solo una sesión aprobada del perfil fundador ve pestañas de diseño',()=>{
 let ctx=load();assert.equal(ctx.window.konsorDesigner.permitted(),true);
 ctx.window.konsorDesigner.mount(ctx.home);
 assert.ok(ctx.home.children.some(x=>x.id==='konsorDesignerAccess'));
 assert.equal(ctx.home.children.find(x=>x.id==='konsorDesignerAccess').children[2].children.length,6);
 for(const profile of [{uid:null},{role:'comercial'},{name:'Mikel (Jefe)'},{key:'comercial1'}]){
  ctx=load(profile);assert.equal(ctx.window.konsorDesigner.permitted(),false);
  ctx.window.konsorDesigner.mount(ctx.home);assert.equal(ctx.home.children.length,0);
  assert.equal(ctx.window.konsorDesigner.open('ceo'),false);
 }
});
test('al entrar se conserva Comercial como trabajo principal',()=>{
 const ctx=load();ctx.window.konsorDesigner.mount(ctx.home);
 const section=ctx.home.children[0],tabs=section.children[2];
 assert.equal(tabs.children[0].attrs['aria-pressed'],'true');
 assert.equal(tabs.children[0].children[0].textContent,'Comercial');
 assert.equal(ctx.window.konsorDesigner.open('comercial'),true);
 assert.equal(ctx.window.homeOpened,true);
});
test('previsualización aislada: no cambia roles, no guarda datos ni crea sesiones ficticias',()=>{
 const ctx=load();
 assert.equal(ctx.window.konsorDesigner.open('tecnicos'),true);
 const preview=ctx.body.children.find(x=>x.id==='konsorDesignerPreview');
 assert.ok(preview);
 const textAll=JSON.stringify(preview,(key,value)=>key==='parent'||key==='onclick'?undefined:value);
 assert.ok(textAll.includes('SOLO PREVISUALIZACIÓN'));
 assert.ok(textAll.includes('Fotografías antes y después'));
 for(const sensitive of ['KonsorBridge.save','setProfile(','sessionStorage.setItem','fetch('])
  assert.equal(source.includes(sensitive),false,sensitive);
 assert.equal(/currentUserRole\s*=(?!=)/.test(source),false,'Nunca asignar un rol durante la vista previa');
 ctx.window.auth.currentUser=null;
 assert.equal(ctx.window.konsorDesigner.open('oficina'),false);
 assert.equal(ctx.body.children.find(x=>x.id==='konsorDesignerPreview'),undefined);
});
test('archivos se cargan antes del Inicio y los accesos tienen apariencia táctil',()=>{
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const home=fs.readFileSync(path.join(root,'inicio-ios.js'),'utf8');
 assert.ok(index.indexOf('designer-role-preview.js')<index.indexOf('inicio-ios.js'));
 assert.ok(home.includes('window.konsorDesigner?.mount?.(section)'));
 assert.ok(css.includes('.kdp-home-tabs')&&css.includes('.kdp-overlay'));
 assert.ok(css.includes('safe-area-inset-bottom'));
});
