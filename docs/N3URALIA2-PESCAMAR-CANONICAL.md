# N3uralia2 — Pescamar Canonical Development Brief

Purpose: shared execution context for all N3uralia2 skills/agents working on Pescamar / Seafood Intelligence OS.

## Canonical product identity

- Product architecture: **Seafood Intelligence OS**.
- Client implementation: **Pescamar — Implementation 01**.
- Canonical layers: Operational Core -> Seafood Event Graph -> EdgeVision -> Operational Intelligence -> Predictive Intelligence -> Decision Intelligence -> Seafood AI / Control Tower.
- Work on `main` unless explicitly instructed otherwise.
- Prefer grouped changes and one release over many previews/deployments.

## Evidence contract

Every material conclusion must follow:

`observed evidence -> operational interpretation -> risk/uncertainty -> recommended action -> confidence`

Allowed confidence labels:
- `observed`
- `derived`
- `needs-human-validation`

Rules:
- Never infer event absence from a missing record.
- Never promote historical/canonical spreadsheet evidence to live operations without explicit reconciliation.
- Unknown is not zero.
- Keep physical confirmation distinct from administrative confirmation.
- Preserve raw workbook lineage, comments, hidden sheets, source labels and source coordinates.

## Canonical operational flow

`supplier/origin -> reception -> lot -> production/process -> quality -> packing -> inventory/cold -> order/commitment -> dispatch -> settlement/export -> decision`

Continuity of identity and kilograms is mandatory. Transformations may alter mass only when the conversion/yield is documented.

## Exelito findings now canonical for development

The five audited XLSX files contain 12,243 populated cells across 15 sheets, 1,860 formulas and 35 comments. The original workbooks remain immutable.

### Production 2026

- 224 production/reception observations.
- 50,959.7 guide kg.
- 49,183.6 received kg.
- 1,776.1 kg aggregate guide-vs-received difference.
- 111 rows with zero difference, 98 positive difference, 15 rows where received kg exceeds guide kg.
- 41/224 rows have guide price; all populated source values are CLP 12,000. Do not treat this as a standard price without Pescamar validation.
- 220 populated guide numbers, 1 explicit `S/G`, 4 blank guide numbers.
- 224 lot cells, 219 unique lot values; repeated lots/guides must be reconciled contextually, never blindly deduplicated.
- 13 known reception/process/production sequence anomalies must be excluded from chronology-sensitive KPIs until reviewed.
- Supplier aliases to normalize while preserving raw labels: `Patricio Diaz` / `Patrcio Diaz`, `Gladys Mansilla` / `Glady Mansilla`.
- Zone/plant case aliases must also preserve raw values.

### Supplier support sheets

`Isla Guafo`, `Diaz termiando`, and `Cesar` are supporting reconciliation evidence, not independent production ledgers.

They contain combinations of guide kg, accepted/destined kg, grade composition, RGA/destination evidence and reconciliation/debt notes. Use them to validate the main production rows when deterministic linkage exists.

### Hidden sheets

- `Stock fisico`: legacy 2021–2022 stock/paste/rejection evidence; reference only.
- `espinoza`: legacy guide/reception/drip/debt evidence including `sin guia`, `respaldo`, `debe`; reference only.

Never mix these sheets into 2026 live inventory.

### Pulpo packing

- `BLOQUE`: 446 unique boxes, 8,920 kg, exactly 20 kg/box, explicit lots `I01-260805`, `I02-260815`, `I03-260816`, `I04-260824`.
- `IQF`: 116 boxes, 2,372 kg, no explicit lot identifier.
- `BLOQUE!D1048576 = SUM(D1:D1048575)` is a structural artifact and must never count as an operational record.
- Lot strings and production dates are separate facts; never derive date by parsing the lot code.

### CUENTA2 / finance-operational memory

`CUENTA2.xlsx` is not a conventional general ledger. It mixes operational and financial memory.

- `CUENTA CORRIENTE` includes advances, deposits, guides, maquila, freight, seafood, tax, purchases, dispatch/sample references and 33 business-relevant comments.
- Comments can contain box counts, kg, dispatch details, payment evidence and reconciliation explanations; treat comments as evidence.
- Known formula anomaly: rows 791–793 each contain CLP 320,000 in inflow while `G794` resumes from `G790`, omitting CLP 960,000 from that running-balance chain. Do not auto-correct; surface for reconciliation.
- Rows 1017–1023 and 1025 are numeric summary/reference rows, not transactions.
- Date anomalies include 2012 and future/out-of-sequence dates; preserve raw and flag.
- `TRANSF RECIBIDAS`: 25 bank-transfer records totaling CLP 80,211,983. Match to ledger/settlements only when evidence is deterministic and unique.
- `STOCK FISICO ERIZOS` and `STOCK PULPO` remain staged/historical stock evidence until reconciled against live inventory.

