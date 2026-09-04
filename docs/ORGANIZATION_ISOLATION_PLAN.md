# Seafood Intelligence OS — Organization Isolation Plan

Status: **design only — no migration applied**  
Implementation 01: **Pescamar**  
Current isolation mode: `single_organization_legacy`

## 1. Why this exists

Seafood Intelligence OS now has an explicit organization context in auth, product configuration, the Seafood Event Graph and EdgeVision adapters. That is a product boundary, not yet a database isolation boundary.

Implementation 02 must not be enabled on the same operational database until tenant ownership is persisted, queries/writes are scoped and cross-organization negative tests pass.

## 2. Current verified legacy shape

A read-only schema inspection on the current Neon project confirmed that the following operational/authentication tables do not currently expose an `organization_id` column:

- `operators`
- `operator_sessions`
- `parties`
- `receptions`
- `reception_evidence`
- `lot_events`
- `inventory_movements`
- `sales_orders`
- `sales_order_allocations`
- `lot_dispatches`
- `lot_sales`
- `sea_urchin_process_runs`
- `sea_urchin_color_captures`

This list is the inspected critical path, not a claim that every table in the database has already been exhaustively classified.

Current application behavior therefore remains intentionally labeled `single_organization_legacy`.

## 3. Target boundary

Every authenticated request must resolve this chain before touching tenant-owned data:

`session → organization membership → organization → allowed sites → role → resource`

Rules:

1. Organization is derived from authenticated server context, never trusted from request body/query alone.
2. Client organization headers are assertions that must match authenticated context, not tenant selectors with authority.
3. Every tenant-owned root row has explicit `organization_id`.
4. Child rows either carry `organization_id` directly or have an enforced parent path that cannot cross organizations. For operational simplicity and auditability, direct ownership is preferred on high-volume/query-critical tables.
5. Human role and site scope are evaluated inside the resolved organization.
6. Public/business identifiers are unique inside an organization unless there is a documented global reason.
7. Background jobs, imports, AI tools and webhooks use the same organization boundary as interactive requests.
8. Unknown organization must fail closed.

## 4. Proposed schema sequence

No step below should be applied to production without explicit migration authorization and rollback evidence.

### Phase A — organization roots

Introduce:

- `organizations`
  - `id`
  - `slug`
  - `legal_name`
  - `display_name`
  - `active`
  - timestamps
- `organization_memberships`
  - `organization_id`
  - `operator_id`
  - `role`
  - `active`
  - timestamps
- optional `organization_sites` if site ownership cannot be safely represented by the existing plant model.

Seed exactly one initial organization: `pescamar`.

### Phase B — ownership columns

Add nullable `organization_id` first to critical tenant-owned tables, backfill existing Pescamar rows deterministically, verify counts, then enforce `NOT NULL` + foreign keys.

Priority order:

1. Identity / master data: `operators`, `parties`, site/plant ownership.
2. Operational roots: `receptions`, `sales_orders`, process runs.
3. Operational children: evidence, lot events, inventory movements, allocations, dispatches, sales, vision captures.
4. Audit/derived/support tables after their ownership path is classified.

No row should receive an organization by inference from free text.

### Phase C — scoped uniqueness

Review every uniqueness constraint and identifier generator.

Examples:

- reception number: `(organization_id, reception_number)` if numbering is tenant-local;
- order number: `(organization_id, order_number)` if numbering is tenant-local;
- external source keys: `(organization_id, source_system, external_id)`;
- integration idempotency: `(organization_id, adapter_id, external_event_id)`.

Global UUID primary keys can remain global identifiers.

### Phase D — query/write enforcement

Create one server-side organization access primitive and migrate endpoints by domain.

Required behavior:

- reads always predicate by authenticated `organization_id`;
- inserts stamp authenticated `organization_id` server-side;
- updates/deletes require both row identity and organization ownership;
- joins include ownership-safe parent paths;
- admin means administrator **inside the organization**, not bypass-all-tenants;
- cron/import/background execution requires an explicit organization context.

