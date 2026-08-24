# Pescamar — ROADMAP de activación y despliegue

**Ventana:** 24 agosto – 22 noviembre 2026  
**Estado actual:** CORE LISTO PARA POBLAR / ROLLOUT CONTROLADO  
**Fecha objetivo de cierre:** 22 noviembre 2026  
**North Star:** seis plantas operando sobre un solo core, con datos reales, trazabilidad completa, control por rol/planta y operación diaria sin dependencia del equipo de desarrollo.

> **Operación compleja, control sereno.** Datos reales primero. Un solo core. Una planta a la vez, sin perder la visión multiplanta.

---

## 1. Punto de partida — lo que ya está construido

La plataforma ya no está en etapa de prototipo. El core productivo cuenta con:

### Operación

- Recepciones operacionales sin datos sintéticos precargados.
- Evidencia documental asociada a recepción.
- Pipeline Vision para extracción asistida desde documentos.
- Calidad y Producción por lote.
- Ficha 360 como detalle único de trazabilidad.
- Inventario, ubicaciones y movimientos.
- Costos de transformación.
- Órdenes de venta y reservas por lote.
- Despachos y ventas.
- Créditos y anticipos.
- Liquidaciones con doble control.
- Cierre diario operacional.
- Línea temporal continua entre histórico 2025 y operación viva 2026+.

### Gestión y control

- Dashboard operacional y vista de red multiplanta.
- Roles: Administrador, Gerencia de Operaciones, Finanzas, Calidad y Lectura.
- Scope de datos por planta aplicado en backend/SQL.
- Auditoría Operacional por fecha, planta, operador y módulo.
- Identidad estable de operador mediante UUID en los flujos críticos.
- Trazabilidad de quién hizo qué, cuándo y dónde.
- Separación de eventos financieros para roles autorizados.

### Plataforma

- Neon PostgreSQL como fuente operacional canónica.
- Vercel producción sobre `main`.
- Autenticación server-side, sesiones seguras y rate limiting.
- Sin bypass de autenticación en producción.
- Headers de seguridad y APIs `no-store`.
- CI con lint, TypeScript, build, release smoke y Chromium desktop/mobile.
- Gates de seguridad, formularios, identidad, aislamiento por planta y auditoría.
- Experiencia responsive/mobile-ready.
- Tema claro y oscuro bajo un único sistema visual.

### Estado de datos

- Histórico 2025 se conserva como fuente histórica, sin forzar equivalencias no confirmadas con las seis plantas actuales.
- Operación 2026+ parte desde estado cero real.
- No existen mocks presentados como producción.
- El siguiente riesgo relevante ya no es técnico: es **calidad, disponibilidad y adopción de datos reales**.

---

## 2. Objetivo comercial y operacional

El despliegue busca convertir Pescamar en una operación gestionada desde una sola plataforma capaz de responder en segundos:

1. ¿Qué entró a cada planta?
2. ¿Qué se produjo y con qué rendimiento?
3. ¿Dónde está físicamente cada kilo?
4. ¿Qué está comprometido, despachado o vendido?
5. ¿Qué falta liquidar o aprobar?
6. ¿Qué excepciones requieren atención?
7. ¿Quién ejecutó cada acción y cuándo?
8. ¿Qué ocurrió históricamente y cómo continúa en la operación viva?

El producto se considera exitoso cuando estas respuestas salen del sistema y no de múltiples planillas, mensajes o reconstrucciones manuales.

---

## 3. Principio de rollout

**Un solo producto, un solo core, seis plantas configuradas.**

No se crean forks por planta. Toda diferencia operacional se resuelve en este orden:

1. configuración existente;
2. nueva configuración reutilizable;
3. regla de negocio reutilizable;
4. código específico sólo como último recurso.

### Plantas objetivo

| Ola | Planta | Modalidad principal | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Ancud | Planta propia | Recepción → producción → inventario → comercial |
| 1 | Quellón | Planta propia / multiespecie | Producción + desconche + liquidación |
| 2 | Iquique / Sotomayor | Maquila | Conciliación integral de maquila |
| 2 | Piedra Azul | Maquila / producto terminado | Proceso + PT + despacho |
| 3 | Aqua Austral | Producto terminado | Inventario PT + trazabilidad + despacho |
| 3 | Natales | Producto terminado / multiespecie | PT + inventario + despacho |

