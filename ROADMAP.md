# Pescamar — ROADMAP de rollout + Plant Execution

**Fecha base:** 2 septiembre 2026  
**Estado:** core productivo construido; rollout controlado en curso; expansión de operación de planta aprobada para planificación.  
**North Star:** seis plantas operando sobre un solo core Pescamar, con trazabilidad completa desde recepción hasta producto terminado, operación diaria sin dependencia del equipo de desarrollo y ejecución de piso integrada a balanzas, lectores, packing, frío y control regulatorio.

> Un solo core. Datos reales. Una planta a la vez. Cero forks por planta. Hardware e integraciones externas sólo con contrato real.

---

## 1. Resumen ejecutivo

Pescamar no necesita una reescritura para incorporar las capacidades observadas en SmartPlant.

Gran parte de la base ya existe:

- recepción y evidencia;
- lotes y Ficha 360;
- producción por lote y líneas;
- balance de masa;
- inventario y ubicaciones;
- inventario de materiales;
- costos de transformación;
- etiquetas y gates de liberación;
- producto terminado derivable por lote;
- despachos, ventas y rentabilidad;
- usuarios, permisos y alcance por planta;
- auditoría;
- cierre diario;
- mobile responsive;
- CI, tests y despliegue productivo.

La nueva etapa se concentra en cerrar la ejecución física:

**recepción → proceso → pesaje → packing → etiqueta → pallet → frío → liberación regulatoria → inventario PT → despacho**

### Estimación realista

Con el código ya existente y el equipo actual de agentes/skills trabajando en paralelo:

| Resultado | Tiempo estimado |
| --- | ---: |
| Software E2E sin hardware real | 7–10 días hábiles |
| Piloto industrial Ancud listo para UAT | 12–15 días hábiles |
| Ancud validado en operación real | 15–20 días hábiles |
| Ancud + Quellón validados | 20–25 días hábiles |
| Plant Execution estandarizado para 6 plantas | 30–40 días hábiles |
| Sernapesca XML / Siscomex | +3–7 días hábiles desde recibir contrato/formato oficial |

La duración crítica no será principalmente desarrollo. Será disponibilidad de hardware, acceso a planta, ejemplos reales de etiquetas, protocolos de balanza/impresora y validación humana.

---

## 2. Capacidad de ejecución

El trabajo se divide en carriles paralelos para evitar desarrollo secuencial innecesario.

### Carril A — Arquitectura y datos

- contratos canónicos;
- migraciones;
- idempotencia;
- trazabilidad;
- permisos;
- auditoría;
- compatibilidad con el modelo actual.

### Carril B — Frontend / Floor UX

- Floor Station;
- Packing Station;
- palletización;
- frío;
- regulatory holds;
- operación táctil y mobile.

### Carril C — Integraciones

- scanner;
- balanza;
- impresora;
- Device Gateway;
- offline/sincronización;
- contratos Sernapesca/Siscomex cuando existan.

### Carril D — QA / release

- unit/contract tests;
- Playwright desktop/mobile;
- degradación;
- duplicados/idempotencia;
- seguridad;
- preview Vercel;
- smoke productivo;
- UAT.

### Carril E — Rollout / datos reales

- usuarios;
- catálogos;
- plantas;
- evidencia real;
- primeras recepciones;
- cierres diarios;
- aceptación humana.

Los carriles A–D pueden avanzar en paralelo. El carril E es el que define cuándo una planta puede declararse LIVE.

---

## 3. Principios no negociables

1. **Un solo core.** No se crean forks por planta.
2. **El lote sigue siendo la raíz operacional.**
3. **No se duplica funcionalidad existente.**
4. **La balanza no escribe inventario directamente.** Produce un evento validado.
5. **Toda acción crítica tiene operador, planta y timestamp.**
6. **Toda corrección manual sensible exige motivo.**
7. **Integraciones externas requieren contrato real.**
8. **Offline debe ser idempotente.**
9. **Bloqueos regulatorios se aplican en backend.**
10. **Una planta sólo es LIVE con evidencia real y aceptación humana.**

---

# TRACK A — ROLLOUT DEL CORE EXISTENTE

Este track continúa sin esperar a Plant Execution.

## A0 — Core LIVE
### 2–5 septiembre

