# Manual de prueba de KONSOR

## Antes de empezar

Haz estas pruebas en un entorno de demostración separado, con cuentas y datos ficticios. No crees fichas ni cuentas de prueba en el Firebase que pueda contener información real. No uses DNI, teléfonos, direcciones, correos, fotografías ni nombres de clientes reales. No borres registros para “limpiar” la prueba.

Anota para cada paso: **OK**, **FALLO** o **NO APLICA**. Si falla, guarda el nombre de la pantalla, el paso anterior, el resultado esperado y el resultado observado. Las capturas deben ocultar correos, teléfonos, direcciones y cualquier otro dato personal.

## 1. Acceso y registro

1. Abre KONSOR en el navegador del teléfono y comprueba que la pantalla de acceso muestra la marca KONSOR, fondo claro, una tarjeta, campos y botones legibles.
2. Pulsa **Crear cuenta**. Comprueba que la tarjeta conserva el mismo aspecto y que aparece el campo de nombre completo y una nota de que un administrador debe aprobar el acceso.
3. Envía una solicitud con una cuenta ficticia del entorno de prueba. La cuenta debe quedar pendiente y no debe entrar en el panel ni recibir permisos de responsable.
4. Vuelve a **Iniciar sesión**. Comprueba que se oculta el nombre y vuelve a aparecer la recuperación de contraseña.
5. Prueba un correo incorrecto, una contraseña vacía y una cuenta pendiente. Comprueba que aparece un mensaje claro y que no se abre el panel.
6. Con una cuenta ficticia aprobada, inicia sesión. Verifica que se abre Inicio y que aparece el rol correcto.

## 2. Inicio, apariencia y navegación

1. Revisa Inicio en vertical y horizontal. Comprueba que no hay textos cortados, botones fuera de pantalla ni desplazamiento horizontal.
2. Abre cada acceso principal y usa **Atrás** varias veces. Debes volver por las pantallas visitadas y acabar en Inicio, sin salir inesperadamente de KONSOR.
3. Repite la vuelta con el botón de la pantalla y con el gesto desde el borde, si el teléfono lo permite. El gesto debe hacer lo mismo que el botón visible.
4. Abre Ajustes y la guía de uso. Revisa que el modal sea claro, legible y se cierre sin perder la sesión.
5. Comprueba que un responsable ve Dirección y un comercial no ve las acciones de administración.

## 3. Equipo, planificación y territorio

1. En el entorno aislado, verifica que el creador empieza sin equipos ni comerciales ficticios precargados.
2. Crea un equipo de demostración y un responsable. Comprueba que la asignación queda una sola vez.
3. Entra como responsable. Crea una planificación corta con dos comerciales ficticios y una zona de prueba. Revisa fechas, asignaciones, resumen y publicación.
4. Intenta abrir desde la cuenta de otro equipo una zona que no le pertenece. Debe quedar bloqueada.
5. Crea un pueblo y un sector ficticios. Cierra y vuelve a entrar para comprobar si quedan guardados.
6. En el mapa, prueba Catastro, búsqueda, ubicación y medición. La medición debe mostrar superficie antes de cerrar y permitir volver al mapa.

## 4. Jornada y trabajo de calle

1. Entra como comercial ficticio y revisa **Mi jornada**. Confirma que solo aparecen sus asignaciones.
2. Registra inicio, comida, reanudación y fin usando la secuencia disponible. Comprueba que cada acción cambia una sola vez y se refleja al volver a abrir la pantalla.
3. Si no hay trabajo asignado, comprueba que KONSOR lo indica sin inventar una ruta.
4. Comprueba los avisos en el centro de notificaciones. Si pruebas avisos del sistema, concede permiso únicamente en el dispositivo de prueba.

## 5. Fichas, volcado y llamadas

1. Crea una ficha ficticia desde el asistente de captación. Prueba una vivienda y, si aplica al caso de demostración, una comunidad.
2. Introduce valores de prueba para los campos técnicos. Comprueba cálculos, validaciones, resumen y guardado.
3. Cambia de paso sin guardar y vuelve. Los valores deben conservarse en el asistente; después guarda y comprueba que aparece una ficha, no dos.
4. Haz un volcado ficticio con varias respuestas y distribuye las viviendas. Comprueba que los recuentos coinciden y que una respuesta “Sí” no se presenta como una ficha completa si aún faltan datos.
5. En Oficina, abre seguimiento de llamadas. Cambia un estado, escribe una nota ficticia y verifica que el cambio aparece al regresar.
6. Repite una acción de guardado. No debe crear una ficha o cita duplicada.

## 6. Cita y mensajes de WhatsApp

1. Programa una cita con una ficha completamente ficticia y comprueba que aparece la fecha, la franja y la dirección de prueba correctas.
2. Abre el mensaje preparado para el cliente, pero no lo envíes. Comprueba que solo incluye lo necesario para confirmar la visita y que no solicita DNI, escrituras ni documentos por WhatsApp.
3. Abre los mensajes **Sugerir una mejora**, **Informar de un fallo** y **Resolver una duda**. Comprueba que el texto pide contexto técnico y recuerda no incluir datos de clientes ni capturas con información personal. Cierra WhatsApp sin enviar.
4. Confirma cómo se comunica la cita con la CRM. En esta versión el proceso depende de la exportación o confirmación manual disponible en la aplicación; la conexión automática con la CRM y Google Calendar debe tratarse como pendiente hasta probarla con la empresa.

## 7. Sincronización y permisos

1. Abre la misma cuenta de prueba en dos sesiones. Guarda un cambio en la primera y comprueba si la segunda se actualiza o avisa que debe recargar.
2. Desconecta la red antes de un cambio. La app debe dejar claro si no pudo confirmar el guardado; vuelve a conectar y verifica el resultado antes de repetirlo.
3. Prueba con un comercial de otro equipo. No debe leer ni modificar fichas, zonas, tareas o datos operativos que no pertenezcan a su ámbito.
4. Suspende una cuenta ficticia y prueba a iniciar sesión de nuevo. El acceso debe quedar bloqueado.
5. Cierra sesión y vuelve atrás en el navegador. No debe dejar abierta la pantalla de trabajo para una sesión cerrada.

## 8. Cierre de la prueba

No despliegues ni cambies reglas de seguridad durante estas comprobaciones. Anota el dispositivo, navegador, rol ficticio y hora aproximada de cualquier fallo. Devuélveme los resultados así:

```text
Entorno de prueba:
Dispositivo y navegador:
Rol ficticio:
Paso del manual:
Resultado esperado:
Resultado observado:
¿Se repite?:
Captura sin datos personales (opcional):
```

Una prueba de interfaz no certifica por sí sola las reglas de Firebase, las funciones desplegadas, el tratamiento legal de datos ni la integración con sistemas de la empresa. Esas comprobaciones deben realizarse en el proyecto de prueba autorizado antes de cargar datos reales.
