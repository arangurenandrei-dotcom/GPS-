# KONSOR CRM 2.0 — Arquitectura funcional y técnica

**Estado:** propuesta de arquitectura, NO implementación en producción. Fecha: 2026-11-24.
**Regla principal:** construir el CRM nuevo en paralelo. No modificar, borrar ni migrar datos de producción hasta inventario, copia verificable, pruebas y aprobación de puesta en marcha.

## 1. Principios de producto

- **Un cliente, un identificador estable y un expediente** accesible para todas las plantas autorizadas.
- **No confundir pueblo con sector ni cliente con visita.** Pueblo agrupa actividad; sector/polígono es solo una marca de cobertura privada del comercial, no es condición para crear un cliente.
- **Acciones mínimas, estados únicos, automatización visible.** Entrada con acceso directo a Clientes, Mapa/Territorio si corresponde, Mi trabajo/Dirección, Mensajes y notificaciones.
- **Registrar primero, completar después:** captura inicial requiere solo nombre, teléfono y dirección (pueblo derivado/seleccionable); no DNI ni correo al crear. Al cerrar una obra, nombre y apellidos, DNI/NIE y correo; validación en servidor y constancia de ejecución.
- **Nunca perder los descartados:** rechazado y no apto salen de la bandeja de trabajo pero permanecen en Todos, búsquedas, historial y estadísticas de captación. Agendado y realizado se contabilizan en fases distintas.
- **Lo firmado debe poder acreditarse:** documentos originales, versión, firmas/evidencia, fecha, emisor, huella, eventos y permisos. Una firma registrada no garantiza por sí sola que una reclamación sea improcedente.
- **Autorización en servidor:** no confiar en pestaña o nombre de usuario para decidir qué datos puede leer o editar una persona o IA.

## 2. Aplicación y plantas

### Inicio de Comercial
1. **Clientes**: por defecto pendientes; pestañas pequeñas Todos, Por llamar, En seguimiento, Agendados, Realizados, Rechazados, No aptos; buscar por nombre, teléfono, pueblo y domicilio.
2. **Mapa/Territorio**: mapa, medición/catastro, pueblos y marcas discretas de cobertura. Sin necesidad de crear sector para fichar una vivienda.
3. **Dirección / Mi trabajo**: Yo (jornada, actividad, resultados); Mi equipo solo supervisores con autorización. Los administradores acceden a planificación global.
4. **Mensajes entre plantas**: tareas y avisos.

### Inicio de Oficina
Clientes, Mi jornada, Agenda/Obras, Mensajes. Agenda integrada en expedientes; no es una segunda cartera de clientes. Oficina verifica documentos y coordina con Técnicos/Comercial.

### Inicio de Técnicos
Mi jornada/ruta, Obras asignadas, Mensajes. Cada obra abre **el mismo expediente** en una vista por permisos; documentación y mediciones se adjuntan allí.

### Finanzas
Producción, Costes, Conciliaciones y Compras, sobre datos de expedientes/órdenes. No gestionar importes desde una calculadora de captación.

### CEO
Resumen de empresa, excepciones, trabajadores/permisos, finanzas y Jarvis. Ver alertas críticas y trazabilidad, sin notificaciones por operaciones rutinarias.

## 3. Estados de CRM independientes de la actividad territorial

El estado de cliente es una dimensión:
- `por_llamar`: pendiente de contacto.
- `en_seguimiento`: contactado, sin confirmar, esperando documentación o nueva llamada; `nextActionAt` y `reason` opcionales.
- `agendado`: existe una reserva registrada por la empresa, `calendarSyncStatus` indica si se refleja o no en Calendar.
- `realizado`: obra ejecutada, con evidencias y requisitos de cierre.
- `rechazado`: no quiere continuar.
- `no_apto`: no procede por criterios técnicos/comerciales.

Estado único, cambios auditados, reactivación permitida. **No tratar una ausencia/no contesta como rechazo automáticamente.** Se guarda intento de llamada y próxima acción.

