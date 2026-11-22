# KONSOR CRM — Diseño de interfaz y contratos operativos

Estado: **laboratorio visual**, sin autenticación real ni Firebase conectado. La aplicación comercial en la raíz del repositorio **no se modifica**.

## Objetivo

Una única aplicación donde el empleado accede con su usuario y entra directamente en su espacio de trabajo. Las pantallas y asistentes adaptan el orden, herramientas, avisos y permisos a su puesto. El botón **EDIFICIO** abre la visualización en pantalla completa y permite consultar zonas y volver a las funciones reales. El edificio no almacena fichas separadas.

## Referencia inspeccionada de la app actual

- `inicio-ios.js`: cabecera KONSOR, saludo, siguiente acción recomendada calculada según jornada, sectores del día, anteriores y por volcar; cuatro accesos principales; acceso a Dirección para responsable.
- `motor-operativo-konsor.js`: guía de Mi jornada y Oficina; sectores ordenados por prioridad; no iniciar trabajo de calle sin jornada activa; antes de guardar se verifican estados y servidor.
- `volcado-guiado-ios.js`: cinco pasos; total de interesados = distribución por tipo; validación de fichas; no guardar volcado con "sí" sin contacto resuelto.
- `vivienda-guiada-ios.js`: cuatro pasos de captación, campos condicionados, datos técnicos, Catastro, revisión y guardado.
- `avisos-app.js`: pestañas de avisos, tareas y preferencias. Los avisos informativos se descartan; los encargos requieren recepción y resolución. Ajustes de silenciado/categorías.
- `oficina-ios.js`: volcar, revisar fichas, llamadas/citas, revisar cierre.
- `direccion-hub-ios.js`: planificación y análisis de equipo.

Estos archivos son **referencias operativas**, no se trasladan literalmente al nuevo CRM ni garantizan la configuración futura de seguridad.

## Experiencia visual común

1. Acceso / selección de trabajador **solo en la demo**; en producción, autenticación de empresa y roles del servidor.
2. Pantalla de inicio tipo iOS: marca, saludo, siguiente paso recomendado, cuatro tarjetas del departamento, gestión de equipo si corresponde.
3. Pregunta de inicio de jornada; permite consultar sin fichar. Confirmación efectiva cuando el backend real lo permita.
4. Recorrido guiado por departamento; el siguiente paso depende del estado real. Mostrar por qué está bloqueado y qué se debe completar.
5. Centro de actividad: **Avisos**, **Tareas**, **Ajustes**. Avisos descartables; tareas confirmables y cerrables.
6. Ficha central de cliente / inmueble / expediente con pestañas según necesidad y permiso.
7. Edificio KONSOR a pantalla completa, planta visible, despachos restringidos y acceso de vuelta a la función del CRM.

## Flujos por planta

- **Comercial**: jornada -> sectores -> captación de cuatro pasos -> contactos/viabilidad y citas -> volcado y cierre. Mapas solo como botón en la demo.
- **Técnicos**: órdenes -> ruta/material -> instalación autorizada -> fotos antes/después/mediciones -> parte e incidencias.
- **Oficina**: recibir -> verificar viabilidad -> documentos/firmas/fotos -> subsanaciones dirigidas -> tramitación y revisión.
- **Administración**: movimientos -> gastos/justificantes -> facturas -> cobros efectivamente conciliados -> costes y cierre.
- **Dirección**: estado de departamentos -> bloqueos -> ingresos/costes/cobros -> equipos y resultados -> decisiones supervisadas.

## Entidades únicas para el desarrollo futuro

- `Usuario`, `Departamento`, `Equipo`, `Asignación` y `Rol/permiso`.
- `Cliente` con datos de contacto; `Inmueble` vinculado; `Expediente` por servicio/actuación.
- `Tarea` con dueño, vencimiento, recepción y resolución; `Aviso` con lectura/descarte.
- `Archivo` con expediente, tipo de evidencia, estado de validación y autor.
- `Jornada`, `Cita`, `Orden de instalación`, `Coste`, `Factura` y `Movimiento de cobro`.
- `Ejecución de agente` con proceso, última ejecución, resultado, error y vínculo a tareas. Sin animaciones de actividad inventada.

## Invariantes a implementar en servidor (no solo botones deshabilitados)

- Los roles y ámbitos se asignan por administración; no se auto-conceden desde el cliente.
- No se envían fichas de otro equipo a usuarios sin autorización.
- No se puede confirmar un estado empresarial sin pasar validaciones obligatorias del servicio.
- Un expediente no se considera viable por mera elección de un comercial; necesita evaluación registrada.
- Una orden técnica y su documentación pertenecen al mismo expediente.
- No confundir ejecución, documentación completa, CAE aceptado, factura emitida y cobro conciliado.
- Escribir registros y transiciones de modo idempotente; registrar auditoría de quién hizo qué y cuándo.
- Reglas técnicas/CAE requieren revisión profesional antes de producción.

## Entrega de este laboratorio

`index.html`: acceso común con diez perfiles ficticios, inicio adaptado, asistentes de ejemplo con bloqueos ilustrativos, actividades por pestañas, fichas de demostración, vistas de equipo y edificio visual.

**No hay persistencia real, autenticación, IA, seguridad de servidor, notificaciones push ni generación de documentos.** Esto es una base visual y contractual para implementar los módulos, validarlos y sustituir datos ficticios por información autorizada.
