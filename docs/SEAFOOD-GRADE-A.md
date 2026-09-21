# Seafood Intelligence Grade A

Objetivo: llevar Seafood Intelligence OS desde control operacional confiable a inteligencia anticipatoria, sin inventar evidencia ni aumentar carga del equipo de planta.

## Principios de cierre

- Live primero; histórico y canonical permanecen separados hasta validación explícita.
- Cada conclusión material debe distinguir evidencia observada, interpretación, incertidumbre, acción y confianza.
- No crear dashboards por crear: las nuevas capacidades deben reducir revisión manual y escalar sólo excepciones.
- Toda inteligencia predictiva requiere baseline validado; hasta entonces las métricas son descriptivas/derivadas.
- Decisiones regulatorias, de calidad y comerciales materiales conservan aprobación humana.
- Ninguna capacidad se declara "Grade A validada" sólo porque compile, tenga tests o funcione en staging/producción. Debe pasar validación operacional de Pescamar con datos y responsables reales.

## Capas Grade A

1. Yield Intelligence
   - input/output/yield por lote cuando la evidencia existe.
   - detectar evidencia incompleta o balances físicamente inconsistentes.
   - siguiente fase: baseline por especie, proveedor, origen, proceso y temporada.

2. Order Fulfilment Intelligence
   - continuidad compromiso -> despacho -> venta.
   - detectar despacho sobre asignación y venta sobre despacho cuando todos los kilos son observables.
   - siguiente fase: forecast de cobertura por fecha de entrega con inventario y producción futura.

3. Margin per Lot
   - compra -> transformación -> packing -> frío -> logística -> venta -> margen.
   - no proyectar margen hasta contar con costos completos y fórmula validada.

4. Exception Engine
   - priorizar sólo anomalías verificables: pesos, rendimiento no evaluable, inventario inválido, evidencia faltante, continuidad comercial, visión pendiente y frío cuando existan límites fuente.

5. Supplier Intelligence
   - comparar rendimiento, variabilidad, calidad, cumplimiento y resultado económico por proveedor.
   - requiere muestra mínima y ventanas temporales explícitas para evitar rankings engañosos.

6. Predictive / What-if
   - disponibilidad futura, cumplimiento de órdenes, capacidad, frío y escenarios.
   - se habilita sólo después del Minimum Pilot Pack y validación de baselines.

## Grade A contract

Un dominio se considera Grade A cuando cumple simultáneamente:

A. Identidad y continuidad: cada kilo material puede seguirse por lote y transformación.
B. Evidencia: cada métrica o excepción puede mostrar su fuente.
C. Excepción automática: el usuario no necesita revisar todas las pantallas para detectar un problema.
D. Impacto: cuando existe evidencia económica/operacional suficiente, la decisión muestra impacto y responsable.
E. Forward-looking: la predicción usa un baseline validado, no heurísticas sin evidencia.
F. Validación Pescamar: el flujo y sus decisiones fueron contrastados con operación real por responsables de Pescamar.

## Pescamar Validation Gate

Pescamar — Implementation 01 es la referencia operacional para validar Grade A. Esta validación es de producto/operación del cliente; no equivale a certificación regulatoria ni a aprobación de SERNAPESCA, SUBPESCA u otra autoridad.

Una capacidad sólo puede mostrarse como `validated-by-pescamar` si existe evidencia de los siguientes gates:

### Gate 1 — Flujo físico real

Validar al menos un ciclo completo con identidad y kilos trazables:

`supplier/origin -> reception -> lot -> production/process -> packing -> inventory/cold -> order -> dispatch -> settlement/close`

Requisitos:
- documentos o registros reales vinculados a cada transición;
- diferencia entre confirmación física y administrativa cuando aplique;
- transformación con input/output o regla de rendimiento documentada;
- ninguna ausencia de registro se interpreta como ausencia del evento.

### Gate 2 — Operador de planta

