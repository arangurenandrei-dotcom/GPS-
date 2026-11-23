# Edificio KONSOR — V1 (rama de desarrollo)

El acceso «Edificio KONSOR» se añade al inicio sin eliminar las pantallas existentes. Módulos: `edificio-konsor.js` y `edificio-konsor.css`.

## Plantas

- **05 — Dirección:** métricas visibles de la sesión, Dirección/Planificador existente, resultados y avisos.
- **04 — Administración:** área independiente; acceso de consulta a resultados. Facturación, gastos, pagos y comisiones pendientes de desarrollar.
- **03 — Oficina:** acceso a Oficina, clientes y chat de Gemini para fotos. No existe importación automática desde Gemini.
- **02 — Técnicos:** vista con obras agendadas que consten en las fichas actuales y acceso a los expedientes. Falta asignación técnica y ejecución en campo.
- **01 — Comercial:** acceso a jornada, mapa, clientes y resultados.

## Perfiles de interfaz (no son reglas de seguridad)

- CEO visual: cuenta existente **Andrei (Jefe)** (rol heredado `jefe`).
- Jefe de equipo: Dirección, Comercial, Técnicos y Oficina.
- Comercial: Comercial y Oficina.
- Técnico: Técnicos y Oficina.
- Oficina: Oficina.
- Administración: Administración.

**IMPORTANTE:** Los nuevos cargos y sus permisos en Firestore **no están implementados**. La interfaz no concede ni garantiza permisos. Antes de desplegar datos sensibles se necesita: perfil de usuario basado en UID, claims/roles en servidor, reglas Firestore, asignación por equipo y pruebas de acceso cruzado. No alterar la cuenta principal hasta entonces.

## Seguridad y compatibilidad

- No escribe ni migra documentos Firebase.
- No sustituye funciones del sistema heredado ni añade agentes IA simulados.
- Las estadísticas son solo recuentos de registros ya cargados en `savedZones`, filtrados según la sesión.
- La flecha interna vuelve a la lista de plantas. La X cierra el edificio. También existe gesto táctil desde el borde izquierdo.
- Los accesos faltantes se muestran como no disponibles.

## Validación

```sh
node --test tests/edificio-konsor.test.cjs
```

Esta rama es **propuesta de cambio**, no está desplegada en la versión principal. Antes de integrarla, probar en iPhone y portátil la navegación, el cierre de sesión, el retorno desde herramientas y el aspecto visual con datos reales.

## Próximas entregas

1. Sistema de autorización backend real por departamento y equipo.
2. Expedientes transversales: comercial → técnico → oficina → administración → dirección, con un solo identificador.
3. Bandejas de entrada, acciones y trazabilidad por rol.
4. Automatización real en backend, supervisada y con límites de coste.
