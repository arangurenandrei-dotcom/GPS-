'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app/ui/componentes-ios.js'),'utf8');
function setup(){
 const window={};
 const document={
  createElement(tag){
   return {tag,children:[],className:'',textContent:'',innerHTML:'',type:'',_events:{},
    append(node){this.children.push(node);},
    addEventListener(name,fn){this._events[name]=fn;}};
  }
 };
 vm.runInNewContext(source,{window,document});
 return window.KonsorUI;
}
test('componentes comunes preservan clases, texto y acciones de Inicio',()=>{
 const ui=setup(),root=ui.el('section','myclass','Hola');
 assert.equal(root.tag,'section');assert.equal(root.className,'myclass');assert.equal(root.textContent,'Hola');
 let called=0;
 const button=ui.button('Continuar',()=>{called++;},'cnv-home-primary');
 assert.equal(button.className,'cnv-button cnv-home-primary');
 assert.equal(button.type,'button');
 button._events.click();
 assert.equal(called,1);
});
test('los iconos iOS son SVG constantes y no convierten texto de usuario en HTML',()=>{
 const ui=setup();
 const map=ui.icon('map'),unknown=ui.icon('unknown');
 assert.equal(map.className,'cnv-icon');
 assert.match(map.innerHTML,/<svg/);
 assert.match(map.innerHTML,/<path/);
 assert.equal(unknown.innerHTML,map.innerHTML,'Icono desconocido tiene fallback establecido');
});
