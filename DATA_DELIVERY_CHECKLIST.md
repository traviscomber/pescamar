# Pescamar — Next Data Delivery Checklist

Use this checklist when Pescamar sends the next real data package.

## Package metadata

- [ ] Original filename preserved.
- [ ] Sender / responsible person identified.
- [ ] Export date and time recorded.
- [ ] Source system or operational process identified.
- [ ] Covered plant(s) identified.
- [ ] Covered date range identified.
- [ ] Currency and weight units confirmed.
- [ ] Whether the file replaces an earlier source or extends it is confirmed.

## File integrity

- [ ] SHA-256 calculated before any transformation.
- [ ] File opens successfully as XLSX.
- [ ] Required worksheets are present.
- [ ] Hidden sheets and formulas are inventoried.
- [ ] No manual cleanup is performed on the original file.

## Preflight

- [ ] `/api/canonical-preflight` returns `ok=true`.
- [ ] `structureOk=true` or every reported issue is explicitly reviewed.
- [ ] Recognized row counts are plausible for the declared period.
- [ ] Duplicate box-number warnings are reviewed when packing is supplied.
- [ ] A new hash is treated as unapproved until canonical registration is reviewed.

## Canonical intake

- [ ] Grain of every relevant worksheet defined.
- [ ] Raw values preserved.
- [ ] Aliases/normalization kept separate from source values.
- [ ] Dates, identifiers, formulas, units and sign conventions audited.
- [ ] Ambiguous rows receive quality flags rather than silent corrections.
- [ ] Target module and canonical object identified.

## Registration and staging

- [ ] Name + SHA-256 + source kind + period + expected count explicitly approved.
- [ ] Source registration is committed through a controlled change.
- [ ] `canonical-upload` is executed only after registration.
- [ ] Observed `sourceRecordCount` reconciles with the audit.
- [ ] Replay does not overwrite existing lineage.
- [ ] `/api/canonical-status` is consistent.
- [ ] `/api/canonical-connections` is consistent.
- [ ] Production review queue is checked when applicable.

## Release gate

- [ ] No canonical import created live receptions, inventory movements, sales, liquidations or payments by inference.
- [ ] No unexplained row-count difference remains.
- [ ] No unresolved P0/P1 exists in intake or staging.
- [ ] Human owner signs off on ambiguous operational meaning before any promotion to live objects.
