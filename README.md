# Seafood Intelligence OS

> **Operational intelligence for seafood and aquaculture**

Seafood Intelligence OS is N3uralia's operating system for seafood operations. It connects physical product, operational events, quality evidence, inventory, cold chain, commercial outcomes and AI into one traceable system.

<p align="center"><strong>Source → Reception → Lot → Production → Quality → Inventory → Cold Chain → Dispatch → Commercial → Traceability → Intelligence</strong></p>

---

## Product thesis

Seafood operations are usually fragmented across plant software, spreadsheets, sensors, cameras, quality records, inventory systems, finance tools and messaging. The result is technically connected infrastructure without a single operational truth.

Seafood Intelligence OS provides the shared intelligence layer above those systems.

The product is designed around five layers:

1. **Operational Core** — reception, lots, production, quality, packing, inventory, cold chain, dispatch, suppliers, customers and commercial control.
2. **Seafood Event Graph** — canonical lineage across every physical and digital event affecting a lot.
3. **EdgeVision** — visual evidence for count, size, calibre, color, defects, classification, biomass and process control.
4. **Operational Intelligence** — yield, loss, quality, supplier performance, cost, margin, forecast, exceptions and recommendations.
5. **Seafood AI / Control Tower** — evidence-grounded answers and prioritized decisions: what happened, why, impact, evidence and next action.

The system is intentionally hardware- and vendor-neutral. Existing cameras, sensors, plant equipment, ERPs and external platforms should become data sources rather than reasons to fork the product.

---

## Canonical operating model

```text
FARM / CATCH / SUPPLIER
          │
          ▼
      RECEPTION
          │
          ▼
         LOT
          │
          ├────► production / transformation
          ├────► quality / laboratory
          ├────► EdgeVision evidence
          ├────► packing / pallet
          ├────► inventory / cold chain
          └────► cost / commercial state
          │
          ▼
       DISPATCH
          │
          ▼
       CUSTOMER
          │
          ▼
 TRACEABILITY + INTELLIGENCE
```

Every important event should retain its source, actor, timestamp, plant, lot identity and evidence chain. Missing information stays unknown until captured or reconciled; the system must not fabricate certainty.

---

## EdgeVision

EdgeVision is a native evidence layer of Seafood Intelligence OS, not a separate dashboard.

Target capabilities include:

- count;
- calibre;
- size;
- color;
- defect detection;
- classification / grading;
- biomass estimation;
- visual process control;
- anomaly detection.

A visual result should be attributable to a canonical operational event:

`lot → station → timestamp → image/hash → model → model version → measurement → confidence → operator override → decision`

This makes visual AI auditable and allows quality evidence to connect directly to yield, inventory, customer outcome and margin.

---

## Implementation 01 — Pescamar

**Pescamar is the first operational implementation and proving ground of Seafood Intelligence OS.** It is not the product boundary.

The current Pescamar instance already exercises the core pattern across:

- multi-plant reception and lot control;
- quality and production;
- inventory and physical location;
- packing, pallets and cold chain;
- commercial orders, dispatch and sales;
- transformation cost, credits and settlements;
- operational audit and stable operator identity;
- canonical historical evidence and live operation;
- Pescamar IA;
- operational Control Tower;
- desktop and mobile release gates.

Pescamar remains a named tenant/implementation inside the broader Seafood Intelligence OS. Client-specific language, data, users and workflows remain isolated from the reusable product core.

The first productization slice now introduces a centralized product/implementation context in `src/product.ts`, presents **Seafood Intelligence OS** as the global shell and keeps **Implementation 01 · Pescamar** visible as the active operational tenant. Existing Pescamar routes, IDs, database contracts and canonical sources remain unchanged.

The rollout and productization plan is maintained in [`ROADMAP.md`](./ROADMAP.md). Pilot acceptance remains governed by [`PILOT_ACCEPTANCE.md`](./PILOT_ACCEPTANCE.md).

---

## Product principles

1. **The lot is the canonical physical object.** All transformation, evidence and commercial lineage must remain connected.
2. **Events are appendable and attributable.** Operational intelligence should be explainable from source evidence.
3. **Unknown is not zero.** Missing measurements are never silently converted into facts.
4. **Mass balance must reconcile.** Inputs, outputs, waste, yield and accepted product cannot silently diverge.
5. **AI must be evidence-grounded.** Recommendations should point back to the underlying events and records.
6. **EdgeVision is part of the operational graph.** A vision result without lot/process context is incomplete.
7. **Open integrations beat hardware lock-in.** Cameras, sensors, PLCs, ERPs and third-party systems should integrate through explicit contracts.
8. **Configuration before forks.** Plant, species and process differences should be represented as reusable configuration wherever possible.
9. **Cross-species by design.** The core should support wild catch, aquaculture and processing across seafood categories.
10. **Control by exception.** Normal operations should flow; people should be pulled in when risk, uncertainty or policy requires a decision.
