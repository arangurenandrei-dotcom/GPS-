# KONSOR — Flujo operativo objetivo v1

**Propósito:** KONSOR no es una colección de pantallas; es un asistente operativo que lleva al comercial y al responsable desde la siguiente tarea real hasta el cierre verificable, sin tener que buscar manualmente por dónde seguir.

**Fecha de definición:** 19 de noviembre de 2026. **Estado:** especificación funcional; no implica que todos estos pasos estén implementados.

## Principios innegociables

1. La pantalla Inicio ofrece pocos accesos (Mi jornada, Mapa, Oficina, Resultados y Dirección solo para jefe). Un único motor de "siguiente acción" debe dirigir cada proceso.
2. Flecha izquierda y gesto iOS desde el borde izquierdo: misma acción, un nivel atrás. X derecha: cerrar la sección. La flecha jamás salta directamente a Inicio desde una subpantalla ni destruye datos; no operar sobre campos en edición sin preservar su estado.
3. Distinguir tiempo fichado, pausas y tiempo efectivo en sector. Registrar cambios manuales de horarios con autor, marca temporal y motivo.
4. Distinguir finalización de visitas de calle, volcado de hojas, validación de fichas, seguimiento telefónico, reserva de obra y obra realizada. Ninguna de estas etapas implica automáticamente la siguiente.
5. No inventar datos de catastro, geometría, ausencias, rentabilidad, facturación ni disponibilidad; solo confirmar guardados tras respuesta real del servidor.
6. Separar por equipos y responsabilidades, conservando la posibilidad de que un jefe sea también su propio comercial. Mikel y Andrei pueden tener cada uno su equipo, con visibilidad cruzada solo de los agregados expresamente autorizados.
7. Cada pueblo tiene un perímetro único; admite varios sectores y varios comerciales, pero cada sector pertenece a un responsable asignado y se evita el solapamiento de polígonos. El estado del pueblo deriva de los sectores de captación, no de las llamadas u obras posteriores.
8. Una propuesta no constituye una orden: el comercial recibe asignaciones/avisos con confirmación; el jefe puede corregir planificación. Separar aviso informativo descartable de tarea pendiente persistente.

## A. Domingo: asistente de planificación del jefe

El jefe pulsa "Comenzar planificación". Elige período: una semana, varias semanas o mes, con inicio y días laborales editables. Lista de comerciales activos (incluye al jefe si trabaja en campo).

Secuencia guiada:
- **Diagnóstico:** comparar período anterior y actual: sectores visitados, horas efectivas, respuestas Sí/No/Ausente/Papelito, tasa de Sí por contactos válidos, citas confirmadas, metros cuadrados verificables, pendientes de volcar y seguimientos atrasados. La comparación debe mostrar denominador y diferenciar objetivos de hechos.
- **Territorios:** revisar pueblos iniciados, sectores pendientes, progreso y alertas basadas en evidencia. Sugerir continuar sectores antiguos antes de abrir nuevas zonas.
- **Capacidad:** revisar cada comercial, su disponibilidad conocida, sectores arrastrados, desplazamientos previstos y carga diaria. Si solo trabaja Andrei, planificar solo Andrei.
- **Asignación:** elegir pueblo, delimitar sectores si faltan, numerarlos de forma inequívoca, asignar comercial/fecha/duración estimada y notas, comprobar que no se solapan ni exceden la carga prevista.
- **Revisión:** mostrar resumen por persona y día/semana, avisos de huecos y sectores sin responsable, cambios respecto de planes anteriores; permitir editar antes de publicar.
- **Publicación:** guardar con confirmación de Firestore, notificar a cada comercial de sus asignaciones, conservar recibo de lectura. Cierre: "Planificación completa" solo si se cumplen validaciones; pendientes y excepciones explícitos.

Las alertas de baja productividad y rentabilidad nunca se convierten automáticamente en reproches. Proponer una acción basada en métricas normalizadas (por hora, contacto o m² confirmado), permitir al jefe redactar el mensaje y enviarlo mediante notificación interna dirigida. Si no hay histórico comparable, mostrar "datos insuficientes".

## B. Inicio de jornada del comercial

Al abrir la app:
- **Sin jornada de hoy:** una pregunta "¿Vas a empezar a trabajar?" con "Sí, iniciar" y "Ahora no / X". Descartar no ficha; no volver a preguntar durante el mismo día en ese dispositivo. El horario y la hora real de inicio deben guardarse en el motor de jornadas, no solo cambiar visualmente.
- **Jornada ya activa:** ir directamente al siguiente trabajo, sin pregunta inicial repetida.
- **Comida:** al reabrir, recordar "¿Vuelves al trabajo después de comer?" hasta que se reanude realmente. No enviar notificaciones repetitivas ni bloquear tareas de consulta.
- **Jornada terminada:** no volver a ofrecer iniciar ese mismo día, salvo corrección explícita y auditada.

Prioridad del asistente: sector del último día laboral aún abierto > sector vencido más antiguo > sector de hoy > próximo sector. Mostrar pueblo, número, responsable, lo que falta y fecha. Botón "Ir al sector" abre ruta Apple Maps/Google Maps. La llegada sugerida por GPS no inicia el cronómetro sin confirmación del comercial. "Empezar trabajo de calle" inicia tiempo efectivo de visitas; comida lo pausa; "Terminar visitas del sector" lo detiene y marca volcado pendiente. El mapa sigue disponible libremente para GPS, tejados, superficie y Catastro. Al salir a casa, "Finalizar jornada" registra cierre, sin borrar trabajos pendientes para Oficina.

## C. Oficina: recorrido obligatorio y reanudable

