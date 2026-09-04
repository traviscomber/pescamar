# Seafood Intelligence OS — ROADMAP

**Producto:** Seafood Intelligence OS  
**Implementación 01:** Pescamar  
**Ventana operacional Pescamar:** 24 agosto – 22 noviembre 2026  
**Estado actual:** core productivo desplegado; productización del OS y UAT real en progreso  
**North Star:** convertir operaciones seafood fragmentadas en un único grafo operacional trazable, enriquecido por EdgeVision y una capa de inteligencia capaz de explicar qué ocurrió, por qué importa y qué hacer después.

> **One seafood operation. One evidence graph. One intelligence layer.**

---

## 1. Tesis del producto

Seafood Intelligence OS no se limita a un ERP de plantas ni a un sistema de acuicultura.

Es un sistema operativo transversal para:

**origen / cultivo / captura → recepción → lotes → producción → calidad → packing → inventario → frío → despacho → comercial → trazabilidad → inteligencia**

La oportunidad competitiva no está en fabricar cada cámara, sensor, PLC o ERP. Está en ser la capa neutral que conecta esos sistemas con el producto físico, su evidencia, su resultado comercial y la decisión operacional.

### Qué debe poder responder el OS

1. ¿Qué entró y de dónde provino?
2. ¿Qué lote representa cada kilo y qué transformaciones sufrió?
3. ¿Qué calidad tuvo y qué evidencia la respalda?
4. ¿Qué vio EdgeVision y con qué modelo/confianza?
5. ¿Qué rendimiento, merma y costo generó?
6. ¿Dónde está físicamente ahora?
7. ¿Qué está comprometido, despachado o vendido?
8. ¿Qué cliente recibió qué producto y desde qué lote?
9. ¿Qué excepción requiere atención ahora?
10. ¿Qué decisión produce mayor impacto operacional o comercial?

---

## 2. Arquitectura objetivo

### Capa A — Operational Core

- Recepciones.
- Lotes.
- Producción y transformación.
- Calidad y laboratorio.
- Packing, cajas y pallets.
- Inventario y ubicaciones.
- Cadena de frío.
- Órdenes comerciales.
- Despachos y ventas.
- Proveedores y clientes.
- Costos, liquidaciones y settlement cuando corresponda.

### Capa B — Seafood Event Graph

Objeto físico central: **lot / batch**.

Cada evento debe poder vincular:

`organization → site → station → source → lot → event → evidence → actor → timestamp → downstream object`

El grafo debe soportar:

- split y merge de lotes;
- transformación de materia prima a producto terminado;
- lineage entre cajas/pallets y lote origen;
- evidencia documental;
- evidencia visual;
- estados de inventario;
- eventos de frío;
- decisiones humanas;
- outcomes comerciales.

### Capa C — EdgeVision

EdgeVision será una capacidad nativa del OS para:

- conteo;
- calibre;
- tamaño;
- color;
- defectos;
- clasificación / grading;
- biomasa;
- control visual de proceso;
- anomalías.

Contrato objetivo de evidencia:

`lotId + stationId + capturedAt + media/hash + model + modelVersion + measurement + confidence + review/override + decision`

### Capa D — Operational Intelligence

- Yield real y esperado.
- Merma.
- Calidad por proveedor/origen/especie.
- Productividad por línea/planta.
- Desviaciones operacionales.
- Costo por transformación.
- Margen por producto/cliente/lote.
- Riesgo de inventario/frío.
- Forecast de producción e inventario cuando exista historia suficiente.
- Recomendaciones de compra, producción y comercialización basadas en evidencia.

### Capa E — Seafood AI + Control Tower

Patrón de decisión:

**qué pasó → por qué → impacto → evidencia → recomendación → acción**

Seafood AI no debe responder desde texto libre aislado. Debe priorizar:

1. datos canónicos;
2. operación viva;
3. eventos del grafo;
4. evidencia documental/visual;
5. reglas de acceso del usuario.

