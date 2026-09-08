# Seafood Intelligence OS — Pescamar Closure Gate

**Producto:** Seafood Intelligence OS  
**Implementación:** Pescamar — Implementation 01  
**Modo:** CIERRE FINITO / NO FEATURE CREEP  
**Baseline técnico:** `28b701d1076692daa1e3e641087ea6247c7eed2f`  
**Fuente superior de alcance:** `ROADMAP.md`  
**Aceptación de piloto:** `PILOT_ACCEPTANCE.md`  
**Diseño:** `DESIGN.md`

Este documento no reemplaza el roadmap. Es el tablero de cierre que impide que el desarrollo se vuelva infinito.

## Regla de alcance

Desde este punto sólo entra trabajo que cumpla al menos una condición:

1. cierra uno de los gates 1–7 de este documento;
2. corrige un P0/P1 verificado;
3. es requisito directo de UAT/piloto real;
4. elimina complejidad o deuda que bloquea cierre, seguridad, operación o mantenibilidad.

Toda otra idea va a **POST-PILOT / WATCH**. No se abre una fase nueva para incorporarla.

## Equipo de cierre

| Skill | Responsabilidad de cierre | No debe hacer |
| --- | --- | --- |
| Seafood Chile Core | Verdad operacional seafood, flujo físico, evidencia, excepción y autoridad humana | Inventar hechos, pesos, trazabilidad o reglas regulatorias |
| Borat | R&D, benchmarking y una sola apuesta experimental a la vez | Convertir tendencias en features sin evidencia |
| Databasin | Canonical ownership, Neon, migraciones, identidades GS1, Event Graph, API/data contracts | Crear doble fuente de verdad o migraciones destructivas |
| Marmush | Arquitectura y ejecución técnica end-to-end | Reescrituras amplias sin beneficio medible |
| Hume | Simplificación UX, jerarquía, una tarea/decisión principal, lenguaje entendible | Decorar o aumentar densidad sin función |
| Qalito | QA, browser, roles, mobile, release PASS/HOLD/BLOCK | Declarar cierre sin evidencia del SHA exacto |
| Thor | Seguridad, exposición, secretos e IP N3uralia vs material cliente | Reclasificar datos/documentos del cliente como propiedad N3uralia |
| Cronos | Integraciones, jobs, retries, idempotencia, reconciliación y observabilidad | Confiar en HTTP 200 sin verificar efecto downstream |
| Polyglot | ES/EN, terminología, rutas, mensajes y siglas explicadas | Traducir IDs, datos canónicos o contratos técnicos |
| Pescamar Canonical Intake | Ingesta histórica/canónica, lineage e inmutabilidad de fuentes | Publicar filas ambiguas como operación viva |
| Terminator | Limpieza final de deuda, duplicados, legacy y regresiones | Borrar compatibilidad/historia sin evidencia suficiente |

## Estado permitido

Cada bloque usa sólo uno de cuatro estados:

- `PENDIENTE`
- `EN CURSO`
- `CERRADO`
- `REQUIERE PILOTO REAL`

No existe “casi listo” como estado final.

---

# Gate 1 — Arquitectura y lenguaje

**Estado:** `CERRADO`

Objetivo: que la arquitectura sea estable y que un operador no necesite conocer jerga técnica.

Criterios:
- arquitectura canónica fija: Operational Core → Seafood Event Graph → EdgeVision/Uni → Operational Intelligence → Seafood AI / Control Tower;
- Pescamar separado del nombre del producto global;
- lenguaje humano primero, sigla secundaria;
- glosario reutilizable ES/EN;
- ninguna sigla crítica debe ser conocimiento previo obligatorio;
- Quality + Chromium + Vercel PASS sobre el baseline.

**Freeze:** no rediseñar arquitectura ni nomenclatura salvo defecto P0/P1.

---

# Gate 2 — Trazabilidad e interoperabilidad

**Estado:** `REQUIERE PILOTO REAL`

Owners: Seafood Chile Core + Databasin + Borat + Cronos + Qalito.

Objetivo: reconstruir el máximo lineage soportado por evidencia y preparar interoperabilidad sin declarar capacidades inexistentes.

Cierre técnico alcanzado:
- Event Graph cubre recepción, producción, packing, pallet, frío, inventario, compromiso comercial y despacho con mappings explícitos;
- GS1 Identity Registry está reconciliado con Neon y no contiene identificadores inventados;
- GTIN/GLN/SSCC sólo pueden existir como vínculos externos con evidencia y revisión;
- serializer EPCIS 2.0 JSON-LD está implementado en modo read-only y fail-closed;
- datos insuficientes se reportan como faltantes, nunca se sustituyen por IDs internos;
- no se declara `GDST Capable`; Query, Capture, resolver/master data y Capability Test siguen fuera del claim actual;
- Quality, contratos, Chromium y Vercel pasaron sobre el baseline técnico.

Pendiente sólo de evidencia real:
- primer lote físico completo para demostrar el recorrido con datos vivos;
- identidades GS1 reales aportadas/verificadas por la operación cuando correspondan;
- input/split/merge y mass balance real cuando el proceso efectivamente lo requiera;
- Capability Test GDST sólo cuando existan todas las capacidades y datos exigidos.

**Freeze:** no agregar más estándares o exportadores antes del piloto salvo P0/P1 o requisito comprobado del piloto.

---

# Gate 3 — Operación mínima de planta

**Estado:** `REQUIERE PILOTO REAL`

Owners: Seafood Chile Core + Hume + Marmush + Qalito.

Objetivo: que pocas personas puedan operar la planta capturando una vez y atendiendo sólo excepciones.

