# Seafood Intelligence OS

> **Run seafood operations with fewer manual tasks and clearer decisions.**

Seafood Intelligence OS is N3uralia's operating system for seafood operations. The product is sold around a simple operating model: capture information once, confirm what is physical, automate repetitive work, escalate exceptions and decide with evidence.

<p align="center"><strong>Reception → Production → Packing → Inventory & Cold Chain → Commercial → Decision</strong></p>

---

## What the customer buys

The customer is not buying a list of software modules. The customer is buying a simpler way to operate.

Seafood Intelligence OS is designed so each stage answers three questions:

1. **What does the system prepare or automate?**
2. **What must a person physically confirm or execute?**
3. **When does a manager actually need to intervene?**

The target operating model is deliberately small:

- one generalist plant operator for physical execution and confirmation;
- one commercial / administrative owner for commitments and documents;
- one manager or supervisor who intervenes by exception;
- technical administration as non-daily support.

Canonical commercial principle:

> **Capture once → confirm the physical → automate the repetitive → escalate exceptions → decide with evidence.**

Spanish:

> **Capturar una vez → confirmar lo físico → automatizar lo repetitivo → escalar excepciones → decidir con evidencia.**

The live reference for this operating model is the Pescamar implementation at `/<locale>/modulos?view=modelo-operativo`.

---

## Operating flow

### 01 — Reception

The system prepares supplier, lot and context where evidence allows it. The operator confirms documents when needed and records physical measurements. Management appears only when there is a meaningful block or exception.

### 02 — Production

The system keeps sequence and traceability. The operator executes the process and confirms the observed result. Management intervenes on material exceptions.

### 03 — Packing

The system proposes the next context and carries lot identity forward. The operator confirms the physical package, lot and weight.

### 04 — Inventory and cold chain

Stock and traceability are consequences of the operational flow, not a second administrative entry. A person intervenes only when a physical location, temperature or block requires confirmation.

### 05 — Commercial and dispatch

The system carries lot and inventory context into commitments and dispatch. Commercial users confirm deliberate economic commitments such as reservation, sale documents and material financial decisions.

### 06 — Decision and improvement

The system prioritizes what requires attention. Managers decide with the evidence already accumulated by the operation.

---

## Product thesis

Seafood operations are commonly fragmented across spreadsheets, plant software, quality records, inventory tools, cameras, sensors, finance systems and messaging. The problem is not the absence of software; it is repeated manual work and disconnected decisions.

Seafood Intelligence OS reduces that fragmentation by preserving one operational context from reception through commercial outcome.

The underlying technical architecture remains:

1. **Operational Core** — reception, lots, production, quality, packing, inventory, cold chain, dispatch, suppliers, customers and commercial control.
2. **Seafood Event Graph** — lineage across physical and digital events affecting a lot.
3. **EdgeVision** — visual evidence for count, size, calibre, color, defects, classification, biomass and process control.
4. **Operational Intelligence** — yield, loss, quality, supplier performance, cost, margin, exceptions and recommendations.
5. **Seafood AI / Control Tower** — evidence-grounded answers and prioritized actions.

These layers support the operating model; they are not the primary commercial story.

The system is intentionally hardware- and vendor-neutral. Existing cameras, sensors, plant equipment, ERPs and external platforms can become data sources rather than reasons to fork the product.

---

## Canonical operating model

```text
SOURCE / SUPPLIER
       │
       ▼
   RECEPTION
       │
       ▼
      LOT
       │
       ▼
  PRODUCTION
       │
       ▼
    PACKING
       │
       ▼
INVENTORY / COLD
       │
       ▼
COMMERCIAL / DISPATCH
       │
       ▼
DECISION / IMPROVEMENT
```

Every important event should retain its source, actor, timestamp, plant, lot identity and evidence chain. Missing information stays unknown until captured or reconciled; the system must not fabricate certainty.

---

## EdgeVision

EdgeVision is a native evidence layer of Seafood Intelligence OS, not the commercial proposition by itself.

Target capabilities include count, calibre, size, color, defect detection, classification, biomass estimation, visual process control and anomaly detection.

A visual result should be attributable to an operational event:

`lot → station → timestamp → image/hash → model → model version → measurement → confidence → operator review → decision`

Quality remains the human authority where the process requires human approval.

---

## Implementation 01 — Pescamar

**Pescamar is the first operational implementation of Seafood Intelligence OS.**

The current Pescamar instance exercises the operating model across:

- multi-plant reception and lot control;
- quality and production;
- packing, inventory and cold chain;
- commercial orders, dispatch and sales;
- transformation cost, credits and settlements;
- operational audit and operator identity;
- historical evidence separated from new operation;
- Seafood AI and prioritized operational attention.

Pescamar remains a named implementation inside the broader Seafood Intelligence OS. Client-specific data, users and workflows remain isolated from the reusable product core.

The rollout and productization plan is maintained in [`ROADMAP.md`](./ROADMAP.md). Pilot acceptance remains governed by [`PILOT_ACCEPTANCE.md`](./PILOT_ACCEPTANCE.md).

---

## Product principles

1. **Capture once.** Do not create repeated administrative entry when context can be inherited.
2. **Confirm the physical.** Measurements and physical execution remain explicit human responsibilities unless there is real trusted instrumentation.
3. **Automate the repetitive.** The system should prepare context, calculate consequences and carry information forward.
4. **Escalate exceptions.** Managers should not be part of every normal step.
5. **Decide with evidence.** Important decisions must point back to the underlying operation and source records.
6. **Unknown is not zero.** Missing measurements are never silently converted into facts.
7. **Mass balance must reconcile.** Inputs, outputs, waste and accepted product cannot silently diverge.
8. **Open integrations beat hardware lock-in.** Existing cameras, sensors, equipment and systems should integrate through explicit contracts.
9. **Configuration before forks.** Plant, species and process differences should be reusable configuration wherever possible.
10. **The lot preserves continuity.** Transformation, evidence, inventory and commercial outcome remain connected to the physical product.
