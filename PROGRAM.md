# Pescamar — Programa Maestro de Ejecución

**Horizonte:** 24 agosto – 22 noviembre 2026  
**Estado:** OPERANDO / HARDENING  
**Objetivo final:** seis plantas operativas sobre un único core, con datos reales, trazabilidad, permisos, control gerencial y operación diaria sin dependencia del equipo de desarrollo.

---

## 1. Qué documento manda

Este archivo es el **índice operativo** del proyecto. No reemplaza los documentos especializados.

| Tema | Fuente de verdad |
| --- | --- |
| Prioridades, fechas, olas y Definition of Done | `ROADMAP.md` |
| Criterios de aceptación humana y piloto | `PILOT_ACCEPTANCE.md` |
| Principios visuales y UX | `DESIGN.md` |
| Setup técnico y orientación general del repo | `README.md` |
| Código frontend | `src/` |
| API / backend | `api/` |
| Esquema y migraciones | `migrations/`, `db/` |
| Deploy productivo | Vercel / `main` |
| Persistencia operacional | Neon PostgreSQL |
| Vision documental | OpenAI API vía `OPENAI_API_KEY` |

**Regla:** si dos documentos se contradicen, gana el documento más específico. Si la contradicción afecta alcance, fecha o Definition of Done, se corrige `ROADMAP.md`.

---

## 2. Decisión de arquitectura

**Un solo producto, un solo core, múltiples plantas configuradas.**

No se crean forks de código por planta salvo último recurso. Toda necesidad nueva se evalúa en este orden:

1. ¿Ya existe en el core?
2. ¿Puede resolverse con configuración por planta?
3. ¿Puede resolverse con una regla reutilizable?
4. Sólo si las tres respuestas son no, evaluar código específico.

El sistema debe mantener una sola línea temporal por lote y una sola Ficha 360 como fuente de detalle.

---

## 3. Programa de 90 días

### Ola 0 — Core / cierre técnico
**24–31 agosto**

Objetivo: dejar la plataforma lista para que las plantas entren sin deuda estructural.

Frentes:
- migraciones Neon confirmadas;
- usuarios y permisos reales;
- pipeline Vision probado con documentos reales;
- recepción → calidad → producción → inventario → liquidación trazable;
- observabilidad y errores runtime;
- recuperación/rollback;
- catálogos canónicos comunes.

Gate: **Core Production Ready**.

### Ola 1 — Plantas propias
**1–22 septiembre**

Plantas:
- Ancud;
- Quellón.

Objetivo: validar operación completa donde Pescamar tiene mayor control directo.

Gate por planta:
- datos reales reconciliados;
- flujo principal E2E;
- 3 días consecutivos de operación sin soporte técnico manual;
- sin P0/P1;
- responsable acepta.

### Ola 2 — Maquilas
**23 septiembre – 22 octubre**

Plantas:
- Iquique / Sotomayor;
- Piedra Azul.

Objetivo: demostrar que el core soporta operaciones externas, conciliación y producto terminado sin fragmentarse.

Entregable adicional:
- centro de control multiplanta consolidado.

### Ola 3 — Producto terminado
**23 octubre – 12 noviembre**

Plantas:
- Aqua Austral;
- Natales.

Objetivo: cerrar los flujos de ingreso PT, inventario, trazabilidad y despacho.

### Cierre global
**13–22 noviembre**

Sólo:
- UAT;
- defects;
- performance;
- seguridad;
- backups/restore;
- documentación;
- handoff;
- aceptación final.

No entran features nuevas salvo requisito directo de aceptación.

---

## 4. Frentes de trabajo

### A. Operación
Owner funcional: **Gerencia de Operaciones / Sebastián**

Responsabilidades:
- validar flujo real de recepción y producción;
- definir qué datos son obligatorios por planta;
- confirmar proveedores, especies y procesos;
- aprobar Definition of Done operacional por planta.

### B. Calidad
Owner funcional: **Calidad Pescamar**

Responsabilidades:
- criterios de aprobación/revisión/alerta;
- tolerancias y evidencia;
- validación de captura Vision;
- flujo de excepción.

### C. Finanzas
Owner funcional: **Finanzas Pescamar**

Responsabilidades:
- anticipos;
- liquidaciones;
- descuentos;
- recuperación;
- conciliación económica.

### D. Producto / UX
Owner: **N3uralia / Frida**

Responsabilidades:
- simplicidad;
- consistencia visual;
- una acción dominante por pantalla;
- estados vacíos, loading, error y móvil;
- evitar recaptura de datos.

### E. Ingeniería
Owner: **N3uralia**

Responsabilidades:
- frontend;
- API;
- Neon;
- seguridad;
- Vercel;
- CI;
- performance;
- observabilidad;
- migraciones.

### F. R&D / validación
Owner: **Borat**

