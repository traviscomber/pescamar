# Pescamar — ROADMAP 90 días

**Ventana:** 24 agosto – 22 noviembre 2026  
**Estado:** OPERANDO / HARDENING  
**Fecha máxima de término:** 22 noviembre 2026  
**North Star:** seis plantas operativas sobre un solo core, con datos reales, trazabilidad completa, permisos por planta y operación diaria sin depender del equipo de desarrollo.

> Simplicidad primero. Datos reales primero. Un solo core. Una planta a la vez, sin perder la visión multiplanta.

---

## 1. Qué ya está resuelto

La plataforma ya tiene base productiva:

- Neon/PostgreSQL como persistencia operacional.
- Importación XLSX/XLS/CSV con preview, historial y rollback.
- Recepciones vivas trazables.
- Ficha 360 y línea temporal por lote.
- Calidad, producción, inventario, costos, órdenes, comercial y cierre diario.
- Créditos, anticipos y liquidaciones.
- Roles, sesiones y alcance por planta.
- Vercel + CI/build productivo.
- OpenAI Vision activo en producción.
- Prueba sintética Vision: 11/11 campos correctos, 100% extracción, 95% confianza, score 99/100.
- 2025 tratado como referencia histórica canónica; 2026+ como operación viva.

El trabajo restante ya no es demostrar la arquitectura. Es **activar, validar y estabilizar cada planta con operación real**.

---

## 2. Estrategia de rollout

| Ola | Planta | Modalidad | Resultado esperado |
| --- | --- | --- | --- |
| 0 | Core común | Plataforma | Core Production Ready |
| 1 | Ancud | Propia | Flujo completo de recepción a inventario |
| 1 | Quellón | Propia | Flujo multiespecie + desconche + liquidación |
| 2 | Iquique / Sotomayor | Maquila | Conciliación maquila completa |
| 2 | Piedra Azul | Maquila / PT | Maquila + producto terminado + despacho |
| 3 | Aqua Austral | Producto terminado | Inventario PT + trazabilidad + despacho |
| 3 | Natales | Producto terminado | Multiespecie PT + inventario + despacho |

**Regla:** no se crea un fork por planta. Primero configuración; luego reglas reutilizables; código específico sólo si no existe otra opción.

---

# FASE 0 — CORE PRODUCTION READY
## 24–31 agosto

### Objetivo
Cerrar todos los riesgos estructurales antes de acelerar plantas.

### Entregables

- [ ] Confirmar migraciones canónicas en Neon y eliminar drift.
- [ ] Validar usuarios reales y matriz usuario → rol → planta.
- [ ] Ejecutar pruebas cruzadas de autorización por planta/rol.
- [ ] Completar E2E real: recepción → calidad → producción → inventario → liquidación.
- [ ] Probar Vision con documentos reales de planta.
- [ ] Dataset Vision: luz normal, baja luz, inclinación, sombra, documento arrugado y texto pequeño.
- [ ] Gate Vision: >=95% campos críticos y cero campos críticos inventados.
- [ ] Validar errores, fallos de OpenAI, archivos corruptos y recuperación.
- [ ] Validar backup / restore / rollback.
- [ ] Confirmar catálogos comunes: plantas, proveedores, especies, productos, procesos.
- [ ] Cero P0 abiertos.

### Gate
**CORE PRODUCTION READY**

No comienza rollout acelerado si existe un P0.

---

# FASE 1 — PLANTAS PROPIAS
## 1–22 septiembre

## Semana 2 — Modelo operacional común

- [ ] Parametrizar especies, procesos, unidades y reglas por planta.
- [ ] Consolidar catálogo canónico de proveedores/productos/especies.
- [ ] Confirmar estados del lote de punta a punta.
- [ ] Validar rendimiento y merma configurables.
- [ ] Definir estados de calidad de datos: completo / pendiente / observado / rechazado.
- [ ] Salud por planta: última actualización, cobertura, pendientes y excepciones.

## Semana 3 — Ancud

- [ ] Reconciliar 2025 disponible como referencia histórica.
- [ ] Ejecutar primera recepción viva real.
- [ ] Validar evidencia + Vision.
- [ ] Calidad sin recaptura.
- [ ] Producción de erizo congelado.
- [ ] Rendimiento y merma.
- [ ] Inventario por lote.
- [ ] Trazabilidad completa en Ficha 360.
- [ ] Operar 3 días consecutivos sin intervención técnica manual.
- [ ] Responsable de planta acepta el flujo.

