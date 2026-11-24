# KONSOR unificado — Limpieza estructural (Fase 1)

**Rama:** `desarrollo/konsor-unificado-2026-11-22`. **Base original:** `3a9705197af033d3ef85cb3be69bb0330de1eccf` de `main` (22/11/2026).

**Nunca desplegar a producción sin pruebas de interfaz, guardados, sincronización y permisos efectivos.**

## Objetivo del producto

Una única PWA con la **misma estructura visual y lógica de la aplicación comercial actual**: Inicio inteligente, Mi jornada, asistentes guiados, avisos (informativos y tareas persistentes), navegación iOS y seguimiento del trabajo. Cada trabajador ve solo módulos necesarios para su actividad, información autorizada y siguiente acción. Los jefes ven su ámbito; CEO ve indicadores consolidados, previsiones y desvíos, sin ejercer de gestoría.

Comercial, Técnicos, Oficina, Administración y Dirección trabajarán sobre fichas y expedientes relacionados por IDs estables. El edificio es una navegación visual opcional, no un segundo CRM.

## Lo realizado en la Fase 1

**Refactor controlado, con retirada de código muerto y migración inicial a módulos universales:**

- `index.html`: de **787.845 caracteres a 25.571**, conservando el DOM y los scripts en el mismo orden.
- `app/legacy/comercial-app.js`: motor clásico extraído, posteriormente reducido mediante eliminación comprobada de cuatro funciones antiguas sin referencias. La prueba compara el resultado exacto con la versión original menos las funciones retiradas.
- `app/legacy/firebase-init.js`: **6.269 caracteres**, inicialización Firebase original, sigue siendo `type=module`.
- `app/legacy/limpieza-visual.js`: **2.020 caracteres**, mismo observador DOM de limpieza decorativa.
- `app/legacy/estilos-comercial.css`: consolidación de **22 bloques** CSS inline en **orden original**, con separadores documentales; se ha comprobado que no contienen `url(...)` con rutas relativas que cambien de significado.
- `app/core/konsor-modulos.js`: manifiesto inicial de herramientas y roles. **No concede permisos**. Los módulos visibles se calculan como intersección de roles permitidos y concesiones explícitas procedentes del backend; sin concesiones, no muestra herramientas.
- `app/core/modelo-fichas-v2.js`: lectura y diagnóstico **sin escrituras** para documentos de `zonas` y `fichas`; conserva el ID y la referencia original, detecta fichas sin zona, revisiones inválidas e IDs duplicados sin registrar datos personales en el informe.
- `app/core/asistente-operativo.js`: reglas únicas de siguiente acción para Comercial, Técnicos, Oficina, Administración y Dirección. Inicio comercial ya usa este módulo y deja de duplicar sus condiciones locales.
- `app/ui/componentes-ios.js`: extrae los constructores de elementos e iconos de Inicio sin cambiar su HTML. Ya se reutiliza en Inicio, Oficina, Dirección, Operaciones y Resultados.
- Se retiraron definitivamente cuatro funciones antiguas sin referencias: `updateClientCallStatusOld`, `renderGlobalClientSearchResultsOld`, `exportOfficialCrmJsonPackageOld` y `requestMobileNotificationsOld`. La alternativa aún usada por Mikel `openCommercialStatsModalLegacy` **se conserva**.
- GitHub Actions ejecuta regresiones y una prueba de Chromium real con tamaños de iPhone y PC, aislando las peticiones de Firebase.

**No se ha borrado ni editado ninguna ficha, sector, colección, Cloud Function, regla de Firestore o dato real.** La rama `main` continúa inalterada.

## Estructura ahora

```text
index.html
app/
  legacy/
    comercial-app.js         # Motor comercial original; pendiente de modularizar
    firebase-init.js         # Inicialización Firebase actual, sin cambios
    estilos-comercial.css    # CSS legacy consolidado; pendiente de depuración
    limpieza-visual.js       # Limpieza decorativa original
  core/
    konsor-modulos.js        # Registro universal propuesto
    modelo-fichas-v2.js      # Vista/adaptador legacy y diagnóstico de integridad
tests/
  verificar-extraccion.cjs   # Compara byte a byte con commit base de main
  verificar-arquitectura.cjs # Roles, permisos simulados, referencias V2
```

Los módulos iOS separados que ya funcionaban (`inicio-ios.js`, `oficina-ios.js`, `volcado-guiado-ios.js`, `vivienda-guiada-ios.js`, `avisos-app.js`, etc.) permanecen en el repositorio y se cargan igual que antes.

## Cómo verificar localmente

