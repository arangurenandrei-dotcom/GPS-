# KONSOR CRM 2.0 — entorno de desarrollo

**Estado a 2026-11-24:** proyecto Supabase creado y base de datos inicial desplegada. No hay interfaz CRM2 publicada, ni empleados activados, ni clientes migrados.

## Infraestructura real

- Supabase project ref: `aqflqhitivdhxeouhmmf`
- Organización Supabase: `bjisdyvousprqhsyroim`
- Región: `eu-west-1` (Irlanda)
- Proyecto: `KONSOR CRM 2.0 - Desarrollo`
- Plan al crearlo: Free, creación confirmada a 0 por mes; cuotas de uso y cambios de plan se revisarán por separado.
- Empresa CRM: `KONSOR`, organización interna `51817e35-444b-4bb5-b698-7d236dcfc620`

### Esquema creado

Todas las tablas están en `public`, llevan prefijo `konsor_` y **RLS activado**:

| Tabla | Función |
| --- | --- |
| `konsor_organizations` | Empresas y ámbito de acceso |
| `konsor_members` | Roles y miembros asociados al UID autenticado |
| `konsor_access_requests` | Solicitud de nuevo trabajador, pendiente de aprobación |
| `konsor_towns` | Pueblos y estado del territorio |
| `konsor_clients` | Clientes y estado CRM único |
| `konsor_properties` | Viviendas de cada expediente |
| `konsor_jobs` | Obras y estado de sincronización con Calendar |
| `konsor_territory_days` | Resultados diarios acumulables por pueblo y comercial |
| `konsor_coverages` | Polígonos de cobertura opcionales |
| `konsor_client_events` | Historial de movimientos de expediente |
| `konsor_documents` | Metadatos de documentos y firmas (sin archivos subidos aún) |
| `konsor_shifts` | Fichajes y pausas |

Se aplicaron dos migraciones directamente en el proyecto conectado:
- `konsor_crm2_initial_schema_locked_down`.
- `konsor_crm2_tenant_integrity_and_access_request`.

**Advertencia importante:** estas migraciones están en el historial de Supabase, no aún como SQL fuente reproducible en este repositorio. Recuperar y versionar el SQL completo antes de cualquier despliegue adicional o duplicación de entorno. No asumir que este README sustituye al esquema SQL.

## Seguridad de la fundación

- Todas las 12 tablas tienen RLS activado.
- Por defecto **ningún usuario del navegador puede consultar ni modificar clientes, viviendas, órdenes, documentos, pueblos o fichajes**. Esto es intencional hasta configurar permisos por planta.
- Un usuario autenticado puede consultar sus propias membresías y solicitudes.
- Un usuario autenticado puede crear una sola solicitud de alta `pending` para KONSOR; no puede autoproclamarse CEO/supervisor, aprobar su propia solicitud ni editarla desde el cliente.
- Existen claves compuestas para impedir asociar un cliente de una organización a un pueblo/obra de otra.
- Todavía no se ha implementado el flujo de aprobación, autenticación Google de la **aplicación**, permisos por rol sobre expedientes ni almacenamiento de archivos.
- La consola de Supabase y su integración de desarrollo son accesos de administración: no deben utilizarse como credenciales de usuarios finales.

## Próximo orden técnico

1. Guardar el SQL DDL exacto como migraciones reproducibles en GitHub; verificar esquema con introspección y analizar avisos de seguridad.
2. Crear frontend independiente bajo `/crm2/`, sin cambiar la PWA vigente.
3. Autenticación Google e incorporación: solicitudes, aprobación CEO, suspensiones, roles; comprobación de RLS con cuentas distintas, sin exponer `service_role` en navegador.
4. Clientes y expedientes con CRUD seguro, documentos privados y auditoría, probados en móvil.
5. Pueblos y actividades por día sin obligar a crear sector, mapas y jornada compacta.
6. Calendar, técnicos, oficina, finanzas y agentes IA.
7. Migración con inventario, copia de seguridad, correspondencia de IDs, conciliación y vuelta atrás.

**No modificar Firebase de producción ni incorporar clientes reales hasta que la versión nueva sea segura y verificable.**
