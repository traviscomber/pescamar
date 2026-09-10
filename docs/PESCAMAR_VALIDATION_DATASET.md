# Pescamar Validation Dataset

Purpose: canonical validation cases built only from evidence already delivered by Pescamar. This dataset is not live state and must never be promoted to live inventory, active lots, commitments, settlements or regulatory status without explicit reconciliation.

Use together with:
- `docs/N3URALIA2-PESCAMAR-CANONICAL.md`
- `docs/SEAFOOD-GRADE-A.md`
- `docs/MINIMUM-PILOT-PACK.md`

## Validation contract

Every case must preserve:

`observed evidence -> operational interpretation -> risk/uncertainty -> recommended action -> confidence`

Allowed confidence:
- `observed`
- `derived`
- `needs-human-validation`

Only Pescamar operational `PASS` on the exact deployed SHA may promote a capability to `validated-by-pescamar`.

## Dataset status

Current maturity: `pilot-evidence` for historical validation cases.

This means the source evidence is real and traceable, but the cases are not yet equivalent to live operational validation.

## Golden cases

### PV-001 — Financial running-balance discontinuity

Source: `CUENTA2.xlsx` / `CUENTA CORRIENTE`.

Observed evidence:
- `E791 = 4000*80` -> cached CLP 320,000.
- `E792 = 4000*80` -> cached CLP 320,000.
- `E793 = 4000*80` -> cached CLP 320,000.
- corresponding running-balance cells are blank.
- `G794` resumes from `G790`.
- total omitted from that source running-balance chain: CLP 960,000.

Operational interpretation:
- the workbook balance chain has a detectable continuity break even though the inflow evidence exists.

Risk / uncertainty:
- do not assume whether the workbook balance or the three movements reflect the intended accounting treatment until Pescamar reconciles the underlying evidence.

Expected OS behavior:
- surface a finance reconciliation exception;
- preserve the source balance and source formulas;
- independently recompute arithmetic from observed inflow/outflow values;
- never auto-correct the source workbook.

Confidence: `observed` for the formula break; `needs-human-validation` for business correction.

### PV-002 — Reception exceeds guide quantity

Source: `planilla de produccion 2026.xlsx` / `Producción Pescamar 2026`.

Observed evidence:
- 224 production/reception rows.
- 111 rows with zero guide-vs-received difference.
- 98 rows with guide kg greater than received kg.
- 15 rows where received kg exceeds guide kg.
- formula rule for `Dif. Kilos` is consistently `K-L` across the 224 rows.

Operational interpretation:
- negative source difference is not automatically an error; it is an exception requiring evidence review.

Expected OS behavior:
- calculate the difference deterministically;
- classify received > guide as an exception, not as impossible data;
- show source guide, supplier, lot, dates and kilograms;
- request review rather than changing kilograms.

Confidence: `observed`.

### PV-003 — Production chronology anomalies

Source: `planilla de produccion 2026.xlsx` / `Producción Pescamar 2026`.

Observed evidence:
- 13 rows violate the expected reception <= process <= production sequence.
- confirmed examples include rows 24, 25, 30, 61, 62, 77, 78, 90, 91, 162, 196, 205 and 221.

Operational interpretation:
- chronology-sensitive KPIs cannot safely include these rows until reviewed.

Expected OS behavior:
- preserve all original dates;
- apply a quality/eligibility flag;
- exclude flagged records from lead-time and chronology KPIs by default;
- never silently repair dates.

Confidence: `observed`.

### PV-004 — BLOQUE physical packing continuity

Source: `packing pulpo pescamar 2026-2.xlsx` / `BLOQUE`.

Observed evidence:
- 446 unique physical boxes.
- 8,920 kg total.
- exactly 20 kg per box.
- explicit source lots: `I01-260805`, `I02-260815`, `I03-260816`, `I04-260824`.
- box-level lot and production-date evidence exists.

Operational interpretation:
- this is the strongest current historical case for box -> lot physical continuity.