Responsabilidades:
- investigar decisiones técnicas antes de incorporar dependencias externas;
- verificar capacidades, costos, licencias y riesgos;
- preparar comparaciones y handoffs cuando exista una decisión técnica no resuelta;
- no modificar producción dentro de su mandato de investigación.

---

## 5. Cadencia semanal

### Lunes — compromiso
- elegir máximo 3 outcomes de la semana;
- asignar planta/frente;
- definir aceptación medible;
- bloquear scope creep.

### Miércoles — gate técnico
- build;
- runtime;
- DB;
- flujo E2E;
- datos reales;
- riesgos.

### Viernes — score / decisión
Se actualiza el score de `ROADMAP.md`:

- Integridad y calidad de datos: 25
- Flujos operacionales E2E: 25
- Trazabilidad/evidencia: 15
- Seguridad/permisos: 15
- Estabilidad/observabilidad: 10
- Adopción: 10

Resultado:
- 95–100 = estable;
- 90–94 = operable;
- 80–89 = piloto;
- <80 = bloqueado.

Cada viernes se decide explícitamente: **seguir / corregir / bloquear rollout**.

---

## 6. Backlog jerarquizado

### P0 — bloquea operación o seguridad
Ejemplos:
- datos corruptos o perdidos;
- permiso incorrecto entre plantas;
- recepción no persistida;
- cálculo económico incorrecto;
- crash general;
- secreto expuesto.

SLA interno: resolver antes de continuar rollout.

### P1 — rompe flujo principal
Ejemplos:
- Vision no completa campos críticos;
- inventario no concilia;
- lote pierde trazabilidad;
- liquidación no cierra;
- planta no puede completar tarea principal.

SLA interno: resolver dentro de la ola activa.

### P2 — fricción operativa
Ejemplos:
- pasos innecesarios;
- nomenclatura confusa;
- tabla poco legible;
- error recuperable sin pérdida de datos.

Se resuelve si afecta adopción o score.

### P3 — mejora
No entra mientras exista P0/P1 ni debe poner en riesgo los 90 días.

---

## 7. Regla de datos

### Histórico
- 2025 = referencia histórica canónica disponible.
- Nunca presentar 2025 como inventario físico actual.

### Operación viva
- 2026+ = datos ingresados por operación real.
- Cero mocks presentados como producción.
- Toda métrica debe conservar procedencia.

### Derivados
- forecasts, rendimientos esperados y recomendaciones deben etiquetarse como derivados.
- Nunca sustituyen producción, inventario o disponibilidad confirmada.

---

## 8. Pipeline documental / Vision

Estado verificado:
- `OPENAI_API_KEY` disponible en producción;
- modelo por defecto: `gpt-4o-mini`;
- prueba sintética controlada: 11/11 campos correctos;
- extracción: 100%;
- confianza reportada: 95%;
- score de prueba: 99/100.

Pendiente para aceptación:
- conjunto real de fotografías de planta;
- buena luz;
- baja luz;
- perspectiva;
- sombra;
- documento arrugado;
- texto pequeño;
- celular real.

Gate productivo: **>=95% en campos críticos y cero campos críticos inventados**.

---

## 9. Definition of Done global

Pescamar se declara terminado cuando:

- 6/6 plantas cumplen su Definition of Done o tienen aceptación formal acorde a su modalidad real;
- score global >=95/100;
- ninguna planta <90/100;
- cero P0/P1;
- permisos/roles validados;
- datos productivos sin mocks;
- backups y restore probados;
- operación diaria posible sin equipo de desarrollo;
- `PILOT_ACCEPTANCE.md` completo;
- Vercel producción estable;
- Neon canónico y migraciones alineadas;
- runbook técnico y operacional entregado.

Fecha máxima: **22 noviembre 2026**.

---

## 10. Lo que NO hacemos antes del cierre

- ML predictivo sin suficiente historia real.
- módulos decorativos;
- dashboards redundantes;
- forks por planta;
- integraciones sin propietario/fuente/contrato de datos;
- computer vision avanzada de calibre/color salvo requisito de aceptación;
- features que no mejoren operación, trazabilidad, control o adopción.

---

## 11. Próxima secuencia ejecutable

1. Confirmar Ola 0 contra `PILOT_ACCEPTANCE.md`.
2. Crear usuarios/roles reales y matriz por planta.
3. Probar Vision con documentos reales de Ancud/Quellón.
4. Cerrar catálogos y reglas comunes.
5. Activar Ancud.
6. Activar Quellón.
7. Tomar aprendizajes y convertirlos en configuración reutilizable.
8. Entrar a Iquique y Piedra Azul.
9. Consolidar centro de control multiplanta.
10. Activar Aqua Austral y Natales.
11. Hardening global.
12. UAT + transferencia + cierre.

---

## Regla final

**Simplicidad primero. Datos reales primero. Una sola fuente de verdad. Un solo core. Una planta a la vez, sin perder la visión multiplanta.**
