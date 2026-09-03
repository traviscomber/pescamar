# Operational UI pass

Scope: Recepciones, Producción, Erizo/Calidad and Despachos/Ventas.

Principle: current operational work first; analytical, historical and configuration context second.

## Changes

- Recepciones: remove the outer dashboard-card treatment around search/live/history and use one continuous working surface.
- Producción: remove the wrapper card around current lots; retain analytical balance after current work.
- Comercial: convert the four headline metrics into one continuous rail and remove the wrapper card around lot results.
- Erizo/Calidad: convert lot selection into a control bar and flatten repeated stage rows inside the critical sequence.
- Responsive: 4 → 2 → 1 metric rail behavior and single-column process selector on small screens.

## Non-goals

No API, database, RBAC, routing, canonical-data, inventory, approval or transaction behavior changes.

## Gate

Require Quality + desktop/mobile Chromium evidence for `/recepciones`, `/lineas`, `/proceso-erizo` and `/despachos-ventas` before merge recommendation.