Un operador real de Pescamar debe poder completar el flujo diario sin doble digitación innecesaria.

Validar:
- recepción;
- continuación del lote;
- producción;
- calidad/hold;
- packing e inventario;
- preparación/despacho;
- atención de excepciones.

Criterio de aprobación: el sistema reduce trabajo manual y no obliga al operador a comprender la arquitectura interna del OS.

### Gate 3 — Jefatura / gerente

Un responsable de Pescamar debe validar que Control Tower y Seafood AI permiten responder, con evidencia, al menos:
- qué requiere atención hoy;
- qué órdenes están expuestas;
- qué kilos están realmente disponibles o comprometidos;
- qué lote tiene rendimiento evaluable y cuál no;
- qué parte del resultado económico es conocida y qué parte falta validar;
- qué decisión requiere intervención humana.

### Gate 4 — Economía real

Validar por lotes representativos:
- compra o costo base cuando exista;
- transformación;
- packing;
- frío/logística cuando corresponda;
- venta;
- liquidación/cierre.

`unknown_is_not_zero`: si falta un componente material, el margen no puede presentarse como completo.

### Gate 5 — Baselines predictivos

Yield Intelligence, Supplier Intelligence y Predictive/What-if sólo se consideran validados después de contrastar sus baselines contra una muestra real acordada con Pescamar.

Cada baseline debe registrar:
- población/muestra;
- especie/producto;
- proveedor/origen cuando aplique;
- proceso;
- ventana temporal;
- fórmula;
- exclusiones;
- responsable que valida;
- fecha de validación.

Hasta entonces: `needs-human-validation` o descriptivo/derived, nunca predicción validada.

### Gate 6 — Integración regulatoria Chile

La plataforma debe preparar y reconciliar la evidencia operacional necesaria para los procesos regulatorios que correspondan a Pescamar, sin declarar equivalencia automática entre un evento interno y una declaración oficial.

Reglas:
- requisitos legales variables se verifican contra la fuente oficial vigente;
- SERNAPESCA/SUBPESCA continúan siendo fuente autoritativa para sus respectivos procesos;
- cualquier envío, declaración o aprobación material mantiene responsable humano cuando corresponda;
- el estado interno no debe presentarse como aprobación oficial sin evidencia de dicha aprobación.

### Gate 7 — Sign-off

Para cada capacidad validada registrar como mínimo:
- capability;
- versión/SHA desplegado;
- planta;
- flujo probado;
- registros/lotes de evidencia;
- resultado `PASS / PASS-WITH-OBSERVATIONS / HOLD`;
- observaciones;
- responsable Pescamar;
- responsable N3uralia;
- fecha.

Sólo `PASS` permite usar el estado `validated-by-pescamar`.

## Estados permitidos de madurez

- `implemented`: existe en producto, sin afirmar validación operacional.
- `tested`: pasó pruebas técnicas sobre SHA exacto.
- `pilot-evidence`: tiene evidencia real suficiente para evaluación.
- `validated-by-pescamar`: Pescamar firmó PASS sobre el flujo y versión correspondiente.
- `regulatory-confirmed`: sólo cuando exista evidencia explícita de la autoridad/proceso aplicable; nunca se deriva de `validated-by-pescamar`.

## Definition of Grade A — Pescamar Implementation 01

Pescamar alcanza Grade A validado únicamente cuando:

1. el ciclo físico completo está trazado con evidencia real;
2. operador y gerente lo validan en uso real;
3. Order Coverage y Exception Engine producen decisiones correctas sobre evidencia observada;
4. Margin per Lot distingue resultado completo de economía parcial/desconocida;
5. Yield/Supplier/Predictive usan baselines validados por Pescamar;
6. el flujo regulatorio aplicable está contrastado con fuentes oficiales vigentes y no genera falsas aprobaciones;
7. existe sign-off `PASS` vinculado al SHA exacto desplegado.

## CPU / deployment discipline