Expected OS behavior:
- preserve box identity, lot, date, size band and weight;
- calculate packing totals by lot without parsing the lot string as a date;
- expose reconciliation against production and staged stock;
- never treat `BLOQUE!D1048576 = SUM(D1:D1048575)` as an operational box row.

Confidence: `observed`.

### PV-005 — IQF missing lot lineage

Source: `packing pulpo pescamar 2026-2.xlsx` / `IQF`.

Observed evidence:
- 116 boxes.
- 2,372 kg total.
- no explicit lot identifier in the source sheet.

Operational interpretation:
- packing weight is known; lot lineage is not.

Expected OS behavior:
- maintain box/date/weight evidence;
- mark lot linkage as unresolved;
- do not infer lot from date alone;
- escalate only the missing identity relation for human validation.

Confidence: `observed` for missing lot; linkage remains `needs-human-validation`.

### PV-006 — Supplier reconciliation evidence

Source: `planilla de produccion 2026.xlsx` support sheets `Isla Guafo`, `Diaz termiando`, `Cesar`.

Observed evidence:
- supplier-specific guide blocks exist with guide kg, accepted/destined kg, grade composition and RGA/destination evidence.
- `Diaz termiando` also preserves free-text debt/reconciliation notes.

Operational interpretation:
- these are supporting reconciliation sources, not a second production ledger.

Expected OS behavior:
- link support rows to main production only when guide/supplier/date/lot context is deterministic;
- preserve unmatched support evidence separately;
- never double-count production.

Confidence: `observed` for support-sheet content; relation confidence varies per match.

### PV-007 — Supplier alias fragmentation

Source: `planilla de produccion 2026.xlsx`.

Observed evidence:
- supplier variants include `Patricio Diaz` / `Patrcio Diaz` and `Gladys Mansilla` / `Glady Mansilla`.
- zone and plant labels also contain case variants.

Operational interpretation:
- raw-string aggregation can create false supplier/location fragmentation.

Expected OS behavior:
- preserve raw label;
- use an explicit alias catalog for normalized analysis;
- require human approval before merging ambiguous identities.

Confidence: `observed` for variant labels; canonical identity is `needs-human-validation` until approved.

### PV-008 — Current-account non-transaction summary rows

Source: `CUENTA2.xlsx` / `CUENTA CORRIENTE`.

Observed evidence:
- rows 1017-1023 and 1025 contain numeric summary/reference values but no transaction date and no normal inflow/outflow transaction structure.

Operational interpretation:
- numeric presence alone does not make a transaction.

Expected OS behavior:
- retain as source/reference evidence;
- exclude from transaction counts and financial movement KPIs;
- never create settlement, credit or cash events from these rows.

Confidence: `observed`.

### PV-009 — Bank transfer staging and reconciliation

Source: `CUENTA2.xlsx` / `TRANSF RECIBIDAS`.

Observed evidence:
- 25 received-transfer rows.
- total CLP 80,211,983.
- source preserves date, bank, sender and amount.

Operational interpretation:
- these records are clean enough for deterministic staging, but not automatically equivalent to settlements.

Expected OS behavior:
- stage each transfer with immutable source lineage;
- propose a ledger/settlement link only when date + amount + sender and surrounding evidence produce a unique deterministic match;
- otherwise leave unmatched and escalate only when economically material.

Confidence: `observed` for transfer evidence; individual accounting match can be `derived` or `needs-human-validation`.

### PV-010 — Historical stock boundary

Sources:
- `CUENTA2.xlsx` / `STOCK FISICO ERIZOS`.
- `CUENTA2.xlsx` / `STOCK PULPO`.
- hidden `Stock fisico` in production workbook.

Observed evidence:
- stock evidence exists across grades/formats and historical periods.
- the production workbook hidden stock sheet includes 2021-2022 context.

Operational interpretation:
- these are historical/staged physical-stock records, not proof of current ERP-located inventory.