```bash
node tests/verificar-extraccion.cjs
node tests/verificar-arquitectura.cjs
```

El primer test reconstruye el HTML de la rama a partir del HTML original anclado al commit de base y comprueba que el contenido de los scripts y estilos extraídos coincide exactamente.

**La prueba de Chromium automatizada ha pasado para Inicio comercial en tamaños móvil y escritorio; no sustituye la comprobación en Safari iOS, pruebas completas de flujos ni Firebase real.** Si se detecta una diferencia de renderizado o carga por tratarse ahora de recursos externos, se debe corregir **antes** de fusionar.

## Fichas: conservar, no recrear

El adaptador actual `konsor-v2-bridge.js` aplana `comercial_custom_zones` a `zonas/{id}` y `fichas/{clientUid}`, conservando `zona`, `owner`, `orden`, `rev` y `datos`. La reconstrucción de sectores a partir de fichas se realiza en `hydrate`. Las fichas que ya no aparecen en un sector **permanecen por diseño** y requieren revisión, no eliminación ciega.

**Evolución futura propuesta:**
- Contacto / persona: ID estable, nombre y medios de contacto. Datos visibles solo para los puestos que los necesitan.
- Inmueble: identidad catastral cuando existe, dirección, datos técnicos, superficie estimada y mediciones verificadas.
- Expediente: actuación/servicio para ese inmueble, histórico de fases, responsables, tramitación y resultados.
- Parte técnico, tarea, aviso, envío y gasto: documentos separados con referencias al expediente, autor, timestamp y restricciones.
- Comercial mantiene `clientUid` como referencia legacy para evitar duplicados y posibilitar migración reversible.

No se ejecuta ninguna migración de Firestore en esta fase. No asumir que un `Sí` de captación significa obra agendada, instalada, expediente completo ni derecho de cobro.

## Plan de siguientes fases

**Fase 2 — Motor universal real y UI:** llevar Inicio, navegación, formularios, tareas y notificaciones al núcleo compartido, sustituyendo rutas antiguas una a una. Unificar diseño móvil estático/compacto y escritorio aprovechando todo el ancho. Cada flujo migrado deberá tener una ruta única y un test de regresión; los antiguos se eliminan, no se ocultan con CSS.

**Fase 3 — Datos compartidos y autorización:** crear un esquema versionado e implementar backend de permisos por empresa/área/equipo/expediente/acción. Validar acceso efectivo de perfiles distintos y pruebas negativas. Desplegar en proyecto de pruebas separado.

**Fase 4 — Técnicos, Oficina, Administración y Dirección:** portar el recorrido de las demos a componentes universales, conectando acciones con el mismo expediente. Técnicos calcula sacos, rutas y evidencias; Oficina tramita externamente y prepara envíos; Administración supervisa honorarios fijos, 1 €/m² de buhardilla comercial, pagos confirmados y gastos; CEO ve información económica explicada y alertas.

**Fase 5 — Migración y despliegue:** diagnosticar y normalizar datos legacy, probar idempotencia, copias y restauración, pruebas de carga y dispositivos, publicar gradual con rollback verificado.

## Bloqueantes actuales

1. Falta auditoría de **Cloud Functions y reglas desplegadas**; la definición de roles front-end no es un mecanismo de autorización.
2. No se han comprobado las bases reales ni se debe suponer que los datos son desechables solo porque haya fichas de prueba.
3. Algunos flujos antiguos comparten datos y funciones globales, por eso **no es seguro borrarlos en bloque**; necesitan reemplazo y pruebas graduales.
4. El volumen del antiguo CSS de compatibilidad, incluidos `ios-unified.css` y `konsor-legacy-light.css`, requiere desmontar estilos de pantalla uno por uno.
5. La nueva rama no está desplegada en GitHub Pages como vista previa; `main` sigue siendo la aplicación publicada.

**Regla de calidad:** si una fase no es demostrablemente equivalente o mejor en guardado, permisos y usabilidad, no se fusiona.

## Estado de pruebas de esta revisión

GitHub Actions del pull request ejecuta:

```bash
node tests/verificar-extraccion.cjs
node tests/verificar-arquitectura.cjs
node --test tests/*.test.cjs
node tests/smoke-navegador.cjs # requiere puppeteer-core y Chrome
```

El resultado del navegador en CI prueba que el script comercial y la pantalla Inicio cargan con los componentes comunes sin enviar tráfico real a Firebase. La comprobación de Safari y de permisos efectivos continúa pendiente. **No se debe confundir esta publicación de limpieza comercial con el CRM completo de cinco plantas**.

