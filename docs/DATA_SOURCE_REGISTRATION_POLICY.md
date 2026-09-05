# Canonical Source Registration Policy

A new workbook hash is not trusted merely because its filename matches a previous Pescamar source.

## Authority tuple

Every approved canonical source is identified by:

- original filename;
- SHA-256;
- source kind;
- covered period;
- expected record count;
- canonical flag;
- notes explaining provenance when needed.

## New version rule

When a client sends a newer export with the same filename:

1. run read-only preflight;
2. compare structure with the prior approved source;
3. audit the new period and row grain;
4. confirm whether it replaces, corrects or extends the prior source;
5. never mutate the prior source registration or prior lineage rows;
6. add a new approved registration only after review;
7. publish the new file to canonical staging using its own SHA-256 lineage.

## Prohibited shortcuts

Do not:

- trust filename alone;
- auto-register a hash after upload;
- overwrite an earlier source row;
- infer that a newer workbook supersedes history without explicit provenance;
- promote ambiguous rows to live operations;
- hide row-count differences with deduplication rules that are not evidenced by the source.

## Expected system behavior

`/api/canonical-preflight` may inspect an unregistered hash but must never write staging or live data.

`/api/canonical-upload` may publish only an exact approved filename + SHA-256 canonical source.

A source can be structurally valid yet remain unauthorized for publication. That is an expected HOLD state, not an application failure.