---

## 3. Principios no negociables

1. **El lote es el objeto físico canónico.**
2. **Unknown is not zero.** Datos ausentes siguen ausentes.
3. **Evidence first.** Ninguna conclusión crítica sin fuente rastreable.
4. **Mass balance reconciliable.** Entradas, salidas, merma y yield deben cerrar.
5. **Open integrations.** Integrar antes de reemplazar hardware/software existente.
6. **Configuration before forks.** Nada de forks por planta, especie o cliente salvo imposibilidad justificada.
7. **Cross-species.** El core debe servir pesca extractiva y acuicultura.
8. **AI is accountable.** Modelo, versión, confianza y override deben quedar trazados cuando aplique.
9. **Human authority remains explicit.** Automatización no inventa aprobación regulatoria, calidad ni decisión financiera.
10. **Control by exception.** El sistema debe reducir ruido y aumentar foco.

---

# IMPLEMENTACIÓN 01 — PESCAMAR

## 4. Rol de Pescamar dentro del producto

Pescamar deja de ser el nombre del producto global.

Pasa a ser la **primera implementación / tenant operacional de Seafood Intelligence OS**, usada para validar el modelo reusable en seis plantas y múltiples modalidades de operación.

La implementación actual ya aporta al core reusable:

- recepción y lotes;
- calidad y producción;
- inventario y ubicación;
- packing, pallets y frío;
- comercial, despacho y ventas;
- costos, créditos y liquidaciones;
- auditoría operacional;
- identidad estable de operador;
- historial canónico + operación viva;
- Control Tower;
- Pescamar IA;
- gates de release desktop/mobile.

Pescamar mantiene su identidad propia dentro del OS: usuarios, plantas, datos, branding cliente, catálogos y reglas particulares. El producto reusable se denomina **Seafood Intelligence OS**.

---

## 5. Rollout Pescamar

### Estado actual

El core técnico está desplegado y no debe confundirse con aceptación operacional final. El gate de piloto continúa requiriendo usuarios reales, datos reales, flujo E2E por lote y UAT humano según `PILOT_ACCEPTANCE.md`.

### Plantas objetivo

| Ola | Planta | Modalidad principal | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Ancud | Planta propia | Recepción → producción → inventario → comercial |
| 1 | Quellón | Planta propia / multiespecie | Producción + desconche + liquidación |
| 2 | Iquique / Sotomayor | Maquila | Conciliación integral de maquila |
| 2 | Piedra Azul | Maquila / producto terminado | Proceso + PT + despacho |
| 3 | Aqua Austral | Producto terminado | Inventario PT + trazabilidad + despacho |
| 3 | Natales | Producto terminado / multiespecie | PT + inventario + despacho |

### Gate Core LIVE

- [ ] Usuarios reales por rol/planta.
- [ ] Catálogos operacionales confirmados.
- [ ] 2–3 recepciones reales controladas.
- [ ] Evidencia real vinculada.
- [ ] Calidad real.
- [ ] Producción del mismo lote.
- [ ] Inventario físico del mismo lote.
- [ ] Señal comercial vigente del mismo lote.
- [ ] Cierre diario.
- [ ] Auditoría correcta de actores.
- [ ] Cero P0/P1.
- [ ] Aceptación humana del responsable.

### Ola 1 — Ancud + Quellón

- [ ] Configurar usuarios y scopes.
- [ ] Confirmar especies/productos/procesos.
- [ ] Reconciliar histórico donde exista evidencia suficiente.
- [ ] Ejecutar operación real E2E.
- [ ] Validar yield y merma.
- [ ] Validar Ficha 360 y Timeline.
- [ ] Validar Pescamar IA contra datos canónicos/live.
- [ ] Validar Control Tower por excepción.
- [ ] Tres días consecutivos de operación con cierres registrados.
- [ ] Aceptación humana.

**Gate:** 2/6 plantas LIVE.

### Ola 2 — Iquique/Sotomayor + Piedra Azul

