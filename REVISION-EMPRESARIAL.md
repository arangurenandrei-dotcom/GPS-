# Revisión empresarial de KONSOR

## Estado de esta entrega

El borrador incorpora un acceso común por correo, contraseña y perfil aprobado. Se retiran el formulario oculto de perfiles fijos, el selector separado por equipo y la acción de borrado masivo presentada como limpieza de pruebas. En Inicio se utiliza el nombre visible, sin acoplar la etiqueta de pantalla a los identificadores históricos de almacenamiento.

El directorio nuevo permite arrancar con una única cuenta creadora y ningún equipo. Su API de servidor permite dar de alta equipos, asignar al responsable, activar o suspender comerciales y consultar el directorio con el alcance de cada rol. Las pruebas de la lógica pasan por las mismas funciones de entrada usando un almacenamiento simulado. El directorio todavía requiere integración con la aplicación y validación en un entorno Firebase de pruebas.

## Permisos objetivo

| Operación | Creador | Responsable | Comercial |
| --- | --- | --- | --- |
| Crear equipos y asignar responsables | Sí | | |
| Dar de alta o suspender comerciales | Equipos a su cargo o bajo gestión de la organización | Su equipo | |
| Consultar el directorio | Lista de equipos | Su equipo | Su perfil |
| Gestionar fichas individuales | Conforme a su función dentro del equipo | Su equipo | Sus fichas o las que tenga asignadas |
| Consultar resultados de toda la organización | Agregados por equipo | | |
| Consultar resultados operativos | Según su ámbito | Su equipo | Su trabajo |

El privilegio global propuesto para el creador alcanza los indicadores agregados de los equipos. Los indicadores globales no necesitan DNI, teléfonos, direcciones de viviendas ni fichas de clientes. La empresa debe concretar cualquier acceso excepcional a una ficha fuera del equipo y los datos necesarios en cada fase de trabajo.

## Inventario de recorridos y pruebas pendientes

| Área | Comportamiento encontrado | Prueba de aceptación |
| --- | --- | --- |
| Acceso y altas | Firebase Authentication activa el acceso por correo. La identidad del backend actual sigue usando claves fijas y perfiles históricos. | Inicio vacío, alta de responsable, alta y suspensión de comercial, cierre de sesión y acceso denegado al equipo ajeno. |
| Inicio, Dirección y planificación | Los nombres y algunas capacidades siguen ligados a Andrei o Mikel. La planificación usa un borrador local y un guardado de zonas. | Mismas herramientas para los jefes, publicación única, avisos sin duplicados, borrador aislado por cuenta y retorno correcto. |
| Mapa, Catastro y territorio | Herramientas compartidas con rutas antiguas y guardados separados para pueblo y sector. | Crear pueblo y sector, interrumpir y retomar, medir superficie, consultar Catastro y verificar el resultado en iPhone. |
| Captación de vivienda | El asistente replica campos y depende del formulario anterior para dirección, cálculo técnico y guardado. | Un modelo de ficha. Probar vivienda unifamiliar, piso y urbanización, entradas inválidas, cálculo, guardado, edición posterior y pérdida de red. |
| Volcado de hojas | El asistente todavía utiliza campos y tarjetas del formulario histórico. | Una acción de guardado por hoja, recuentos coherentes con sus fichas y recuperación de un volcado incompleto. |
| Oficina, llamadas y obras | Conviven la interfaz antigua y vistas nuevas. Persisten recorridos de agenda, CRM e históricos que requieren validarse juntos. | Una lista de llamadas por calle, una ficha por contacto, cita sin duplicados y estados coherentes entre comercial y responsable. |
| Jornadas y avisos | El reparto de avisos y la lógica histórica conservan referencias a los equipos originales. | Inicio, pausa, vuelta y cierre de jornada, avisos automáticos, tareas asignadas y deduplicación en varios equipos. |
| Resultados y supervisión | Los cruces actuales se diseñaron alrededor de dos equipos. | Resultados agregados para el creador sin enviar fichas de clientes, y vistas operativas acotadas a equipo o usuario. |
| Sincronización y privacidad | El adaptador traduce los modelos anteriores a documentos revisados. El guardado pendiente puede conservar una copia local y el código histórico contiene exportaciones. | Conflicto desde dos sesiones, reintento, suspensión, revisión de datos guardados en navegador, copias controladas y recuperación comprobada. |

## Condiciones para revisión técnica y lanzamiento

1. Integrar el directorio en Firebase Auth, los flujos de aprovisionamiento y cada función operativa. Probar la equivalencia de permisos entre responsables y comerciales de equipos distintos.
2. Extraer captación y volcado a modelos explícitos antes de retirar sus formularios anteriores. Comparar cálculos, registros, identificadores y efectos en agenda con datos ficticios.
3. Centralizar la validación de los campos personales, revisar la salida HTML y la persistencia local, y validar los permisos de lectura y escritura tanto en reglas como en funciones de servidor.
4. Ensayar el recorrido de presentación de principio a fin en un proyecto aislado y en iPhone. Repetir cierre, reconexión, escritura simultánea y suspensión de accesos.
5. Acordar con la empresa qué datos se recogen en cada fase, para qué se usan, quién los ve y cuánto se conservan. Las pruebas de la aplicación y la aprobación de ese tratamiento son decisiones distintas.

Producción se mantiene separada. El arranque vacío se comprueba con un proyecto sin registros reales y cuentas ficticias.

## Citas y futura conexión al CRM

El proceso actual incluye una exportación manual de una ficha y una declaración del comercial de que la ha subido. El campo histórico `crmUploaded` expresa esa declaración. El borrador retrasa la confirmación visual de la cita hasta que el guardado devuelve éxito y omite el nombre del cliente en el nombre del archivo exportado.

Si la empresa acepta la aplicación, la integración tendrá una única entrada en el sistema externo. Tras confirmar la reserva en KONSOR, el servidor registrará una entrega pendiente, identificada por ficha y versión de la cita. El adaptador enviará los campos acordados al CRM, guardará su identificador y distinguirá entre pendiente, aceptada y en revisión. El CRM gestionará la obra en Google Calendar. Para cambios de fecha y cancelaciones habrá que acordar cómo actualizar el mismo registro, incluido el caso de una respuesta perdida.

La implementación del adaptador depende del producto y versión del CRM, su mecanismo de entrada, esquema de campos, autenticación y un entorno de pruebas de la empresa. La prueba de aceptación deberá verificar que reservar, reintentar y reprogramar termina con una ficha y un único evento en el calendario corporativo.

