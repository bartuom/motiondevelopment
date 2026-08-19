# FXDeck — Canonical Project State

> Current execution status only. The canonical implementation roadmap is [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).

## Current state — 2026-08-19

- **Milestone:** **P4.0 — Web2D V1 Controlled Reset**.
- **Execution status:** planning complete; implementation reset not started yet.
- **Canonical plan:** [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).
- **Legacy prototype baseline:** **P3.15.0** at commit `26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`.
- **Canonical Runtime Lab today:** `site/heavy-impact-lab.html` — still legacy P3.15 until Session 1 rewires it.
- **Production Web2D backend decision:** tsParticles only.
- **Particlr decision:** authoring/reference source only; no default production runtime dependency.
- **3D decision:** architectural boundary only; zero 3D implementation in Web2D V1.

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

Keep them recoverable through Git history while the Web2D V1 path replaces them.

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

### Session 0 — Safety checkpoint

- record/retain the P3.15 baseline,
- optionally tag/branch the prototype before destructive cleanup.

### Session 1 — Architecture Reset

- one authoritative boot path,
- one tsParticles engine/container,
- no iframe runtime,
- capabilities registered before container creation,
- begin retiring effect-specific bridge/build-label plumbing,
- no new showcase effect.

### Session 2 — Schema + Compiler + Validator

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

- **P4.0 plan reset:** created canonical `FXDECK_PLAN.md` for Web2D V1.
- **P4.0 plan reset:** tsParticles retained as the sole Web2D production backend.
- **P4.0 plan reset:** Particlr moved to authoring/reference role.
- **P4.0 plan reset:** schema/compiler/validator becomes the next framework milestone before new hero effects.
- **P3.15.0:** final legacy prototype baseline before the controlled reset.