"Oficina" es el centro de trabajo al volver a casa:
1. **Volcar sectores:** mostrar pendientes ordenados del más antiguo al más reciente por fecha de calle (no fecha de transcripción); progreso "1 de N". Cada sector se puede volcar manualmente o mediante CSV creado a partir de fotografías en el chat especializado. Importar CSV solo después de seleccionar sector, mapear filas, revisar campos dudosos y duplicados, y confirmar; los comerciales podrán importar únicamente sus propios sectores una vez se implementen permisos correctos. El volcado no se marca completo antes del guardado real.
2. **Revisar calidad de fichas:** validar al guardar cada sector para impedir errores inmediatos y realizar una segunda pasada global al acabar los volcados. Las fichas sin datos se identifican y se pueden guardar como "pendiente de completar" con motivo; nunca rellenar lo ilegible inventando información.
3. **Seguimientos urgentes:** primero clientes en "esperando confirmación" cuyo próximo contacto vence, confirmando si hay decisión o fijando próxima acción. Después llamadas sin resolver de sectores más antiguos a nuevos; agrupar por calle para facilitar rutas/citas, sin mezclar reservas individuales.
4. **Agendar y cerrar:** el comercial confirma el estado de cada cliente: llamada realizada y cita confirmada, fecha de próximo contacto con motivo, rechazo, no contesta, etc. No forzar reservas inventadas. Mostrar avance por lote y resumen por pueblo de "Sí", citas, esperas y m², distinguiendo potencial de producción real.
5. **Motivación y balance:** mostrar posición real de la Liga y diferencia con el puesto superior; si es primero, ventaja sobre el segundo, usando períodos y criterios homogéneos. Sugerir revisar Resultados y terminar sin menús extras.

Guardar punto de reanudación y progreso del asistente para recuperar la misma fase tras interrupción, incluso desde otro dispositivo cuando la sincronización lo permita.

## D. Cierre diario del jefe

Después de su propia Oficina, si el usuario también es comercial, ofrecer un segundo recorrido de Dirección:
- **Pueblos:** pueblos terminados, nuevos, sectores avanzados, pendientes que pasan al siguiente día, calidad del progreso.
- **Rendimiento territorial:** pueblos prometedores o lentos, siempre con métricas observadas y denominadores (visitas/hora, conversión, m² y citas); sin atribuir rentabilidad a datos ausentes.
- **Cada comercial:** inicio, pausas, tiempo en calle, sectores iniciados/terminados, hojas volcadas, fichas revisadas, llamadas resueltas, citas confirmadas y pendientes para mañana. Diferenciar datos exactos, estimados y no registrados.
- **Resultado económico:** separar valor potencial de Sí, importe previsto de citas confirmadas, obra ejecutada y facturación cobrada cuando exista integración; jamás llamar "facturación" a un "Sí".
- **Alertas accionables:** comerciales sin iniciar en hora planificada, pausa excesiva, sector estancado, ficha atrasada; proponer mensaje o tarea y respetar permisos.
- **Análisis visual:** gráficas de actividad, conversión y tendencias por semana, distribución de respuestas, embudo Sí→seguimiento→cita→obra; gráficos basados en registros reales. Cierre positivo y retorno a Inicio.

## Máquina de estados mínima

**Sector:** planificado → en calle → visitas terminadas/volcado pendiente → volcado guardado → fichas revisadas → seguimiento en curso. Las citas y obras continúan sin reabrir el sector de captación. Los estados se auditan con fecha y persona.

**Pueblo (captación):** sin empezar si ningún sector empezó; en proceso si alguno empezó y hay otros pendientes; terminado cuando todos los sectores definidos estén cerrados en captación. Poder añadir sectores posteriormente sin perder el histórico.

**Jornada:** sin iniciar → trabajando (incluye períodos de visitas de calle) ↔ comida → terminada; correcciones auditadas.

**Cliente:** nuevo → ficha validada o pendiente de datos → por llamar / esperando / no contesta / rechazado → cita confirmada → obra realizada; reprogramaciones preservan historial.

## Orden de implementación sugerido

1. Estabilizar navegación y formularios (gesto = flecha; un nivel; X cierra; no perder datos).
2. Hacer el motor de siguiente acción del comercial y el recordatorio de comida; diferenciar tiempo en calle del fichaje.
3. Completar el asistente de Oficina, con volcado CSV por comercial, revisión, seguimiento y cierre.
4. Crear planificador guiado del jefe para semana/semanas/mes, con publicación y notificaciones.
5. Añadir cierre diario de Dirección, alertas fundadas, comparaciones temporales y panel analítico gráfico.
6. Pruebas reales con Andrei y Mikel, permisos, datos de prueba, escenarios sin cobertura, recarga, reintentos y no duplicación.

## Estado comprobado en el repositorio al redactar

- **Existen piezas:** Inicio con pregunta de fichaje; Mi jornada ordena sectores y ofrece navegación al mapa; Oficina ya distingue parcialmente volcado/fichas/llamadas/revisión; módulo de citas individual con propuestas por calle; Dirección con planes y estadísticas; asistente CSV inicial restringido a responsables; gráficos e informes parciales.
- **No existe todavía el circuito completo:** asistente autónomo multi-fase de punta a punta, comparador semanal con todas las métricas exigidas, planificador por período que publique un plan y valide capacidad, reentrada persistente tras comida, tiempo de calle fiable, importación CSV autorizada para comerciales, cierre diario narrado del jefe y etapa final de Liga integrada.
- **Navegación:** se ha corregido el módulo de retorno para que gesto y flecha compartan la misma acción, y se ha suprimido el salto genérico a Inicio al no encontrar pantalla anterior. Pendiente prueba real en iPhone de todas las rutas.