Camino principal:
`recepción → calidad → producción → packing → pallet → frío → inventario → compromiso comercial → despacho → cierre diario`

Cierre técnico alcanzado:
- Ficha 360 guía la continuidad usando evidencia del Seafood Event Graph;
- packing hereda lote/planta y deja scanner/corrección manual como excepción;
- palletización hereda lote/planta y limita cajas al mismo `reception_id`;
- frío hereda planta/pallet y selecciona automáticamente contexto sólo cuando es inequívoco;
- inventario mantiene el lote activo y no mezcla prioridades de otros lotes de la planta;
- órdenes de venta consumen `receptionId` y priorizan ese lote en la reserva;
- ubicación física exige movimiento con destino real;
- compromiso comercial exige asignación positiva a orden no cancelada;
- despacho/venta ya no se usan como sustituto silencioso de ubicación o compromiso;
- una acción dominante, estados honestos, owners y excepciones quedan protegidos por contratos CI;
- desktop/mobile Chromium y Vercel pasaron sobre el baseline técnico.

Pendiente sólo de piloto:
- ejecutar el mismo `reception_id` con personas, pesos, evidencia y decisiones reales;
- completar la matriz de roles de `PILOT_ACCEPTANCE.md`;
- registrar el cierre diario real de la planta;
- demostrar tres días consecutivos cuando corresponda a la revisión LIVE;
- aceptación humana explícita.

**Freeze:** no agregar más pasos al flujo mínimo antes del piloto. Cualquier nueva automatización operacional pasa a POST-PILOT / WATCH salvo P0/P1.

---

# Gate 4 — Seafood AI

**Estado:** `EN CURSO`

Owners: Borat + Seafood Chile Core + Databasin + Qalito + Polyglot.

Objetivo: inteligencia evidence-native, no chatbot genérico.

Criterios:
- ruta determinística para preguntas que no requieren LLM;
- Fast Evidence para consulta focalizada;
- Investigative para síntesis transversal;
- benchmark ES/EN reproducible;
- evidencia requerida y evidencia cargada visibles/auditables;
- `insufficient/limited/sufficient` preservan semántica de faltantes;
- ausencia de fila nunca significa automáticamente “no ocurrió”;
- hechos, cálculos, inferencias y faltantes separados;
- decisiones regulatorias/calidad/comerciales materiales requieren humano;
- ninguna escritura autónoma desde Seafood AI;
- respuestas y UI usan lenguaje operativo antes de nombres internos.

Stop condition: después del benchmark y UAT real, nuevas capacidades AI pasan a post-pilot salvo requisito del piloto.

---

# Gate 5 — Uni / visión

**Estado:** `EN CURSO`

Owners: Seafood Chile Core + Borat + Hume + Qalito.

Objetivo: software listo para evidencia visual real sin fingir hardware ni autonomía de Calidad.

Criterios:
- Vision observa; Calidad decide;
- media/hash + modelo + versión + confianza + revisión quedan trazables;
- sólo evidencia humana confirmada puede alimentar evaluación/aprendizaje supervisado;
- no automatic retraining;
- cámaras/sensores inexistentes se muestran como `not configured`/foundation;
- dataset real y métricas por caso antes de automatizar una decisión;
- fallback humano y degradación segura.

Hardware, cámaras y dataset físico pendiente pasan a `REQUIERE PILOTO REAL`.

---

# Gate 6 — Comercial y finanzas

**Estado:** `EN CURSO`

Owners: Seafood Chile Core + Databasin + Marmush + Qalito.

Objetivo: conectar producto físico con compromiso comercial y economía sin romper separación de roles.

Criterios:
- clientes/proveedores usan master identities explícitas;
- órdenes no crean terceros implícitamente;
- lote/pallet asignado conserva lineage;
- hold regulatorio impide despacho cuando corresponde;
- costos, anticipos, liquidaciones y margen conservan fuentes y grain;
- Calidad no recibe importes financieros reservados;
- Gerencia puede explicar resultado por lote/proveedor/cliente cuando exista evidencia;
- no se inventa margen o disponibilidad por datos faltantes.

---

# Gate 7 — Simplificación, hardening y release

**Estado:** `EN CURSO`

Owners: Hume + Terminator + Thor + Polyglot + Qalito + Marmush + Cronos.

Objetivo: cerrar el producto, no expandirlo.

Criterios UX:
- una tarea/decisión principal por pantalla;
- eliminar jerga, cards redundantes y navegación duplicada;
- siglas críticas explicadas;
- ES/EN sin mezcla accidental;
- desktop/mobile sin overflow;
- teclado, foco, errores y estados vacíos correctos.

Criterios ingeniería/seguridad:
- cero P0/P1;
- legacy/duplicados sólo removidos con evidencia;
- no secretos, prompts propietarios o lógica diferencial expuesta innecesariamente al cliente/navegador;
- canonical/client data permanece claramente cliente-owned;
- jobs/integraciones idempotentes y observables;
- migraciones repo/Neon reconciliadas;
- lint/types/build/tests PASS;
- Chromium desktop/mobile PASS;
- Vercel SUCCESS/READY para el mismo SHA;
- runtime sin errores nuevos atribuibles al release.

**Gate final técnico:** Qalito emite `PASS` sólo con evidencia del SHA exacto.

---

# Pilot Gate — no sustituible por software

**Estado:** `REQUIERE PILOTO REAL`

El piloto sólo puede cerrarse con datos, personas, operación física y aceptación humana conforme a `PILOT_ACCEPTANCE.md`. No se crean seeds, simulaciones ni hechos sintéticos para obtener PASS.