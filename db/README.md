# Base de datos Pescamar

PostgreSQL/Neon es la fuente única para operaciones reales. `001_core.sql` crea el núcleo de proveedores, recepciones, liquidaciones, anticipos, recuperaciones, aprobaciones y operadores.

## Migraciones

Para una instalación administrada manualmente, ejecutar en orden:

```bash
psql "$DATABASE_URL" -f db/migrations/001_core.sql
psql "$DATABASE_URL" -f db/migrations/002_settlement_workflow.sql
psql "$DATABASE_URL" -f db/migrations/003_operator_auth.sql
psql "$DATABASE_URL" -f db/migrations/004_reception_plant_evidence.sql
```

`002_settlement_workflow.sql` incorpora peso guía, cálculo de liquidaciones y recuperación auditable de anticipos. `003_operator_auth.sql` agrega credenciales individuales, alcance por planta y sesiones. `004_reception_plant_evidence.sql` vincula cada nueva recepción a una planta y agrega evidencia documental trazable.

La migración 004 es aditiva. Las recepciones históricas pueden conservar `plant_id` nulo hasta que exista evidencia suficiente para asignarlas sin inventar procedencia. Por seguridad, esas filas heredadas sólo son visibles para Administración mientras no tengan planta confirmada.

Las funciones operacionales ejecutan una compatibilidad idempotente mínima para crear las estructuras aditivas de 004 si aún no existen. La migración versionada sigue siendo la fuente canónica y debe aplicarse explícitamente en una operación de mantenimiento para instalar también sus constraints de dominio.

## Primera activación

La interfaz de acceso incluye **Activación inicial** para crear el primer administrador usando `ADMIN_SETUP_TOKEN`. Ese flujo:

- sólo funciona mientras no exista un administrador activo con credenciales;
- aplica de forma idempotente el esquema de autenticación;
- si falta el esquema 002, sólo lo completa automáticamente cuando recepciones, liquidaciones, anticipos, movimientos y aprobaciones están vacíos;
- si detecta datos operacionales, se detiene y exige aplicar `002_settlement_workflow.sql` manualmente antes de continuar.

Después de crear el primer administrador, `ADMIN_SETUP_TOKEN` deja de servir para la administración cotidiana. Altas y cambios de operadores requieren una sesión individual con rol Administrador.

No existe un *seed*: el sistema inicia vacío y sólo recibe datos respaldados por la operación real o por una importación auditada de la planilla canónica.