Esquema de importes por fase (tarifa configurable, no siempre 1 €/m²):
- `potencialEstimado`: interesados sin cita, deduplicados, con m² conocidos. Los contactos sin llamar pueden mostrarse aparte como oportunidades sin confirmar; no se suman a potencial conservador.
- `previsto`: obras agendadas no ejecutadas.
- `generado`: obras ejecutadas.
- `cobrado`: transacciones conciliadas; nunca asumirlo a partir de `realizado`.
- Los rechazos/no aptos no se incorporan a potencial ni previsto. Los desconocidos de superficie no equivalen a 0: mostrar "sin medición".

## 4. Ficha unificada

Cabecera fija: nombre, pueblo/dirección, teléfono, ID estable, estado actual, siguiente acción, responsable.
Subsecciones compactas:
- **Cliente:** nombre completo, teléfono, correo, DNI/NIE, preferencias de contacto.
- **Vivienda(s):** dirección oficial y portal, coordenadas si verificadas, CP/CTE derivados cuando exista fuente fiable, superficie total y neta (sin doble deducción), Catastro, varias viviendas bajo un mismo titular/expediente cuando corresponda.
- **Seguimiento:** llamadas, WhatsApp, respuestas, estado, notas, siguientes tareas.
- **Obra:** reserva, equipo, fecha y franja, cambios, mediciones reales, materiales, costes e incidencias. `calendarSyncStatus` muestra pendiente/sincronizado/error, no bloquea guardar el expediente.
- **Documentos/fotos:** originales almacenados, metadatos, estado de revisión, versionado y evidencias de firma.
- **Historial:** eventos inmutables con quién/cuándo/qué cambió; rectificaciones con evento nuevo, no modificación silenciosa de evidencia.

Validación progresiva: alta de cliente = nombre/teléfono/dirección. Cierre `realizado` = nombre y apellidos, DNI/NIE, email y comprobación de obra ejecutada por usuario autorizado. Si una persona carece de email, registrar excepción explícita aprobada, no inventarlo.

## 5. Pueblos y trabajo diario — sin sector obligatorio

`pueblos/{puebloId}`: nombre oficial, municipio INE si disponible, geometría, `status` (por hacer/en curso/pausado/completado), métricas agregadas derivadas, personal asignado, cobertura.

`actividadTerritorial/{activityId}`: `puebloId`, `comercialUid`, `fecha`, `duracion`, `no`, `ausentes`, `papelitos`, `otros`, `notas`; se añade UNA jornada al pueblo y se suman automáticamente las jornadas previas. **No se introduce cantidad de "sí"**: los sí se obtienen contando las fichas captadas atribuibles a ese pueblo, fecha y comercial, con una regla de deduplicación. Una ficha sin sector cuenta igual. El jefe puede auditar y rectificar un registro con historial.

`coberturas/{coverageId}`: polígonos/líneas como apoyo opcional del comercial, no estructura de clientes, ni contabilidad, ni requisito. Estilo: línea gris fina, sin grandes puntos, zonas completadas con superposición blanca translúcida, sin colores heredados. Medición: trazado fino y vértices pequeños; el cálculo visual de m² no sustituye medición técnica.

KPIs por pueblo y comercial, separados:
- fichas captadas únicas / horas de trabajo / contactos efectivos / viviendas visitadas (si hay dato),
- tasa de captación, superficie obtenida, conversiones a cita y a obra, kilómetros y coste,
- comparación con pueblos semejantes, muestra mínima y volumen histórico.
- No concluir "mal comercial" por un municipio aislado o pocos datos; detectar primero localidad difícil, saturación, ruta, horario, oportunidad y circunstancias.
- Alertas de mejora a jefe: `motivo`, `evidencia`, `propuesta`, `nivel_confianza` y posibilidad de descartar.

## 6. Registro de jornada con botón único

