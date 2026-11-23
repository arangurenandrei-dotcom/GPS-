# KONSOR · Comunicación entre plantas

## Estado de la integración
La interfaz, la lógica de autorización y las Cloud Functions están versionadas en este repositorio. **La fusión en GitHub no despliega las funciones Firebase.** Hasta que estén desplegadas, la bandeja muestra que falta la función; no simula que una tarea ha sido enviada.

## Rutas de trabajo y avisos
- Comercial → Oficina: al agendar o modificar una obra, preparar expediente.
- Oficina → Técnicos: al agendar, comunicar nueva intervención.
- Técnicos → Oficina y Comercial: al marcar una intervención como aplazada o no realizada, abrir incidencia y reprogramación.
- Técnicos → Oficina: al registrar una ejecución realizada, solicitar revisión de cierre.
- Planta destinataria: confirmar recepción o completar la tarea mediante transacción, sin conceder permisos a otra planta.
- CEO: recibe solo alertas críticas o tareas escaladas y consulta sus propias instrucciones emitidas. Puede emitir órdenes y fijar plazos de confirmación, escalado y márgenes de control.

La automatización Firestore observa los campos `obraStatus`, `obraDate`, `obraTime` y `obraEquipoInstalacion` de documentos `fichas/{id}`; no escribe en Google Calendar ni cambia reservas. Cada alerta automática usa ID estable para evitar duplicados por reintentos del disparador. La escalada comprueba cada 15 minutos tareas sin confirmar o vencidas; no multiplica avisos idénticos.

## Identidades y separación
El servidor consulta `usuarios/{uid}` y exige estado `aprobado`. `jefe` opera como CEO; `comercial1` a `comercial9` como Comercial; perfiles con prefijo `oficina` o `tecnicos` se adscriben a su planta. No se asignan permisos por cambiar la pestaña. Los datos del equipo `mikel` no son consultables con estas funciones. Los perfiles de personal de Oficina/Técnicos necesitan aprovisionamiento y pruebas de acceso antes de darles credenciales. La interfaz actual de selección de planta sigue reservada al perfil fundador.

## Instalación segura del backend
1. Usar los archivos de **la misma revisión de GitHub**: `backend/plantas-konsor.js` y `backend/instalar-plantas.cjs`.
2. En el entorno de despliegue, ejecutar `node backend/instalar-plantas.cjs ~/konsor-despliegue-final/functions` desde la copia que contiene ambos archivos. Se comprueba sintaxis y se conserva copia de `index.js`.
3. Desde `~/konsor-despliegue-final`, revisar dependencias y ejecutar:
```bash
firebase deploy --project gestion-comercial-navarr-3b028 --only "functions:crearMensajePlantaKonsor,functions:listarMensajesPlantaKonsor,functions:actualizarMensajePlantaKonsor,functions:configurarMargenesPlantaKonsor,functions:automatizarFichaPlantasKonsor,functions:escalarPendientesPlantasKonsor"
```
4. Verificar una tarea **no real/de prueba autorizada** de cada planta, confirmación, cierre, alertas del disparador, idempotencia, permisos de una identidad ajena y escalado CEO.

**Costes:** Firestore triggers y Cloud Scheduler pueden requerir habilitar facturación en Firebase/Google Cloud y pueden generar costes. No habilitar facturación ni desplegar sin revisar el plan y obtener autorización del titular.

## Limitaciones pendientes
- Los límites de margen son configuraciones de vigilancia. **No generan alertas financieras hasta que la CRM tenga datos de costes e ingresos fiables**, y nunca cambian presupuestos.
- No hay push móvil entre plantas en este módulo; la bandeja consulta el backend cuando se abre o se actualiza.
- Los cambios de estados técnicos, subida de fotos, aprobaciones y cierre documental siguen sujetos al backend específico aún no desplegado.
- Antes de llamar sistema listo para producción, validar reglas, roles, infraestructura, Calendar y casos reales de punta a punta.
