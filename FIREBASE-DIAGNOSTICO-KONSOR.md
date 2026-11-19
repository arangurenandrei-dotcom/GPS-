# KONSOR · Diagnóstico seguro de Firebase (solo lectura)

Objetivo: comprobar configuración, funciones desplegadas, permisos, reglas y código backend real antes de proponer reglas o desplegar cambios.

## Ejecutar en Google Cloud Shell

**Estos comandos no despliegan, no escriben en Firestore y no eliminan datos.**

```bash
cd ~/konsor-despliegue-final || exit 1
echo "=== PROYECTO ==="
firebase use
echo "=== FUNCIONES DESPLEGADAS ==="
firebase functions:list --project gestion-comercial-navarr-3b028
echo "=== CONFIGURACIÓN LOCAL DEL PROYECTO ==="
ls -la firebase.json .firebaserc firestore.rules firestore.indexes.json 2>/dev/null || true
echo "=== FUNCIONES LOCALES ==="
find functions -maxdepth 2 -type f \( -name '*.js' -o -name '*.cjs' -o -name 'package.json' \) | grep -v 'node_modules' | head -80
echo "=== VERSIONES ==="
firebase --version
node --version
echo "=== CONEXIÓN FIRESTORE ==="
gcloud firestore databases list --project gestion-comercial-navarr-3b028 --format='table(name,locationId,type)' 2>/dev/null || true
```

## Lo que hay que facilitar para auditoría de seguridad

- Resultado del diagnóstico de arriba.
- Contenido de `firebase.json`, `firestore.rules` y `functions/package.json` (cuando existan).
- Archivos backend que gestionan `readWorkV2`, `writeWorkV2`, `consultarSectoresMikel`, altas de usuarios y avisos, preferiblemente subir los archivos completos sin credenciales.
- Captura o texto de **Firestore Database > Reglas** de Firebase Console para confirmar las reglas **desplegadas**, porque el archivo local puede no coincidir.
- Los permisos efectivos de las cuentas de prueba de jefe Andrei, jefe Mikel y comercial, sin compartir contraseñas ni tokens.

No enviar: service-account JSON, claves privadas, tokens de acceso, secretos de Functions, archivos .env, listas de clientes ni documentos con teléfonos o direcciones reales.

## Pruebas obligatorias a continuación

1. Un comercial puede leer/escribir únicamente sus fichas autorizadas.
2. Un jefe puede administrar únicamente su equipo y consultar agregados autorizados del otro.
3. Las llamadas y los cambios de sector son verificables en servidor y auditan autor y fecha.
4. Las reglas bloquean operaciones desde cuentas anónimas, cuentas suspendidas y cuerpos manipulados.
5. Los reintentos, dos dispositivos simultáneos y conexiones inestables no duplican fichas ni corrompen cambios.
6. Copias de seguridad y restauración en un proyecto de pruebas, sin datos personales.
7. App Check, observabilidad, límites de consumo, control de vulnerabilidades en dependencias y roles de mantenimiento.

**No desplegar una regla genérica de lectura/escritura autenticada.** El control de permisos debe probarse en Cloud Functions, Firestore Rules y entornos separados.

Fuente: https://firebase.google.com/docs/cli y https://firebase.google.com/docs/rules/manage-deploy
