# Base de datos Pescamar

PostgreSQL/Neon es la fuente única para la operación real. Los archivos versionados bajo `db/migrations/` son la fuente canónica del esquema: ninguna lista externa, documento de piloto ni compatibilidad de runtime reemplaza ese directorio.

## Regla de migración

En una instalación nueva o al reconciliar un entorno, ejecutar **todos** los archivos `.sql` presentes en `db/migrations/`, en orden ascendente por prefijo numérico, con detención inmediata ante error. Los saltos de numeración son intencionales; no se deben inventar migraciones faltantes.

Ejemplo para un entorno controlado:

```bash
for migration in $(find db/migrations -maxdepth 1 -type f -name '*.sql' | sort); do
  echo "Applying $migration"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration" || exit 1
done
```

Antes de producción se debe confirmar el esquema real del entorno objetivo. Que una API aplique compatibilidad aditiva o que el build esté verde no demuestra por sí solo que todas las migraciones canónicas estén aplicadas.

## Inventario canónico actual

| Migración | Alcance principal |
| --- | --- |
| `001_core.sql` | núcleo operacional: partes, recepciones, créditos, liquidaciones, aprobaciones y operadores |
| `002_settlement_workflow.sql` | workflow de liquidación y recuperación auditable de anticipos |
| `003_operator_auth.sql` | credenciales, sesiones y alcance por planta |
| `004_reception_plant_evidence.sql` | planta y evidencia documental asociada a recepción |
| `005_auth_abuse_audit.sql` | protección de autenticación y auditoría de abuso |
| `006_historical_production.sql` | producción histórica canónica |
| `007_live_lot_memory.sql` | memoria y eventos vivos por lote |
| `008_dispatches_sales.sql` | despachos y ventas trazables por recepción |
| `009_sales_orders_inventory_daily_close.sql` | órdenes, asignaciones, ubicaciones, movimientos y cierre diario |
| `010_transformation_costs.sql` | costos reales de transformación por lote |
| `011_reception_evidence_files.sql` | archivos internos de evidencia de recepción |
| `012_plant_identity_links.sql` | vínculos de identidad y reconciliación de plantas |
| `013_fix_create_lot_sale.sql` | corrección versionada del flujo de venta por lote |
| `014_reception_evidence_ownership.sql` | ownership y procedencia de evidencia de recepción |
| `015_production_lines.sql` | líneas de producción configurables |
| `016_operator_audit_identity.sql` | identidad de operador en auditoría |
| `017_operational_operator_identity.sql` | identidad estable del actor en flujos operacionales |
| `020_whatsapp_intelligence.sql` | canales, mensajes raw e insights de WhatsApp Intelligence |
| `021_whatsapp_directory_seed.sql` | directorio inicial versionado para comunicaciones |
| `022_sea_urchin_process_control.sql` | control de proceso de erizo y chequeos de etapa |
| `023_product_labels.sql` | etiquetas de producto trazables |
| `024_label_release_gate.sql` | gate de liberación de etiquetas |
| `025_partners_profitability_inventory.sql` | partners, rentabilidad e inventario asociado |
| `026_historical_intelligence.sql` | inteligencia derivada de evidencia histórica |
| `027_historical_record_eligibility.sql` | elegibilidad explícita de registros históricos |
| `028_uni_vision_station.sql` | estación Uni Vision y referencias/capturas de color |
| `029_uni_vision_source_image_hash.sql` | identidad hash de imagen fuente en Uni Vision |
| `030_production_support_evidence.sql` | evidencia canónica de soporte de producción |
| `031_production_support_resolutions.sql` | resolución auditada de soporte canónico |
| `032_production_support_blocks.sql` | bloques/cadenas físicas de soporte de producción |
| `033_plant_execution_foundation.sql` | estaciones, dispositivos, eventos idempotentes y unidades físicas de packing |
| `034_label_engine.sql` | plantillas versionadas, vínculo etiqueta/packing y cola auditable de impresión |

El inventario anterior describe el repositorio actual. Si se agrega una migración, debe agregarse también a esta tabla; CI verifica esa correspondencia.

## Invariantes de datos

- No crear seeds productivos, mocks ni filas sintéticas para completar un gate.
- Preservar histórico 2025 como evidencia histórica; no reinterpretar identidades de planta sin evidencia.
- Operación 2026+ parte desde hechos reales registrados o fuentes canónicas auditadas.
- Un archivo fuente no se considera canónico sólo por nombre: debe conservar linaje, hash y estado de aprobación según el flujo de importación.
- Las funciones de compatibilidad idempotente son una red de seguridad, no una segunda fuente de verdad del esquema.
- Cambios de esquema nuevos continúan exclusivamente en `db/migrations/` mediante migraciones versionadas y revisables.
- `canonical_packing_boxes` conserva evidencia canónica/importada; `packing_units` representa unidades físicas vivas creadas por Plant Execution. Nunca publicar una fila canónica directamente como packing vivo sin reconciliación determinística y aprobación.
- Las plantillas de etiqueta son versionadas e inmutables por `scope + code + version`; cada print job conserva un `payload_snapshot` para reconstruir exactamente qué se solicitó imprimir.
- Una cola de impresión no equivale a confirmación física: sólo un adapter de impresora validado puede promover un job de `queued`/`sent` a `printed`.

## Seguridad y tenancy operacional

Las recepciones y recursos operativos protegidos deben conservar un camino explícito hacia `plant_id` y el actor autorizado. La interfaz no sustituye los controles server-side. Identidad de operador, alcance por planta, auditoría y credenciales deben permanecer coherentes con las migraciones versionadas.

La contraseña aceptada por la API debe mantenerse dentro de los límites vigentes definidos por el código; los mecanismos de rate limiting y auditoría de autenticación no deben exponerse mediante valores sensibles en logs o UI.

Plant Execution mantiene sus escrituras deshabilitadas hasta que un preview Neon aislado haya sido verificado. `PLANT_EXECUTION_WRITES_ENABLED=true` sólo puede habilitarse en un entorno cuyo `DATABASE_URL` haya sido comprobado contra la rama esperada.

## Primera activación

La interfaz de acceso puede usar `ADMIN_SETUP_TOKEN` para crear el primer administrador sólo mientras no exista un administrador activo con credenciales. Después de la activación, las altas y cambios de operadores deben realizarse con una identidad administrativa individual y auditable.

Antes de declarar un entorno apto para piloto, usar `PILOT_ACCEPTANCE.md` junto con la verificación del esquema real. El piloto no se aprueba únicamente porque las migraciones compilen o porque Vercel esté `READY`.
