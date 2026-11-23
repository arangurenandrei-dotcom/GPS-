'use strict';
// Garantiza que el primer refactor no haya cambiado la lógica heredada.
// Ejecutar: node tests/verificar-extraccion.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const sha='3a9705197af033d3ef85cb3be69bb0330de1eccf';
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const original=execFileSync('git',['show',sha+':index.html'],{cwd:root,encoding:'utf8',maxBuffer:10*1024*1024});
const styles=[...original.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)];
const scripts=[...original.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
assert.equal(styles.length,22,'La versión inicial tenía 22 bloques CSS');
const main=scripts.find(m=>m[2].length>500000&&m[1].trim()==='');
const mod=scripts.find(m=>/\btype\s*=\s*["']module["']/i.test(m[1]));
const cleanup=scripts.find(m=>m[2].includes('function cleanDecorativeUi'));
assert.ok(main&&mod&&cleanup,'No se reconocen los scripts originales');
const css='/* KONSOR — CSS heredado extraído sin alterar las declaraciones ni el orden de cascada. */\n'+
 styles.map((s,i)=>'/* == Original <style> '+(i+1)+'/22 == */\n'+s[1]).join('\n');
assert.equal(read('app/legacy/estilos-comercial.css'),css,'Cambió el CSS extraído');
function removeUnused(source,name){
 const matcher=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(');
 const m=matcher.exec(source);
 assert.ok(m,'Función histórica no encontrada: '+name);
 assert.equal((source.match(new RegExp('\\b'+name+'\\b','g'))||[]).length,1,'La función todavía tiene referencias: '+name);
 let end=m.index,found=null;
 while((end=source.indexOf('\n',end+1))>=0){
  const snippet=source.slice(m.index,end);
  if(snippet.length<60)continue;
  try{new vm.Script(snippet);found=end;break}catch{}
  if(end-m.index>18000)break;
 }
 assert.notEqual(found,null,'No se puede aislar la función: '+name);
 return source.slice(0,m.index)+source.slice(found+1);
}
const obsolete=['updateClientCallStatusOld','renderGlobalClientSearchResultsOld','exportOfficialCrmJsonPackageOld','requestMobileNotificationsOld'];
const maintained=obsolete.reduce(removeUnused,main[2]).replace(
 '    async function authFinishLogin(user) {',
 '    async function authFinishLogin(user) {\n      if (window.KonsorIntegracion) return window.KonsorIntegracion.abrirSesion(user);')
 .replace('      if (!window.authApi) return;\n      profilesWatchStarted = true;',
  '      if (!window.authApi?.watchProfiles) return;\n      profilesWatchStarted = true;')
 .replace('    function openAccessAdminModal() {',
  '    function openAccessAdminModal() {\n      if (window.KonsorIntegracion) return window.KonsorIntegracion.equipo();');
assert.equal(read('app/legacy/comercial-app.js'),maintained,'El motor comercial cambió fuera de la limpieza auditada');
assert.equal(read('app/legacy/firebase-init.js'),mod[2],'Cambió la inicialización original de Firebase');
assert.equal(read('app/legacy/limpieza-visual.js'),cleanup[2],'Cambió el limpiador visual');
new vm.Script(maintained,{filename:'comercial-app.js'});
new vm.Script(cleanup[2],{filename:'limpieza-visual.js'});
let rebuilt=original.replace(styles[0][0],'<link rel="stylesheet" href="./app/legacy/estilos-comercial.css?v=1">');
rebuilt=rebuilt.replace(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi,'');
rebuilt=rebuilt.replace(main[0],'<script src="./app/legacy/comercial-app.js?v=1"></script>');
rebuilt=rebuilt.replace(mod[0],'<script type="module" src="./app/legacy/firebase-init.js?v=1"></script>');
rebuilt=rebuilt.replace(cleanup[0],'<script src="./app/legacy/limpieza-visual.js?v=1"></script>');
const current=read('index.html');
assert.ok(current.includes('<script src="./app/legacy/comercial-app.js?v=1"></script>'));
assert.ok(current.includes('<script type="module" src="./app/legacy/firebase-init.js?v=1"></script>'));
assert.ok(current.includes('<link rel="stylesheet" href="./app/legacy/estilos-comercial.css?v=1">'));
assert.ok(current.includes('id="appContainer"')&&current.includes('id="loginScreen"'));
assert.equal((current.match(/<style\b/gi)||[]).length,0,'No debe quedar CSS inline heredado');
assert.ok(!current.includes('const CANONICAL_USER_NAMES = {'),'No debe duplicarse el motor viejo en index');
assert.ok(current.indexOf('app/core/asistente-operativo.js')<current.indexOf('inicio-ios.js'),'El motor común debe cargar antes de Inicio');
assert.ok(current.length<original.length/10,'El HTML no debe volver a crecer con lógica y CSS embebidos');
console.log('OK: extracción auditada y punto de entrada de la sesión integrada verificado.');
