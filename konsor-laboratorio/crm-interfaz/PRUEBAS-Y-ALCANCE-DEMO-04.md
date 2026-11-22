# KONSOR CRM · Demo 04 — pruebas, recorrido y límites

**Estado:** solo laboratorio de interfaz con memoria local. No modifica el CRM comercial real de `GPS-`, y no utiliza cuentas, archivos ni cobros de producción.

**URL de prueba:** https://arangurenandrei-dotcom.github.io/GPS-/konsor-laboratorio/crm-interfaz/?v=04

## Prueba integral del mismo expediente K-0021

1. Entra como **Administrativo de Oficina** → **Mi trabajo**. El sistema detecta automáticamente que falta una fotografía posterior del expediente K-0021. Crea la solicitud de subsanación.
2. Cambia a **Técnico · Cuadrilla 1** → **Mi trabajo**. Aparece la solicitud de Oficina. Simula la entrega de la fotografía requerida.
3. Cambia a **Administrativo de Oficina** → **Mi trabajo**. K-0021 pasa a estar listo para la revisión. Aprueba la revisión **solo después de comprobar las evidencias**.
4. Cambia a **Administrativo de Finanzas** → **Mi trabajo**. La ficha ya puede pasar a la facturación de ejemplo. Registra una factura.
5. Registra un **cobro parcial** (p. ej. 1.000,50 €) y comprueba que queda saldo por cobrar; una cifra superior al pendiente se rechaza.
6. Marca un **pago de proveedor** efectuado, prueba que el saldo de tesorería cambia y que no existe una segunda opción de pagar dos veces el mismo movimiento.
7. Cambia a **Dirección general** → **Mi trabajo**. Comprueba que las cifras de facturación, cobros, pagos y tesorería han variado sin tener que recalcular manualmente.
8. En **Centro de actividad → Tareas**, una incidencia operativa desaparece cuando se resuelve en el circuito y no mediante un botón ficticio de «completado».

**Importante:** el botón del técnico para aportar evidencia no sube imágenes. Marca una evidencia simulada. Ningún cobro o pago se ejecuta.

## Pruebas de código verificadas en esta iteración

- Sintaxis de `index.html`, `operaciones-demo.js` y `tecnico-demo.js`.
- Cálculo de seis expedientes ficticios y previsiones económicas en céntimos.
- Elaboración automática de una solicitud de Oficina al técnico y reaparición posterior para revisión.
- La revisión documental no se aprueba con requisitos ausentes.
- Factura solo después de la revisión simulada; cobro parcial válido y rechazo de sobrecobro.
- El saldo de tesorería cambia tras cobros y pagos anotados.
- El pago ya registrado no se repite.
- Filtrado de los expedientes visibles en la demo por `office=O1` y `finance=F1`.
- Las cuentas ficticias de empleados y responsables se pueden abrir sin depender de datos externos.

Las comprobaciones anteriores no equivalen a pruebas de navegador Safari, integración Firebase ni una auditoría de seguridad.

## Diseño a conservar

**Entrada → mi trabajo → siguiente acción calculada → acción física o decisión humana → comprobación → siguiente gestión automática.**

- Comercial: sectores, captación, llamadas, fichas y objetivos; se mantiene como referencia el flujo de la aplicación existente.
- Técnicos: plan desde m², cálculo de sacos, confirmación de carga, ruta, parte, incidencias y material restante.
- Oficina: revisión automática de disponibilidad de documentos, tareas técnicas de subsanación y control de preparación documental.
- Administración: facturación, cobro registrado, saldos, pagos que vencen, clasificación de tickets y conciliación.
- CEO: previsiones explicadas, origen de ingresos, obligaciones de pago, desglose de márgenes, riesgos y escenario de caja.
- Jefes: vistas agregadas del ámbito asignado, sin decisiones automatizadas de empleo.
- Edificio: capa visual navegable hacia estos módulos, no una base de datos paralela.

## Pendiente antes de la implantación empresarial

1. Base de datos de clientes, inmuebles, expedientes, actuaciones, documentos, tareas, facturas, órdenes y movimientos, con identificadores permanentes.
2. Autenticación y seguridad reales por departamento/equipo/expediente, implementadas en servidor; no confiar en el selector de usuario ficticio.
3. Almacenamiento privado de archivos, revisión de tipos/tamaños, permisos, historial y copias.
4. Motor transaccional de autorizaciones, revisiones, CAE, emisión de facturas y conciliación para que no se dupliquen pagos ni expedientes.
5. Catálogo por producto con consumo, rendimiento, espesor, margen, material y condiciones técnicas verificadas.
6. Integraciones de cartografía/rutas, calendario, proveedores de facturación, banco/VIA-T si se autorizan.
7. Pruebas en Safari/iPhone y navegador desktop, simulaciones con varias cuentas, restauración de copias, RGPD y revisión externa.
8. Auditoría de integridad antes de la migración desde la empresa anterior.

Las cifras, nombres y direcciones incluidos en el laboratorio son **ficticios**. Las previsiones CAE son escenarios, no derechos de cobro certificados. El valor de comisión de 1 €/m² es una hipótesis para explicar el módulo y debe sustituirse por las condiciones contractuales reales.
