# KONSOR · Integración de fichas, expedientes y tareas

## Recorrido en la aplicación existente

El entorno de pruebas sirve el `index.html` comercial con su acceso y sus pantallas. La compilación selecciona el Firebase de pruebas y pone las herramientas empresariales en la misma aplicación y sesión. Comercial guarda la ficha desde el asistente habitual, la busca en **Clientes** y abre **Expediente compartido**. **Expedientes** en Inicio vuelve a la bandeja de trabajo. Técnicos, Oficina, Administración y Dirección entran con el mismo formulario y ven el espacio de su departamento.

El alta de equipo y sus cuentas se gestiona en **Equipo** con Dirección general. Para acceder a las pantallas comerciales, Dirección vincula el UID de cada cuenta con su perfil comercial histórico dentro del equipo. Ese vínculo se reserva incluso si se suspende la cuenta y conserva la titularidad de las fichas. Los jefes del equipo pueden gestionar el acceso de trabajadores de su departamento. El espacio empresarial también admite cuentas de Comercial que consulten sus tareas sin entrar al visor histórico.

## Datos y permisos

| Operación | Implementación |
| --- | --- |
| Guardar la ficha | El puente V2 guarda zonas y fichas por ID y revisión en subcolecciones del equipo. Un recibo persistente confirma la operación completa y permite reintentar. Una escritura basada en una revisión antigua se rechaza. |
| Vincular al expediente | La función vuelve a leer la ficha y comprueba su titularidad y sector. Su ID y el equipo determinan un único expediente. Su vínculo y su primera tarea se escriben juntos. La ficha vinculada conserva su ID y sector. |
| Compartir la ficha | El expediente consulta la revisión actual de origen. Técnicos recibe ubicación y datos operativos. Oficina también recibe el contacto. Administración recibe el estado y la revisión. Dirección consulta agregados. Los datos que no necesita un rol no salen de la API. |
| Reasignar y seguir | Una transición resuelve la tarea anterior, crea la siguiente si corresponde y escribe el aviso y el movimiento de historial en una transacción. El destinatario puede empezar su tarea y consultar las abiertas y las resueltas. Los jefes de departamentos operativos pueden consultar las tareas de su departamento. |
| Sincronizar | Firebase transmite un sello de actualización sin datos de expediente a miembros activos de su equipo. Las bandejas vuelven a consultar el servidor. Con un formulario abierto se avisa de los cambios y se conserva lo que se está introduciendo. |

Los trabajadores comerciales consultan sus propias fichas. Los jefes consultan las fichas de su ámbito comercial dentro del equipo. El servidor valida equipo, vínculo, puesto y estado de cuenta por operación. Una jefatura que abre un expediente para el titular activo de la ficha le asigna la primera tarea. Las reglas de Firestore del entorno de pruebas son provisionales y bloquean el acceso directo a fichas y expedientes. Se permite la lectura del sello al equipo y se verificó el rechazo desde otro equipo. Antes de ampliar el piloto, hay que revisar reglas y autorización con el proyecto real.

La integración cubre la ficha V2 y su circuito operativo. La reserva en Calendar, el CRM externo, los sistemas de firma y los avisos push requieren sus propias conexiones de pruebas. La bandeja interna entrega y registra los avisos dentro de KONSOR.

## Ejecutar Emulator Suite

Desde `empresarial/`, con Node 22, Java 21 y Chromium o Chrome para las pruebas:

```sh
npm ci
npm test
npm run dev
```

Abre `http://127.0.0.1:5004`. La aplicación arranca con las cuentas y registros del emulador. Para un arranque vacío usa un directorio de trabajo nuevo. La prueba automatizada empieza con emuladores nuevos e introduce sus cuentas y registros desde los flujos de prueba.

1. Registra una cuenta de Dirección. Al intentar acceder antes del alta, el formulario muestra el UID.
2. En otra terminal ejecuta `npm run ceo -- UID "Nombre visible"` y accede de nuevo.
3. En **Equipo**, crea un equipo y registra cuentas de Comercial, Técnicos, Oficina y Administración. Vincula la de Comercial a un perfil histórico, por ejemplo el que corresponda a su titular. Usa una cuenta de Dirección del equipo para comprobar los agregados por ámbito.
4. Guarda una captación desde la aplicación comercial. Abre la ficha desde **Clientes** y elige **Expediente compartido**. Deriva a Técnicos, entrega el parte, tramita o pide la corrección en Oficina y verifica el cierre desde Administración y su recuento en Dirección.

## Resultados verificados

Pasaron las 11 comprobaciones de `npm test` con Node 22, Java 21 y los emuladores oficiales de Auth, Functions, Firestore y Hosting. Chromium probó cinco cuentas en la aplicación integrada, con Comercial a 390 px y los demás departamentos a 1440 px. Se guardó la ficha en el formulario original, se vinculó desde Clientes, se recibió el aviso con la bandeja de Técnicos abierta, se sincronizó una edición de dirección, se entregó el parte, se validó en Oficina, se cerró en Administración y se comprobó el recuento en Dirección. Las pruebas de API verificaron además concurrencia, reintentos, subsanación, suspensión y aislamiento de dos equipos. Las pruebas externas de Gemini usaron un transporte controlado.

