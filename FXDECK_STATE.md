# FXDeck — Canonical Project State

> Current execution status only. The canonical implementation roadmap is [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).

## Current state — 2026-08-19

- **Milestone:** **P4.0 — Web2D V1 Controlled Reset**.
- **Execution status:** **Session 0 complete; Session 1 is next**.
- **Canonical plan:** [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).
- **Legacy prototype baseline:** **P3.15.0** at commit `26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`.
- **Legacy recovery branch:** `legacy-p3.15` → `26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`.
- **Reset-start checkpoint branch:** `checkpoint-web2d-v1-reset-start` → `9f4217d992c4cf0a6a732df28952a18557eb7439`.
- **Canonical Runtime Lab today:** `site/heavy-impact-lab.html` — still legacy P3.15 until Session 1 rewires it.
- **Production Web2D backend decision:** tsParticles only.
- **Particlr decision:** authoring/reference source only; no default production runtime dependency.
- **3D decision:** architectural boundary only; zero 3D implementation in Web2D V1.

## Session 0 — Safety checkpoint

**Status: PASS.**

The controlled reset is now reversible before any destructive cleanup begins.

Recovery points:

```text
legacy-p3.15
→ exact final P3.15 prototype baseline
→ 26b4622e68f4a2457dda6b84bf55c0fdb9a7112c

checkpoint-web2d-v1-reset-start
→ repository immediately before Session 1 implementation
→ includes the canonical Web2D V1 plan/state reset
→ 9f4217d992c4cf0a6a732df28952a18557eb7439
```

No runtime, visual, asset, or deployed-page behavior was changed during Session 0.

### Recovery rule

Do not copy legacy bridge/runtime code back into the Web2D V1 path merely because it is available. The recovery branches are safety snapshots, not alternate sources of truth. `main` + `FXDECK_PLAN.md` remain canonical.

## Product direction

FXDeck is a lightweight, AI-friendly gameplay VFX framework for 2D web games.

```text
GAME
  ↓
FXDeck API
  ↓
FXDeck Core
  ↓
FXDeck Effect Schema
  ↓
Web2D Compiler
  ↓
TsParticlesAdapter
  ↓
custom modular tsParticles build
  ↓
one persistent transparent canvas/container
```

The normal authoring unit must become **effect data + reusable assets**, not effect-specific JavaScript.

Primary architecture KPI:

> A new gameplay effect should be approximately 90% effect data + reusable assets. If a normal effect requires another `*-runtime-bridge.js`, the architecture is failing.

## What is frozen / legacy

Do not continue P3.x visual iteration as the main development path.

Legacy/prototype material includes:

- current effect-specific runtime bridges,
- P3 build-label synchronization hacks,
- rejected Explosion V2 / Magic Burst V2 visual experiments,
- old iframe/source-runtime calibration work,
- Football Card showcase direction.

These are now explicitly recoverable from `legacy-p3.15` and Git history while the Web2D V1 path replaces them.

## What survives the reset

- FXDeck runtime/lifecycle concepts,
- registry and instance ownership where useful,
- coordinate adapter concept,
- one persistent tsParticles container,
- performance/mobile baseline,
- reference/provenance material,
- Runtime Lab as a debug/authoring shell,
- quality/backpressure logic only where it stays isolated from effect authoring.

## Immediate next work

### Session 1 — Architecture Reset

Goal: one clean authoritative Web2D runtime path.

Required outcomes:

```text
1 FXDeck runtime
1 tsParticles engine
1 persistent transparent container
0 iframe runtimes
0 second particle containers for reference effects
```

Tasks:

- remove Particlr/iframe runtime from the canonical path,
- collapse boot to one authoritative initializer,
- register tsParticles capabilities before container creation,
- preserve one persistent transparent tsParticles container,
- remove/neutralize build-label mutation hacks,
- isolate old effect bridges pending schema migration,
- document the Web2D backend boundary,
- verify repeated play/stop does not grow container/listener count,
- author **no new showcase effect** in this session.

### Session 2 — Schema + Compiler + Validator

Only after Session 1 passes:

- `effect.schema.json`,
- structural + semantic validation,
- FXDeck V1 → tsParticles compiler,
- synthetic burst/smoke/rain definitions with zero effect-specific runtime JS.

Only after Session 2 do we resume visual authoring.

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

This remains a reference baseline for later Web2D V1 overhead/performance comparisons.

## Changelog

- **P4.0 / Session 0:** created `legacy-p3.15` at the exact P3.15 prototype baseline.
- **P4.0 / Session 0:** created `checkpoint-web2d-v1-reset-start` at the pre-implementation reset state.
- **P4.0 / Session 0:** verified both recovery branches point at their intended commits; no runtime behavior changed.
- **P4.0 plan reset:** created canonical `FXDECK_PLAN.md` for Web2D V1.
- **P4.0 plan reset:** tsParticles retained as the sole Web2D production backend.
- **P4.0 plan reset:** Particlr moved to authoring/reference role.
- **P4.0 plan reset:** schema/compiler/validator becomes the next framework milestone before new hero effects.
- **P3.15.0:** final legacy prototype baseline before the controlled reset.