- [ ] Confirmar usuarios reales por rol y planta.
- [ ] Confirmar catálogos comunes.
- [ ] Ingresar 2–3 recepciones reales.
- [ ] Validar evidencia/Vision.
- [ ] Completar al menos un flujo recepción → producción → inventario.
- [ ] Completar al menos un flujo comercial/liquidación.
- [ ] Revisar Ficha 360, Timeline y Auditoría.
- [ ] Corregir cualquier P0/P1.

**Gate:** CORE LIVE.

## A1 — Ancud
### 5–16 septiembre

- [ ] Responsable funcional confirmado.
- [ ] Usuarios y permisos reales.
- [ ] Catálogo real.
- [ ] Recepciones reales.
- [ ] Calidad.
- [ ] Producción.
- [ ] Rendimiento/merma.
- [ ] Inventario.
- [ ] Comercial cuando corresponda.
- [ ] Cierre diario.
- [ ] Tres días consecutivos sin soporte técnico manual.

**Gate:** ANCUD LIVE.

## A2 — Quellón
### 9–23 septiembre

Puede comenzar mientras Ancud completa continuidad.

- [ ] Usuarios y permisos.
- [ ] Catálogo multiespecie.
- [ ] Recepciones reales.
- [ ] Desconche/proceso real cuando corresponda.
- [ ] PT.
- [ ] Rendimiento y merma.
- [ ] Inventario.
- [ ] Liquidación.
- [ ] Tres días consecutivos sin soporte técnico manual.

**Gate:** QUELLÓN LIVE.

## A3 — Iquique + Piedra Azul
### 24 septiembre – 9 octubre

- [ ] Configuración maquila.
- [ ] Owner de cada fuente.
- [ ] Conciliación enviado/procesado/merma/PT.
- [ ] Inventario.
- [ ] Evidencia.
- [ ] Despacho.
- [ ] Tres días consecutivos por planta.

**Gate:** 4/6 plantas LIVE.

## A4 — Aqua Austral + Natales
### 10–30 octubre

- [ ] Ingreso PT.
- [ ] Inventario PT.
- [ ] Movimientos.
- [ ] Trazabilidad.
- [ ] Despacho.
- [ ] Multiespecie en Natales.
- [ ] Tres días consecutivos por planta.

**Gate:** 6/6 plantas LIVE o formalmente aceptadas según su modalidad real.

---

# TRACK B — PLANT EXECUTION

## B0 — Contrato industrial
### 2–4 septiembre · 2–3 días hábiles

Objetivo: congelar el contrato mínimo antes de conectar hardware.

### Levantamiento por Ancud y Quellón

- [ ] marca/modelo de balanza;
- [ ] protocolo: RS232 / USB / Ethernet / Bluetooth;
- [ ] scanner y modo de operación;
- [ ] impresora;
- [ ] lenguaje de impresión: ZPL / TSPL / EPL / otro;
- [ ] terminal Windows/Android/tablet;
- [ ] red disponible;
- [ ] ejemplos reales de etiquetas;
- [ ] códigos utilizados;
- [ ] túneles/cámaras;
- [ ] operación regulatoria actual;
- [ ] ejemplos Sernapesca/Siscomex si existen.

### Desarrollo paralelo

- [ ] definir `plant_stations`;
- [ ] definir `plant_devices`;
- [ ] definir `device_events`;
- [ ] definir `packing_units`;
- [ ] definir `pallets`;
- [ ] definir `cold_assets/cold_runs`;
- [ ] definir `regulatory_holds`;
- [ ] definir contratos de API.

**Gate:** `PLANT_EXECUTION_CONTRACT.md` aprobado internamente.

## B1 — Floor Station + packing básico
### 4–8 septiembre · 3–4 días hábiles

Reutiliza auth, scope por planta, lotes, producción, labels, auditoría y mobile actual.

- [ ] nueva ruta `/floor`;
- [ ] planta desde sesión;
- [ ] estación;
- [ ] lote activo;
- [ ] proceso/producto;
- [ ] peso;
- [ ] confirmación;
- [ ] creación de packing unit;
- [ ] fallback manual auditado;
- [ ] UI táctil;
- [ ] estado conectado/desconectado;
- [ ] tests de permisos.

**Gate:** una caja puede crearse manualmente desde Floor Station y queda ligada al lote real.

