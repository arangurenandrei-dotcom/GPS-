'use strict';

const { randomUUID } = require('node:crypto');

const prioridades = {
  revision_ordinaria: 'Revisar el parte con el procedimiento habitual.',
  revisar_medicion: 'Comprobar la diferencia de superficie respecto al parte anterior.',
  revisar_subsanaciones: 'Comprobar que el parte resuelve las subsanaciones anteriores.'
};

function opciones(partes) {
  return [
    'revision_ordinaria',
    ...(partes.cambioSuperficie === 'alto' ? ['revisar_medicion'] : []),
    ...(partes.subsanaciones !== 'ninguna' ? ['revisar_subsanaciones'] : [])
  ];
}

async function clasificarParte({ apiKey, modelo, partes, transporte = fetch }) {
  const categorias = opciones(partes);
  const respuesta = await transporte(
    'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelo) + ':generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'Ayudas a Oficina a priorizar la revisión de un parte de instalación. Selecciona una categoría permitida. Si hay varias incidencias, prioriza la que requiere más atención. Utiliza revisión ordinaria cuando no hay incidencias.' }] },
        contents: [{ parts: [{ text: JSON.stringify({
          cambioSuperficie: partes.cambioSuperficie, subsanaciones: partes.subsanaciones
        }) }] }],
        generationConfig: {
          responseMimeType: 'application/json', maxOutputTokens: 1024,
          responseSchema: {
            type: 'OBJECT', required: ['prioridad'],
            properties: { prioridad: { type: 'STRING', enum: categorias } }
          }
        }
      })
    }
  );
  if (!respuesta.ok) throw new Error('Proveedor no disponible');
  const payload = await respuesta.json();
  const candidate = payload.candidates?.[0];
  if (candidate?.finishReason !== 'STOP') throw new Error('Clasificación incompleta');
  const contenido = (candidate.content?.parts ?? []).filter(part => !part.thought).map(part => part.text).join('');
  const { prioridad } = JSON.parse(contenido);
  if (!categorias.includes(prioridad)) throw new Error('Clasificación inválida');
  return prioridad;
}

function refEvaluacion(ref, revision) {
  return ref.collection('revisionesIA').doc(String(revision));
}

function elegible(e, revision) {
  return e?.fase === 'documentacion' && e?.revisionParte === revision;
}

function permiteEvaluar(actual, ahora = Date.now()) {
  return !actual || (actual.estado !== 'lista' && actual.intentos < 3 &&
    (actual.estado !== 'procesando' || actual.hasta <= ahora));
}

async function evaluarParte({ db, ref, revision, config, clasificar = clasificarParte }) {
  const evaluacion = refEvaluacion(ref, revision);
  const lease = randomUUID();
  const solicitud = await db.runTransaction(async tx => {
    const [expediente, anterior] = await tx.getAll(ref, evaluacion);
    const e = expediente.data();
    const actual = anterior.data();
    if (!elegible(e, revision) || !permiteEvaluar(actual)) return null;
    tx.set(evaluacion, {
      estado: 'procesando', lease, hasta: Date.now() + 45000, intentos: (actual?.intentos ?? 0) + 1
    });
    return e.datosRevision;
  });
  if (!solicitud) return;

  let resultado;
  try {
    const prioridad = await clasificar({ ...config, partes: solicitud });
    resultado = { estado: 'lista', prioridad, modelo: config.modelo };
  } catch {
    resultado = { estado: 'fallida' };
  }

  await db.runTransaction(async tx => {
    const actual = (await tx.get(evaluacion)).data();
    if (actual?.lease !== lease) return;
    tx.set(evaluacion, { ...resultado, intentos: actual.intentos, fecha: new Date() });
  });
}

function resumenIA(actual) {
  if (!actual) return { estado: 'pendiente', reintentar: true };
  return {
    estado: actual.estado,
    recomendacion: prioridades[actual.prioridad] ?? null,
    reintentar: permiteEvaluar(actual)
  };
}

module.exports = { clasificarParte, evaluarParte, refEvaluacion, resumenIA };
