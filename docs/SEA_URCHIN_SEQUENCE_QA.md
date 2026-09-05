# Sea Urchin Sequence QA

Date: 2026-09-05

Scope: migration `044_sea_urchin_sequence_fail_closed.sql` on Neon.

## Result

PASS on an isolated Neon branch created from production HEAD.

Validated cases:

1. Attempting to mark `blanching` as `ok` while `pinching` remained `pending` was rejected by `sea_urchin_stage_previous_pass_fk`.
2. After validating `pinching`, validating `blanching` succeeded.
3. Attempting to promote a run to `ready_for_packing` with Grade A, Color accepted and X-ray passed while downstream process stages remained pending was rejected by `sea_urchin_run_terminal_stage_fk`.
4. After validating stages sequentially through `freezing`, promotion to `ready_for_packing` succeeded.
5. Attempting to promote from `ready_for_packing` to `released` while `packing` remained pending was rejected by `sea_urchin_run_terminal_stage_fk`.
6. After validating `packing`, transitions to `released` and `closed` succeeded.

## Invariant proven

The database now fails closed. UI or API code cannot skip a prior sea-urchin stage or release a run before its required terminal stage and classification gates are satisfied.

Synthetic QA data exists only on the isolated branch `qa-sea-urchin-044`; production business rows were not modified by the test.