- [ ] Convertir aprendizajes de Ola 1 en configuración reusable.
- [ ] Modelar maquila sin fork de código.
- [ ] Conciliar kilos enviados/procesados/merma/PT.
- [ ] Validar owner y fuente de cada dato externo.
- [ ] Validar PT e inventario.
- [ ] Validar despacho y lineage.
- [ ] Tres días consecutivos de operación con cierres registrados.

**Gate:** 4/6 plantas LIVE + Control Tower multiplanta usado por Gerencia.

### Ola 3 — Aqua Austral + Natales

- [ ] Configurar PT y multiespecie.
- [ ] Reconciliar fuentes disponibles.
- [ ] Validar inventario, movimientos, trazabilidad y despacho.
- [ ] Tres días consecutivos de operación con cierres registrados.
- [ ] Aceptación humana.

**Gate:** 6/6 plantas LIVE o formalmente aceptadas según modalidad real.

---

# PRODUCTIZACIÓN — SEAFOOD INTELLIGENCE OS

## 6. Fase P0 — Separar producto de implementación

**Objetivo:** que el código pueda representar N organizaciones sin hardcodear Pescamar como frontera de producto.

- [ ] Definir `organization/tenant` como primer contexto del OS.
- [x] Separar branding global del branding cliente.
- [x] Mantener Pescamar como tenant inicial.
- [ ] Inventariar literales Pescamar que son branding vs contratos de datos reales.
- [ ] Definir configuración por organización, planta, especie, proceso y rol.
- [x] Evitar cambios destructivos de IDs históricos o fuentes canónicas durante el rename.
- [x] Renombrar metadata, documentación y UI global a Seafood Intelligence OS.

**Gate:** nueva organización puede configurarse sin fork del core.

---

## 7. Fase P1 — Seafood Event Graph v1

**Objetivo:** pasar de módulos conectados a lineage explícito end-to-end.

### Entidades mínimas

- Organization.
- Site / plant / farm / vessel cuando aplique.
- Station.
- Supplier / source.
- Species.
- Lot / batch.
- Transformation event.
- Quality event.
- Vision event.
- Inventory event.
- Cold-chain event.
- Packing unit.
- Pallet.
- Commercial commitment.
- Shipment.
- Customer outcome.
- Evidence artifact.

### Trabajo

- [ ] Definir IDs canónicos y relaciones split/merge.
- [ ] Definir event envelope reusable.
- [ ] Definir source/evidence provenance.
- [ ] Definir schema versioning.
- [ ] Definir idempotency keys para fuentes externas.
- [ ] Crear API de lineage por lot.
- [ ] Crear visualización `source → lot → transformation → shipment`.
- [ ] Añadir test de integridad de grafo.

**Gate:** cualquier kilo representado por el sistema puede explicar su lineage hasta el máximo nivel soportado por la evidencia disponible.

---

## 8. Fase P2 — EdgeVision Foundation

**Objetivo:** convertir visión computacional en evidencia operacional reusable.

### Casos iniciales

1. Erizo — color/calidad/clasificación.
2. Producto en línea — conteo/calibre/tamaño.
3. Defectos visibles.
4. Biomasa estimada donde el escenario lo permita.

### Plataforma

- [ ] Registro de cámaras/estaciones.
- [ ] RTSP/ONVIF gateway cuando corresponda.
- [ ] Cola de inferencia edge/cloud.
- [ ] Registro de modelo y versión.
- [ ] Confidence + human review.
- [ ] Media hash / evidence retention policy.
- [ ] Vinculación obligatoria a lote/proceso cuando sea posible.
- [ ] Dataset registry y labeling workflow.
- [ ] Métricas de precisión por caso de uso.
- [ ] Degradación segura si inferencia no está disponible.

### Gate por modelo

No promover un modelo a decisión automática sin:

- dataset real representativo;
- métrica definida;
- threshold documentado;
- revisión de false positives/negatives;
- fallback humano;
- versionado y trazabilidad.