Expected OS behavior:
- label as `stock según planilla` / historical evidence;
- reconcile before any live inventory promotion;
- never create live stock movements from snapshots alone.

Confidence: `observed` for historical evidence; live equivalence is `needs-human-validation`.

### PV-011 — Purchase order economic evidence with unknown unit

Source: `OC N° 41 - 16-02 Erizo Chiloe (2).xlsx`.

Observed evidence:
- supplier context: José Mayorga / Chiloé.
- maquila-erizo line quantity 12,000 at CLP 700.
- net CLP 8,400,000.
- VAT CLP 1,596,000.
- total CLP 9,996,000.
- the quantity unit is not explicitly labeled.
- two different email spellings appear in the supplier block.

Operational interpretation:
- document economics are usable; quantity-unit semantics and canonical contact are unresolved.

Expected OS behavior:
- preserve document totals exactly;
- do not invent kg/units;
- flag unit and contact identity for Pescamar confirmation.

Confidence: `observed` for document values; semantics `needs-human-validation`.

### PV-012 — Export invoice versus template separation

Source: `Factura Exp. Nº 2316 Lbs.xlsx`.

Observed evidence:
- `Invoice` records PACIFIC LIVE, LLC / Whole Fresh King Salmon Chinook / 35 cases / 1,513.942912 lb net / USD 8.30 per lb / FOB USD 12,565.7261696 / freight USD 2,346.6115136 / CFR USD 14,912.3376832 / New York.
- `Proforma` is a separate DELICIA CO., LTD / Tokyo template context.
- blank-input formulas in the template have blank cached values.

Operational interpretation:
- workbook-level grouping must not collapse separate commercial contexts into one sale.

Expected OS behavior:
- treat Invoice 2316 as documentary transaction evidence;
- treat Proforma as reference/template unless its own completed transaction evidence exists;
- blank formula result is unknown/blank, not zero sale value.

Confidence: `observed`.

## Acceptance matrix

A validation case passes only when the product can reproduce the expected behavior while preserving source lineage.

For each case record:
- case id;
- capability under test;
- deployed SHA;
- source file hash/version;
- source sheet/cell/row references;
- observed output;
- expected output;
- result: `PASS`, `PASS-WITH-OBSERVATIONS`, or `HOLD`;
- Pescamar reviewer;
- N3uralia reviewer;
- validation date;
- notes.

`PASS-WITH-OBSERVATIONS` and `HOLD` do not permit `validated-by-pescamar`.

## Capability mapping

- Yield Intelligence: PV-002, PV-003, PV-006.
- Supplier Intelligence: PV-002, PV-006, PV-007.
- Exception Engine: PV-001, PV-002, PV-003, PV-005, PV-008.
- Packing / Inventory Intelligence: PV-004, PV-005, PV-010.
- Margin / Finance Intelligence: PV-001, PV-008, PV-009, PV-011, PV-012.
- Seafood AI / Control Tower: must explain all material exceptions above with evidence and confidence, without promoting historical evidence to live state.

## Development order from this dataset

1. Build deterministic validation checks for PV-001, PV-002, PV-003, PV-005 and PV-008.
2. Build historical chain reconstruction for PV-004 and PV-006.
3. Add transfer reconciliation suggestions for PV-009 without automatic settlement writes.
4. Expose historical stock boundary for PV-010.
5. Add documentary economic lineage for PV-011 and PV-012.
6. Feed only validated/eligible derived outputs into Supplier Intelligence, Yield Intelligence, Margin per Lot and Exception Engine.
7. Run the same reasoning contract in live UAT before any capability receives `validated-by-pescamar`.

## Explicit non-goals

- no source workbook mutation;
- no invented lot IDs;
- no automatic date repair;
- no historical-to-live promotion;
- no automatic accounting classification where semantics are not approved;
- no supplier ranking across incomparable species/process/period populations;
- no predictive claim without a Pescamar-approved baseline;
- no regulatory approval inference from internal state.
