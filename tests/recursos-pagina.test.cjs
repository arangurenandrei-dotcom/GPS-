'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function localResources(tag,attr){
 const tags=[...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>','gi'))].map(x=>x[0]);
 return tags.map(s=>(s.match(new RegExp('\\b'+attr+'=["\\\']([^"\\\']+)["\\\']','i'))||[])[1]).filter(Boolean).filter(url=>!/^https?:|^data:|^#/.test(url));
}
test('cada script local y hoja CSS que carga index existe',()=>{
 const srcs=localResources('script','src');
 const css=localResources('link','href').filter(x=>/\.css(?:\?|$)/.test(x));
 for(const url of [...srcs,...css]){
  const file=path.resolve(root,url.split('?')[0]);
  assert.ok(file.startsWith(root+path.sep),'No se permiten rutas fuera del repositorio: '+url);
  assert.ok(fs.existsSync(file),'Falta un recurso del HTML: '+url);
 }
 assert.ok(srcs.length>=20,'Los módulos comerciales deben seguir montándose');
 assert.ok(css.length>=5,'Faltan estilos comerciales');
});
test('el motor común se carga antes de Inicio',()=>{
 assert.ok(html.indexOf('app/core/asistente-operativo.js')>=0);
 assert.ok(html.indexOf('app/core/asistente-operativo.js')<html.indexOf('inicio-ios.js'));
});
test('el HTML no contiene motor ni estilos comerciales antiguos duplicados',()=>{
 assert.ok(!html.includes('function calculatePolygonAreaM2('));
 assert.ok(!html.includes('const CANONICAL_USER_NAMES = {'));
 assert.ok(!/<style\b/i.test(html));
});
