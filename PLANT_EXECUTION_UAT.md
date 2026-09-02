# Pescamar — UAT industrial de Plant Execution

## Objetivo

Demostrar en planta, con una operación autorizada y evidencia física real, que el mismo lote puede avanzar desde una estación hasta despacho sin perder identidad, control de planta, auditoría ni reglas regulatorias.

Este UAT complementa `PILOT_ACCEPTANCE.md`. No reemplaza los gates históricos de recepción, calidad, producción, inventario, comercial, roles, continuidad ni aceptación humana.

## Regla principal

No se crean estaciones, dispositivos, cajas, pallets, ciclos, etiquetas, holds ni resultados ficticios para completar este UAT. Cada evidencia debe provenir de una operación real o de una prueba física explícitamente autorizada por Pescamar.

## Planta piloto

1. Ancud.
2. Quellón después de cerrar Ancud.

Los aprendizajes de Ancud deben convertirse en configuración reusable antes de replicar el flujo.

## Cadena obligatoria

Mantener el mismo `reception_id` y la trazabilidad física correspondiente a través de:

`recepción → calidad → producción → estación → lectura/peso → packing unit → etiqueta física → pallet → frío → hold regulatorio → intento de despacho bloqueado → release → despacho permitido`

## Evidencia mínima

### 1. Estación y hardware

- estación activa de la planta;
- operador autenticado y autorizado para esa planta;
- scanner HID real o equivalente confirmado;
- balanza real integrada o fallback manual explícitamente auditado;
- impresora real registrada antes de confirmar impresión;
- sensor real cuando se use evidencia térmica con origen `sensor`.

Marca, modelo, protocolo e identificador estable se registran cuando se conozcan. No se inventan protocolos.

### 2. Packing

- lectura o ingreso de peso asociado a una estación real;
- creación de un único `device_event` materializado en un único `packing_unit`;
- mismo `idempotencyKey` no puede producir una segunda caja;
- species, grade, formato, spec y peso deben respetar el contrato live;
- un rechazo 4xx/409 debe quedar para revisión humana y no entrar en retry infinito.

### 3. Offline

- cortar conectividad después de preparar una operación de packing;
- verificar que IndexedDB conserve el request;
- recuperar conectividad;
- comprobar replay exactamente una vez con el mismo `packingUnitCode` e `idempotencyKey`;
- comprobar ausencia de packing duplicado y eventos huérfanos.

### 4. Etiqueta física

- packing unit live existente;
- etiqueta documental `validated` de la misma recepción;
- plantilla activa global o de la misma planta;
- impresora activa registrada en la misma planta;
- trabajo creado como `queued`;
- impresión física ejecutada por un adapter/dispositivo real;
- estado `printed` o `reprinted` sólo después de confirmación física;
- una reimpresión conserva `source_job_id` y motivo/evidencia cuando aplique.

No se acepta marcar un trabajo como impreso sólo para completar readiness.

### 5. Pallet

- agregar packing units reales al pallet;
- una caja no puede tener dos membresías activas;
- retiro, si se prueba, exige motivo y mantiene historial;
- cierre deriva cantidad y kilos desde sus cajas;
- pallet cerrado no admite mutaciones normales;
- un hold `open/rejected` congela composición.

### 6. Cadena de frío

- activo físico vinculado a estación `cold` de la misma planta;
- máximo un ciclo abierto por activo;
- al menos una carga real del pallet/lote;
- al menos una observación térmica;
- si el origen es sensor, debe ser un sensor activo de la estación física del activo;
- cerrar el ciclo como `completed` o `deviation` según evidencia;
- la cadena de frío no crea inventario ni despacho por sí misma.

### 7. Control regulatorio

- abrir un hold real de UAT sobre recepción, pallet o packing unit;
- verificar historial de apertura;
- intentar despacho del lote afectado y comprobar bloqueo en API;
- comprobar que PostgreSQL también bloquea el despacho confirmado;
- liberar o rechazar el hold con actor/evidencia;
- si se libera, comprobar que el despacho posterior puede continuar cuando no existe otro bloqueo.

### 8. Auditoría

Al finalizar, revisar Ficha 360, Timeline y Auditoría para comprobar:

- misma recepción raíz;
- planta correcta;
- operadores reales;
- timestamps coherentes;
- caja, etiqueta, pallet, frío y hold enlazados sin pérdida de lineage;
- correcciones y reintentos preservados, no sobrescritos destructivamente.

## Escenarios negativos obligatorios

1. Lote fuera del scope del operador → rechazado.
2. Reutilizar idempotency key con payload diferente → 409.
3. Caja ya palletizada → no puede agregarse a otro pallet.
4. Segundo cold run abierto para el mismo activo → rechazado.
5. Sensor de otra estación → rechazado.
6. Etiqueta no validada o de otra recepción → no entra a impresión.
7. Impresora de otra planta → rechazada.
8. Pallet con hold → composición congelada.
9. Despacho bajo hold → bloqueado incluso si se intenta evitar la UI.
10. Pérdida de red durante packing → replay sin duplicación.

## PASS Ancud

Ancud obtiene PASS de Plant Execution sólo cuando:

- las siete señales de Plant Execution readiness están completas con evidencia real;
- la cadena obligatoria se ejecutó con el mismo lote/recepción;
- los escenarios negativos críticos fueron comprobados;
- no existen P0/P1 atribuibles al flujo;
- Quality y producción están verdes en el SHA usado;
- el responsable de planta acepta explícitamente el resultado.

`hasPhysicalUatEvidence = true` es evidencia técnica; nunca sustituye la aceptación humana.

## Replicación a Quellón

Después del PASS de Ancud:

1. documentar hardware y protocolos reales confirmados;
2. extraer configuración reusable;
3. evitar fork de código por planta;
4. repetir el mismo UAT con operación real de Quellón;
5. registrar diferencias sólo como configuración o regla reusable salvo necesidad demostrada.
