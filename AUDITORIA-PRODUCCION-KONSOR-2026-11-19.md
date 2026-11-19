# KONSOR — Auditoría de producto y seguridad (19-11-2026)

## Alcance y evidencia
Revisión estática de la rama principal del repositorio GPS-. No equivale a pruebas E2E, auditoría de Firebase en producción, penetración ni certificación RGPD. Las funciones y reglas desplegadas de Firebase no están completas en este repositorio.

## Mejoras de esta revisión
- Barra del mapa: cuatro controles (Catastro con interruptor sobre satélite, Medir, Norte, Mi ubicación). Gestión de pueblos/sectores permanece en Dirección.
- GPS: seguimiento de marcador y centrado mientras se usa mapa; arranca al entrar en Mapa, al arrastrar se suspende el centrado y Mi ubicación lo reactiva. Se detiene al salir de Mapa para reducir batería.
- Liquid Glass: controles táctiles de 44px, estados de foco/pulsación, diseño unificado de flechas y cierres.
- Actualizaciones previas: Mi equipo nuevo, evaluación técnica previa y cierre de sectores técnicamente descartados.

## Pendientes bloqueantes antes de uso empresarial
1. **Autorización real:** revisar código desplegado de Cloud Functions, reglas de Firestore, IAM, separación de equipos, roles, acceso de nuevos usuarios, actualización y borrado de fichas, validación servidor de cada operación. Probar acceso denegado con perfiles diferentes.
2. **Datos:** limpieza de fichas de prueba desde la app tras copia y verificación; inventariar y resolver fichas huérfanas. Evitar que los JSON de respaldo con datos personales queden en dispositivos compartidos.
3. **Navegación:** prueba manual pantalla por pantalla del gesto, flecha y X. Hay rutas antiguas y asistentes que aún cierran sin pila de pantallas; la compatibilidad completa no está acreditada.
4. **Código heredado:** index.html monolítico contiene decenas de flujos anteriores, funciones históricas, CSS sobrescrito y enlaces a modales antiguos; retirar solo tras sustituir y probar cada flujo. No considerar el simple ocultado CSS como eliminación del código.
5. **Integridad de datos:** comprobar reintentos offline, escritura parcial, concurrencia, protección contra duplicados y restauración tras interrupción. Pruebas de importador CSV, cierre de jornada, pausas, zonas y contactos.
6. **Seguridad frontend:** revisar todas las asignaciones innerHTML con contenido del usuario por XSS; establecer CSP compatible con dependencias y Firebase, revisar scripts CDN sin integridad y controlar dependencias.
7. **Privacidad y cumplimiento:** inventario de datos personales y localizaciones, roles responsable/encargado, contratos, información al interesado, conservación/borrado, ejercicio de derechos, análisis de riesgos y registro de actividades conforme RGPD/LOPDGDD.
8. **Disponibilidad:** monitoreo de errores, copias con restauración probada, límites y costes Firebase, pruebas de rendimiento con muchas fichas, pruebas PWA en Safari/iOS y Android, y degradación sin GPS/conexión.
9. **Repositorio:** evaluar pasar código fuente a privado y disponer de entornos separados dev/staging/producción; no es garantía por sí misma.
10. **GPS:** watchPosition solo funciona mientras la app está activa y los permisos lo permiten; iOS/PWA no garantiza seguimiento continuo en segundo plano.

## Observaciones técnicas
- Existe autenticación Firebase y guardados que exigen recibo servidor, pero ello no certifica controles de acceso.
- El adaptador v2 separa documentos de zonas y fichas. Las fichas huérfanas se conservan por diseño y no se incluyen en el borrado por sectores.
- Hay dependencia de proveedores CDN y de capas externas de cartografía/Catastro.
- La barra de mapa y seguimiento deben validarse en dispositivos reales.
- No registrar ubicación de forma permanente sin necesidad, autorización y política específica.

**Dictamen:** mejoras de usabilidad aplicadas; **NO APTO TODAVÍA PARA DECLARAR PRODUCCIÓN EMPRESARIAL SEGURA O SIN FALLOS** hasta completar y verificar las pruebas anteriores.
