# Japan Release End-to-End QA

Date: 2026-09-05

Scope: isolated Neon branch cloned from production HEAD.

## Critical finding

Production schema did not contain the database constraint `lot_dispatches_japan_release_check` from migration `043_japan_dispatch_fail_closed.sql`.

A synthetic sea-urchin lot was created only on the isolated QA branch with:

- complete sea-urchin process through packing,
- Grade A,
- Color accepted,
- X-ray passed,
- validated product label with evidence,
- no regulatory hold,
- 9 of the 10 Japan manual release gates approved.

With the production-cloned schema unchanged, a confirmed dispatch to `Tokyo, Japan` was accepted. This is a FAIL and proves the database fail-closed Japan gate was not active in production.

## Remediation verification on QA branch

Migration 043 logic was then applied on the isolated branch.

Validated cases:

1. 9/10 Japan gates + otherwise conforming lot -> confirmed Japan dispatch was rejected by `lot_dispatches_japan_release_check`.
2. Final gate `final_quality_release` added, bringing evidence to 10/10 -> confirmed Japan dispatch succeeded.

## Result

Japan export release logic itself behaves correctly when migration 043 is present.

Current release decision: HOLD until migration 043 is applied and verified on Neon production.

No production business rows were modified during this QA.