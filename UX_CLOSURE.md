# Pescamar UX Closure

Objetivo: llevar la experiencia de Pescamar — Implementation 01 a **9,5+/10 lista para piloto** sin abrir desarrollo horizontal infinito.

## Regla de alcance

Una mejora UX entra en este programa sólo si reduce fricción de una tarea real, mejora comprensión, corrige navegación/jerarquía/accesibilidad, o elimina una inconsistencia visual sistémica. No se agregan módulos ni datos ficticios para mejorar una pantalla.

Canonical Intake protege la fuente de verdad: etiquetas normalizadas y ayudas de interfaz pueden ser más simples, pero nunca reescriben valores fuente, lotes, proveedores, fechas, pesos, moneda, calidad ni lineage.

## UX-1 · Navegación y lenguaje — IMPLEMENTADO · VERIFICACIÓN EN UX-4

Criterio de salida:
- cuatro workspaces diarios claros;
- flujo físico de planta ordenado y completo;
- Packing y Pallets separados;
- Pescamar visible como implementación del Seafood Intelligence OS;
- conceptos humanos antes que siglas o nombres internos;
- identidades técnicas preservadas como metadata separada cuando son canónicas;
- administración reservada para tareas poco frecuentes;
- contrato CI que impida regresar a jerga o navegación ambigua.

## UX-2 · Jerarquía de tareas — IMPLEMENTADO · VERIFICACIÓN EN UX-4

Criterio de salida:
- una tarea principal por pantalla crítica;
- siguiente acción evidente;
- estados normales silenciosos y excepciones primero;
- detalle técnico bajo demanda;
- sin doble frame ni CTA primarios repetidos en Recepciones, Ficha 360, Packing, Pallets, Frío, Inventario y Órdenes;
- contrato CI que impida volver a títulos genéricos o acciones duplicadas.

## UX-3 · Mobile y accesibilidad — IMPLEMENTADO · VERIFICACIÓN EN UX-4

Criterio de salida:
- navegación utilizable con una mano;
- targets mínimos de 44 px;
- sin overflow horizontal del documento;
- foco visible, orden lógico, Escape/cancelación y labels accesibles;
- recepciones activas e históricas recompuestas en tarjetas semánticas en móvil en vez de comprimir columnas;
- valores canónicos conservados sin transformación de datos.

## UX-4 · Verificación y cierre — CERRADO · CI + VERCEL PASS · 2026-09-20

Criterio de salida:
- Quality PASS;
- Chromium desktop/mobile PASS;
- Vercel SUCCESS en el mismo SHA;
- revisión visual autenticada cuando haya navegador disponible;
- cero P0/P1 UX abiertos.

### Evidencia 2026-09-20 (SHA `d228bedf780251a2d7cd4c247cfcb631c5cd0039`)

- **Quality PASS** — `npm run quality`: lint 0 errores (31 warnings preexistentes), typecheck y build OK.
- **Chromium desktop PASS** — 212 tests en 106 specs, proyecto `desktop-chromium`, contra preview de producción (`vite preview`).
- **Chromium mobile PASS** — mismo universo de tests, proyecto `mobile-chromium` (Pixel 7).
- **Revisión visual autenticada PASS** — home, trazabilidad por período y Seafood AI revisadas en Chromium desktop y mobile con sesión mock: 0 errores de consola, 0 overflow horizontal. Evidencia: `ux4-evidence/` en workspace de la sesión.
- **Alineación de contratos previa al PASS** — los specs de home decisión/navegación por rol/lang, Control Tower, executive brief, Seafood AI, trazabilidad histórica (period-report UX) y product-identity quedaron alineados al rediseño CEO/role-first; `AppShell` rotula el sidebar con el producto (Seafood Intelligence OS) y el topbar con la identidad de implementación sin filtrar el numbering al shell diario, cerrando el drift de productización P0.
- **Runtime de tests** — `@playwright/test` fijado a `1.55.0` en `devDependencies`, igual que el pin de CI.

### Evidencia de cierre 2026-09-20 (SHA `f33cec0b14a9f924deec7c892503f0ecf2f6fb9c`)

- **CI PASS** — workflow Quality, run `35538780704`: `conclusion=success` sobre `f33cec0`.
- **Vercel SUCCESS en el mismo SHA** — deployment Production `6557934501` creado por `vercel[bot]` para `f33cec0`, estado `success` ("Deployment has completed"). URL protegida por Vercel SSO (herramienta interna): contenido no fetchable sin credenciales, consistente con el acceso autenticado del producto.
- **Backlog de smokes CI cerrado** — los 32 smokes del workflow corren locales: 32/32 PASS (`release-smoke` verificado con preview atado a `127.0.0.1`; en CI usa el mismo bindeo). Se corrigió drift real de contratos: policy `seafood.ai.evidence.v13`, router `seafood.router.v5`, contexto live de Hoy migrado a `HomeHero`, label de procedencia Event Graph restaurado en `DailyClose`, y fix de paridad bilingüe del router (`/\banomali/` → `/\banomal/`: inglés "anomaly" ruteaba distinto de español "anomalía"; parity 95.7% → 100%).
- **Quality PASS** — `npm run quality` sobre `f33cec0`: lint 0 errores (warnings preexistentes), typecheck y build OK; specs Playwright tocados (product-identity, browser-smoke, copilot-browser, control-tower-operational-intelligence) re-corridos: 23 passed.

### Nota de estabilidad

- Dos specs (`control-tower-operational-intelligence`, `executive-decision-brief`) mostraron flakiness de carga inicial en la primera corrida y pasaron de forma estable en retry y en corridas aisladas; no se observaron P0/P1 UX abiertos.

Después de UX-4, cualquier mejora cosmética o nueva idea pasa a POST-PILOT salvo que un usuario real del piloto demuestre fricción operacional.