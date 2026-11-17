# Comercial Navarra

## Superficies

La ficha de vivienda permite introducir m² útiles o calcularlos desde los m² totales construidos y las plantas. Se divide el total entre las plantas y se descuenta por paredes una interpolación lineal entre 5 m² (planta de 55 m²) y 10 m² (planta de 130 m²), limitada a ese intervalo y a la superficie disponible. El resultado es orientativo, no una medición certificada. Ejemplos: 110 m² / 2 plantas → 50 m²; 260 / 2 → 120 m².

Se mantienen los rangos históricos. Los valores vacíos o inválidos cuentan como cero, sin inventar superficie. Las comunidades suman los m² de sus buhardillas. La medición del mapa usa una proyección local con origen común para evitar la distorsión anterior.

## Históricos

Importador individual y CSV/TSV: ID obligatorio, teléfono español normalizado, fecha ISO real, comercial canónico del equipo Andrei y m² opcionales. Se conserva el comercial y la fecha indicada. La fecha introducida en una cita es la fecha de obra; para separar fecha de captación y cita se necesita ampliar el formato.

Una fila agendada solo se vincula si coincide de forma inequívoca con una ficha sincronizada: ID externo o teléfono/dirección/pueblo, más fecha, hora y equipo instalador. Conserva su UID y reserva; añade la referencia histórica. Si no existe coincidencia verificable, queda bloqueada en revisión. No se considera que una franja ocupada identifique por sí sola al cliente.

La ampliación `backend/` añade la verificación autenticada del evento original de KONSOR y su reclamación única desde el guardado transaccional existente. El importador ofrece “Verificar citas antiguas en KONSOR”; el servidor vuelve a verificar al guardar. Requiere instalar y desplegar las funciones según `backend/README.md`. No se ha desplegado ni probado contra producción desde este entorno. No se han importado datos reales.

## Mikel

Sin importación, Catastro, medición/cálculo de superficies ni activación de notificaciones. Los controles y las funciones tienen restricciones; se conserva la superficie existente al editar una ficha. La actividad, jornadas, pueblos y registros comerciales continúan disponibles. El centro de avisos existente ya limita sus perfiles al equipo Andrei.

Las restricciones del navegador no sustituyen la autorización de las Cloud Functions y reglas de Firestore. No se han modificado esas reglas, ausentes del repositorio. Los tokens push previamente registrados requieren revisar/revocar suscripciones desde el servidor si existieran.

## Comprobación

Ejecutar `node --test tests/comercial.test.cjs` con Node 22 o posterior. Incluye sintaxis de scripts, cálculo y polígonos, fechas, vinculación inequívoca, restricciones y flujos del importador con persistencia simulada. No requiere credenciales ni escribe datos reales. Pendiente prueba visual y validación de las Cloud Functions con sesión autenticada.
