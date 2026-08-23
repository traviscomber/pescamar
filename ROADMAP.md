# Pescamar Control Multiplanta — Roadmap 90 días

**Ventana:** 24 agosto – 22 noviembre 2026  
**Objetivo:** terminar en un máximo de 3 meses una plataforma operacional estable, trazable y adoptada para las seis plantas de Pescamar.  
**Principio:** no esperar a que todas las plantas estén perfectas para avanzar. Se estabiliza el núcleo común una vez y luego se despliega por planta en olas cortas.

## Estado de partida

El producto ya está operando técnicamente sobre una base sólida:

- PostgreSQL/Neon como persistencia operacional canónica.
- Importación XLSX/XLS/CSV con preview, historial y rollback.
- Snapshot compartido multiplanta.
- Recepciones trazables con evidencia.
- OpenAI Vision para extracción documental; prueba sintética controlada: 11/11 campos, 100% de extracción y score 99/100.
- Créditos, anticipos, liquidaciones y recuperación de anticipos.
- Login individual, roles y autorización efectiva por planta.
- CI/build y despliegue productivo en Vercel.

El desafío de los próximos 90 días ya no es demostrar que la arquitectura funciona. Es convertirla en operación repetible por planta, con datos reales, usuarios reales y criterios de aceptación medibles.

## Plantas y estrategia de rollout

| Ola | Planta | Modalidad | Foco de activación |
| --- | --- | --- | --- |
| 1 | Ancud | Propia | Recepción, producción, rendimiento, inventario y trazabilidad |
| 1 | Quellón | Propia | Recepción multiespecie, desconche, rendimiento y liquidación |
| 2 | Iquique (Sotomayor) | Maquila | Control de maquila, recepción, producción y conciliación |
| 2 | Piedra Azul | Maquila / producto terminado | Maquila, producto terminado, inventario y despacho |
| 3 | Aqua Austral | Producto terminado | Ingreso PT, inventario, trazabilidad y despacho |
| 3 | Natales | Producto terminado | Multiespecie, inventario, trazabilidad y despacho |

La prioridad de las olas puede cambiar según disponibilidad de operadores y datos, sin cambiar la fecha máxima de cierre.

---

# MES 1 — Núcleo productivo + Ola 1
## 24 agosto – 22 septiembre

### Semana 1 — Cerrar el núcleo

- [ ] Confirmar migraciones canónicas en Neon y eliminar cualquier drift de esquema.
- [ ] Crear administrador y usuarios reales por rol.
- [ ] Definir matriz real usuario → rol → planta.
- [ ] Ejecutar pruebas cruzadas de autorización por rol/planta.
- [ ] Completar flujo real recepción → aprobación → liquidación → anticipo.
- [ ] Probar Vision con fotografías reales de documentos de planta: buena luz, sombra, inclinación, documento arrugado y cámara móvil.
- [ ] Definir ground truth y score de OCR por campo crítico.
- [ ] Gate Vision: >=95% en campos críticos y cero datos críticos inventados.
- [ ] Revisar logs, errores runtime, seguridad y recuperación ante fallos.

**Gate:** Core Production Ready.

### Semana 2 — Modelo operacional por planta

- [ ] Parametrizar especies, procesos, unidades y reglas por planta; evitar lógica hardcodeada por instalación.
- [ ] Definir catálogo canónico de proveedores, productos, especies y lotes.
- [ ] Definir estados del lote desde recepción hasta producto terminado/despacho.
- [ ] Implementar inventario/lotes con trazabilidad de origen.
- [ ] Implementar rendimiento y merma con reglas configurables.
- [ ] Establecer calidad de datos: completo, pendiente, observado, rechazado.
- [ ] Crear dashboard de salud por planta: última actualización, cobertura, pendientes y excepciones.

### Semana 3 — Ancud

