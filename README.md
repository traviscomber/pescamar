# Pescamar Control Multiplanta

MVP ejecutivo para visualizar seis plantas de Pescamar desde importaciones periódicas de Excel.

## Flujo principal

1. Descargar la plantilla de resumen operacional.
2. Cargar un archivo XLSX, XLS o CSV.
3. Validar planta, período, producción, meta e inventario.
4. Publicar un snapshot en el navegador.
5. Revisar KPIs, semáforos, alertas y archivo de origen.
6. Revertir la última publicación si corresponde.

## Estado actual

- El catálogo de las seis plantas es configuración real por validar.
- Los indicadores sólo aparecen después de una importación válida.
- La persistencia es local al navegador: todavía no es multiusuario, auditable ni respaldada.
- La base de datos, archivos privados y autenticación forman parte del siguiente incremento.

El alcance y los hitos están documentados en `ROADMAP.md`.