---

## 9. Fase P3 — Integration/Data Plane

**Objetivo:** ganar por interoperabilidad, no por lock-in.

### Southbound

- [ ] REST/webhooks.
- [ ] CSV/XLSX import contract con lineage explícito.
- [ ] MQTT.
- [ ] OPC-UA / Modbus gateways según hardware real.
- [ ] RTSP/ONVIF para visión.
- [ ] Adaptadores para equipos/sistemas existentes sólo donde exista cliente/fuente real.

### Northbound

- [ ] API operacional documentada.
- [ ] Webhooks de eventos canónicos.
- [ ] Export de trazabilidad.
- [ ] Contratos interoperables para clientes/partners.
- [ ] Evaluar e implementar estándares GS1/EPCIS/GDST según mercados y requisitos comerciales concretos.

**Gate:** una integración externa puede entrar y salir sin alterar el core de negocio.

---

## 10. Fase P4 — Seafood AI v1

**Objetivo:** asistente operacional evidence-native, no chatbot genérico.

### Capacidades

- [ ] Preguntas sobre datos canónicos y live.
- [ ] Scope por organización/rol/planta.
- [ ] Respuesta con provenance.
- [ ] Drill-down a lot/evidence/event.
- [ ] Detección de excepciones.
- [ ] Resumen de cierre diario.
- [ ] Explicación de yield/merma/calidad.
- [ ] Comparación por proveedor/planta/especie.
- [ ] Impacto comercial cuando existan datos autorizados.
- [ ] Recomendaciones separadas de hechos.

### Regla

Toda respuesta debe distinguir claramente:

- **hecho observado**;
- **cálculo derivado**;
- **inferencia/recomendación**;
- **dato faltante**.

**Gate:** ninguna respuesta ejecutiva crítica depende de una afirmación sin evidencia o sin clasificación de certeza.

---

## 11. Fase P5 — Control Tower predictivo

Sólo después de tener historia real suficiente.

- [ ] Forecast de recepción/producción.
- [ ] Forecast de inventario.
- [ ] Riesgo de quiebre/cold-chain.
- [ ] Predicción de yield.
- [ ] Calidad esperada por origen/proveedor.
- [ ] Priorización de lotes para órdenes comerciales.
- [ ] Recomendaciones de cosecha/compra cuando corresponda a la vertical.
- [ ] Análisis de margen por decisión.

No construir ML predictivo para llenar dashboards. Cada modelo debe tener una decisión operacional asociada.

---

## 12. Fase P6 — Verticales de producto

Un solo core, configuraciones especializadas:

### Processing Plants

Pescamar es la referencia inicial.

### Aquaculture

- farm/site;
- biomasa;
- alimentación;
- salud/bienestar cuando exista fuente;
- cosecha;
- integración con procesamiento.

### Fisheries

- vessel/catch/landing;
- zonas/origen;
- recepción;
- quota/regulatory evidence sólo mediante fuentes autorizadas;
- procesamiento y comercial.

### Cold Chain

- cámaras;
- pallets;
- temperatura;
- dwell time;
- alertas;
- despacho.

### Quality & Vision

- EdgeVision;
- laboratorio;
- defectos;
- grading;
- buyer specification;
- evidence packs.

---

## 13. Competitive moat

Seafood Intelligence OS debe ganar por combinación, no por feature aislada.

### Moat 1 — Canonical Seafood Graph

Competidores pueden dominar cámaras, feeding, MES o ERP. Nosotros debemos dominar el contexto que une esos eventos.

### Moat 2 — Vision → economics

No basta detectar color/calibre/defecto. El OS debe conectar esa evidencia con:

`provider → lot → yield → grade → product → customer → price → margin`

### Moat 3 — Evidence-native AI

La IA debe explicar exactamente de dónde viene una respuesta y permitir abrir el lote/evento/evidencia.

### Moat 4 — Hardware neutrality

