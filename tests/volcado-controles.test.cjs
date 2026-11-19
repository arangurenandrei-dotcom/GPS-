const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

test('el volcado mantiene la identidad y el valor del control al cambiar de paso', () => {
  const source = readFileSync(join(__dirname, '../volcado-guiado-ios.js'), 'utf8');
  const input = { value: '3', before(anchor) { this.anchor = anchor; } };
  let restored;
  const document = { createComment: () => ({
    isConnected: true, replaceWith(node) { restored = node; }
  }) };
  const presented = [];
  const el = () => ({ append(node) { presented.push(node); } });
  const context = { document, original: () => input, el };
  vm.runInNewContext(source.slice(source.indexOf('const positions'), source.indexOf('function sectorStatusControl')), context);
  context.field({}, 'dumpSi', 'Interesados');
  assert.equal(presented[0], input);
  presented[0].value = '4';
  context.restoreFields();
  assert.equal(restored, input);
  assert.equal(restored.value, '4');
});