## B2 — Packing Units + especificaciones
### 7–11 septiembre · 3–4 días hábiles

Cada unidad física debe conocer lote, proceso, planta, producto, especie, grade, formato, bruto, tara, neto, operador, estación, fecha y estado.

### Packing Specification

- [ ] producto;
- [ ] grade;
- [ ] formato;
- [ ] rango de peso;
- [ ] destino;
- [ ] cliente cuando aplique;
- [ ] campos de etiqueta;
- [ ] barcode/QR;
- [ ] unidades por caja;
- [ ] cajas por pallet;
- [ ] reglas de liberación;
- [ ] versión.

**Gate:** Pescamar valida una caja contra una especificación versionada.

## B3 — Label Engine
### 9–13 septiembre · 3 días hábiles

Reutiliza el módulo actual de etiquetas y release gate.

- [ ] plantillas versionadas;
- [ ] barcode/QR;
- [ ] preview;
- [ ] print jobs;
- [ ] queued/sent/printed/failed/cancelled/reprinted;
- [ ] auditoría de reimpresión;
- [ ] bloqueo si faltan campos críticos;
- [ ] plantilla por producto/mercado/cliente.

No se construye un diseñador libre tipo Word en esta etapa.

**Gate:** una packing unit genera una etiqueta determinística y auditable.

## B4 — Scanner + Device Gateway + balanza
### 9–16 septiembre · 4–5 días hábiles de software
### Dependencia: hardware/protocolo real

### Scanner

- [ ] USB HID / keyboard wedge;
- [ ] códigos de lote;
- [ ] caja;
- [ ] pallet.

### Balanza

`Balanza → Device Gateway → API → device_event → validación → packing_unit`

- [ ] adapter interface;
- [ ] simulador de balanza para CI/UAT remoto;
- [ ] adapter real para primer modelo;
- [ ] reconexión;
- [ ] debounce;
- [ ] peso estable;
- [ ] captura manual autorizada;
- [ ] idempotency key.

**Gate:** una caja real puede recibir peso automáticamente desde una balanza soportada.

Si el hardware no está disponible, el roadmap continúa con simulador y fallback manual.

## B5 — Pallets + producto terminado
### 13–17 septiembre · 2–3 días hábiles

- [ ] crear pallet;
- [ ] agregar cajas por scanner;
- [ ] quitar caja con motivo;
- [ ] cerrar pallet;
- [ ] peso agregado;
- [ ] cantidad de cajas;
- [ ] producto/grade;
- [ ] destino;
- [ ] ubicación;
- [ ] estado;
- [ ] etiqueta pallet;
- [ ] integrar a inventario PT.

**Gate:** trazabilidad completa `lote → caja → pallet → ubicación`.

## B6 — Frío
### 16–20 septiembre · 2–3 días hábiles

Primera versión: control estructurado manual.

Activos: túnel, cámara, frigorífico.

- [ ] carga;
- [ ] lotes/pallets asociados;
- [ ] inicio;
- [ ] objetivo temperatura;
- [ ] temperatura observada;
- [ ] duración;
- [ ] fin;
- [ ] desviación;
- [ ] operador;
- [ ] evidencia.

Sensores/IoT no son condición para v1.

**Gate:** un pallet puede entrar y salir de un túnel/cámara manteniendo trazabilidad.

## B7 — Regulatory Holds
### 18–22 septiembre · 2–3 días hábiles

Autoridades iniciales: Sernapesca, SAG y control interno.

Estados: OPEN, RELEASED, REJECTED.

- [ ] motivo;
- [ ] documento/evidencia;
- [ ] actor;
- [ ] fecha;
- [ ] lote/pallet;
- [ ] liberación autorizada;
- [ ] auditoría;
- [ ] impedir despacho en backend mientras exista hold activo.

**Gate:** un lote/pallet bloqueado no puede despacharse.

## B8 — Offline + resiliencia
### 18–23 septiembre · 3 días hábiles en paralelo

- [ ] cola local;
- [ ] IndexedDB;
- [ ] estado pendiente;
- [ ] reintento;
- [ ] idempotency key;
- [ ] replay seguro;
- [ ] detección de duplicado;
- [ ] señal visual de sincronización;
- [ ] recuperación después de cerrar/reabrir.

**Gate:** caída de internet no duplica cajas, pesos ni movimientos.

