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
assert.equal(read('app/legacy/comercial-app.js'),main[2],'Cambió el JS comercial extraído');
assert.equal(read('app/legacy/firebase-init.js'),mod[2],'Cambió la inicialización original de Firebase');
assert.equal(read('app/legacy/limpieza-visual.js'),cleanup[2],'Cambió el limpiador visual');
new vm.Script(main[2],{filename:'comercial-app.js'});
new vm.Script(cleanup[2],{filename:'limpieza-visual.js'});
let rebuilt=original.replace(styles[0][0],'<link rel="stylesheet" href="./app/legacy/estilos-comercial.css?v=1">');
rebuilt=rebuilt.replace(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi,'');
rebuilt=rebuilt.replace(main[0],'<script src="./app/legacy/comercial-app.js?v=1"></script>');
rebuilt=rebuilt.replace(mod[0],'<script type="module" src="./app/legacy/firebase-init.js?v=1"></script>');
rebuilt=rebuilt.replace(cleanup[0],'<script src="./app/legacy/limpieza-visual.js?v=1"></script>');
assert.equal(read('index.html'),rebuilt,'El HTML no coincide con la extracción mecánica esperada');
console.log('OK: extracción exacta y verificable. 22 estilos, 3 scripts, sin cambios de lógica.');
