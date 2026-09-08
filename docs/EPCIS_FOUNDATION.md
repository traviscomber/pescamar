# EPCIS 2.0 foundation — lenguaje simple

**EPCIS** significa *Electronic Product Code Information Services*. En Pescamar se usa como formato estándar para compartir eventos de trazabilidad: qué ocurrió, cuándo, dónde y en qué contexto.

La foundation actual es **sólo lectura y fail-closed**:

- sólo recepción, transformación y despacho son candidatos a exportación;
- un evento necesita identidades GS1 reales y confirmadas, tiempo, ubicación, partes y cantidades explícitas;
- los IDs internos de Pescamar nunca se convierten en GTIN, GLN, SSCC u otra identidad GS1;
- si falta un dato obligatorio, el resultado es `no exportable` con una lista de faltantes;
- no se generan eventos parciales para aparentar compatibilidad;
- no existe escritura externa, Capture Interface ni Query Interface EPCIS compatible con el Capability Test;
- no se declara `GDST Capable` ni `compliant`.

## Siglas relacionadas

- **GS1**: estándares globales para identificar productos, empresas, ubicaciones y unidades logísticas.
- **GTIN**: código global de un producto o presentación comercial.
- **GLN**: código global de una ubicación o empresa.
- **SSCC**: código único de una unidad logística, por ejemplo un pallet.
- **GDST**: estándar de interoperabilidad para compartir trazabilidad de productos del mar entre empresas y sistemas.
- **CTE**: evento crítico de trazabilidad; un momento que debe quedar registrado, como recibir o despachar.
- **KDE**: dato clave de trazabilidad que debe capturarse en ese evento.
- **JSON-LD**: formato JSON que conserva significado y relaciones entre datos.

## Criterio de habilitación

El serializer puede producir un documento EPCIS únicamente cuando el evento candidato tiene todas las identidades y cantidades requeridas. Mientras Pescamar no tenga esos datos reales, la salida correcta es `document = null` y diagnóstico de faltantes.
