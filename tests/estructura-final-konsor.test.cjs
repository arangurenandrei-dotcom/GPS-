'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Comercial muestra cinco accesos, Dirección solo al jefe',()=>{
 const home=read('inicio-ios.js');
 for(const title of ['Mi jornada','Mapa','Oficina','Resultados','Mensajes entre plantas'])
  assert.ok(home.includes('tile(grid,"'+title+'"'),title);
 assert.ok(home.includes('if(boss())'));
 assert.ok(home.includes('tile(grid,"Dirección"'));
 assert.ok(home.includes('if(typeof window.openCnOffice==="function")window.openCnOffice()'));
});
test('Oficina tiene exactamente cuatro módulos principales, y altas sin sector',()=>{
 const src=read('oficina-ios.js');
 const a=src.indexOf('const shortcuts=['),b=src.indexOf('];',a);
 const shortcuts=src.slice(a,b);
 assert.deepEqual([...shortcuts.matchAll(/\["(Clientes|Llamadas|Calendario|Obras)"/g)].map(m=>m[1]),['Clientes','Llamadas','Calendario','Obras']);
 assert.ok(src.includes('openNewClient("guided")'));
 assert.ok(src.includes('openNewClient("full")'));
 assert.ok(src.includes('cn-office-more'));
 assert.ok(!src.includes('!z.isSingleHouse'));
 assert.ok(!src.includes('!z.isLegacyPortfolio'));
});
test('Dirección muestra solo Territorio, Cierre y Mi equipo al inicio',()=>{
 const src=read('direccion-hub-ios.js');
 const a=src.indexOf('const grid=el("div","kd-nav-grid"'),b=src.indexOf('const other=el("details","kd-more"',a);
 const main=src.slice(a,b);
 assert.deepEqual([...main.matchAll(/tile\(grid,"([^"]+)"/g)].map(m=>m[1]),['Territorio','Cierre del día','Mi equipo']);
 const advanced=src.slice(b,src.indexOf('/* Plan de Dirección',b));
 assert.ok(advanced.includes('Resultados del equipo'));
 assert.ok(advanced.includes('Mensajes entre plantas'));
 assert.ok(advanced.includes('Volcado de sectores'));
});
test('Resultados Comercial no puede cambiar por selector a todo el equipo',()=>{
 const src=read('resultados-ios.js');
 assert.ok(src.includes('scope=which==="team"&&teamAllowed()?"team":"me"'));
 assert.ok(!src.includes('segment(scopeBox,[["me","Mis resultados"],["team","Todo mi equipo"]]'));
 assert.ok(src.includes('window.openKonsorTeamResults=()=>open("team")'));
});
test('los recursos y cambios de estilos se cargan desde la versión actualizada',()=>{
 const html=read('index.html');
 for(const suffix of ['oficina-ios.js?v=15','direccion-hub-ios.js?v=18','resultados-ios.js?v=9','ios-unified.css?v=15'])
  assert.ok(html.includes(suffix),suffix);
 const css=read('ios-unified.css');
 assert.ok(css.includes('.cn-office-home-grid'));
});

test('repositorio sin laboratorios históricos y sin scripts locales cargados dos veces',()=>{
 assert.ok(!fs.existsSync(path.join(root,'konsor-laboratorio')),'Demos antiguas no deben permanecer en producción');
 const html=read('index.html');
 const sources=[...html.matchAll(/<script[^>]*src=["']([^"']+)["']/g)]
  .map(m=>m[1].split('?')[0]).filter(x=>!x.startsWith('http'));
 assert.equal(new Set(sources).size,sources.length,'No cargar dos veces los mismos scripts');
});
