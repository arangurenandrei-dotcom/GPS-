'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../cartera-antigua-ios.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../oficina-llamadas-obras-v2.css'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('el correo válido no se rechaza por barras duplicadas en la expresión regular',()=>{
 const matched=src.match(/if\(d\.email&&!\/(.+?)\/\.test\(d\.email\)\)/);
 assert.ok(matched,'No se encontró validador de correo');
 const regex=new RegExp(matched[1]);
 for(const email of ['roxigomam@yahoo.es','ejemplo@gmail.com','comercial+obras@konsor.es'])
  assert.equal(regex.test(email),true,'Debe aceptar '+email);
 for(const email of ['incorrecto','usuario @correo.es','usuario@dominio','a@@b.es','a@ b.es'])
  assert.equal(regex.test(email),false,'Debe rechazar '+email);
});
test('guardar retira mensajes de error anteriores y no modifica las fichas al validar',()=>{
 assert.match(src,/async function save\(ready,button\)\{\s*box\.querySelector\("\.kha-live-error"\)\?\.remove\(\)/);
 assert.match(src,/window\.KonsorBridge\.save\("comercial_custom_zones",candidate\)/);
});
test('ficha y llamadas comparten estética iOS KONSOR',()=>{
 assert.ok(src.includes('#konsorLegacyPortfolio .kha-mode-switch'));
 assert.ok(src.includes('background:#293f59'));
 assert.ok(css.includes('#konsorOfficeCallV2 .koc-btn.koc-primary{background:#293f59'));
 assert.ok(css.includes('#konsorOfficeCallV2 .koc-scope-picker'));
 assert.ok(html.includes('cartera-antigua-ios.js?v=13'));
 assert.ok(html.includes('oficina-llamadas-obras-v2.css?v=14'));
});
test('el archivo JS de ficha mantiene sintaxis válida',()=>assert.doesNotThrow(()=>new Function(src)));
