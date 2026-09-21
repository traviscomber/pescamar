# Uni Vision real-image QA

This QA uses an external real product photograph and never writes synthetic operational facts.

## Reference image

- Source: Japan Ministry of Agriculture, Forestry and Fisheries (MAFF)
- Product page: `https://www.maff.go.jp/e/policies/intel/gi_act/register/s135.html`
- Image: `https://www.maff.go.jp/j/shokusan/gi_act/register/0135/img/0135_productImg.jpg`
- QA role: external visual fixture only; not a Pescamar reception, lot, quality approval, regulatory record or live inventory fact.

## Procedure

1. Download the MAFF image locally.
2. Open a sea-urchin process run and Uni Vision Station.
3. Select `Usar foto` and choose the untouched MAFF JPEG.
4. Inspect the segmentation preview before saving anything.
5. Do not create a Grade reference from this image. It is not a Pescamar-approved plant reference.

## Expected safe result

The mixed scene contains extracted uni plus whole sea urchins, a basket/tray and green garnish. Uni Vision should prefer the focused extracted-roe mask and reject most dark shells/spines, green garnish and neutral background.

For the current reference JPEG (960 x 720), an implementation-equivalent pixel pass produces approximately:

- focused usable ratio: `0.17`
- mean RGB: `203 / 139 / 71`
- mean LAB: `L* 63.1 / a* 18.0 / b* 45.5`
- LAB dispersion: `13.8`
- segmentation confidence: `good`

Treat these as regression bands, not product specifications. JPEG decoding, browser scaling and future generic segmentation improvements may move the values. A practical QA band is:

- usable ratio: `0.10–0.25`
- L*: `55–72`
- a*: `10–27`
- b*: `35–58`
- confidence: `good`

## Mandatory interpretation boundary

PASS means the station isolates enough warm extracted product to produce stable color evidence. It does **not** mean:

- Grade A–E is known,
- species is proven,
- origin is proven,
- quality is approved,
- product is safe,
- weight or temperature is known,
- the image is a live Pescamar reception.

Without a real plant reference approved by Quality, `suggested_grade` must remain absent. Any final grade or color decision remains human-confirmed.

## Dataset intake procedure (predictive path scaffolding)

When real plant capture batches arrive for the six planned capabilities (`count`, `calibre`, `size`, `defects`, `biomass`, `anomaly`), intake goes through the admin section **Lotes de dataset EdgeVision** on `/uni`, backed by migration `059_edgevision_dataset_batches`:

1. **Register** the batch: plant, capability, source label, capture window, image count, operator-confirmed labels, external storage reference (blobs stay in object storage; the database stores metadata only).
2. **QA reviews** the batch and sets `qa_status` with notes (validating requires notes ≥ 10 chars). Human QA remains the decision authority; Vision output stays derived evidence.
3. **Evidence thresholds** per capability live in `api/_edgevision-baseline.ts` (`baselineEvidenceRequirements`). A validated batch that meets them can be promoted, which records provenance only.
4. **The predictive boundary stays hard**: promotion never enables a model or metric. `/api/edgevision-baseline` answers `409` with the policy explanation until a validated batch meets the thresholds, and `predictiveBaselineAvailable` remains `false` until Grade A Gate 5 and Gate 7 are executed with real Pescamar sign-off (see the appendix «Cómo promover un dataset a línea de base validada» in `docs/SEAFOOD-GRADE-A.md`).

CI pins this behaviour: `scripts/edgevision-qa-smoke.mjs` (step «EdgeVision QA gate») and the browser spec `tests/edgevision-datasets.spec.ts`.