### Commercial/export evidence

- Purchase Order 41 contains a maquila-erizo line quantity 12,000 at CLP 700, net CLP 8,400,000, VAT CLP 1,596,000, total CLP 9,996,000. The quantity unit is not explicit; keep `needs-human-validation`.
- Export Invoice 2316: PACIFIC LIVE, LLC, Whole Fresh King Salmon Chinook, 35 cases, 1,513.942912 lb net, USD 8.30/lb, FOB USD 12,565.7261696, freight USD 2,346.6115136, CFR USD 14,912.3376832, New York.
- The `Proforma` sheet in that workbook is a separate Tokyo/DELICIA context and must never be merged into Invoice 2316 as the same transaction.
- `Simulador PI CLIENTES (2).xls` remains secondary evidence until value-preserving conversion/audit. Known sheet names include PROFORMA INVOICE, NOTA CREDITO, PACKING LIST, INSTRUCTIVO, MATRIZ BL, DETALLE CLAVES, ENVIO DCTOS., PODER AG.ADUANAS, PREEMBARQUE and TABLA DINAMICA.

## Validation strategy

Do not ask Pescamar for broad duplicate data before exhausting existing evidence.

Development order:
1. reconstruct deterministic historical chains from existing XLS/XLSX evidence;
2. reconcile production <-> packing;
3. reconcile packing <-> staged stock;
4. reconcile operation <-> ledger/transfers/export documents;
5. surface unresolved gaps explicitly;
6. ask Pescamar only for the remaining semantic confirmations;
7. execute live UAT with real product;
8. obtain Pescamar sign-off tied to the exact deployed SHA.

### Golden validation cases

Use these as first official Pescamar validation cases:
- CLP 960,000 running-balance discontinuity in CUENTA CORRIENTE;
- 15 reception rows where received kg > guide kg;
- 13 production chronology anomalies;
- one complete `BLOQUE` lot through box-level packing;
- one supplier reconciliation from `Isla Guafo` or `Diaz termiando`;
- one deterministic transfer-to-ledger reconciliation;
- IQF missing-lot case as `needs-human-validation`.

## Minimal questions still requiring Pescamar confirmation

- How should the 116 IQF boxes be linked to production lots?
- What exactly do `PLANTA` versus `ESPEJO` represent in erizo stock?
- What is the approved business/accounting meaning of `CUENTA CORRIENTE`?
- What unit is represented by quantity `12,000` in PO 41?
- Confirm supplier aliases/contact typos before canonical merge.
- Validate flagged date anomalies and missing guide identities.
- Confirm the rule/ownership for mapping ledger and bank transfers to settlements/credits.

## Grade A / validation states

Allowed maturity states:
- `implemented`
- `tested`
- `pilot-evidence`
- `validated-by-pescamar`
- `regulatory-confirmed`

Only Pescamar operational PASS may produce `validated-by-pescamar`. This is not equivalent to SERNAPESCA/SUBPESCA approval.

## UAT reference

Pescamar industrial UAT remains based on real product and the execution chain:

`reception -> production -> weight -> box -> label -> pallet -> cold -> finished product -> dispatch`

Also test exceptions: scale unavailable/manual fallback, incorrect label/reprint, regulatory hold/release and offline-event synchronization without duplication.

## Development priorities

1. Finish deterministic validation dataset from Pescamar evidence already delivered.
2. Feed validated evidence into Supplier Intelligence, Yield Intelligence, Margin per Lot and Exception Engine.
3. Keep administrative order allocation distinct from physical fulfilment.
4. Do not call cross-species/cross-process supplier comparison a procurement ranking unless comparability is validated.
5. Predictive/what-if remains disabled as validated intelligence until baselines are approved by Pescamar by species/product, supplier/origin, process and period.
6. Prefer reusing already-loaded Event Graph / context data before adding SQL queries, functions or crons.

## Team rule

Every N3uralia2 skill/agent working on Pescamar must use this document together with `docs/SEAFOOD-GRADE-A.md` and `docs/MINIMUM-PILOT-PACK.md` as the canonical execution context before proposing structural changes.