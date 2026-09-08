# GDST capability boundary

Pescamar mantiene la interoperabilidad en modo foundation hasta validar el Capability Test aplicable.

Estado actual:
- Seafood Event Graph: operativo y read-only para lineage.
- Identidades GS1: registry preparado; 0 identificadores reales registrados al aplicar migración 053.
- Serializer EPCIS 2.0 JSON-LD: implementado en modo fail-closed y sólo lectura.
- Export live: apagado mientras falten identidades y datos mínimos confirmados.
- EPCIS Query Interface: pendiente.
- EPCIS Capture/write: pendiente.
- Digital Link resolver/master data: pendiente.
- Claim GDST Capable/compliant: **prohibido** hasta aprobar el test oficial requerido.

Una capacidad `foundation` significa que existe el contrato técnico y sus guardrails; no significa interoperabilidad certificada ni disponibilidad de datos reales.