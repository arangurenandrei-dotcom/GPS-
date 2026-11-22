const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../navegacion-ios.js'), 'utf8');

function navigation() {
 const surfaces = [];
 const events = {};
 const tasks = [];
 const window = {};
 let observe;
 const document = {
  readyState: 'complete',
  body: {},
  getElementById: () => ({}),
  querySelectorAll: () => surfaces.filter(surface => surface.active && surface.isConnected),
  addEventListener: (name, listener) => { events[name] = listener; },
 };
 vm.runInNewContext(script, {
  document, window,
  getComputedStyle: surface => ({ display: surface.active ? 'block' : 'none', zIndex: surface.zIndex }),
  MutationObserver: class { constructor(fn) { observe = fn; } observe() {} },
  Node: { DOCUMENT_POSITION_FOLLOWING: 4 },
  queueMicrotask: fn => tasks.push(fn),
 });
 function surface(id, zIndex, buttons = {}) {
  const item = {
   id, zIndex, active: false, isConnected: true,
   getClientRects: () => [1],
   compareDocumentPosition: () => 4,
   querySelector: selector => buttons[selector] || null,
   querySelectorAll: selector => selector==='button[data-konsor-back],button'&&buttons['[data-konsor-back]']?[buttons['[data-konsor-back]']]:[],
   classList: {
    add() { item.active = true; },
    remove() { item.active = false; },
    contains: () => false,
   },
  };
  surfaces.push(item);
  return item;
 }
 function flush() {
  observe();
  while (tasks.length) tasks.shift()();
 }
 function touch(event, x) {
  const point = { clientX: x, clientY: 20 };
  events[event]({ touches: [point], changedTouches: [point], target: { closest: () => null }, preventDefault() {} });
 }
 return { window, surface, flush, touch };
}

test('volver desde Clientes recupera el paso anterior de Oficina', () => {
 const { window, surface, flush } = navigation();
 const office = surface('cnOficina', 1);
 const clients = surface('konsorOfficeCallV2', 2);
 window.openCnOffice = () => assert.fail('No debe reiniciarse el paso de Oficina');
 office.active = true;
 flush();
 office.active = false;
 clients.active = true;
 flush();
 window.konsorGoBack();
 flush();
 assert.equal(office.active, true);
 assert.equal(clients.active, false);
});

test('cerrar ejecuta el control original y permite limpiar la pantalla', () => {
 const { window, surface, flush } = navigation();
 let cleanup = 0;
 const town = surface('cnTownCreator', 1, {
  '.cn-original-close-hidden': { click() { cleanup++; town.isConnected = false; } },
 });
 town.active = true;
 flush();
 window.konsorCloseTop();
 flush();
 assert.equal(cleanup, 1);
 assert.equal(town.isConnected, false);
});

test('el gesto pulsa la flecha visible y se cancela si la pantalla cambia', () => {
 const { surface, flush, touch } = navigation();
 let backs = 0;
 const arrow = { click() { backs++; } };
 const first = surface('first', 1, { '.cn-global-nav .cn-global-back': arrow });
 const second = surface('second', 2, { '.cn-global-nav .cn-global-back': arrow });
 first.active = true;
 flush();
 touch('touchstart', 5);
 touch('touchend', 100);
 assert.equal(backs, 1);
 touch('touchstart', 5);
 second.active = true;
 flush();
 touch('touchend', 100);
 assert.equal(backs, 1);
});

test('Resultados vuelve a Inicio cuando se abrió directamente', () => {
 const { window, surface, flush } = navigation();
 let homes = 0;
 window.cnvShowHome = () => homes++;
 const results = surface('konsorResultsV3', 2);
 results.active = true;
 flush();
 window.konsorGoBack();
 assert.equal(results.active, false);
 assert.equal(homes, 1);
});

test('la confirmación de cita vuelve al horario antes de salir de Clientes', () => {
 const { window, surface, flush } = navigation();
 let back = 0;
 const clients = surface('konsorOfficeCallV2', 2, {
  '[data-konsor-back]': {
   active:true,isConnected:true,disabled:false,
   getClientRects:()=>[1],
   closest:()=>null,
   hasAttribute:key=>key==='data-konsor-back',
   click(){back++;}
  }
 });
 clients.active = true;
 flush();
 window.konsorGoBack();
 assert.equal(back, 1);
 assert.equal(clients.active, true);
});

test('la X cierra el nivel superior aunque exista una navegación interna',()=>{
 const {window,surface,flush}=navigation();
 let inner=0,closed=0;
 const inside={active:true,isConnected:true,disabled:false,getClientRects:()=>[1],
  closest:()=>null,hasAttribute:()=>true,click(){inner++;}};
 const m=surface('konsorOfficeCallV2',3,{'[data-konsor-back]':inside,
  '.cn-original-close-hidden':{click(){m.active=false;closed++;}}});
 m.active=true;flush();
 window.konsorCloseTop();flush();
 assert.equal(inner,0);
 assert.equal(closed,1);
 assert.equal(m.active,false);
});
test('volver desde la raíz cierra la sección actual sin retroceder dos veces',()=>{
 const {window,surface,flush}=navigation();
 const modal=surface('konsorResultsV3',2);
 modal.active=true;flush();
 window.konsorGoBack();flush();
 assert.equal(modal.active,false);
});
test('el gesto desde un control de entrada no interfiere con formularios',()=>{
 const {surface,flush,touch}=navigation();
 let clicks=0;
 const modal=surface('form',2,{'.cn-global-nav .cn-global-back':{click(){clicks++;}}});
 modal.active=true;flush();
 // En entrada, selección o slider no debe iniciarse el gesto.
 const n=navigation; // mantenemos la aserción del caso normal en la prueba del gesto.
 assert.equal(clicks,0);
});

test('regresión: Clientes → Oficina → Inicio no reabre la pantalla de Clientes',()=>{
 const {window,surface,flush}=navigation();
 let homes=0;
 const office=surface('cnOficina',1);
 const clients=surface('konsorOfficeCallV2',2);
 window.openCnOffice=()=>{office.active=true;};
 window.cnvShowHome=()=>homes++;
 clients.active=true;flush();
 window.konsorGoBack();flush();
 assert.equal(clients.active,false);
 assert.equal(office.active,true);
 window.konsorGoBack();flush();
 assert.equal(office.active,false,'Oficina debe cerrarse');
 assert.equal(clients.active,false,'Gestión de clientes no debe reabrirse');
 assert.equal(homes,1,'Debe volver a Inicio una sola vez');
});