---

## Actualización de navegación y auditoría del repositorio · 24-11-2026

### Arquitectura de producto validada para la interfaz

- **Comercial:** Mi jornada, Mapa, Oficina, Resultados personales y Mensajes entre plantas. Dirección aparece como sexta tarjeta únicamente para responsable autorizado.
- **Oficina comercial:** Clientes, Llamadas, Calendario de equipos y Obras. Los flujos de alta guiada y ficha completa están separados, y volcado, comunidades, cartera histórica y cierre están agrupados en herramientas avanzadas sin romper sus rutas.
- **Dirección:** solo Territorio, Cierre del día y Mi equipo como accesos principales. Las funcionalidades existentes de resultados globales, importación, avisos, encargos y análisis se mantienen en herramientas secundarias para no eliminar operaciones que aún dependen de ellas.
- **Resultados:** la entrada de Comercial muestra únicamente su propio ámbito; la entrada global queda en Dirección. La Liga conserva su implementación para accesos explícitos existentes, sin colocarla como pestaña principal de Comercial.
- **Sectores:** útiles para planificación y métricas, nunca requisito para dar de alta una ficha. Las fichas con y sin sector se consideran para Oficina según el estado real de cada cliente.

### Auditoría estructural estática: evidencias y límites

**Inventario del repositorio al comenzar esta limpieza:** 131 archivos (53 JavaScript). Se detectaron 13 archivos de demostraciones independientes en `konsor-laboratorio/` (~244 KB), no referenciados por el `index.html` de producción: se han retirado del árbol activo. Siguen recuperables desde el historial Git.

El mayor factor de complejidad sigue siendo `app/legacy/comercial-app.js` (~667 KB), seguido de `app/legacy/estilos-comercial.css` (~96 KB), `oficina-llamadas-obras-v2.js` (~75 KB) y `cartera-antigua-ios.js` (~46 KB). **No se han eliminado ni reescrito automáticamente**, porque contienen reglas de negocio, callbacks globales y vínculos con datos reales; el volumen por sí solo no demuestra que una función esté obsoleta.

El HTML carga aproximadamente 45 scripts y usa callbacks históricos que requieren conservar el orden de carga. Se comprueba con pruebas de recursos y navegación. No se han fusionado módulos sin probar sus estados compartidos.

### Acciones sometidas a comprobación automática

- Integridad del motor original y validación de recursos HTML/CSS existentes.
- Inicio y tarjetas principales en navegadores simulados de iPhone y escritorio.
- Apertura de Oficina con cuatro accesos, y de Dirección con tres accesos principales para el jefe.
- Separación de resultados personales y de equipo; no ofrecer selector de equipo en la entrada Comercial.
- Pruebas de guardados, flujo de fichas, reservas, avisos, roles y navegación existentes mediante el conjunto de regresiones del repositorio.
- Ausencia de scripts locales cargados por duplicado en `index.html`.

### Pendientes que **no** se pueden certificar desde pruebas estáticas

1. Permisos y reglas efectivas de Firestore/Cloud Functions de **todos los perfiles reales**.
2. Reserva y enlace reales de Google Calendar con clientes de producción, concurrencia y reintentos.
3. Efectividad de navegación en dispositivos iOS reales, con caché PWA, datos existentes y conexiones inestables.
4. Pruebas E2E sobre cada acción histórica, incluidos importadores, GPS, Catastro, llamadas, ficha multivivienda y reportes. No se debe afirmar que todas las rutas funcionan solo por pasar el smoke.
5. Auditoría de seguridad de XSS, privacidad y tratamiento de datos personales; se han observado patrones de `innerHTML` en el código heredado que requieren análisis del origen de los valores.

### Siguiente limpieza técnica segura

1. Identificar dependencias mediante referencias concretas de funciones exportadas y eventos, comparando su ejecución en pruebas antes de modificar un módulo.
2. Extraer por componentes la lógica de `oficina-llamadas-obras-v2.js` y después el motor `app/legacy/comercial-app.js`; preservar exactamente los adaptadores y formatos de Firestore.
3. Eliminar CSS duplicado **solo** con capturas comparativas y pruebas de pantallas completas.
4. Mantener laboratorios y futuros prototipos en una rama distinta y no en el árbol principal de producción.
5. No borrar datos, reglas, colecciones, funciones Firebase ni scripts de despliegue sin inventario de referencias y comprobación en un entorno de pruebas.

**Dictamen limitado:** navegación simplificada y residuos de laboratorio retirados; **no equivale a certificación integral de producción**, ni al fin de la modularización del motor heredado.
