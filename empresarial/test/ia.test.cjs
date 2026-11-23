'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { clasificarParte, resumenIA } = require('../server/ia.cjs');

test('Clasificación de Gemini con datos mínimos y categorías permitidas', async () => {
  const resultado = await clasificarParte({
    apiKey: 'clave-prueba', modelo: 'modelo-prueba',
    partes: { cambioSuperficie: 'alto', subsanaciones: 'una', informacionInterna: 'privada' },
    transporte: async (url, config) => {
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/modelo-prueba:generateContent');
      assert.equal(config.headers['x-goog-api-key'], 'clave-prueba');
      assert.ok(!config.body.includes('privada'));
      const body = JSON.parse(config.body);
      assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), { cambioSuperficie: 'alto', subsanaciones: 'una' });
      assert.deepEqual(body.generationConfig.responseSchema.properties.prioridad.enum,
        ['revision_ordinaria', 'revisar_medicion', 'revisar_subsanaciones']);
      return { ok: true, json: async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"prioridad":"revisar_medicion"}' }] } }]
      }) };
    }
  });
  assert.equal(resultado, 'revisar_medicion');
});

test('Rechaza resultados incompatibles y limita la repetición', async () => {
  const base = { apiKey: 'clave-prueba', modelo: 'modelo-prueba',
    partes: { cambioSuperficie: 'primera', subsanaciones: 'ninguna' } };
  await assert.rejects(clasificarParte({ ...base, transporte: async () => ({ ok: false }) }), /Proveedor/);
  await assert.rejects(clasificarParte({ ...base, transporte: async () => ({ ok: true, json: async () => ({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"prioridad":"revisar_medicion"}' }] } }]
  }) }) }), /inválida/);
  assert.equal(resumenIA({ estado: 'fallida', intentos: 3 }).reintentar, false);
  assert.equal(resumenIA({ estado: 'procesando', intentos: 2, hasta: Date.now() - 100 }).reintentar, true);
});
