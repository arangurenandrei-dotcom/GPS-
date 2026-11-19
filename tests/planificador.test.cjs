const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../planificador-konsor.js'), 'utf8');

test('el planificador abre el borrador de la sesión actual y conserva la fecha al vaciar el campo', () => {
 class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.style = {}; }
  append(child) { this.children.push(child); }
  insertBefore(child, before) { this.children.splice(this.children.indexOf(before), 0, child); }
  setAttribute() {}
  remove() { this.removed = true; }
 }
 const body = new Element('body');
 const store = new Map();
 const window = {};
 let account;
 const context = {
  window, currentUserRole: 'jefe', currentUserName: '',
  sessionStorage: { getItem() { return account; } },
  localStorage: {
   getItem: key => store.get(key),
   setItem: (key, value) => store.set(key, value),
  },
  document: {
   body, createElement: tag => new Element(tag),
   getElementById: id => body.children.findLast(child => child.id === id && !child.removed),
  },
 };
 vm.runInNewContext(script, context);
 function fixture(login, owner, start) {
  store.set('konsor_plan_v1_' + login, JSON.stringify({ owner, start, step: 0, period: '7', members: [owner], edits: {} }));
 }
 function findDate(el) {
  if (el.tag === 'input' && el.type === 'date') return el;
  for (const child of el.children) {
   const date = findDate(child);
   if (date) return date;
  }
 }
 function open(login, name) {
  account = login;
  context.currentUserName = name;
  window.konsorPlanificador.open();
  return findDate(body.children.at(-1));
 }
 fixture('demo_andrei', 'Andrei (Jefe)', '2026-11-23');
 fixture('demo_mikel', 'Mikel (Jefe)', '2026-11-30');
 const andrei = open('demo_andrei', 'Andrei (Jefe)');
 assert.equal(andrei.value, '2026-11-23');
 andrei.value = '';
 andrei.onchange();
 assert.equal(andrei.value, '2026-11-23');
 assert.equal(open('demo_mikel', 'Mikel (Jefe)').value, '2026-11-30');
 assert.equal(open('demo_andrei', 'Andrei (Jefe)').value, '2026-11-23');
});
