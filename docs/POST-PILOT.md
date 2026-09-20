# Pescamar · Estado POST-PILOT — 2026-09-20

**Veredicto: programa UX cerrado. Gate UX-4 CERRADO.** Último SHA verificado: `f33cec0` (main).

## Qué quedó verificado (evidencia, no promesas)

| Gate | Estado | Evidencia |
|---|---|---|
| Quality (lint + typecheck + build) | PASS | `npm run quality`, 0 errores (31 warnings preexistentes) |
| Chromium desktop | PASS | 212 tests · 106 specs · `desktop-chromium` |
| Chromium mobile | PASS | mismo universo · `mobile-chromium` (Pixel 7) |
| Revisión visual autenticada | PASS | home, trazabilidad por período, Seafood AI · 0 errores consola · 0 overflow horizontal (`ux4-evidence/`) |
| CI GitHub (Quality) | PASS | run `35538780704` → `success` sobre `f33cec0` |
| Vercel Production | PASS | deployment `6557934501` (vercel[bot]) → `success`, mismo SHA |
| Smokes CI (32 contratos) | 32/32 PASS | backlog de drift de contratos cerrado en `f33cec0` |

## Qué se corrigió en el cierre

- **Backlog oculto de CI**: 5 smokes con drift contra el rediseño CEO/role-first (policy v13, router v5, contexto live en `HomeHero`, copy de período).
- **Bug real de paridad bilingüe del router**: inglés "anomaly" ruteaba distinto de "anomalía" → `/\banomal/`, parity 95.7% → 100%, accuracy 100%.
- **Garantía restaurada**: label bilingüe de procedencia Event Graph ("Origen: registros del lote y operación actual") en Hoy.
- **Leak de productización**: numbering de implementación fuera del shell diario (topbar sin "Implementación 01").

## Congelamiento POST-PILOT

A partir de este cierre, **toda mejora cosmética o idea nueva pasa a POST-PILOT**. Solo se reabre trabajo si un usuario real del piloto demuestra fricción operacional. Sin excepciones por estética.

## Conocido y aceptado

- **Flakiness de carga inicial** en `control-tower-operational-intelligence` y `executive-decision-brief`: pasan estable en retry y aislados; no es defecto UX. Monitorear si aparece en CI.
- **Warnings de lint preexistentes** (unused vars, `any`): no bloquean; candidatos a higiene en el próximo sprint técnico.
- **Deploy Vercel protegido por SSO**: verificable vía estado del deployment; además `GET /api/public-health` (sin auth, sin datos sensibles) permite smoke de liveness en prod cuando el SSO no cubra ese path.

## Criterio de reactivación

Reabrir UX solo con: reporte de usuario piloto con caso concreto → triaje P0/P1 → fix + misma verificación (quality + Playwright desktop/mobile + smoke afectado + CI + Vercel en el mismo SHA).
