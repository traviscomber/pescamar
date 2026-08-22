# Pescamar Control Multiplanta — Roadmap MVP

## Objetivo

Construir un centro de control ejecutivo y operacional para las seis plantas de Pescamar, con PostgreSQL/Neon como persistencia canónica, importaciones auditables, recepción trazable, decisiones por excepción y separación efectiva de permisos.

## Promesa del producto

> Toda la operación autorizada de Pescamar, en una sola pantalla.

Cada estado debe explicar qué ocurre, por qué ocurre, desde cuándo y cuál fue la evidencia que originó el dato.

## Plantas iniciales

| Planta | Modalidad | Productos |
| --- | --- | --- |
| Ancud | Propia | Erizo congelado |
| Quellón | Propia | Desconche de erizo, erizo terminado, pulpo, centolla, jaiba |
| Iquique (Sotomayor) | Maquila | Pulpo, erizo congelado, erizo fresco, palometa |
| Piedra Azul | Maquila y producto terminado | Centolla, salmón Chinook, corvina |
| Aqua Austral | Producto terminado | Merluza austral, congrio, salmón de cultivo |
| Natales | Producto terminado | Erizos, centolla, centollón, ostiones |

## Estado de ingeniería

### Persistencia y trazabilidad

- [x] PostgreSQL/Neon como persistencia operacional.
- [x] Importación XLSX/XLS/CSV con validación, preview, historial y rollback controlado.
- [x] Snapshot compartido multiplanta.
- [x] Recepciones con planta, guía, peso bruto, tara, drenado, kilos aceptados y evidencia HTTPS trazable.
- [x] Filtrado de snapshots, recepciones, liquidaciones e historial por alcance de planta.
- [x] Recepciones históricas sin planta confirmada restringidas a Administración.

### Finanzas y decisiones

- [x] Créditos y anticipos vinculados a proveedores, con movimientos auditables.
- [x] Liquidaciones desde recepciones aprobadas, precio por kilo y descuentos.
- [x] Recuperación automática e idempotente de anticipos al aprobar una liquidación.
- [x] Bandeja de decisiones con comentario obligatorio e identidad derivada de la sesión.
- [x] Visibilidad de decisiones separada por rol: recepción para Operaciones/Calidad; anticipos y liquidaciones para Finanzas/Administración.

### Identidad y autorización

- [x] Login individual y sesiones con cookie segura.
- [x] Roles `admin`, `operations`, `quality`, `finance` y `viewer`.
- [x] Matriz efectiva de permisos por planta aplicada por servidor.
- [x] Administración de alcance por planta desde Operadores.
- [x] Navegación y acciones de la UI alineadas con rol como defensa adicional; el servidor sigue siendo la autoridad.
- [x] Bootstrap de primer administrador de una sola vez.
- [x] Throttling de login y auditoría de autenticación sin almacenar IP/correo en texto claro.

### Calidad y release

- [x] Build de producción incluye TypeScript frontend y Vercel Functions.
- [x] GitHub Actions ejecuta `npm ci`, ESLint y build en PRs y `main`.
- [x] Lockfile reproducible; el primer gate ya detectó y obligó a corregir errores React reales.
- [x] `npm ci` reporta 0 vulnerabilidades conocidas en el gate actual.
- [x] Vercel Preview se usa como gate de integración antes de mergear.

## Migraciones canónicas

El esquema versionado actual llega hasta:

1. `001_core.sql`
2. `002_settlement_workflow.sql`
3. `003_operator_auth.sql`
4. `004_reception_plant_evidence.sql`
5. `005_auth_abuse_audit.sql`

Las compatibilidades idempotentes de runtime para cambios aditivos permiten un arranque seguro, pero no sustituyen la confirmación explícita de las migraciones canónicas en Neon.

## Gate de piloto

La ingeniería desplegada no equivale todavía a aceptación humana del piloto. El checklist autoritativo está en `PILOT_ACCEPTANCE.md`.

Pendiente antes de declarar el piloto **PASS**:

- [ ] Confirmar en Neon que 001–005 están aplicadas canónicamente.
- [ ] Confirmar o crear el primer administrador real.
- [ ] Crear al menos cinco identidades reales para Administración, Operaciones, Calidad, Finanzas y Lectura/Gerencia.
- [ ] Asignar roles y plantas según definición entregada por Pescamar, sin inferirlos.
- [ ] Ejecutar pruebas cruzadas de autorización por rol y planta.
- [ ] Ejecutar el escenario de rate-limit con una cuenta de QA autorizada, no con una cuenta operativa.
- [ ] Completar un flujo real recepción → aprobación → liquidación → recuperación de anticipo.
- [ ] Verificar que no existan errores runtime nuevos después de la prueba de aceptación.

**Estado de release:** `HOLD — ingeniería desplegada y gates automáticos verdes; aceptación autenticada del piloto pendiente`.

## Backlog posterior al piloto

- Clasificación visual por calibre y color como módulo separado del flujo financiero.
- Reglas configurables de rendimiento, merma e inventario con evidencia canónica.
- Comparador multiplanta y tendencias históricas cuando exista cobertura de datos suficiente.
- Integraciones adicionales sólo cuando exista fuente real y contrato de datos verificable.
- Optimización del bundle de Excel (`exceljs`) sin ocultar el warning actual.