---

# FASE 0 — ACTIVACIÓN DEL CORE
## 24–31 agosto

### Objetivo

Pasar de plataforma vacía a primeras operaciones reales controladas, sin introducir datos contaminados.

### Ya cerrado

- [x] Persistencia Neon y migraciones canónicas.
- [x] Auth server-side y sesiones seguras.
- [x] Scope por rol y planta en módulos críticos.
- [x] Identidad estable de operador.
- [x] Auditoría Operacional.
- [x] Trazabilidad recepción → producción → inventario → comercial → cierre.
- [x] Formularios críticos sin valores sintéticos.
- [x] Mobile-ready.
- [x] CI, build y deploy productivo.
- [x] Producción limpia sin errores runtime conocidos en la última verificación.

### Por completar para cerrar la fase

- [ ] Crear/confirmar usuarios reales por rol y planta.
- [ ] Confirmar catálogos operacionales: proveedores, especies, productos, procesos y unidades.
- [ ] Ingresar 2–3 recepciones reales controladas.
- [ ] Validar evidencia y Vision con documentos reales.
- [ ] Ejecutar primer flujo real completo hasta inventario.
- [ ] Ejecutar al menos un flujo comercial/liquidación controlado.
- [ ] Confirmar que Auditoría registre correctamente los actores.
- [ ] Revisar datos resultantes con Gerencia de Operaciones.
- [ ] Corregir cualquier P0/P1 antes de ampliar volumen.

### Gate

**CORE LIVE:** primeras operaciones reales completas, trazables y aceptadas.

---

# FASE 1 — PLANTAS PROPIAS
## 1–22 septiembre

## Ancud

### Activación

- [ ] Configurar responsables y usuarios.
- [ ] Confirmar catálogo real de especies/productos/procesos.
- [ ] Reconciliar histórico disponible sin reinterpretar identidades no confirmadas.
- [ ] Cargar primeras recepciones reales.
- [ ] Validar Vision contra documentos reales de terreno.
- [ ] Validar Calidad y Producción sin recaptura innecesaria.
- [ ] Confirmar rendimiento y merma.
- [ ] Confirmar Inventario por lote y ubicación.
- [ ] Confirmar Ficha 360 y Auditoría.
- [ ] Confirmar comercial / despacho cuando exista operación real.
- [ ] Operar tres días consecutivos sin soporte técnico manual.

**Gate Ancud:** LIVE.

## Quellón

### Activación

- [ ] Configurar responsables y usuarios.
- [ ] Confirmar catálogo multiespecie.
- [ ] Reconciliar histórico disponible.
- [ ] Cargar primeras recepciones reales.
- [ ] Validar desconche/procesamiento cuando corresponda.
- [ ] Validar producto terminado.
- [ ] Validar rendimiento y merma.
- [ ] Validar inventario y movimientos.
- [ ] Validar liquidación y doble control financiero.
- [ ] Operar tres días consecutivos sin soporte técnico manual.

**Gate Quellón:** LIVE.

### Gate Fase 1

**2/6 plantas LIVE + core estable con operación diaria real.**

---

# FASE 2 — MAQUILAS Y CONTROL MULTIPLANTA
## 23 septiembre – 22 octubre

## Estandarización posterior a las plantas propias

- [ ] Convertir aprendizajes Ancud/Quellón en configuración reusable.
- [ ] Checklist único de alta de planta.
- [ ] Normalizar catálogos compartidos.
- [ ] Reducir cualquier recaptura manual detectada.
- [ ] Crear excepciones operacionales sólo donde exista señal real.
- [ ] Confirmar comparabilidad de KPIs entre modalidades distintas.

## Iquique / Sotomayor