- Agrupar cambios relacionados en un único commit de release.
- Evitar previews y deployments por archivo.
- Preferir inteligencia determinística pura sobre eventos ya cargados antes de agregar queries o funciones nuevas.
- No agregar cron jobs para métricas que pueden calcularse on-demand desde el Seafood Event Graph.
- Medir primero; materializar/cachar sólo si la latencia o costo real lo justifican.

## Estado actual

La primera capa Grade A se calcula dentro de Operational Intelligence: yield descriptivo, continuidad compromiso-despacho-venta, cobertura comercial y excepciones asociadas. Order Coverage ya está expuesto a Seafood AI y el loader de contexto es capability-aware para reducir trabajo innecesario.

`predictiveBaselineAvailable` permanece `false` hasta recibir y validar datos reales del piloto.

Estado de madurez actual: `tested` para las capacidades técnicas ya cerradas; `validated-by-pescamar` permanece bloqueado hasta ejecutar los gates con evidencia y sign-off real de Pescamar.
## Appendix — Cómo promover un dataset a línea de base validada

Este es el procedimiento operativo del camino predictivo. Su primer efecto es organizar la evidencia; su efecto deliberado es que la frontera predictiva (`predictiveBaselineAvailable: false`) siga cerrada hasta que los gates se ejecuten con sign-off real.

1. **Registrar el lote.** Un admin registra el dataset real de planta en `/uni` (sección «Lotes de dataset EdgeVision»): planta, capacidad (`count`, `calibre`, `size`, `defects`, `biomass`, `anomaly`), etiqueta de fuente, ventana de captura, número de imágenes, etiquetas confirmadas por operador y referencia de almacenamiento externo (nunca binarios en la base de datos). La migración 059 (`edgevision_dataset_batches`) guarda sólo metadatos y queda `qa_status = pending_review`.
2. **Revisar con QA.** QA cambia el estado del lote a `validated` o `rejected` con notas. Validar exige notas de al menos 10 caracteres (CHECK de esquema); la revisión humana sigue siendo la autoridad.
3. **Contrastar umbrales de evidencia.** Para considerar una promoción, el lote validado debe cumplir los umbrales mínimos por capacidad definidos en `api/_edgevision-baseline.ts` (`baselineEvidenceRequirements`): imágenes, etiquetas confirmadas por operador y días de captura distintos. Son mínimos de intake, nunca una afirmación de accuracy.
4. **Registrar provenance.** El endpoint admin `/api/edgevision-baseline` invoca `promoteCapabilityBaseline`: si el lote cumple, marca `promoted_at`/`promoted_by` en el lote. Esto **sólo registra provenance**: no activa modelo, no publica métrica predictiva ni cambia ningún pin. Mientras no exista lote validado que cumpla, el endpoint responde `409` con la explicación de política — ese comportamiento está pineado por `scripts/edgevision-qa-smoke.mjs` en CI.
5. **Ejecutar Gate 5.** Con la línea de base registrada, contrastar el baseline con muestra real acordada con Pescamar (métricas, threshold, versionado, análisis de errores y fallback humano por capacidad).
6. **Ejecutar Gate 7.** Sign-off `PASS` de Pescamar vinculado al SHA exacto desplegado.
7. **Recién entonces** se puede proponer, en un cambio separado con su propia revisión y validación, abrir el tipo `predictiveBaselineAvailable`. Hasta ese momento el pin permanece `false` y cualquier respuesta 409 del paso 4 es el comportamiento correcto, no un error.

Registro técnico del scaffolding: migración `059_edgevision_dataset_batches.sql`, API admin-only `api/edgevision-datasets.ts` (GET/POST/PATCH, rate limit 10/min), seam `api/_edgevision-baseline.ts` (deshabilitado por defecto), sección admin en `/uni`, contrato CI `scripts/edgevision-qa-smoke.mjs` y spec `tests/edgevision-datasets.spec.ts`.
