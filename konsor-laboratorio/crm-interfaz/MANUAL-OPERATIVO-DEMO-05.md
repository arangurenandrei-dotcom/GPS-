# KONSOR CRM · Laboratorio 05

**Versión:** 05 · Interfaz + procesos simulados en memoria.

**Acceso esperado de GitHub Pages:** https://arangurenandrei-dotcom.github.io/GPS-/konsor-laboratorio/crm-interfaz/?v=05

El CRM comercial real está en la raíz de `GPS-`. **No se ha modificado.** El laboratorio está únicamente bajo `konsor-laboratorio/crm-interfaz/`.

## Filosofía aprobada

La aplicación **no es una gestoría**. Calcula, prepara, organiza, coordina y detecta incidencias. Firma, trámites legales, cuentas bancarias, cotizaciones, facturas regladas y transferencias se gestionan en las herramientas externas que corresponden. No se realiza ninguna operación bancaria ni envío de correos desde este laboratorio.

- **Comercial:** exactamente **1 €/m² de buhardilla o desván registrado**, sin comisión de otros servicios. Cada comercial ve sus datos; jefatura comercial ve equipos y rendimiento. El CEO, pagos y riesgos, no el control operativo individual como pantalla principal. Falta definir formalmente el instante del devengo de la comisión.
- **Técnicos:** órdenes, m² estimados, material requerido calculado + sacos de reserva, destinos, medidas realmente ejecutadas, sacos consumidos, fotos antes/después y partes. **No muestran precio del material**. La CRM bloquea la terminación de un parte sin superficie y fotografías. La comprobación automática de nitidez no está implementada.
- **Oficina:** recibe las evidencias de Técnicos. Si falta algo, crea una única subsanación dirigida al responsable; después realiza el trámite externo que corresponda. Una vez preparado el documento a firmar, selecciona PDF y correo del cliente. La demo **simula** el envío y seguimiento: pasados 4 días aparece tarea de llamada si no se han recibido documentos firmados, o si la firma es incorrecta.
- **Administración:** seguimiento de honorarios fijos a autónomos y comisiones comerciales, confirmaciones de recepción del pago desde la app, tarjetas de empresa, VIA-T, combustible, comidas y gastos. La gestoría o responsable externo sigue gestionando los pagos. Cifras fiscales no se calculan aquí.
- **CEO:** precios e ingresos previstos de expedientes, costes directos aproximados, honorarios/comedores, tarjetas, peajes, comidas, alertas, desviaciones y remuneraciones por trabajador. Se indican explícitamente las limitaciones del escenario financiero.

## Confirmación de pagos: día 1 al 5

- Pagos de **noviembre**: previstos entre el **1 y el 5 de diciembre** (ejemplo).
- El trabajador responde **«Sí, recibido»** o **«Todavía no»** en **Mi remuneración**.
- Administración consulta las respuestas; puede simular **día 1, 3, 5 o 6**.
- A partir del día 5 aparece la incidencia del personal sin confirmación positiva; Dirección debe hablar con gestoría/responsable externo. No se presume que «Sí» significa transferencia bancaria verificada.
- Todos los colaboradores simulados tienen un importe fijo mensual, excepto el Comercial 01, calculado de su m² de buhardilla. Las cifras fijas son ficticias y editables cuando exista configuración real.

## Prueba de Oficina y Técnicos

1. Selecciona **Oficina 01** y entra en **Mi trabajo**. Expediente `K-0021` → **Gestionar** → **Solicitar a Técnicos lo que falta**.
2. Cambia a **Técnico 01** → **Mi trabajo**. Verás una solicitud vinculada al expediente. **Aportar evidencia ficticia**.
3. Vuelve a **Oficina 01** → `K-0021` → **Revisión documental realizada**.
4. Elige un PDF de ejemplo y escribe un email de prueba. **Simular envío al correo**. La app no manda correo ni sube archivos.
5. Abre de nuevo `K-0021` y pulsa **Simular paso de 4 días**. Aparecerá una tarea de **llamar al cliente** por ausencia de documentos firmados.
6. También puedes marcar **Firma incorrecta** o **Firmados correctamente**. La alerta permanece hasta el estado correcto.

## Prueba de Administración y Dirección

1. Selecciona **Administración 01** y entra en **Mi trabajo**. Revisa importes fijos, gastos corporativos y anomalías.
2. Pulsa **Día 5** para simular el plazo de pago. Verás los trabajadores sin confirmación.
3. Cambia a **Comercial 01** y abre **Mi remuneración**. El cálculo es **234 m² → 234 €**, suma de 86, 82 y 66 m² de buhardilla. Pulsa **Sí, recibido**.
4. Cambia a **Técnico 01** → **Mi remuneración** → **Todavía no**.
5. Vuelve a **Administración 01**: las respuestas actualizan el estado. Entra como **CEO** → **Mi trabajo**: se muestran las remuneraciones y las alertas por falta de confirmación.
6. Los importes de combustible, VIA-T, comidas y tarjetas son ficticios. El vehículo 01 presenta una desviación intencionada entre el gasto y una estimación basada en km, consumo y €/L ficticios. Se pide verificar, nunca se afirma conducta indebida.

## Datos, precisión y próximos pasos

La aplicación usa `index.html`, `tecnico-demo.js`, `operaciones-v05.js`, `tecnico-demo.css`, `operaciones-demo.css` y `operaciones-v05.css`. Los módulos están divididos para conectar más tarde los servicios reales sin reescribir la interfaz.

**NO implementado:** autenticación ni permisos del servidor, Firebase, almacenamiento privado de PDF/fotos, envío real de email, confirmación de firma, cálculos técnicos por catálogo oficial, tarjeta/banco/VIA-T, kilometraje verificado, actualización programada sin la app abierta, escalados push, nóminas/IVA/IRPF, reportes contables certificados y pruebas Safari/iOS. Todos los nombres, direcciones, importes y movimientos se inventaron solo para la demostración.

El resultado económico de Dirección **no es un P&L fiable**: el conjunto de expedientes está incompleto, faltan ingresos/costes y los honorarios ilustrativos abarcan otro periodo de actividad. No se deben tomar decisiones empresariales reales basándose en esos números.