**Gate Ancud:** LIVE.

## Semana 4 — Quellón

- [ ] Reconciliar 2025 disponible.
- [ ] Ejecutar recepción viva real.
- [ ] Validar desconche de erizo.
- [ ] Validar producto terminado.
- [ ] Validar erizo, pulpo, centolla y jaiba según operación real.
- [ ] Validar calidad, rendimiento y liquidación.
- [ ] Operar 3 días consecutivos sin intervención técnica manual.
- [ ] Responsable de planta acepta el flujo.

**Gate Quellón:** LIVE.

### Gate fin Fase 1
**2/6 plantas LIVE + core estable.**

---

# FASE 2 — MAQUILAS + CONTROL MULTIPLANTA
## 23 septiembre – 22 octubre

## Semana 5 — Plantilla reutilizable

- [ ] Corregir fricciones detectadas en Ancud/Quellón.
- [ ] Convertir diferencias de planta en configuración reusable.
- [ ] Checklist estándar de alta de planta.
- [ ] Automatizar conciliaciones frecuentes.
- [ ] Alertas por datos vencidos, faltantes, diferencias y rendimientos anómalos.

## Semana 6 — Iquique / Sotomayor

- [ ] Configurar modalidad maquila.
- [ ] Cargar fuentes reales disponibles.
- [ ] Validar recepción y producción por especie.
- [ ] Conciliar kilos enviados / procesados / merma / producto resultante.
- [ ] Validar documentación y trazabilidad.
- [ ] Operar 3 días consecutivos sin soporte manual.

**Gate Iquique:** LIVE.

## Semana 7 — Piedra Azul

- [ ] Configurar maquila + producto terminado.
- [ ] Validar centolla, Chinook y corvina según cobertura real.
- [ ] Validar inventario PT.
- [ ] Conciliar origen → procesamiento → PT → despacho.
- [ ] Operar 3 días consecutivos sin soporte manual.

**Gate Piedra Azul:** LIVE.

## Semana 8 — Centro de control multiplanta

- [ ] Comparador homogéneo por planta.
- [ ] KPIs: recepción, producción, rendimiento, merma, inventario y antigüedad de datos.
- [ ] Excepciones y decisiones prioritarias.
- [ ] Drill-down KPI → planta → lote → evidencia.
- [ ] Tendencias sólo donde exista cobertura suficiente.
- [ ] Cierre diario consolidado con origen visible.

### Gate fin Fase 2
**4/6 plantas LIVE + centro de control útil para gestión diaria.**

---

# FASE 3 — PRODUCTO TERMINADO + CIERRE
## 23 octubre – 22 noviembre

## Semana 9 — Aqua Austral

- [ ] Configurar flujo de ingreso de producto terminado.
- [ ] Reconciliar datos disponibles.
- [ ] Validar inventario PT.
- [ ] Validar movimientos y trazabilidad.
- [ ] Validar despacho.
- [ ] Operar 3 días consecutivos sin soporte manual.

**Gate Aqua Austral:** LIVE.

## Semana 10 — Natales

- [ ] Configurar flujo PT multiespecie.
- [ ] Reconciliar datos disponibles.
- [ ] Validar erizo, centolla, centollón y ostiones según operación real.
- [ ] Validar inventario, movimientos y despacho.
- [ ] Operar 3 días consecutivos sin soporte manual.

**Gate Natales:** LIVE.

## Semana 11 — Hardening global

- [ ] E2E de las seis plantas.
- [ ] Permisos y aislamiento por planta.
- [ ] Duplicados, idempotencia y concurrencia.
- [ ] Backup / restore / rollback ensayados.
- [ ] Fallos OpenAI y degradación segura sin Vision.
- [ ] Performance escritorio + móvil.
- [ ] Observabilidad de API, DB, importación y Vision.
- [ ] Revisión de secretos y seguridad.
- [ ] Cero P0/P1 abiertos.

## Semana 12 — UAT + transferencia

- [ ] UAT por cada planta.
- [ ] UAT Administración.
- [ ] UAT Operaciones.
- [ ] UAT Calidad.
- [ ] UAT Finanzas.
- [ ] UAT Gerencia / lectura.
- [ ] Manual operacional breve.
- [ ] Runbook técnico: GitHub, Vercel, Neon, OpenAI, variables, recovery.
- [ ] Integraciones y responsables documentados.
- [ ] Esquema/API v1 congelado para cierre.
- [ ] Checklist `PILOT_ACCEPTANCE.md` completo.

