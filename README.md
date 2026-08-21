# Pescamar Control Multiplanta

MVP ejecutivo para visualizar seis plantas de Pescamar desde importaciones periódicas de Excel.

## Flujo principal

1. Descargar la plantilla de resumen operacional.
2. Cargar un archivo XLSX, XLS o CSV.
3. Validar planta, período, producción, meta e inventario.
4. Publicar un snapshot compartido cuando la base está conectada.
5. Revisar KPIs, semáforos, alertas y archivo de origen.
6. Revertir la última publicación si corresponde.

## Estado actual

- El catálogo de las seis plantas es configuración real por validar.
- Los indicadores sólo aparecen después de una importación válida.
- Neon Postgres guarda el estado compartido, los lotes y las reversiones cuando `DATABASE_URL` está configurada.
- `localStorage` se conserva sólo como fallback para una demostración sin backend.
- El archivo original, su hash y la autenticación forman parte del siguiente incremento.

El esquema reproducible está en `db/schema.sql` y la API serverless en `api/plant-state.ts`.

El alcance y los hitos están documentados en `ROADMAP.md`.
