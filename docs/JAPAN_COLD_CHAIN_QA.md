# Japan Cold Chain QA

Date: 2026-09-05

## Finding

The existing Japan release logic accepted a lot with all manual Japan gates approved even when the lot had no linked cold-chain run. On the isolated QA branch, `japan_reception_is_released(...)` returned `true` while both linked cold loads and cold runs were `0`.

## Fix prepared

Migration `045_japan_cold_chain_fail_closed.sql` adds a computed cold-chain gate. Japan release now requires a linked cold run that is completed and released, has at least one observation, has zero recorded deviations, contains observed min/max temperatures, and remains inside the configured allowed temperature range.

The application Japan release view also gains a computed `Cadena de frío operacional` gate while retaining the manual documentary cold-chain release requirement.

## QA on prepared Neon migration branch

A synthetic Japan lot was created with complete process, Grade A, accepted color, passed X-ray, validated label, all 10 manual Japan gates, and a valid completed cold run.

Results:

1. Valid completed cold run inside range, released, zero deviations -> computed cold gate PASS and Japan release PASS.
2. Same cold run with `deviation_count=1` -> computed cold gate FAIL and Japan release FAIL.
3. Same cold load with `released_at=NULL` -> computed cold gate FAIL and Japan release FAIL.
4. Same cold run with observed maximum temperature outside configured maximum -> computed cold gate FAIL and Japan release FAIL.

## State

The migration has been prepared and tested on an isolated Neon branch. It has not yet been promoted to production.