Un control compacto persistente junto a Ajustes/Notificaciones, con estado e icono claro:
- Sin iniciar → pulsar "Iniciar".
- Trabajando → pulsar "Comida" o "Finalizar" (sin obligar a comer).
- Comida → pulsar "Reanudar".
- Trabajando tras comida → pulsar "Finalizar".
- Jornada cerrada → botón inactivo hasta siguiente jornada, salvo corrección autorizada.

La acción visible es un único botón; al pulsar se ejecuta la transición contextual. No mostrar panel de horas en inicio. El fichaje se registra en servidor con fecha/hora y actor; alertar ante pulsación accidental de finalización. Avisos administrativos no equivalen a vigilancia automática no informada.

## 7. Modelo de datos propuesto (Firestore)

Usar IDs opacos, no nombres de comerciales ni sectores en la clave primaria:
- `organizations/{orgId}`: empresa, configuración.
- `organizations/{orgId}/members/{uid}`: nombre, correo, estado `pending|active|suspended`, roles `commercial|office|technician|finance|ceo`, departamentos, permisos, supervisor opcional, asignaciones.
- `organizations/{orgId}/membershipRequests/{uid}`: solicitud Google, departamento solicitado y metadatos de aprobación.
- `organizations/{orgId}/clients/{clientId}`: datos base y estado CRM estable.
- `organizations/{orgId}/clients/{clientId}/activities/{eventId}`: llamadas, acciones y auditoría.
- `organizations/{orgId}/clients/{clientId}/properties/{propertyId}`: viviendas y mediciones.
- `organizations/{orgId}/jobs/{jobId}`: orden de trabajo, cliente, vivienda(s), equipo, fecha, estado, `calendarEventId`, `calendarSyncStatus`.
- `organizations/{orgId}/clients/{clientId}/documents/{docId}`: metadatos, revisión, tipo, versión, hash y ruta de archivo.
- Cloud Storage: archivos binarios con acceso por servicio autorizado, no urls públicas.
- `organizations/{orgId}/towns/{townId}` y `territoryActivities/{id}`: métricas diarias aditivas y cobertura.
- `organizations/{orgId}/shifts/{id}`: fichajes.
- `organizations/{orgId}/tasks/{id}` y `messages/{id}`: comunicación interplantas.
- `organizations/{orgId}/expenses/{id}`, `purchases/{id}`, `suppliers/{id}`: finanzas.
- `organizations/{orgId}/audit/{id}`: auditoría de mutaciones con política de retención y control de acceso.

Evitar duplicar documentos enteros de usuarios/clientes o mantener `savedZones` como fuente de verdad. Mantener adaptador de importación solo durante migración; el CRM nuevo se escribe de forma transaccional a su modelo propio.

## 8. Alta de trabajadores y permisos

1. Login **Continuar con Google** usando Firebase Authentication. Sin autorización para editar datos por el simple hecho de tener cuenta Google.
2. Primera entrada crea `membershipRequests` en estado `pending`. Solo se puede leer el estado propio, no los expedientes.
3. CEO o jefe autorizado aprueba, asigna uno o varios roles, planta, equipo y alcance; el servidor añade membresía y claims según necesidad, con auditoría.
4. En el próximo refresco de sesión, la persona ve automáticamente su interfaz. No desplegar código por cada usuario.
5. Suspender/quitar acceso: desactivar membresía y revocar sesiones/tokens cuando proceda. Roles de "jefe de oficina" y "técnico" parametrizables, sin comparaciones de nombres literales.
6. El registro de un **agente IA** es una identidad de servicio con herramientas y permisos concretos, no una cuenta de usuario con acceso completo a Google Drive.

Permisos por objeto, planta y acción: por ejemplo Comercial puede editar contacto y seguimientos propios, Oficina expedientes/documentos, Técnicos ejecución y fotos de órdenes asignadas, Finanzas gastos, Dirección puede supervisar según ámbito. Restringir acceso a DNI, datos laborales y financieros. Claims/Rules son necesarios pero los servicios backend Admin también deben autorizar cada petición explícitamente.

## 9. Google: integración, no sustitución de base de datos