- [ ] Configurar modalidad maquila.
- [ ] Definir fuente y owner de cada dato.
- [ ] Validar recepción y envío a proceso.
- [ ] Conciliar kilos enviados / procesados / merma / producto resultante.
- [ ] Validar documentos y evidencia.
- [ ] Validar inventario resultante.
- [ ] Operar tres días consecutivos sin soporte técnico manual.

**Gate Iquique:** LIVE.

## Piedra Azul

- [ ] Configurar maquila + producto terminado.
- [ ] Validar especies/productos con cobertura real.
- [ ] Validar inventario PT.
- [ ] Conciliar origen → procesamiento → PT → despacho.
- [ ] Confirmar trazabilidad y Auditoría.
- [ ] Operar tres días consecutivos sin soporte técnico manual.

**Gate Piedra Azul:** LIVE.

## Centro de control multiplanta

Con cuatro plantas activas se valida que el modelo corporativo sea útil para gestión diaria:

- [ ] recepción por planta;
- [ ] producción y rendimiento;
- [ ] merma;
- [ ] inventario y disponibilidad;
- [ ] órdenes y compromisos;
- [ ] excepciones y decisiones pendientes;
- [ ] antigüedad/frescura de datos;
- [ ] drill-down planta → lote → evidencia;
- [ ] cierre diario consolidado con procedencia visible.

### Gate Fase 2

**4/6 plantas LIVE + control multiplanta usado por Gerencia.**

---

# FASE 3 — PRODUCTO TERMINADO Y CIERRE
## 23 octubre – 22 noviembre

## Aqua Austral

- [ ] Configurar ingreso de producto terminado.
- [ ] Definir responsable y fuente de datos.
- [ ] Reconciliar información disponible.
- [ ] Validar inventario PT.
- [ ] Validar movimientos y trazabilidad.
- [ ] Validar despacho.
- [ ] Operar tres días consecutivos sin soporte técnico manual.

**Gate Aqua Austral:** LIVE.

## Natales

- [ ] Configurar flujo PT multiespecie.
- [ ] Reconciliar información disponible.
- [ ] Validar especies/productos según operación real.
- [ ] Validar inventario y movimientos.
- [ ] Validar despacho.
- [ ] Operar tres días consecutivos sin soporte técnico manual.

**Gate Natales:** LIVE.

---

## 4. Hardening global

Con las seis plantas activadas:

- [ ] E2E real por cada modalidad operacional.
- [ ] Matriz completa de permisos y aislamiento por planta.
- [ ] Concurrencia, duplicados e idempotencia.
- [ ] Recovery / backup / restore / rollback ensayados.
- [ ] Degradación segura cuando Vision/OpenAI no esté disponible.
- [ ] Performance con volumen real.
- [ ] Navegación y tareas críticas en móvil real.
- [ ] Observabilidad de API, DB, importaciones y Vision.
- [ ] Revisión final de secretos, sesiones y autorizaciones.
- [ ] Auditoría de acciones críticas por operador.
- [ ] Cero P0/P1 abiertos.

---

## 5. UAT y transferencia

- [ ] UAT Administración.
- [ ] UAT Gerencia de Operaciones.
- [ ] UAT Calidad.
- [ ] UAT Finanzas.
- [ ] UAT Lectura/Gerencia.
- [ ] UAT por planta.
- [ ] Manual operacional breve.
- [ ] Runbook técnico: GitHub, Vercel, Neon, OpenAI, variables y recuperación.
- [ ] Integraciones y responsables documentados.
- [ ] Checklist `PILOT_ACCEPTANCE.md` completo.
- [ ] Transferencia de operación sin dependencia de N3uralia para tareas rutinarias.

---

## 6. Definition of Done por planta

Una planta sólo se declara **LIVE** cuando cumple:

1. Responsable funcional identificado.
2. Usuarios y permisos reales configurados.
3. Catálogos operacionales confirmados.
4. Fuentes reales identificadas.
5. Histórico reconciliado cuando corresponda.
6. Flujo operacional principal E2E funcionando.
7. Inventario/trazabilidad consistentes.
8. Evidencia y Auditoría visibles.
9. KPIs derivados exclusivamente de datos reales.
10. Excepciones accionables y no decorativas.
11. Tres días consecutivos de operación sin soporte técnico manual.
12. Cero P0/P1 y aceptación del responsable.

