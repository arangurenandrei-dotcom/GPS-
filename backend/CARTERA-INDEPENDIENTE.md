# KONSOR · Clientes antiguos sin sectores (2026-11-23)

## Qué cambia

- **Nueva colección independiente** `clientes_antiguos_independientes` con registros por usuario y equipo; no crea ni modifica sectores, polígonos ni estadísticas de captación.
- **Cliente antiguo → Pueblo → Calle → Ficha**, conservando los clientes históricos que ya estaban asociados a zonas.
- **Guardar pendiente** admite fichas incompletas. **Guardar y habilitar llamadas** solo exige pueblo, nombre, dirección, teléfono español válido y respuesta «Sí». Año, superficie, CP y zona CTE pueden completarse posteriormente.
- El cálculo de superficie neta sigue siendo `m² totales - 5` cuando se dispone de superficie.
- La sección «Plan de llamadas por calles» consulta los históricos independientes, permite realizar la llamada, marcar «ya llamado» o «necesita seguimiento» y reactivar una ficha.
- El control de acceso se aplica desde las funciones: solo usuarios aprobados del equipo correspondiente; comerciales únicamente sobre sus documentos y jefes sobre su equipo. Se comprueban revisiones, se evitan duplicados por equipo/dirección/teléfono y se registran cambios.
- No se ha migrado ni borrado ninguna ficha ya existente. No se registra ningún nombre o teléfono real en GitHub.

## Pasos previos obligatorios para desplegar

Se necesita acceso autorizado a Cloud Shell del proyecto de Firebase `gestion-comercial-navarr-3b028` y a la copia de código real de `functions`. No basta con publicar la web.

1. En Cloud Shell (carpeta `~/konsor-despliegue-final`), descargar **juntos** los dos módulos de `backend/` de esta rama:

```bash
set -e
cd ~/konsor-despliegue-final
parche=$(mktemp -d)
base="https://raw.githubusercontent.com/arangurenandrei-dotcom/GPS-/fix/clientes-antiguos-independientes-2026-11-23/backend"
curl -fsSL "$base/cartera-independiente.js" -o "$parche/cartera-independiente.js"
curl -fsSL "$base/instalar-cartera-independiente.cjs" -o "$parche/instalar-cartera-independiente.cjs"
node "$parche/instalar-cartera-independiente.cjs" "$PWD/functions"
node --check functions/cartera-independiente.js
```

2. Revisar los permisos de la cuenta, la inicialización de `firebase-admin` en `functions/index.js`, las reglas y el estado de Cloud Functions. Probar en un proyecto de staging y confirmar que las cuentas de cada equipo no leen datos de otro.
3. Desplegar **solo** las funciones nuevas, después de confirmar el proyecto y los tests:

```bash
firebase deploy --only "functions:listarClientesAntiguos,functions:guardarClienteAntiguo,functions:actualizarLlamadaClienteAntiguo" --project gestion-comercial-navarr-3b028
```

4. Cuando se confirmen funciones y permisos, fusionar la rama frontend a `main` y probar desde el iPhone: alta pendiente en un pueblo sin sectores, alta lista para llamadas, lectura por calle, actualización de llamada, cierre y reapertura; comprobar que las estadísticas antiguas no cambian.

**No fusionar antes de tener desplegadas y verificadas las funciones.** El instalador no despliega por sí solo y no escribe datos en Firestore.

## Limitaciones

- La reserva de obra para una ficha totalmente independiente todavía no está integrada en las funciones de agendamiento originales: se permite gestionar las llamadas y la ficha, pero **no se finge una reserva** ni se convierte la ficha en un sector.
- Consulta limitada explícitamente a 500 registros por equipo: hace falta paginación antes de que esa cartera crezca más.
- No se han importado las dos fichas manuscritas: deben revisarse los caracteres dudosos y guardarse una vez validado el despliegue.

## Pruebas

```bash
node --test tests/cartera-independiente.test.cjs
node --test tests/*.test.cjs
```