También pasaron las dos verificaciones de arquitectura, las 85 comprobaciones de regresión y la navegación de la entrada comercial anterior en Chromium móvil y escritorio. El ejercicio utilizó cuentas y datos de prueba en emuladores. La validación de IAM, índices y despliegue en KONSOR-Pruebas queda pendiente del acceso al proyecto cloud.

## Conectar KONSOR-Pruebas a Codex

El nombre visible **KONSOR-Pruebas** identifica el proyecto. Sigue pendiente su ID real y la identidad autorizada. Una persona administradora del proyecto puede ejecutar la preparación siguiente.

1. Confirma en la consola el ID real de **KONSOR-Pruebas**. Dentro de ese proyecto habilita el método de Authentication por correo y contraseña, Firestore Standard en modo nativo, una app web y Hosting. Prepara Cloud Functions de segunda generación y habilita las APIs de despliegue que requiera Firebase, incluido Cloud Build, Artifact Registry, Cloud Run y Eventarc. El propietario del proyecto gestiona facturación, región y agentes de servicio. Los emuladores se pueden utilizar mientras el proyecto cloud queda preparado.
2. Crea una identidad de despliegue para ese proyecto e incorpora credenciales de corta duración a Codex mediante federación de identidades y ADC. Si se usa impersonación con un usuario autorizado, concede creación de tokens solo sobre la cuenta de despliegue y completa la autorización interactiva fuera del chat. En un entorno gestionado, guarda el archivo ADC o la configuración de federación en la vinculación de credenciales y expón su ruta por `GOOGLE_APPLICATION_CREDENTIALS`. No se necesita una clave JSON privada de una cuenta de servicio.
3. Crea la cuenta de ejecución `konsor-operaciones@ID_REAL.iam.gserviceaccount.com` en el proyecto de pruebas. La función usa esa cuenta. Autoriza acceso a Firestore y lectura de usuarios de Authentication para validar altas. Da al disparador de Eventarc el permiso de recepción y, si se solicita, el permiso de invocación sobre el servicio de destino. La identidad de ejecución no necesita permisos para desplegar.
4. Obtén la configuración web de la app desde **Configuración del proyecto → Tus apps**. Copia solo `projectId`, `authDomain`, `appId` y `apiKey` de esa app a `empresarial/firebase-pruebas.local.json`. La configuración web se incluye en el cliente compilado y no sirve como credencial de Google Cloud. El archivo local y el destino generado quedan fuera de Git.
5. Una vez que la identidad esté autorizada, comprueba el acceso al proyecto y su base. Desde `empresarial/` ejecuta los comandos siguientes, sustituyendo `ID_REAL` por el ID confirmado.

| Identidad | Alcance inicial en KONSOR-Pruebas |
| --- | --- |
| Despliegue | `roles/cloudfunctions.developer`, `roles/firebasehosting.admin`, `roles/firebaserules.admin`, `roles/datastore.indexAdmin` y `roles/serviceusage.serviceUsageConsumer`. Vincula `roles/iam.serviceAccountUser` solo sobre la cuenta de ejecución. El administrador configura los agentes administrados y suma permisos de despliegue específicos si los requiere una API. |
| Ejecución | `roles/datastore.user` y `roles/firebaseauth.viewer` en el proyecto de pruebas. Para Eventarc, configura `roles/eventarc.eventReceiver` y la invocación del servicio cuando proceda. |
| Alta inicial de Dirección | Identidad temporal con `roles/datastore.user` y `roles/firebaseauth.viewer` en el proyecto de pruebas. Retira el acceso temporal tras crear el primer perfil. |
| Personas que prueban KONSOR | Cuentas de Firebase Auth y perfiles asignados desde KONSOR. Sus permisos operativos se administran en la aplicación. |

```sh
npx --no-install firebase apps:list --project ID_REAL
npx --no-install firebase firestore:databases:list --project ID_REAL
npm run deploy:staging -- ID_REAL
npm run ceo -- --staging ID_REAL UID "Nombre visible"
```

El alta debe usar el UID de la cuenta registrada en el dominio de pruebas. Para probar las pantallas usa `https://ID_REAL.web.app`. Tanto el comando de despliegue como las comprobaciones previas de Hosting, Functions y Firestore verifican el destino local. Las funciones comparan el proyecto en ejecución con el declarado y la compilación web acepta solo el dominio del proyecto. Codex necesita salida de red autorizada para las APIs de Google del despliegue y la identidad. Solicita acceso a esos servicios en este entorno cuando se conecte la credencial, conservando el destino limitado al proyecto de pruebas.

Referencias de configuración e IAM. [Credenciales ADC](https://cloud.google.com/docs/authentication/provide-credentials-adc) · [Identidades de cargas de trabajo](https://cloud.google.com/iam/docs/workload-identity-federation) · [Permisos de Cloud Functions](https://cloud.google.com/functions/docs/reference/iam/roles) · [Permisos de Firebase](https://firebase.google.com/docs/projects/iam/permissions)