- [ ] Cargar y reconciliar datos históricos disponibles.
- [ ] Validar recepción real y evidencia documental.
- [ ] Validar producción de erizo congelado.
- [ ] Validar rendimiento/merma.
- [ ] Validar inventario y trazabilidad por lote.
- [ ] Capacitación corta a operadores responsables.
- [ ] Operar 3 días consecutivos sin intervención técnica manual.

### Semana 4 — Quellón

- [ ] Cargar y reconciliar datos históricos disponibles.
- [ ] Validar desconche de erizo y producto terminado.
- [ ] Validar flujo multiespecie: erizo, pulpo, centolla y jaiba según datos reales disponibles.
- [ ] Validar recepción, rendimiento, calidad y liquidación.
- [ ] Operar 3 días consecutivos sin intervención técnica manual.

**Gate fin Mes 1:** Ancud y Quellón en operación controlada; core estable.

---

# MES 2 — Maquilas + control multiplanta
## 23 septiembre – 22 octubre

### Semana 5 — Aprendizajes y plantilla de activación

- [ ] Corregir fricciones detectadas en Ola 1.
- [ ] Convertir configuración de planta en plantilla reutilizable.
- [ ] Crear checklist técnico/operacional estándar para alta de una nueva planta.
- [ ] Automatizar validaciones de importación y conciliación más frecuentes.
- [ ] Agregar alertas por datos vencidos, faltantes, diferencias y rendimientos fuera de rango.

### Semana 6 — Iquique / Sotomayor

- [ ] Configurar modalidad maquila.
- [ ] Cargar fuentes reales disponibles.
- [ ] Validar recepción y producción por especie.
- [ ] Conciliar kilos enviados, procesados, merma y producto resultante.
- [ ] Validar trazabilidad y documentación.
- [ ] Operar 3 días consecutivos sin soporte manual.

### Semana 7 — Piedra Azul

- [ ] Configurar maquila + producto terminado.
- [ ] Validar centolla, Chinook y corvina según cobertura real.
- [ ] Validar inventario PT y movimientos.
- [ ] Conciliar origen → procesamiento → PT/despacho.
- [ ] Operar 3 días consecutivos sin soporte manual.

### Semana 8 — Centro de control multiplanta

- [ ] Comparador de plantas con filtros homogéneos.
- [ ] KPIs: recepción, producción, rendimiento, merma, inventario, antigüedad de datos y excepciones.
- [ ] Tendencias históricas sólo donde la cobertura sea suficiente.
- [ ] Bandeja ejecutiva de excepciones y decisiones.
- [ ] Drill-down KPI → planta → lote/recepción → evidencia.
- [ ] Exportación/entrega ejecutiva de información sin romper trazabilidad.

**Gate fin Mes 2:** cuatro plantas operativas y centro de control multiplanta útil para gestión diaria.

---

# MES 3 — Producto terminado + cierre definitivo
## 23 octubre – 22 noviembre

### Semana 9 — Aqua Austral

- [ ] Configurar flujo de producto terminado.
- [ ] Cargar y reconciliar datos disponibles.
- [ ] Validar inventario, movimientos, trazabilidad y despacho.
- [ ] Validar productos/especies reales.
- [ ] Operar 3 días consecutivos sin soporte manual.

### Semana 10 — Natales

- [ ] Configurar flujo multiespecie de producto terminado.
- [ ] Cargar y reconciliar datos disponibles.
- [ ] Validar erizo, centolla, centollón y ostiones según cobertura real.
- [ ] Validar inventario, movimientos, trazabilidad y despacho.
- [ ] Operar 3 días consecutivos sin soporte manual.

### Semana 11 — Hardening global

- [ ] Pruebas E2E de las seis plantas.
- [ ] Matriz completa de permisos y aislamiento por planta.
- [ ] Backups, restore y rollback ensayados.
- [ ] Pruebas de duplicados, idempotencia y concurrencia.
- [ ] Manejo de archivos corruptos, datos incompletos y fallos de OpenAI.
- [ ] Performance en móvil y escritorio.
- [ ] Observabilidad: errores, latencia, fallos de importación/Vision y salud de DB.
- [ ] Revisión de seguridad y secretos.
- [ ] Cero errores críticos abiertos.

