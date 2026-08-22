# Base de datos Pescamar

PostgreSQL es la fuente única para operaciones reales. La migración `001_core.sql` crea el núcleo de proveedores, recepciones, liquidaciones, anticipos, recuperaciones y aprobaciones.

## Aplicar la migración

1. Provisionar Neon Postgres desde Vercel Marketplace y vincularlo al proyecto `pescamar`.
2. Descargar las variables con `vercel env pull .env.local --yes`.
3. Ejecutar las migraciones en orden:

   ```bash
   psql "$DATABASE_URL" -f db/migrations/001_core.sql
   psql "$DATABASE_URL" -f db/migrations/002_settlement_workflow.sql
   ```

No existe un *seed*: el sistema inicia vacío y solo recibe datos respaldados por la operación real o por una importación auditada de la planilla canónica.