## B9 — Hardening
### 22–25 septiembre · 2–3 días hábiles

- [ ] `station.use`;
- [ ] `weight.capture`;
- [ ] `packing.create`;
- [ ] `packing.correct`;
- [ ] `label.print`;
- [ ] `label.reprint`;
- [ ] `pallet.close`;
- [ ] `cold.run`;
- [ ] `regulatory.hold`;
- [ ] `regulatory.release`;
- [ ] auditoría;
- [ ] aislamiento por planta;
- [ ] concurrencia;
- [ ] idempotencia;
- [ ] tests desktop/mobile;
- [ ] smoke productivo.

**Gate:** cero P0/P1 conocidos antes de UAT industrial.

---

# TRACK C — UAT INDUSTRIAL

## C1 — Ancud
### 25–30 septiembre · 3–5 días hábiles

### Caso 1
Recepción → producción → peso → caja → etiqueta → pallet → frío → PT → despacho.

### Caso 2
Balanza no disponible → fallback manual → motivo → auditoría.

### Caso 3
Etiqueta incorrecta → bloqueo → corrección → reimpresión.

### Caso 4
Regulatory hold → intento despacho → rechazo backend → liberación → despacho.

### Caso 5
Caída internet → 10 eventos offline → reconexión → sincronización → 0 duplicados.

**Gate técnico:** UAT PASS.  
**Gate operacional:** tres jornadas consecutivas sin soporte de desarrollo.

## C2 — Quellón
### 30 septiembre – 7 octubre

Reutilizar exactamente el mismo core.

Sólo se permiten configuración, adapter reutilizable o regla reusable. No se acepta fork de código.

**Gate:** segunda planta operando Plant Execution sobre el mismo core.

---

# TRACK D — ESTANDARIZACIÓN

## D1 — Rollout a las otras cuatro plantas
### 7–30 octubre

Plant Execution se habilita sólo donde exista necesidad operacional real.

### Iquique / Sotomayor
- maquila;
- trazabilidad PT;
- packing cuando exista captura propia.

### Piedra Azul
- PT;
- packing;
- pallets;
- despacho.

### Aqua Austral
- PT;
- pallets;
- ubicaciones;
- despacho.

### Natales
- PT multiespecie;
- packing;
- pallets;
- despacho.

**Gate:** configuración reusable; ninguna personalización rompe el core.

---

# TRACK E — SERNAPESCA XML / SISCOMEX

## E0 — Espera de contrato

No se estima fecha de inicio hasta contar con XML real, XSD si existe, endpoint, autenticación, códigos de error, acknowledgement, retry y owner funcional.

## E1 — Implementación
### 3–7 días hábiles desde disponer del contrato

- [ ] `regulatory_submissions`;
- [ ] payload versionado;
- [ ] hash;
- [ ] envío;
- [ ] respuesta;
- [ ] aceptación/rechazo;
- [ ] reintentos;
- [ ] auditoría;
- [ ] observabilidad;
- [ ] sandbox/QA;
- [ ] producción.

Una integración externa nunca modifica directamente inventario o lote sin pasar por reglas Pescamar.

---

## 4. Qué NO construir ahora

- no Report Studio general;
- no diseñador drag-and-drop de formularios;
- no diseñador visual libre de etiquetas;
- no IoT masivo antes del piloto;
- no forecasting/ML sin historia real;
- no fork por planta;
- no integración regulatoria inventada;
- no dashboards redundantes;
- no sustitución del ERP actual por una UI nueva.

---

## 5. Reutilización estimada

### 80–90% reutilizable

- autenticación;
- sesión;
- permisos base;
- plantas;
- lotes;
- recepción;
- producción;
- auditoría;
- evidencia;
- labels;
- inventario;
- comercial;
- mobile styles;
- API patterns;
- CI;
- Vercel;
- Neon.

### 50–70% reutilizable

- packing;
- producto terminado;
- liberaciones;
- operación móvil;
- flujo de clasificación;
- inventario físico.

### Nuevo

- `plant_stations`;
- device registry/events;
- Device Gateway;
- packing units físicas;
- pallets;
- cold assets/runs;
- regulatory holds;
- offline queue;
- adapters de hardware.

---

## 6. Cronograma consolidado

