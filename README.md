# Pescamar · UniGrade

> **Seafood Quality OS**

Pescamar · UniGrade is a vertical operating system for seafood quality, receiving, mass balance and lot traceability. The first implementation focuses on Chilean sea urchin operations and the evidence required to connect plant-floor quality with commercial/export decisions.

<p align="center"><strong>Lot → Receiving → Grade → Yield → Quality → Traceability</strong></p>

---

## Product objective

Seafood quality is usually fragmented across handwritten receiving records, weight controls, visual grading, production spreadsheets and export documentation.

UniGrade brings those steps into one canonical lot model so that the same evidence can support:

- fair receiving and supplier settlement;
- gross/tare/drained/net weight separation;
- mass-balance and yield calculations;
- quality grading;
- color evidence and reference standards;
- exception review;
- lot-level traceability;
- management and buyer reporting.

---

## Operating model

```text
SUPPLIER / CATCH
       │
       ▼
    LOT INTAKE
       │
       ▼
Weight + source evidence
       │
       ▼
Processing / grading
       │
       ├────► quality evidence
       ├────► color evidence
       └────► yield / mass balance
       │
       ▼
Reviewed lot state
       │
       ▼
Packaging / commercial / export traceability
```

---

## Initial scope

- artisanal-fisher delivery registration;
- gross weight, tare, drained weight and accepted net weight;
- mass balance and gonad yield;
- lot identity and evidence chain;
- Pantone/CIELAB color reference workflow;
- review by exception rather than approval of every normal lot;
- buyer-facing quality traceability concepts.

The current repository is an **MVP / product exploration**. Simulated data is used where real plant evidence has not yet been connected and must never be presented as production fact.

---

## Product principles

1. **The lot is the canonical object.** Receiving, processing, quality and export evidence must remain connected.
2. **Mass balance must reconcile.** Inputs, outputs, waste and accepted product cannot silently diverge.
3. **Quality evidence stays attributable.** Visual/color conclusions must retain the underlying reference and review context.
4. **Unknown is not zero.** Missing measurements remain missing until captured or verified.
5. **Automation supports quality control.** It does not invent grades or replace required human authority.
6. **Exceptions deserve attention.** Normal, policy-safe cases should flow without unnecessary approval friction.

---

## Direction

The long-term product direction is a shared operational evidence layer from intake to export:

**physical product → measured evidence → quality decision → commercial outcome → traceability**
