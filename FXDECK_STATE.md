# FXDeck — Canonical Project State

> Current execution status only. The canonical implementation roadmap is [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).

## Current state — 2026-08-19

- **Milestone:** **P4.1 — Web2D V1 Architecture Reset**.
- **Execution status:** **Session 1 implementation complete; browser acceptance gate is wired into the canonical lab and must pass before Session 2 starts.**
- **Canonical plan:** [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).
- **Canonical Runtime Lab:** `site/web2d-runtime-lab.html`.
- **Legacy Runtime Lab:** `site/heavy-impact-lab.html`.
- **Legacy prototype baseline:** **P3.15.0** at commit `26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`.
- **Legacy recovery branch:** `legacy-p3.15` → `26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`.
- **Reset-start checkpoint branch:** `checkpoint-web2d-v1-reset-start` → `9f4217d992c4cf0a6a732df28952a18557eb7439`.
- **Production Web2D backend decision:** tsParticles only.
- **Particlr decision:** authoring/reference source only; no default production runtime dependency.
- **3D decision:** architectural boundary only; zero 3D implementation in Web2D V1.

## Session 0 — Safety checkpoint

**Status: PASS.**

The reset is recoverable through the two branches above. No runtime behavior was changed in Session 0.

---

## Session 1 — Architecture Reset

### Implemented topology

```text
GAME / Runtime Lab
  ↓
1 authoritative Web2D bootstrap
  ↓
FXDeck Core
  ↓
Web2D backend boundary
  ↓
TsParticlesAdapter + DomSpriteAdapter
  ↓
1 tsParticles engine
  ↓
1 persistent transparent tsParticles container/canvas
```

Canonical implementation files:

- `site/web2d-runtime-lab.html`
- `site/web2d-runtime-lab.css`
- `site/js/web2d-runtime-lab.js`
- `site/fxdeck/web2d/create-web2d-runtime.js`
- `site/fxdeck/web2d/README.md`

### Canonical-path removals

The new P4 Runtime Lab does **not** load:

- Particlr runtime,
- reference/source iframe,
- standalone Ribbons/Fireworks containers,
- `runtime-main-authority.js`,
- `production-catalog-runtime-sync.js`,
- `critical-hit-runtime-bridge.js`,
- `magic-burst-runtime-bridge.js`,
- `fireball-runtime-bridge.js`,
- other P3 effect-specific bridge/bootstrap hacks.

Those legacy files remain recoverable through Git history and the legacy branch, but they are no longer canonical runtime dependencies.

### Baseline effects retained temporarily

Only three proven legacy definitions are registered directly in P4.1:

1. Heavy Impact v1
2. Explosion v1
3. Fireball v1

They exist only to validate runtime ownership/lifecycle while Session 2 builds the data-driven authoring path. No new showcase effect was authored in Session 1.

### Capability ordering

During P4.1 the full tsParticles bundle is intentionally still used for development convenience:

```text
loadFull(tsParticles)
  ↓
create FXDeck runtime
  ↓
create TsParticlesAdapter
  ↓
create persistent container
```

This guarantees capability registration before container creation. The full bundle is temporary; the measured custom/slim production build remains a later phase after real schema-driven effects establish the required capability set.

### Authoritative boot invariant

`site/js/web2d-runtime-lab.js` guards the page with one boot promise and one boot counter. A second authoritative bootstrap on the same page is treated as an error instead of silently adding duplicate runtime/listener state.

### Session 1 browser acceptance gate

The canonical lab automatically runs the gate once after boot and also exposes a manual button.

The gate verifies repeated off-stage Heavy Impact play/stop cycles against these invariants:

```text
boot count = 1
engine identity stable
persistent container identity stable
particle canvas count = 1
active instances = 0 after each stop
particles = 0 after each stop
emitters = 0 after each stop
burst groups = 0 after each stop
queued particles = 0 after each stop
```

Browser API:

```js
FXDeckLab.topology()
FXDeckLab.runSession1Gate()
```

Expected runtime log:

```text
PASS P4.1.0 BOOT: 1 FXDeck runtime / 1 tsParticles engine / 1 persistent container / 1 canvas / 3 baseline effects
PASS P4.1.0 SESSION 1 GATE: ...
```

Do not mark Session 1 fully accepted or start Session 2 until the deployed/browser gate returns `PASS`.

---

## What survives the reset

- FXDeck runtime/lifecycle concepts,
- registry and instance ownership,
- coordinate adapter concept,
- one persistent tsParticles container,
- existing scheduler/backpressure implementation where isolated,
- performance/mobile baseline,
- reference/provenance material,
- legacy prototype via recovery branch.

## What is now legacy-only

- effect-specific Runtime Lab bridges,
- global build-label MutationObserver/authority hacks,
- Particlr/iframe calibration runtime,
- rejected Explosion V2 / Magic Burst V2 showcase direction,
- Football Card direction,
- P3 multi-script canonical boot chain.

## Immediate next work — Session 2

Only after the Session 1 browser gate passes:

- create `effect.schema.json`,
- structural validation,
- semantic/budget validation,
- `compileWeb2D(effect)` mapping FXDeck schema to the Web2D backend,
- capability checks,
- three synthetic schema effects: burst, smoke/image burst, finite rain/rate emitter,
- zero effect-specific runtime JavaScript for those definitions.

Primary architecture KPI remains:

> A normal new effect should be approximately 90% effect data + reusable assets. If authoring a normal effect requires another `*-runtime-bridge.js`, the architecture is failing.

## Planned public V1 effect set

1. Dust Puff
2. Critical Hit
3. Goal Celebration
4. Explosion
5. Magic Burst
6. Rain / Environment

Visual quality is the release gate; six mediocre effects do not pass.

## P0 mobile baseline retained

Galaxy S20+ 5G:

```text
~150 simple particles   60.0 avg / 59.5 1% low
~400 simple particles   60.0 avg / 59.9 1% low
~800 simple particles   57.4 avg / 30.0 1% low
```

This remains the raw-tsParticles reference for later Web2D V1 overhead/performance comparisons.

## Changelog

- **P4.1 / Session 1:** created a new canonical Web2D Runtime Lab instead of continuing to mutate the P3 lab.
- **P4.1 / Session 1:** introduced `site/fxdeck/web2d/` as the explicit backend boundary.
- **P4.1 / Session 1:** canonical path now has one authoritative boot, one FXDeck runtime, one tsParticles engine and one persistent container.
- **P4.1 / Session 1:** P3 bridges/build-authority/reference-runtime scripts removed from the canonical page dependency graph.
- **P4.1 / Session 1:** added automatic/manual lifecycle topology gate.
- **P4.0 / Session 0:** created recovery branches and completed the safety checkpoint.
- **P3.15.0:** final legacy prototype baseline before the controlled reset.
