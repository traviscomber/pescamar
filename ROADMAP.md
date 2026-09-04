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
- [ ] Separar branding global del branding cliente.
- [ ] Mantener Pescamar como tenant inicial.
- [ ] Inventariar literales Pescamar que son branding vs contratos de datos reales.
- [ ] Definir configuración por organización, planta, especie, proceso y rol.
- [ ] Evitar cambios destructivos de IDs históricos o fuentes canónicas durante el rename.
- [ ] Renombrar metadata, documentación y UI global a Seafood Intelligence OS.

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
- first lighthouse customers;
- Chile → LATAM → international expansion.

---

## 15. KPIs del producto

### Operación

- % de eventos críticos capturados en el OS.
- % de lotes con lineage completo soportado por evidencia.
- tiempo para responder una excepción.
- reducción de recaptura manual.

### Datos

- % eventos con source/actor/timestamp.
- tasa de reconciliación de mass balance.
- tasa de duplicados/reprocesos.

### EdgeVision

- precision/recall según caso de uso.
- % inferencias con lote asociado.
- tasa de override humano.
- drift por modelo/versión.

### Inteligencia

- % respuestas con provenance.
- tiempo de detección de excepción.
- aceptación de recomendaciones.
- decisiones con impacto medible.

### Plataforma

- cero P0/P1 para releases aceptados;
- tenant isolation verificado;
- CI/build/release estable;
- recovery ensayado;
- performance con volumen real.

---

## 16. Secuencia inmediata

1. Consolidar el rename documental y visual global a **Seafood Intelligence OS**.
2. Mantener **Pescamar** como Implementación 01 / tenant.
3. Completar UAT real de Pescamar sin inventar datos para cerrar gates.
4. Definir formalmente el `organization/tenant context` reusable.
5. Especificar Seafood Event Graph v1.
6. Mapear el modelo actual de Pescamar al grafo sin migración destructiva prematura.
7. Elegir primer caso EdgeVision con evidencia real y ROI claro.
8. Implementar evidence contract para visión.
9. Evolucionar Pescamar IA hacia Seafood AI evidence-native manteniendo scope cliente.
10. Diseñar Integration/Data Plane.
11. Validar un segundo deployment/cliente sin fork del core.
12. Sólo entonces ampliar a Aquaculture/Fisheries como verticales completas.

---

# Definition of Done — Seafood Intelligence OS v1

La versión 1 se considera validada cuando:

- existe al menos un tenant Pescamar operando con UAT real aceptado;
- el core soporta una segunda organización sin fork;
- el Seafood Event Graph conecta origen/lote/transformación/inventario/comercial con provenance;
- al menos un caso EdgeVision real está vinculado a eventos operacionales y tiene evaluación documentada;
- Seafood AI responde con evidencia y respeta scope de tenant/rol/planta;
- integración externa puede entrar/salir por contratos versionados;
- no existen P0/P1 abiertos en el release aceptado;
- recuperación, seguridad y aislamiento multi-tenant están probados;
- el producto puede demostrar una decisión operacional o comercial mejorada por la combinación de datos + visión + inteligencia.

Pescamar seguirá su propia Definition of Done operacional en `PILOT_ACCEPTANCE.md`; Seafood Intelligence OS no se declarará validado usando datos simulados como sustituto de UAT real.
