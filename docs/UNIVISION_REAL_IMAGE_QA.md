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