Do not scatter independent tenant parsing logic across endpoints.

### Phase E — defense in depth

After explicit application scoping is complete and verified, evaluate PostgreSQL RLS as an additional barrier.

RLS must only be enabled with a serverless-safe strategy for transaction/request organization context. Connection/session state must never leak across pooled requests.

Application predicates remain required even if RLS is added.

## 5. Data migration contract

For each table migrated:

1. capture pre-migration row count;
2. add nullable ownership column;
3. backfill only from deterministic ownership evidence;
4. assert zero unowned rows before `NOT NULL`;
5. assert no row points to an unexpected organization;
6. add FK/indexes;
7. update application reads;
8. update application writes;
9. run same-organization regression tests;
10. run cross-organization denial tests;
11. record rollback procedure.

If ownership cannot be determined, migration stops. Unknown is not silently assigned.

## 6. Cross-organization negative test matrix

Before switching the isolation mode to `organization_scoped`, create a synthetic Implementation 02 in a non-production database/branch and prove:

- Pescamar user cannot read Implementation 02 reception by UUID.
- Pescamar admin cannot list Implementation 02 rows.
- Implementation 02 user cannot read Pescamar lot lineage.
- A forged `x-seafood-organization-id` cannot change session ownership.
- Search/list endpoints do not leak counts or names across organizations.
- Commercial/finance endpoints preserve both organization and role boundaries.
- EdgeVision evidence cannot attach to a lot from another organization.
- Integration idempotency keys are organization-scoped.
- Imports cannot resolve a source/party/lot in another organization.
- AI retrieval cannot cite or summarize evidence from another organization.
- audit/observability data is tenant-scoped.
- cron/background jobs cannot run without explicit organization context.

## 7. AI and Event Graph implications

`organizationId` is mandatory provenance, not presentation metadata.

Seafood AI retrieval must filter organization before semantic/search/ranking operations. Post-filtering results after retrieval is not sufficient.

Every `seafood.event.v1` event must inherit organization ownership from the authenticated/source context. External integration payloads may assert an organization only as part of a credential-bound adapter contract.

## 8. Integration implications

Before enabling generic REST/webhook/MQTT writers:

- adapter credentials belong to exactly one organization unless explicitly designed as a trusted multi-org system adapter;
- idempotency keys include organization scope;
- rejected/mismatched payloads fail closed and are auditable;
- adapter mapping cannot create cross-org foreign-key relationships;
- external events cannot choose arbitrary organization ownership.

## 9. Implementation 02 gate

Implementation 02 is allowed only when all are true:

- [ ] Organization and membership schema exists.
- [ ] Critical operational ownership is backfilled and `NOT NULL`.
- [ ] All tenant-owned read paths are organization-scoped.
- [ ] All tenant-owned write paths stamp/verify organization server-side.
- [ ] Site/role membership is organization-scoped.
- [ ] Event Graph is organization-scoped.
- [ ] EdgeVision evidence is organization-scoped.
- [ ] Imports/integrations are organization-scoped.
- [ ] Seafood AI retrieval is organization-scoped.
- [ ] Audit/observability/background jobs are organization-scoped.
- [ ] Cross-organization negative test matrix passes.
- [ ] Backup/rollback procedure is verified.
- [ ] Full Quality + authenticated browser QA passes.

Only after this gate should `isolationMode` change from `single_organization_legacy` to `organization_scoped`.

## 10. Explicit non-goals of the current foundation

The current branch does **not**:

- add `organization_id` to production tables;
- migrate or backfill production data;
- enable a second tenant;
- enable generic integration writers;
- claim RLS is active;
- change Pescamar operational IDs or historical source identities.

The immediate outcome is a safe architecture and test target for the later authorized database migration, not an implicit production migration.
