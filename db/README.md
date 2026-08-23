# Base de datos Pescamar

PostgreSQL/Neon es la fuente única para operaciones reales. Las migraciones versionadas bajo `db/migrations/` son la fuente canónica del esquema.

## Migraciones canónicas

Ejecutar siempre en orden:

```bash
psql "$DATABASE_URL" -f db/migrations/001_core.sql
psql "$DATABASE_URL" -f db/migrations/002_settlement_workflow.sql
psql "$DATABASE_URL" -f db/migrations/003_operator_auth.sql
psql "$DATABASE_URL" -f db/migrations/004_reception_plant_evidence.sql
psql "$DATABASE_URL" -f db/migrations/005_auth_abuse_audit.sql
psql "$DATABASE_URL" -f db/migrations/006_historical_production.sql
psql "$DATABASE_URL" -f db/migrations/007_live_lot_memory.sql
psql "$DATABASE_URL" -f db/migrations/008_dispatches_sales.sql
psql "$DATABASE_URL" -f db/migrations/009_sales_orders_inventory_daily_close.sql
psql "$DATABASE_URL" -f db/migrations/010_transformation_costs.sql
psql "$DATABASE_URL" -f db/migrations/011_reception_evidence_files.sql
```

No deben agregarse migraciones en otra carpeta. Cualquier cambio de esquema nuevo continúa la secuencia en `db/migrations/`.

### Alcance

- `001_core.sql`: núcleo operacional de proveedores, recepciones, créditos, liquidaciones, aprobaciones e importación.
- `002_settlement_workflow.sql`: peso guía, liquidaciones y recuperación auditable de anticipos.
- `003_operator_auth.sql`: credenciales individuales, alcance por planta y sesiones.
- `004_reception_plant_evidence.sql`: planta y evidencia documental para recepción.
- `005_auth_abuse_audit.sql`: límites de intentos y auditoría de autenticación sin IP/correo en texto claro.
- `006_historical_production.sql`: producción histórica canónica.
- `007_live_lot_memory.sql`: memoria/eventos vivos del lote.
- `008_dispatches_sales.sql`: despachos y ventas trazables por lote.
- `009_sales_orders_inventory_daily_close.sql`: órdenes, inventario y cierre diario.
- `010_transformation_costs.sql`: ledger de costos reales de transformación por lote.
- `011_reception_evidence_files.sql`: almacenamiento interno de archivos de evidencia de recepción.

La migración 004 es aditiva. Las recepciones históricas pueden conservar `plant_id` nulo hasta que exista evidencia suficiente para asignarlas sin inventar procedencia; esas filas heredadas permanecen restringidas a Administración mientras no tengan planta confirmada.

Las funciones operacionales pueden ejecutar compatibilidad idempotente mínima para estructuras aditivas, pero eso no sustituye las migraciones versionadas. Producción debe mantenerse alineada con esta secuencia canónica.

## Seguridad de acceso

El login limita intentos fallidos por combinación IP/correo y también por IP agregada dentro de una ventana de 15 minutos. Los identificadores usados para control y auditoría se guardan mediante SHA-256; la interfaz administrativa sólo expone conteos y nombres de operador cuando la identidad fue confirmada.

La contraseña aceptada por la API debe tener entre 12 y 256 caracteres. El límite superior evita cargas de cómputo desproporcionadas sobre el derivador `scrypt`.

## Primera activación

La interfaz de acceso incluye **Activación inicial** para crear el primer administrador usando `ADMIN_SETUP_TOKEN`. Ese flujo:

- sólo funciona mientras no exista un administrador activo con credenciales;
- aplica de forma idempotente el esquema de autenticación;
- sólo completa automáticamente compatibilidad aditiva segura;
- se detiene si una actualización estructural requiere una migración canónica explícita.

Después de crear el primer administrador, `ADMIN_SETUP_TOKEN` deja de servir para la administración cotidiana. Altas y cambios de operadores requieren una sesión individual con rol Administrador.

No existe un seed productivo: el sistema sólo recibe datos respaldados por operación real o por una importación auditada de la fuente canónica.
