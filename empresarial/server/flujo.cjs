'use strict';

const departamentos = Object.freeze({
  comercial: 'Comercial',
  tecnicos: 'Técnicos',
  oficina: 'Oficina',
  administracion: 'Administración',
  direccion: 'Dirección'
});

const fases = Object.freeze({
  captacion: { departamento: 'comercial', nombre: 'Captación' },
  instalacion: { departamento: 'tecnicos', nombre: 'Instalación' },
  documentacion: { departamento: 'oficina', nombre: 'Revisión documental' },
  validacion: { departamento: 'administracion', nombre: 'Validación administrativa' },
  cerrado: { departamento: 'administracion', nombre: 'Cerrado' }
});

const transiciones = Object.freeze({
  derivar: { desde: 'captacion', hasta: 'instalacion', nombre: 'Pasar a Técnicos' },
  entregar: { desde: 'instalacion', hasta: 'documentacion', nombre: 'Entregar parte a Oficina', superficie: true },
  subsanar: { desde: 'documentacion', hasta: 'instalacion', nombre: 'Pedir subsanación', motivo: true },
  validar: { desde: 'documentacion', hasta: 'validacion', nombre: 'Validar y pasar a Administración' },
  cerrar: { desde: 'validacion', hasta: 'cerrado', nombre: 'Cerrar expediente', justificante: true }
});

function puedeLeer(persona, expediente) {
  return persona.equipoId === expediente.equipoId && (
    expediente.lectores.includes(persona.uid) ||
    (persona.puesto === 'jefe' && expediente.departamentos.includes(persona.departamento))
  );
}

function acciones(persona, expediente) {
  const actual = fases[expediente.fase];
  if (expediente.fase === 'cerrado' || persona.equipoId !== expediente.equipoId ||
      persona.departamento !== actual.departamento) return [];
  const dirige = persona.puesto === 'jefe';
  if (!dirige && expediente.responsableUid !== persona.uid) return [];

  const disponibles = Object.entries(transiciones)
    .filter(([, paso]) => paso.desde === expediente.fase)
    .map(([id, paso]) => {
      const destino = fases[paso.hasta];
      return {
        id, nombre: paso.nombre,
        asignarDepartamento: paso.hasta === 'cerrado' ? null : destino.departamento,
        superficie: !!paso.superficie, motivo: !!paso.motivo, justificante: !!paso.justificante
      };
    });
  if (dirige) {
    disponibles.push({ id: 'reasignar', nombre: 'Reasignar', asignarDepartamento: actual.departamento });
  }
  return disponibles;
}

module.exports = { departamentos, fases, transiciones, puedeLeer, acciones };