| Semana | Track A — rollout | Track B/C — Plant Execution |
| --- | --- | --- |
| 2–4 sep | Core LIVE | Contrato industrial |
| 4–8 sep | Ancud datos reales | Floor Station |
| 7–11 sep | Ancud | Packing + specs |
| 9–16 sep | Ancud / Quellón | Labels + scanner + balanza |
| 13–20 sep | Quellón | Pallets + frío |
| 18–25 sep | Quellón | Regulatory + offline + hardening |
| 25–30 sep | Ancud continuidad | UAT industrial Ancud |
| 30 sep–7 oct | Quellón continuidad | UAT industrial Quellón |
| 7–30 oct | Plantas 3–6 | Rollout Plant Execution según modalidad |
| desde contrato | — | Sernapesca XML/Siscomex |

---

## 7. Critical path

Puede retrasar calendario aunque el software esté listo:

1. no disponer del modelo/protocolo de balanza;
2. no disponer de impresora/etiquetas reales;
3. no contar con usuario/responsable de planta;
4. no tener operaciones reales durante la ventana UAT;
5. falta de contrato Sernapesca/Siscomex;
6. red local muy inestable sin acceso para probar;
7. cambios de proceso descubiertos tarde.

### Mitigación

- simuladores para hardware;
- fallback manual auditado;
- interfaces por adapter;
- UAT con datos reales en cuanto estén disponibles;
- no bloquear software por XML externo;
- un solo modelo canónico.

---

## 8. Definition of Done — Plant Execution

Plant Execution sólo se considera listo cuando:

1. existe una estación real configurada;
2. operador real accede sólo a su planta;
3. lote real puede abrirse desde Floor;
4. peso puede capturarse automáticamente o por fallback auditado;
5. packing unit física queda creada;
6. etiqueta queda generada;
7. impresión/reimpresión queda auditada;
8. caja puede incorporarse a pallet;
9. pallet mantiene ubicación;
10. movimiento por frío queda trazado;
11. regulatory hold bloquea despacho en backend;
12. operación offline reconecta sin duplicados;
13. auditoría identifica actor/acción/planta;
14. Playwright desktop/mobile está verde;
15. smoke productivo está verde;
16. tres jornadas reales consecutivas funcionan sin intervención de desarrollo;
17. responsable de planta acepta el flujo.

---

## 9. KPIs

### Operación

- >=99% de eventos de estación sincronizados.
- 0 duplicados por reintento/offline.
- 100% cajas con lote y operador.
- 100% reimpresiones auditadas.
- 100% holds regulatorios respetados en despacho.
- 100% acciones críticas con scope de planta.

### Velocidad

- packing unit: <5 segundos desde peso estable a confirmación.
- scan de caja/pallet: <2 segundos de interacción.
- recuperación offline automática al recuperar conectividad.

### Calidad

- cero P0/P1 al declarar módulo LIVE;
- cero datos sintéticos presentados como reales;
- cero inventario generado directamente desde dispositivo sin evento validado.

---

## 10. Fecha objetivo

### Objetivo comprometible

**30 septiembre 2026:** Plant Execution funcional y probado técnicamente en Ancud.

### Objetivo probable si hardware y operación están disponibles a tiempo

**7 octubre 2026:** Ancud + Quellón validados.

### Objetivo de programa

**30 octubre 2026:** core + Plant Execution estandarizados y habilitables para las seis plantas.

### Buffer

Hasta **13 noviembre 2026** para dependencias externas, hardware no previsto o correcciones surgidas de operación real.

El objetivo contractual original puede mantenerse dentro del **22 noviembre 2026**, pero el plan interno debe apuntar a terminar varias semanas antes para no consumir el buffer con desarrollo normal.

---

## 11. Próximas 48 horas

1. confirmar hardware Ancud;
2. confirmar hardware Quellón;
3. conseguir una etiqueta real de cada flujo prioritario;
4. identificar responsable funcional de cada planta;
5. cerrar `PLANT_EXECUTION_CONTRACT.md`;
6. crear migración de estaciones/dispositivos/packing;
7. implementar skeleton `/floor`;
8. implementar packing unit manual;
9. agregar pruebas de scope/auditoría;
10. mantener el rollout del core en paralelo.

**Siguiente gate:** primera packing unit trazable creada desde Floor Station sin romper el flujo actual.