Integrar equipos existentes reduce fricción comercial y evita competir frontalmente con incumbentes de hardware.

### Moat 5 — Cross-species core

Evitar quedar atrapados en una única especie o modalidad productiva.

---

## 14. Equipos / workstreams

### Product + Operations

- workflows reales;
- definition of done;
- UAT;
- adoption;
- ROI operacional.

### Data + Architecture

- event graph;
- schemas;
- lineage;
- integrations;
- observability.

### EdgeVision / AI

- datasets;
- models;
- evidence contracts;
- evaluation;
- Seafood AI.

### Frontend / UX

- Control Tower;
- lot 360;
- event graph UI;
- mobile/plant-floor workflows;
- organization/tenant context.

### Security / QA

- RBAC;
- tenant isolation;
- audit;
- release gates;
- model/evidence integrity;
- disaster recovery.

### Commercial / Partnerships

- target ICP;
- integration partners;
- hardware partners;
- buyer/traceability requirements;
- implementation playbook;
- measurable ROI case studies.

---

## 15. KPIs del producto

### Operación

- Tiempo desde recepción a estado reconciliado.
- % lotes con lineage completo.
- % masa reconciliada.
- reducción de recaptura manual.
- tiempo de resolución de excepciones.

### Calidad / Vision

- precisión/recall por modelo y clase.
- % resultados con evidencia visual atribuible.
- override humano por modelo/versión.
- relación entre visual grade y outcome real.

### Inteligencia

- % respuestas con provenance navegable.
- tiempo para explicar una desviación.
- recomendaciones aceptadas/rechazadas y outcome.
- reducción de decisiones basadas en reconciliación manual.

### Plataforma

- aislamiento tenant/planta/rol.
- uptime y error budget.
- latencia de eventos.
- idempotencia de integraciones.
- recovery probado.

### Comercial

- tiempo de implementación de un nuevo tenant.
- número de integraciones reutilizables.
- expansión plantas/especies por cliente.
- ROI documentado por caso de uso.

---

## 16. Secuencia de ejecución

### Ahora — P0 + Pescamar rollout

1. Separar producto global de tenant Pescamar.
2. Inventariar hardcodes de tenant.
3. Definir organization context sin migrar destructivamente datos existentes.
4. Mantener rollout real Pescamar en paralelo.
5. Documentar el contrato del Seafood Event Graph.

### Después — P1 + EdgeVision foundation

6. Implementar event envelope y lineage API.
7. Visualización de lineage en Lot 360.
8. Definir VisionEvent reusable.
9. Conectar primer caso EdgeVision real sobre erizo.
10. Medir calidad y human override.

### Luego — Integration plane + Seafood AI

11. Formalizar conectores northbound/southbound.
12. Añadir provenance de eventos a Seafood AI.
13. Convertir Control Tower en consumidor del event graph.
14. Integrar señales externas según clientes reales.
15. Preparar Implementation 02 sin fork.

---

# DONE — PESCAMAR

Pescamar se considera operacionalmente aceptado cuando cumple `PILOT_ACCEPTANCE.md`: usuarios y datos reales, flujo E2E enlazado por lote, continuidad requerida, UAT humano, cero P0/P1 y release estable.

# DONE — SEAFOOD INTELLIGENCE OS v1

El producto v1 se considera productizado cuando:

1. Pescamar funciona como tenant y no como frontera hardcodeada del producto.
2. Puede configurarse una segunda organización sin fork.
3. Existe Seafood Event Graph con lineage navegable.
4. EdgeVision puede registrar evidencia versionada ligada a lot/proceso.
5. Seafood AI responde con provenance y scope correcto.
6. Control Tower consume eventos canónicos y prioriza excepciones.
7. Integraciones externas usan contratos versionados/idempotentes.
8. Seguridad demuestra aislamiento organization → site → role.
9. Cero P0/P1 en gates de producto.
10. Existe al menos un caso operativo real que demuestre Vision → quality/yield → commercial outcome.
