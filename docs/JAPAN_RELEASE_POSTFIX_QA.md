# Japan Release Post-Fix QA

Date: 2026-09-05

Scope: end-to-end validation of the Japan dispatch fail-closed rule after applying migration `043_japan_dispatch_fail_closed.sql` to Neon production.

## Environment

Validation ran on an isolated Neon branch cloned from production HEAD after the migration was applied. Production business rows were not modified.

## Synthetic lot

The QA lot included:

- Sea urchin reception and canonical process run.
- Grade A.
- Color accepted.
- X-ray passed.
- Process stages validated through freezing.
- Product label validated with documentary evidence.
- No regulatory hold.
- Japan destination: `Tokyo, Japan`.

## Result

PASS.

1. With 9 of 10 Japan manual release gates approved, insertion of a confirmed Japan dispatch was rejected by PostgreSQL with `lot_dispatches_japan_release_check`.
2. After approving the tenth gate, `final_quality_release`, the same confirmed Japan dispatch was accepted.
3. The accepted test dispatch received a normal dispatch number, proving the positive path remains functional after fail-closed enforcement.

## Invariant proven

A confirmed Japan dispatch now requires the Japan release graph to be complete at database level. A missing manual Japan gate blocks the dispatch even if application code attempts to write it directly. When the full release state is complete, the dispatch is allowed.

QA branch: `qa-japan-release-postfix`.
