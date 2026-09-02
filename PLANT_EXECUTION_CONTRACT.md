# Pescamar — Plant Execution Contract

**Estado:** foundation / read-only hasta cerrar #68  
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
8. Holds regulatorios deben bloquear despacho en backend.
9. Integraciones Sernapesca/Siscomex sólo se implementan con contrato real.
10. `canonical_packing_boxes` sigue siendo evidencia canónica/importada; no se reutiliza como tabla transaccional viva de piso.

## 3. Entidades previstas

### `plant_stations`

Identidad/configuración de una estación física o lógica dentro de una planta.

Campos conceptuales mínimos:
- station id;
- plant id;
- nombre;
- tipo;
- estado activo;
- configuración versionada.

### `plant_devices`

Registro de scanner, balanza, impresora u otro equipo asociado a una estación.

Campos conceptuales:
- device id;
- station id;
- tipo;
- fabricante/modelo;
- protocolo;
- identificador estable;
- estado.

### `device_events`

Registro inmutable de lectura/interacción de hardware.

Campos conceptuales:
- station/device/operator/plant;
- event type;
- raw value;
- normalized value;
- occurred at;
- idempotency key;
- processing status.

### `packing_units`

Unidad física operacional creada en piso.

Grain: una caja/bandeja/unidad identificable.

Relaciones mínimas:
- reception id;
- production/process run;
- plant;
- product/species/grade/format;
- gross/tare/net kg;
- station/operator;
- packing specification version;
- status;
- packed at.

### `packing_specs`

Regla versionada por producto/cliente/mercado.

Incluye rangos de peso, formato, grade, campos obligatorios, barcode/QR, unidades por caja, cajas por pallet y reglas de liberación.

### `label_print_jobs`

Cola auditable de impresión/reimpresión.

Estados previstos: `queued`, `sent`, `printed`, `failed`, `cancelled`, `reprinted`.

### `pallets` + relación pallet/packing

Agrupa packing units y conserva peso agregado, cantidad, producto/grade, ubicación, destino y estado.

### `cold_assets` / `cold_runs`

Modela túneles, cámaras y frigorífico, con carga, objetivo/lecturas de temperatura, duración, desviaciones, operador y evidencia.

### `regulatory_holds`

Hold/liberación/rechazo aplicable a lote o pallet, con autoridad, motivo, documento, actor, timestamps y evidencia.

## 4. Hardware

Orden preferido de integración:

1. scanner USB HID / keyboard wedge;
2. Web Serial/WebUSB cuando el dispositivo y navegador lo permitan;
3. pequeño Device Gateway local para RS232/Ethernet/protocolos no web;
4. captura manual autorizada como fallback.

No se escribe un driver de hardware hasta conocer marca, modelo y protocolo real.

## 5. Offline

La estación utilizará una cola local con idempotency keys. Un evento sólo podrá materializar una operación viva una vez, incluso después de reconexión/replay.

## 6. Gate actual

Mientras #68 permanezca abierto:

- `/floor` puede leer recepciones reales y validar UX/scope;
- puede simular entrada local de peso;
- NO crea `device_events`;
- NO crea `packing_units`;
- NO modifica inventario;
- NO ejecuta migraciones.

El primer cambio con escritura requiere preview Neon aislado verificado y una prueba reversible que demuestre que el preview no apunta a `main`.

## 7. Primer UAT industrial

Ancud será la primera planta piloto para el flujo completo, seguida por Quellón. El mismo core debe reutilizarse sin forks.