### Buffer final
**13–22 noviembre:** sólo aceptación, defectos, datos faltantes y plantas retrasadas. No nuevas features salvo requisito directo de cierre.

---

## 3. Definition of Done por planta

Una planta es **LIVE** sólo cuando cumple los 10 puntos:

1. Fuentes reales identificadas.
2. Responsable funcional definido.
3. Usuarios/permisos reales configurados.
4. Datos históricos reconciliados cuando existan.
5. Flujo operacional principal E2E funcionando.
6. Evidencia y trazabilidad visibles.
7. KPIs derivados de datos reales, no mocks.
8. Excepciones accionables.
9. 3 días consecutivos de operación sin soporte técnico manual.
10. Cero P0/P1 y aceptación del responsable.

---

## 4. Score semanal

Cada viernes se puntúa cada planta y el core.

| Área | Peso |
| --- | ---: |
| Integridad y calidad de datos | 25 |
| Flujo operacional E2E | 25 |
| Trazabilidad y evidencia | 15 |
| Seguridad y permisos | 15 |
| Estabilidad / observabilidad | 10 |
| Adopción | 10 |

Interpretación:

- **95–100:** estable / listo.
- **90–94:** operable; cerrar detalles.
- **80–89:** piloto; no declarar terminado.
- **<80:** bloqueado.

### Gate de cierre global

- Score global >=95/100.
- Ninguna planta <90/100.
- Cero P0/P1.

---

## 5. KPIs de éxito a 90 días

- 6/6 plantas LIVE o formalmente aceptadas según modalidad real.
- >=95% precisión Vision en campos críticos con documentos reales.
- 0 campos críticos inventados por Vision aceptados automáticamente.
- 100% decisiones críticas con usuario, timestamp y evidencia/origen.
- 100% usuarios restringidos a plantas/roles autorizados.
- 0 mocks presentados como producción.
- 0 P0/P1 al cierre.
- >=95/100 score global.
- Operación diaria sin dependencia del equipo de desarrollo.

---

## 6. Prioridad de defectos

**P0 — bloquea seguridad, datos u operación.** Se corrige antes de continuar rollout.

**P1 — rompe flujo principal.** Se corrige dentro de la ola activa.

**P2 — fricción operativa.** Se corrige si afecta adopción o score.

**P3 — mejora.** No entra mientras exista P0/P1 ni puede poner en riesgo la fecha final.

---

## 7. Fuera de alcance antes del cierre

No se incorpora antes del 22 de noviembre salvo requisito directo de aceptación:

- forecasting / ML predictivo sin historia suficiente;
- computer vision avanzada de calibre/color;
- dashboards redundantes;
- integraciones sin fuente y owner confirmado;
- personalizaciones cosméticas específicas por planta;
- forks de código por planta;
- módulos que no mejoren operación, trazabilidad, control o adopción.

---

## 8. Riesgos que pueden mover una planta, no la fecha final

- datos reales no disponibles a tiempo;
- operador de planta sin disponibilidad;
- diferencias de procesos no documentadas;
- documentos físicos de baja calidad;
- reglas financieras aún no confirmadas;
- catálogo de proveedores/especies inconsistente.

Mitigación: mover el orden de las plantas dentro de la misma ola o intercambiar olas, manteniendo el core único y la fecha máxima de cierre.

---

## 9. Secuencia inmediata

1. Cerrar Fase 0 contra `PILOT_ACCEPTANCE.md`.
2. Usuarios/roles reales por planta.
3. Vision con documentos reales de Ancud y Quellón.
4. Catálogos y reglas comunes.
5. Ancud LIVE.
6. Quellón LIVE.
7. Convertir aprendizajes en configuración reusable.
8. Iquique y Piedra Azul.
9. Centro de control multiplanta.
10. Aqua Austral y Natales.
11. Hardening.
12. UAT + handoff + cierre.

---

# DONE

Pescamar se considera terminado cuando:

**6/6 plantas operativas, score global >=95, ninguna planta <90, cero P0/P1, datos reales sin mocks, permisos validados, backups/restore probados, `PILOT_ACCEPTANCE.md` completo y operación diaria posible sin el equipo de desarrollo.**

**Deadline absoluto: 22 noviembre 2026.**
