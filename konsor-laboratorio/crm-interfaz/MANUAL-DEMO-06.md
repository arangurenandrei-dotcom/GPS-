# KONSOR CRM — Demo 06 · Escritorio y móvil, oficina por excepción

**URL:** https://arangurenandrei-dotcom.github.io/GPS-/konsor-laboratorio/crm-interfaz/?v=06

**Ámbito:** únicamente `konsor-laboratorio/crm-interfaz/`. No modifica la aplicación comercial de producción.

## Diseño de interfaz

- **PC:** shell completo, menú lateral persistente, contenido flexible a todo el ancho y paneles en varias columnas.
- **Móvil:** sin barra fija inferior; cabecera pequeña con volver al inicio, notificaciones y edificio; inicio con cuatro accesos y botones compactos para Gestión, Edificio y Mi remuneración.
- El **contenedor de trabajo** ocupa el alto del dispositivo y desplaza internamente el contenido cuando sea necesario. No se crean páginas de desplazamiento enorme.
- Secciones internas bajo demanda: Oficina (Por hacer, Enviar, En espera, Finalizados); Administración (Pagos, Gastos, Incidencias); CEO (Resumen, Ingresos, Pagos, Gastos).
- Detalle y explicaciones con `details`, disponibles pero no siempre desplegados. Técnicos solo muestra el próximo trabajo y ofrece el desglose de sacos e instalaciones si hace falta.

## Oficina: correo automático desde ficha central

1. **Expediente K-0021** en Oficina -> faltan pruebas: solicitar a Técnico.
2. Técnico simula aportar foto -> el expediente vuelve automáticamente a **Por hacer**.
3. Oficina confirma que las evidencias son correctas -> se muestra en **Enviar**.
4. Se utiliza el **correo de la ficha central** (`maria@ejemplo.test`, ficticio), **sin solicitarlo otra vez**. El asistente prepara el asunto y mensaje con nombre y referencia de expediente.
5. Contenido de mensaje: instrucciones de revisar y firmar los PDF, devolverlos respondiendo al correo y contactar con Oficina si necesita ayuda.
6. La **plantilla común de instrucciones** se prepara automáticamente. Solo se seleccionan los PDF **específicos** del cliente. Se admiten varios PDF de hasta 10 MB en la interfaz de prueba.
7. No permite avanzar sin PDF, correo válido de ficha central, revisión y evidencias obligatorias.
8. Al simular envío pasa a **En espera**. Transcurridos cuatro días ficticios sin firma pasa a **Por hacer** con tarea de llamada. La firma correcta lo traslada a **Finalizados**.
9. El teléfono de Oficina no ha sido proporcionado: figura **«[Teléfono de Oficina por configurar]»**. Debe configurarse una vez en el perfil de la oficina antes de activar el correo real.

En esta demo **NO se envían correos ni se suben documentos**. Los nombres de archivo solamente se muestran en memoria y se olvidan al recargar. Generar plantillas legales o enviarlas debe hacerse mediante los servicios externos autorizados cuando se conozcan los documentos concretos.

## Revisión funcional verificada

- Código principal y módulos JS sin errores de sintaxis.
- Diez perfiles: acceso, Mi trabajo, expedientes, agenda, herramientas, remuneración, controles de jefatura, centro de actividad y acceso al edificio.
- Cambio de apartados de Oficina, Administración y CEO; regreso a Inicio.
- Secuencia Oficina -> Técnicos -> Oficina -> preparación de envío -> firma/recordatorio con transiciones automáticas.
- Comisión comercial de ejemplo de 1 €/m² y cálculo de sacos con reserva.
- No se modificaron Firebase ni datos reales.

No está certificado el comportamiento visual real en Safari/iPhone; hacen falta pruebas manuales en dispositivo.

## Próximas integraciones en producción

- Identidad y permisos en servidor para correo y datos del cliente.
- Identificador único de expediente, contacto y correo verificado; cambios de correo desde la ficha, no desde la ventana de envío.
- Catálogo de documentos específicos por tipo de actuación y generación de texto común de acompañamiento.
- Servicio email empresarial autorizado, registro de envío y control de entrega, tratamiento conforme a privacidad y conservación definida.
- Seguimiento automático de plazos en servidor incluso cuando el usuario tenga la aplicación cerrada.
- Teléfono y remite corporativo desde configuración de Oficina.
- Validación de fotografías de Técnicos, control de documentos obligatorios, integración con plataformas legales y permisos por departamento.
- Datos económicos con cobertura y periodos coherentes antes de presentar una previsión empresarial utilizable.