- **Firestore:** base de datos operativa de CRM, transacciones, permisos, índices, estados y eventos.
- **Google Drive:** documentos y copias/exportaciones cuando convenga, mediante cuenta/servicio específico con alcance restringido y permisos definidos.
- **Sheets/Excel:** informes, exportaciones y análisis, NO la fuente transaccional única cuando decenas de usuarios, citas, documentos y agentes escriben simultáneamente.
- **Calendar:** agenda de obras con sincronización bidireccional controlada, IDs de eventos, reconciliación e idempotencia; guardar en CRM no exige buscar y demostrar un evento preexistente, pero muestra claramente si la cita está o no sincronizada.
- **WhatsApp/Email:** envío mediante integraciones oficiales, aprobación o automatización con consentimiento, registro del mensaje y resultado de entrega.

Jamás dar a Jarvis permiso irrestricto sobre la cuenta Google personal. Usar OAuth con scopes mínimos o identidad de servicio, cuentas empresariales y autorización revocable.

## 10. Agentes de IA y automatizaciones

Agentes: Comercial, Oficina, Técnicos, Finanzas, CEO y Jarvis conversacional.
Herramientas de dominio, no acceso SQL/Firestore/Drive directo por defecto:
`findClients`, `getClient`, `proposeNextCall`, `getAvailableSlots`, `draftMessage`, `getMissingDocuments`,
`reviewTownProductivity`, `suggestRoute`, `compareMaterials`, `getFinancialVariance`, etc.
Flujo: trigger de evento → tarea con idempotency key → herramienta consultiva → propuesta → autorización humana cuando cambia agenda/envía información sensible/realiza gasto → ejecución y auditoría.
- IA no decide sola despidos, sanciones, pagos, alteraciones de evidencia ni elimina registros.
- Finanzas requiere integración verificable con Via-T/tarjetas, vehículos, peajes y facturas; comparar estimados con reales, jamás inventar gastos.
- Supervisión mediante panel de excepciones, no alertar al CEO por cada trabajo ordinario.

## 11. Migración sin perder clientes

1. Congelar **estructura** del CRM actual, no la operación diaria.
2. Inventario de documentos `zonas`, `fichas`, citas/Calendar, mensajes, usuarios y documentos; detectar duplicados, huérfanos y estados contradictorios.
3. Exportar copia inmutable cifrada, comprobar conteos y restauración en entorno de pruebas.
4. Importar a modelo 2.0 preservando mapa `legacyId → newId`; sin borrar origen.
5. Conciliar por cliente y por orden: cantidad y estado, no solo totales. Confirmar personalmente muestras de pueblos, agendados y realizados.
6. Piloto con usuarios de prueba, incluida simulación de fichaje, alta, cambio de estado, documento firmado y obra, y pruebas de permisos.
7. Operación paralela controlada y corte solo tras conciliación. Plan de reversión documentado.
8. Documentar retención, base jurídica, información a empleados/clientes, RGPD, acceso y rectificación antes de registrar documentos personales masivamente.

## 12. Fases entregables

**Fase A — Fundación:** nuevo proyecto de frontend (o ruta aislada `/crm2/`), identidad Google, solicitudes, aprobación y roles, esquema y seguridad; datos de prueba. Sin tocar producción.

**Fase B — Clientes:** ficha y historial único, estados y métricas, búsqueda global y pueblos, documentos con subida real; pruebas de creación/edición/concurrencia.

**Fase C — Territorio/Jornada:** pueblos con cargas diarias aditivas, cobertura gris optativa, regla fina, botón único de fichaje, indicadores por localidad.

**Fase D — Operaciones:** órdenes de trabajo, equipos, Calendar, recordatorios y validación de cierre, mensajes interplantas.

**Fase E — Finanzas/IA:** conciliación, proveedores, agentes con herramientas auditadas y Jarvis multidispositivo.

**No completado por este documento:** código nuevo, datos migrados, login Google implementado, conexión bancaria/Drive o despliegue. No prometer características antes de probarlas.
