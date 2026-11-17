# Vinculación de históricos KONSOR

Los módulos se integran con las funciones existentes, sin sustituir el proyecto Firebase. No crean, editan ni borran eventos de Calendar.

`verificarHistoricoKonsor` requiere la cuenta aprobada `jefe`. Busca en el calendario configurado en `calendario-konsor.js`, para la fecha/franja/equipo indicados. Solo acepta una cita inequívoca que incluya la referencia original etiquetada o teléfono y dirección/pueblo completos. Una franja ocupada o un nombre coincidente por sí solos no sirven. Las citas de día completo, solapadas, no identificadas o con horarios distintos quedan para revisión.

La pantalla verifica antes de habilitar el guardado. `guardarTrabajoV2` vuelve a comprobar el evento: el resultado del navegador no constituye autorización. Solo para una ficha histórica nueva y verificada permite reutilizar una franja ocupada. Conserva el evento original y aplica las reservas internas habituales. La transacción crea una reclamación única en `vinculos_konsor`, que impide reutilizar el evento desde otra ficha incluso ante operaciones concurrentes. El recibo existente permite reintentar la misma operación sin duplicarla. La reclamación se conserva aunque se elimine la ficha: esa situación requiere revisión administrativa, no se libera automáticamente.

Los campos del vínculo quedan protegidos en `guardarTrabajoV2` y en el editor antiguo `guardarFichaTransaccional`. Las fichas locales ya sincronizadas conservan su flujo de vinculación por UID.

## Instalación

1. Descargar juntos `instalar-historicos.cjs`, `historicos-core.js` e `historicos-konsor.js` de la misma revisión.
2. Ejecutar `node instalar-historicos.cjs ~/konsor-despliegue-final/functions`.
3. El instalador comprueba las anclas de la versión revisada y toda la sintaxis antes de escribir. Guarda una copia local y muestra su ruta. No despliega ni modifica Firestore.
4. Desde `~/konsor-despliegue-final`, desplegar únicamente `guardarTrabajoV2`, `verificarHistoricoKonsor` y `guardarFichaTransaccional`, en el proyecto `gestion-comercial-navarr-3b028`.
5. Publicar el cambio de `index.html` y probar primero con una sola ficha histórica.

Usa las dependencias ya presentes (`firebase-admin`, `firebase-functions`, `googleapis`) y la misma identidad de ejecución por defecto que `guardarTrabajoV2`. Esa identidad necesita acceso de lectura al calendario. No cambia permisos de IAM, reglas de Firestore ni las funciones del proyecto separado `konsor-calendar`.

## Comprobación

`node --test tests/comercial.test.cjs tests/historicos.test.cjs`

Las pruebas usan Calendar y Firestore simulados; incluyen identidad, ambigüedad, duplicados, protección de acceso, flujo de importación e instalación con copia y repetición. Pendiente confirmar despliegue y probar contra KONSOR con sesión autenticada. Las comprobaciones del calendario y Firestore no pueden ser una única transacción: se comprueba la cita inmediatamente antes de la transacción, pero una edición externa posterior del calendario requiere revisión y no se sincroniza automáticamente.
