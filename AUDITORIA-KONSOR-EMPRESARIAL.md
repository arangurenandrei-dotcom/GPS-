# KONSOR · Auditoría y primera entrega empresarial

La fase posterior reutiliza la entrada comercial y amplía el mismo backend. [Integración y conexión de KONSOR-Pruebas](EMPRESARIAL-INTEGRACION.md)

**23 de noviembre de 2026.** Repositorio `arangurenandrei-dotcom/GPS-`, base `703720d3` de `main`, rama `desarrollo/konsor-plataforma-empresarial`. Alcance de la auditoría: código y documentación versionados, puntos de entrada, persistencia, integraciones, flujos del laboratorio y pruebas. La configuración, las reglas, el código completo de las funciones desplegadas y los datos de producción quedan fuera del alcance verificable de este repositorio.

## Estado del sistema en la base auditada

| Proceso | Funcionamiento observado | Trabajo pendiente |
| --- | --- | --- |
| Acceso y equipos | La app comercial inicia sesión con Firebase Auth y consulta el estado del perfil en `usuarios`. Quedan nombres y ámbitos históricos (Andrei y Mikel). El directorio nuevo de `backend/` solo cubre equipos comerciales y carece de entrada desde la app. | Verificar reglas, escrituras y funciones desplegadas. Mapear las cuentas históricas por UID sin cambiar sus permisos ni sus IDs. |
| Comercial | Entrada en `index.html`. Captación, zona, Catastro, jornada, llamadas, citas, resultados y avisos usan asistentes sobre el motor de `app/legacy/`. `konsor-v2-bridge.js` conserva IDs y revisiones de fichas y zonas, espera recibos y recupera cambios pendientes. | Validar en preproducción el recorrido autenticado, conflictos, móviles y sincronización. Una cita y su marca `crmUploaded` requieren verificar el resultado externo. |
| Técnicos | La secuencia de instalaciones, materiales, medición y evidencias está trazada en `konsor-laboratorio/crm-interfaz/`. | Conectar partes, cuadrillas, agenda, materiales y evidencias a los expedientes del servidor. |
| Oficina | Hay una Oficina comercial operativa para llamadas y seguimiento de obras. La tramitación documental, el envío de PDF y el seguimiento de firma aparecen en el laboratorio con estados simulados. | Conectar almacenamiento privado, generación del documento, envío y recepción de firma con trazabilidad. Coordinar la entrega con la Oficina comercial existente. |
| Administración | Remuneraciones, gastos, tarjetas y confirmación de pagos se calculan con registros de laboratorio. | Acordar fuentes y reglas contables. Distinguir importe estimado, devengo, cobro y pago confirmado por su origen. |
| Dirección | La jefatura comercial tiene planificación y resultados. Las vistas económicas globales del laboratorio consumen sus datos locales. El manifiesto común de roles controla presentación. | Consolidar indicadores comprobables y conservar el acceso a detalle bajo los permisos operativos. |
| Automatizaciones | El aviso comercial usa Functions, preferencias y mensajería. El asistente común propone la siguiente acción con reglas locales. El acceso de Gemini del volcado abre un chat externo. | Ampliar las alertas con tareas, responsables y vencimientos en servidor. Integrar agentes con entradas acotadas y revisión humana. |

Los principales riesgos de integración están en la autorización real de las funciones heredadas, las operaciones que abarcan KONSOR, CRM y Calendar, y los borradores o exportaciones con datos personales en el navegador. El backend versionado contiene módulos e instaladores parciales para un árbol de Functions que se mantiene fuera de GPS-. La suite local permite comprobar la extracción del monolito, los recorridos cubiertos y los contratos de algunas funciones.

## Primer circuito operativo

| Fase | Acción implementada | Resultado |
| --- | --- | --- |
| Comercial | Abrir un expediente con título y referencia interna opcional. Asignar a Técnicos. | Un expediente persistente con número de revisión y responsable. |
| Técnicos | Entregar la superficie instalada y asignar la revisión a Oficina. | Parte registrado y aviso al destinatario. Una nueva entrega conserva las anteriores en el historial. |
| Oficina | Pedir subsanación con motivo o validar y asignar a Administración. | Retorno trazable a Técnicos o traspaso a Administración. |
| Administración | Registrar un justificante interno de cierre. | Expediente cerrado, justificante visible para Administración y aviso al creador. |
| Dirección | Consultar recuentos por fase y gestionar los equipos y altas según el puesto. | El CEO ve la organización completa. El resto de Dirección ve los recuentos de su equipo. |

La primera entrega modela una organización y equipos transversales a los cinco departamentos. Cada cuenta tiene un equipo, un departamento y un puesto. Los trabajadores ven los expedientes que han creado o tenido asignados. Los jefes ven aquellos en los que intervino su departamento dentro del equipo, pueden reasignar los que están en su fase y gestionan las altas y suspensiones de sus trabajadores. El CEO asigna jefaturas y crea equipos. Dirección consulta agregados. Una cuenta suspendida pierde el acceso por API con efecto en la siguiente solicitud.