### Semana 12 — Aceptación y transferencia

- [ ] UAT por cada planta con responsable identificado.
- [ ] UAT Administración, Operaciones, Calidad, Finanzas y Gerencia.
- [ ] Manual operacional breve dentro del repositorio.
- [ ] Runbook técnico: Vercel, GitHub, Neon, OpenAI, dominios, variables y recuperación.
- [ ] Documentar todas las integraciones y propietarios.
- [ ] Congelar esquema/API v1 y documentar cambios posteriores mediante migraciones.
- [ ] Resolver todos los P0/P1.
- [ ] Firmar checklist de aceptación final.

### Buffer máximo — hasta 22 noviembre

Los últimos días son exclusivamente para defectos de aceptación, datos faltantes o activación de una planta retrasada. No se incorporan features nuevas que no sean necesarias para el cierre.

**Gate final:** seis plantas operativas, plataforma aceptada y transferible.

---

## Definition of Done por planta

Una planta se considera **LIVE** sólo cuando cumple todos estos puntos:

1. Fuentes reales identificadas y responsables definidos.
2. Datos históricos mínimos cargados/reconciliados cuando existan.
3. Usuarios y permisos reales configurados.
4. Recepción/ingreso principal funcionando con evidencia.
5. Flujo operacional principal trazable hasta producto o salida correspondiente.
6. KPIs de la planta derivados de datos canónicos, no mocks.
7. Excepciones visibles y accionables.
8. Tres días consecutivos de uso real sin intervención técnica manual.
9. Sin P0/P1 abiertos.
10. Responsable de planta acepta el flujo.

## Score semanal

Cada viernes se calcula un score de 100 puntos:

| Área | Peso |
| --- | ---: |
| Integridad y calidad de datos | 25 |
| Flujos operacionales E2E | 25 |
| Trazabilidad y evidencia | 15 |
| Seguridad y permisos | 15 |
| Estabilidad / observabilidad | 10 |
| Adopción de usuarios | 10 |

- **95–100:** listo / estable.
- **90–94:** operable, cerrar detalles.
- **80–89:** piloto, no declarar terminado.
- **<80:** bloqueado para aceptación.

El cierre global requiere **>=95/100**, ninguna planta bajo **90/100** y **cero P0/P1**.

## KPIs de éxito a 90 días

- 6/6 plantas activas o formalmente aceptadas según su modalidad real.
- >=95% de precisión en campos documentales críticos del conjunto de prueba real.
- 100% de decisiones críticas con usuario, timestamp y evidencia/origen.
- 100% de usuarios restringidos a sus plantas/roles autorizados.
- 0 datos demo/mocks presentados como producción.
- 0 P0/P1 abiertos al cierre.
- >=95/100 de score global.
- Operación diaria posible sin depender del equipo de desarrollo.

## Fuera de alcance antes del cierre

No deben poner en riesgo los 90 días:

- Computer vision avanzada para calibre/color si no es requisito de aceptación.
- Forecasting/ML predictivo sin suficiente historia real.
- Integraciones externas sin fuente, propietario y contrato de datos confirmado.
- Personalizaciones cosméticas específicas por planta que rompan el modelo común.
- Nuevos módulos que no aporten a operación, trazabilidad, control o aceptación.

## Regla de ejecución

**Core común primero; configuración por planta después; custom code por planta sólo como último recurso.**

Cada nueva necesidad debe responder: ¿es una regla configurable que puede servir a otra planta? Si la respuesta es sí, se implementa en el núcleo y no como fork local.

## Estado actual

**OPERANDO / HARDENING.** La arquitectura y el pipeline principal están funcionales. El trabajo restante es activación real por planta, validación humana, cobertura de datos, hardening y adopción.

**Fecha máxima de término: 22 de noviembre de 2026.**
