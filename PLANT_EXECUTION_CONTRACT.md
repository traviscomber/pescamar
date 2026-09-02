# Pescamar — Plant Execution Contract

**Estado:** schema 033–040 aplicado en Neon `main`; escritura controlada habilitada en producción; UAT físico real pendiente  
**Objetivo:** extender el core existente hasta la ejecución física de planta sin duplicar lotes, inventario, usuarios ni auditoría.

## 1. Cadena objetivo

`recepción → calidad → producción → pesaje → packing unit → etiqueta → pallet → frío → liberación regulatoria → inventario PT → despacho`

El `reception_id` continúa siendo la raíz de trazabilidad. Ningún dispositivo crea inventario directamente.

## 2. Principios

1. Un solo core para las seis plantas.
2. Scope por planta se hereda de la sesión actual.
3. Cada evento crítico conserva operador, planta y timestamp.
4. Balanzas/scanners generan eventos; reglas Pescamar deciden su efecto.
5. Toda escritura de estación debe ser idempotente.
6. Correcciones manuales críticas requieren motivo y auditoría.
7. Offline nunca puede duplicar packing, peso ni movimientos.
8. Holds regulatorios bloquean despacho tanto en API como en PostgreSQL.
9. Integraciones Sernapesca/Siscomex sólo se implementan con contrato real.
10. `canonical_packing_boxes` sigue siendo evidencia canónica/importada; no se reutiliza como tabla transaccional viva de piso.
11. No se crean estaciones, dispositivos, cajas, pallets ni ciclos ficticios para “completar” readiness.

## 3. Entidades live

### `plant_stations`

Identidad/configuración de una estación física o lógica dentro de una planta. Tipos actuales: `floor`, `packing`, `cold`, `warehouse`, `quality`.

### `plant_devices`

Registro de scanner, balanza, impresora, terminal o sensor asociado a una estación. Fabricante, modelo y protocolo permanecen opcionales hasta conocer hardware real; `stable_identifier` mantiene identidad física.

### `device_events`

Registro de lectura/interacción de hardware con estación, dispositivo, operador, valor crudo/normalizado, timestamp, estado e idempotency key.

### `packing_units`

Unidad física operacional creada en piso. Grain: una caja/bandeja/unidad identificable, vinculada a recepción, estación, operador, especificación, peso y estado.

### `packing_specs`

Regla versionada por producto/cliente/mercado. Las versiones son append-only y no reescriben una especificación histórica.

### `label_templates` / `label_print_jobs`

Plantillas versionadas y cola auditable de impresión/reimpresión. Una solicitud no se considera físicamente impresa hasta confirmación del adapter/impresora.

### `pallets` + `pallet_packing_units`

Agrupa packing units y conserva historial de membresía. Una caja sólo puede tener una membresía activa. Un pallet bajo hold `open/rejected` congela su composición.

### `cold_assets` / `cold_runs` / `cold_run_loads` / `cold_observations`

Modela túneles, cámaras, freezer/frigorífico, su estación física, cargas, límites y lecturas de temperatura. Sólo puede existir un ciclo abierto por activo. Una lectura `sensor` debe provenir de un sensor activo de la misma planta y, cuando el activo tiene estación, de esa misma estación.

### `regulatory_holds` / `regulatory_hold_events`

Hold/liberación/rechazo aplicable exactamente a una recepción, pallet o packing unit. La recepción queda bloqueada para despacho si existe un hold `open/rejected` directo o heredado por caja/pallet.

## 4. Hardware

Orden preferido de integración:

1. scanner USB HID / keyboard wedge;
2. Web Serial/WebUSB cuando el dispositivo y navegador lo permitan;
3. Device Gateway local para RS232/Ethernet/protocolos no web;
4. captura manual autorizada como fallback.

No se escribe un driver de hardware hasta conocer marca, modelo y protocolo real.

## 5. Offline e idempotencia

`/floor` utiliza cola local IndexedDB con identidad estable de request. Los reintentos conservan `packingUnitCode` e `idempotencyKey`; un 4xx/409 sale del loop automático y requiere revisión humana. La DB asocia el key al payload normalizado completo antes de materializar `packing_units`.

## 6. Gate actual

- Neon `main` contiene migraciones 033–040 y sus constraints/triggers.
- Producción tiene Plant Execution writes habilitados.
- `PLANT_EXECUTION_WRITES_ENABLED=false` sigue siendo kill-switch inmediato.
- Previews permanecen read-only salvo configuración explícita y segura.
- Las APIs exigen sesión, rol y scope de planta.
- La UI deshabilita mutaciones cuando el gate está apagado.
- El schema está operativo, pero no equivale a UAT: mientras no existan registros físicos reales, readiness debe mostrar ausencia de evidencia.

## 7. Evidencia de seguridad ya implementada

- `device_event → packing_unit` idempotente;
- scanner HID limitado a lotes autorizados;
- packing specs y label templates versionados;
- caja con una sola membresía activa de pallet;
- add/remove/close de pallet con locking y auditoría;
- un solo cold run abierto por activo;
- sensor de frío limitado a su estación física;
- hold regulatorio congela composición del pallet;
- despacho bloqueado en aplicación y DB bajo hold;
- rutas directas SPA verificadas en desktop y móvil.

## 8. Primer UAT industrial

Ancud será la primera planta piloto y Quellón la segunda. No se considera Plant Execution validado hasta ejecutar con datos/equipos reales:

`estación → lectura/peso → packing unit → etiqueta → pallet → frío → hold → intento de despacho bloqueado → release → despacho permitido`

Además debe probarse:

- scanner real o HID equivalente confirmado;
- balanza real o fallback manual auditado;
- impresión de etiqueta real cuando se conozca impresora/lenguaje;
- pérdida de conectividad y replay exactamente una vez;
- corrección/reimpresión con motivo;
- sensor/lectura térmica correspondiente al activo físico;
- hold y release con evidencia;
- trazabilidad completa hacia la misma recepción.

## 9. Readiness

El rollout mantiene dos señales separadas:

1. gate UAT/LIVE histórico, basado en roles, recepción, evidencia, calidad, producción, inventario, comercial y continuidad;
2. Plant Execution readiness, basado sólo en configuración/evidencia física observada: estaciones, dispositivos, packing live, pallet cerrado, frío con carga/temperatura y ejercicio hold→resolución.

La segunda señal no modifica por sí sola el gate LIVE y nunca sustituye aceptación humana.
