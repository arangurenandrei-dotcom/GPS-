/* Pruebas sin dependencias del edificio. Ejecutar: node --test tests/edificio-konsor.test.cjs */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const rootDir=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(rootDir,'edificio-konsor.js'),'utf8');

function node(tag){
 return {
  tagName:tag.toUpperCase(),id:'',className:'',textContent:'',hidden:false,disabled:false,
  children:[],attributes:{},listeners:{},
  appendChild(c){this.children.push(c);c.parentNode=this;return c;},
  addEventListener(type,fn){this.listeners[type]=fn;},
  click(){if(this.listeners.click)this.listeners.click();},
  setAttribute(k,v){this.attributes[k]=String(v);},
  replaceChildren(...children){this.children=children;children.forEach(c=>c.parentNode=this);},
  focus(){},
  querySelector(selector){
   const cls=selector.startsWith('.')?selector.slice(1):null;
   function find(n){
    for(const c of n.children){
     if(cls&&c.className.split(/\s+/).includes(cls))return c;
     const d=find(c);if(d)return d;
    }
    return null;
   }
   return find(this);
  }
 };
}
function all(n,cls,out=[]){
 if(n.className.split(/\s+/).includes(cls))out.push(n);
 n.children.forEach(c=>all(c,cls,out));
 return out;
}
function setup(name,role){
 const doc={
  body:node('body'),activeElement:null,
  createElement:node,addEventListener(){},
  getElementById(id){
   const walk=n=>n.id===id?n:n.children.map(walk).find(Boolean);
   return walk(this.body)||null;
  }
 };
 const app=node('div');app.id='appContainer';doc.body.appendChild(app);
 const win={};
 const zones=[
  {id:'1',comercial:name,streetCompletedAt:100,status:'en_proceso',clients:[{name:'Uno',obraStatus:'agendada'}]},
  {id:'2',comercial:'Otra persona',status:'completada',clients:[{name:'Dos'}]}
 ];
 const context={window:win,document:doc,currentUserName:name,currentUserRole:role,savedZones:zones,
  getComputedStyle:()=>({display:'block'}),alert:()=>{}};
 vm.runInNewContext(code,context);
 return {win,doc,open:win.abrirEdificioKonsor};
}
test('Se integra sin dependencias y conserva los cinco departamentos',()=>{
 const {win,doc,open}=setup('Andrei (Jefe)','jefe');
 open();
 const floors=all(doc.getElementById('keEdificio'),'ke-floor');
 assert.equal(floors.length,5);
 assert.equal(floors.filter(f=>!f.disabled).length,5);
 assert.equal(win.KonsorEdificio.state().role,'ceo');
 assert.equal(win.KonsorEdificio.metrics().zones,2);
 floors[0].click();
 assert.equal(win.KonsorEdificio.state().floor,'direccion');
 doc.getElementById('keEdificio').querySelector('.ke-back').click();
 assert.equal(win.KonsorEdificio.state().floor,null);
 doc.getElementById('keEdificio').querySelector('.ke-close').click();
 assert.equal(doc.getElementById('keEdificio').hidden,true);
});
test('Comercial no accede a plantas de administración ni dirección',()=>{
 const {win,doc,open}=setup('Persona comercial','comercial');
 open();
 const floors=all(doc.getElementById('keEdificio'),'ke-floor');
 assert.equal(floors.filter(f=>!f.disabled).length,2);
 assert.equal(win.KonsorEdificio.metrics().zones,1);
 assert.equal(win.KonsorEdificio.metrics().dump,1);
});
test('Jefe de equipo mantiene acceso a cuatro plantas y no a administración',()=>{
 const {win,doc,open}=setup('Mikel (Jefe)','jefe');
 open();
 const floors=all(doc.getElementById('keEdificio'),'ke-floor');
 assert.equal(floors.filter(f=>!f.disabled).length,4);
 assert.equal(floors[1].disabled,true);
 assert.equal(win.KonsorEdificio.state().role,'jefe');
});
test('Los perfiles especializados abren únicamente sus departamentos',()=>{
 for(const [role,expected] of [['tecnico',2],['oficina',1],['administracion',1]]){
  const {doc,open}=setup('Cuenta de '+role,role);open();
  assert.equal(all(doc.getElementById('keEdificio'),'ke-floor').filter(f=>!f.disabled).length,expected);
 }
});
test('El inicio y el documento principal incluyen el módulo',()=>{
 const index=fs.readFileSync(path.join(rootDir,'index.html'),'utf8');
 const home=fs.readFileSync(path.join(rootDir,'inicio-ios.js'),'utf8');
 assert.ok(index.includes('edificio-konsor.js?v=1'));
 assert.ok(index.includes('edificio-konsor.css?v=1'));
 assert.ok(home.includes('tile(grid,"Edificio KONSOR"'));
});