---

## 7. KPIs de éxito del programa

### Datos

- 0 mocks presentados como producción.
- 100% operaciones críticas con fuente identificable.
- 100% acciones críticas con identidad estable de operador cuando aplique.
- 100% usuarios limitados al rol/planta autorizado.

### Operación

- 6/6 plantas LIVE o formalmente aceptadas según modalidad real.
- Flujo recepción → producción → inventario → comercial trazable.
- Operación diaria sin equipo de desarrollo para tareas rutinarias.

### Vision documental

- >=95% de precisión en campos críticos sobre documentos reales antes de automatizar confianza alta.
- 0 campos críticos inventados aceptados silenciosamente.
- Siempre debe existir revisión humana cuando la confianza o evidencia sea insuficiente.

### Plataforma

- Cero P0/P1 al cierre.
- Build, CI y deploy productivo estables.
- Runtime sin errores recurrentes no explicados.
- Mobile operativo para tareas de terreno.

---

## 8. Score de rollout

Cada planta y el core se puntúan semanalmente:

| Área | Peso |
| --- | ---: |
| Integridad y calidad de datos | 25 |
| Flujo operacional E2E | 25 |
| Trazabilidad y evidencia | 15 |
| Seguridad y permisos | 15 |
| Estabilidad / observabilidad | 10 |
| Adopción | 10 |

### Interpretación

- **95–100:** estable / listo.
- **90–94:** operable; cerrar detalles.
- **80–89:** piloto; continuar controlado.
- **<80:** bloqueado para ampliar rollout.

### Gate global

- Score global >=95.
- Ninguna planta <90.
- Cero P0/P1.

---

## 9. Priorización de defectos

**P0 — seguridad, pérdida/corrupción de datos o imposibilidad de operar.**  
Se corrige antes de continuar rollout.

**P1 — rompe el flujo principal o genera decisión incorrecta.**  
Se corrige dentro de la ola activa antes de declarar LIVE.

**P2 — fricción operacional o claridad insuficiente.**  
Se corrige si afecta adopción, calidad de dato o score.

**P3 — refinamiento.**  
No pone en riesgo rollout ni desplaza P0/P1.

---

## 10. Fuera de alcance antes del cierre

No entra antes de estabilizar las seis plantas salvo requisito directo de aceptación:

- forecasting o ML predictivo sin historia real suficiente;
- computer vision avanzada de calibre/color sin caso operacional validado;
- dashboards redundantes;
- integraciones sin fuente, owner y contrato de datos;
- forks de código por planta;
- personalizaciones cosméticas que rompan el core común;
- features que no reduzcan riesgo, trabajo manual o tiempo de decisión.

---

## 11. Secuencia inmediata

1. Confirmar usuarios reales y permisos de la primera planta.
2. Confirmar catálogos operacionales comunes.
3. Ingresar las primeras 2–3 recepciones reales controladas.
4. Validar Vision con documentos reales.
5. Ejecutar recepción → producción → inventario de punta a punta.
6. Revisar Ficha 360, Timeline y Auditoría contra la operación real.
7. Ejecutar un ciclo comercial/liquidación controlado.
8. Corregir cualquier P0/P1 detectado.
9. Declarar Core LIVE.
10. Activar Ancud.
11. Activar Quellón.
12. Convertir diferencias en configuración reusable.
13. Activar Iquique / Sotomayor y Piedra Azul.
14. Validar centro de control multiplanta.
15. Activar Aqua Austral y Natales.
16. Hardening, UAT y transferencia.

---

# DONE

Pescamar se considera terminado cuando:

**las seis plantas operan o están formalmente aceptadas bajo su modalidad real; el score global es >=95; ninguna planta está bajo 90; no existen P0/P1; los datos productivos son reales; roles y plantas están validados; trazabilidad y Auditoría están activas; recuperación está probada; y la operación diaria puede continuar sin depender del equipo de desarrollo.**

**Fecha objetivo: 22 noviembre 2026.**
