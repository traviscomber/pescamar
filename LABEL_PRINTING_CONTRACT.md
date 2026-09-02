# Pescamar — Physical Label Printing Contract

## Scope

This control connects live `packing_units` to already validated `product_labels`, versioned `label_templates`, registered physical printer devices and the auditable `label_print_jobs` queue.

## Invariants

1. A physical print request starts from an existing live packing unit; it never creates or reinterprets a lot.
2. The label must belong to the same reception and have `status = validated` before it can enter the queue.
3. Species, grade and net weight remain consistency gates when those values exist on both the packing unit and label.
4. The template must be active and either global or scoped to the packing unit plant.
5. The printer must be an active `printer` device on an active station in the same plant.
6. Each requested physical action uses a new idempotency key. Reusing a key for different print intent is rejected.
7. New requests and reprints enter as `queued`. The UI and API never claim a job was physically printed without a future printer adapter confirming it.
8. Reprint can only originate from a job already confirmed as `printed` or `reprinted` and preserves `source_job_id` lineage.
9. `PLANT_EXECUTION_WRITES_ENABLED=false` is an immediate kill switch for every print mutation.
10. No printer language or protocol is assumed. ZPL, EPL, TSPL, ESC/POS, PDF or proprietary adapters are implemented only after the real printer is identified.

## Operational sequence

`packing unit → validated label → template version → registered printer → queued print job → adapter sends → physical confirmation`

The current delivery ends at the auditable queue. `sent`, `printed`, `failed` and `reprinted` physical outcomes require a real adapter or explicitly audited device integration.