Cada cambio válido guarda edición, historial y aviso en la misma transacción de Firestore. Una revisión desactualizada se rechaza. El reintento de una operación confirmada recupera el recibo persistido. Los avisos se consultan y marcan como leídos en la bandeja personal. Una entrega técnica puede disparar una revisión asistida por Gemini para el responsable de Oficina. El agente recibe solo dos categorías derivadas, variación de superficie y número agrupado de subsanaciones. Devuelve una recomendación de revisión y Oficina conserva la decisión.

El circuito arranca vacío en el entorno aislado. El título y la referencia los introduce la persona que abre el expediente. En esta fase la referencia sirve como identificador de trabajo ingresado manualmente. La ficha comercial heredada, sus reservas y las cuentas actuales siguen su recorrido habitual.

## Orden de desarrollo

1. **Identidad y continuidad comercial.** Exportar a preproducción el código y la configuración de permisos que faltan. Inventariar IDs y referencias huérfanas con acceso de lectura. Conectar una entrega autenticada desde la ficha actual al expediente, con equivalencia de identidad y reintento por ID estable.
2. **Instalación y documentación.** Registrar planificación, materiales, partes y evidencias. Integrar almacenamiento por expediente con rutas autorizadas, generación de documentos y firma con el proveedor y la política de conservación de la empresa.
3. **Administración y Dirección.** Incorporar gastos, remuneraciones y pagos comprobados con conciliación. Obtener KPIs desde registros autorizados y mostrar el origen y fecha del dato agregado.
4. **Automatización y puesta en servicio.** Validar Gemini con credenciales de pruebas, revisar las recomendaciones y medir sus fallos. Añadir vencimientos y escalados con control de duplicados. Verificar Safari iOS, carga, copias, restauración y migración reversible en preproducción antes de solicitar autorización de despliegue.

## Verificación reproducible

Desde la raíz:

```sh
node tests/verificar-extraccion.cjs
node tests/verificar-arquitectura.cjs
node --test tests/*.test.cjs backend/test-rendimiento.cjs
node tests/smoke-navegador.cjs
```

La última orden necesita Chromium o Chrome y `puppeteer-core@24` accesible desde Node. Se ejecutó con las conexiones de Firebase bloqueadas por la propia prueba. Las dos verificaciones de arquitectura y las 85 comprobaciones pasaron. Chromium validó el Inicio, Resultados, Jornada, Dirección y navegación para tamaños móvil y escritorio. Se desacopló la prueba de avisos de `./lib`, que se encuentra en el backend externo. La instalación histórica conserva su contrato y la prueba usa el horario de Madrid.

Pasaron las siete comprobaciones del circuito empresarial con Node 22, Java 21, Firebase Auth, Functions, Firestore Standard y Hosting emulados. Cubren permisos, aislamiento entre dos equipos, rechazo de lecturas y escrituras directas, alta y suspensión, concurrencia, avisos, subsanaciones, cierre e indicadores. Chromium validó el alta y el traspaso en 390 px, y la recepción del aviso y entrega de parte en 1440 px. Se corrigió el aviso de Auth que cubría el botón de confirmación en móvil y se comprobó el orden de historial y avisos mediante campos indexados. El disparador de Firestore se ejecutó en el emulador. La clasificación de Gemini se comprobó con transporte controlado y reserva transaccional en Firestore. Una llamada al proveedor con credenciales reales queda pendiente.

Las reglas de Firestore de `empresarial/` son un prototipo aislado: bloquean por completo el acceso directo de clientes y dejan validación y filtrado de cada operación a la API. Se compilaron con el emulador oficial. La política y el backend requieren revisión antes de habilitar acceso en preproducción o producción.

## Arranque local

Desde `empresarial/`, con Node 22, Java 21 o posterior y Chromium o Chrome para las pruebas:

```sh
npm ci
npm test
npm run dev
```

Abre `http://127.0.0.1:5004`. Crea la cuenta de Dirección en la pantalla de acceso, copia su UID y arranca Dirección general desde otra terminal en `empresarial/`.

```sh
npm run ceo -- UID "Nombre visible"
```

Pulsa **Comprobar acceso**, abre **Equipo** y crea el primer equipo. Cada persona se registra para obtener su UID y la cuenta de Dirección le asigna un departamento y puesto. Tras iniciar sesión en Comercial, crea el expediente y sigue la fase indicada. Para probar la subsanación y el cierre, da de alta al menos una cuenta activa por departamento operativo. Las altas, expedientes y avisos del desarrollo quedan en `.datos-emulador/` cuando se detienen normalmente los emuladores. Las pruebas arrancan desde cero en sus propios emuladores.

Para activar el agente en desarrollo, configura `KONSOR_GEMINI_API_KEY` y `KONSOR_GEMINI_MODEL` en `empresarial/.env.local` y arranca el entorno con acceso autorizado al endpoint de Gemini. El modelo debe admitir salida JSON con esquema. La aplicación sin credenciales sigue permitiendo la revisión manual. `npm test` mantiene aislado el proveedor externo.

Con un proxy HTTP obligatorio, la CLI 15.37.0 puede enviar al proxy el enlace local del disparador de Firestore, incluso con `NO_PROXY`. Con el JAR ya en la caché, las pruebas del circuito se ejecutan con `HTTP_PROXY`, `HTTPS_PROXY` y sus variantes en minúscula retirados solo para ese comando.
