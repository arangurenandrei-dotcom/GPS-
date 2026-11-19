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
   querySelectorAll: () => [],
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
