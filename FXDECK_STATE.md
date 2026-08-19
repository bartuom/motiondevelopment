# FXDeck — Canonical Project State

> Current execution status only. The canonical implementation roadmap is [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).

## Current state — 2026-08-19

- **Milestone:** **P4.4 — Hero Effects: Critical Hit + Goal Celebration**.
- **Execution status:** **Sessions 0–3 accepted. Session 4 implemented and awaiting deployed technical + visual acceptance.**
- **Canonical plan:** [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).
- **Canonical Runtime Lab:** `site/heavy-impact-lab.html`.
- **Production Web2D backend:** tsParticles only.
- **Particlr:** authoring/reference only; not a production runtime dependency.
- **3D:** architectural boundary only; zero implementation in Web2D V1.

## Hard UI preservation rule

Runtime, architecture, schema, optimization, backend or refactor work must **preserve the established Runtime Lab UI/UX and working controls by default**. Technical work is not permission to replace the interface, remove controls, reduce diagnostics, or promote a temporary harness to canonical UI.

P4.4 follows this rule. The existing Play / Debug / HUD / inspector / overlap / A/B / cancellation / stress interface is preserved.

---

## Session 0 — Safety checkpoint

**Status: PASS.**

Recovery points:

- `legacy-p3.15` → `26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`
- `checkpoint-web2d-v1-reset-start` → `9f4217d992c4cf0a6a732df28952a18557eb7439`

---

## Session 1 — Architecture Reset

**Status: PASS / browser accepted.**

```text
GAME / Runtime Lab
  ↓
1 authoritative Web2D bootstrap
  ↓
FXDeck Core
  ↓
Web2D backend boundary
  ↓
TsParticlesAdapter
  ↓
1 tsParticles engine
  ↓
1 persistent transparent tsParticles container/canvas
```

---

## Session 2 — Schema + Compiler + Validator

**Status: PASS / browser accepted.**

User-provided deployed P4.2.1 log confirmed the Schema V1 pipeline with three JSON regression effects, actionable validation failures, zero effect-specific runtime JS and one persistent canvas.

Canonical authoring path:

```text
FXDeck Effect JSON
  ↓
structural + semantic validation
  ↓
compileWeb2D(effect, params)
  ↓
generic schema runtime
  ↓
TsParticlesAdapter
  ↓
1 persistent container
```

---

## Session 3 — Asset Pipeline + Dust Puff

**Status: PASS / browser + visual accepted.**

User-provided deployed P4.3.0 log confirmed:

```text
PASS P4.3.0 SESSION 2 GATE: ... / 1 persistent canvas
P4.3.0 DUST PUFF: registered from JSON / 3 manifest assets / cold decode 3 / cache hits 0
PASS P4.3.0 SESSION 3 TECH GATE: manifest / 3 reusable alpha assets / cold decode 3 / warm cache hit 3 / dust-puff JSON / 0 effect bridge / 1 persistent canvas
```

The user then reviewed Dust Puff repeatedly in Play, described the visual result as good enough to continue, and explicitly moved the project to the next step. Session 3 visual gate is therefore accepted.

Retained Session 3 architecture:

- `site/fxdeck/assets/manifest.json`
- `site/fxdeck/core/asset-manager.js`
- manifest id → hydrated runtime asset flow
- cold/warm prefetch and decode cache
- `site/fxdeck/effects/dust-puff.json`
- semantic `motion.drag`
- zero Dust Puff runtime bridge

---

## Session 4 — Hero Effects: Critical Hit + Goal Celebration

### Implemented effects

#### Critical Hit

`site/fxdeck/effects/critical-hit.json`

Five data layers:

1. additive flare,
2. slash alpha,
3. directional image streaks,
4. additive sparks,
5. physical fragments.

Runtime semantics:

- `direction` drives inherited burst direction,
- `intensity` scales particle count/speed within validation clamps,
- optional `tint` replaces authored color on selected layers,
- short hero lifecycle,
- zero effect-specific runtime bridge.

#### Goal Celebration

`site/fxdeck/effects/goal-celebration.json`

Five data layers:

1. team-color flare,
2. radial streaks,
3. team-color confetti,
4. accent confetti,
5. delayed sparkles.

Runtime semantics:

- `intensity` scales hero density,
- optional `teamColor` replaces authored team-color layers,
- delayed sequencing remains pure Schema V1 data,
- zero effect-specific runtime bridge.

### Schema capability justified by hero effects

P4.4 extends constrained bindings with semantic color parameters:

```text
tint      → layer.color → replace
teamColor → layer.color → replace
```

Rules remain intentionally strict:

- color bindings only support `replace`,
- no arbitrary expressions,
- no general scripting,
- numeric bindings remain `intensity` only.

The Web2D compiler also now accepts the public semantic `direction` parameter directly (while retaining `directionDegrees` compatibility) and enables color replacement for white alpha image assets.

### Reusable P4.4 assets

Added FXDeck-original assets:

- `site/assets/vfx/critical-slash.svg`
- `site/assets/vfx/hero-streak.svg`
- `site/assets/vfx/hero-flare.svg`

They are registered in the existing manifest alongside the three Dust Puff assets.

### Ribbon decision

**Ribbon capability was not added.**

Goal Celebration currently achieves the intended hierarchy with flare + radial streak + confetti + sparkle layers. The Session 4 rule says ribbon is only allowed if the actual effect proves it is needed; this implementation does not require it.

### Integration modules

- `site/js/session4-hero-effects.js`
- `site/js/session4-hero-gate.js`

These modules load/register generic Schema V1 definitions and run regression gates. They contain no custom per-effect playback implementation.

### Session 4 technical gate

Expected deployed log:

```text
P4.4.0 HERO EFFECTS: Critical Hit + Goal Celebration registered from JSON / no effect-specific runtime bridge
P4.4.0 GOAL CAPABILITY DECISION: ribbon NOT added ...
PASS P4.4.0 SESSION 4 TECH GATE: Critical Hit + Goal Celebration / JSON-driven / direction + intensity + tint/teamColor / 0 effect bridges / ribbon not required / 1 persistent canvas
P4.4.0 SESSION 4 VISUAL GATE: USER REVIEW REQUIRED ...
```

The gate verifies:

- both effects resolve as schema-driven,
- five authored data layers each,
- semantic runtime direction compiles into the directional burst,
- Critical Hit `tint` binding compiles,
- Goal Celebration `teamColor` binding compiles,
- ribbon remains absent,
- hero assets are manifest-managed,
- both effects play/stop through the generic runtime,
- cleanup returns resources to zero,
- persistent container identity stays stable,
- canvas count remains exactly one.

### Session 4 acceptance status

**Technical browser gate: pending user-deployed run.**

**Visual gate: pending user review.**

Review both effects in the existing Play effect selector. If either is weak, tune effect JSON/assets/timing first. Do not add framework features unless the visual requirement proves the need.

---

## Immediate next work

1. Browser-check P4.4 technical gate.
2. User visually reviews Critical Hit and Goal Celebration.
3. Tune JSON/assets if required.
4. After acceptance proceed to Session 5 — Explosion + Magic Burst + Rain.

Primary architecture KPI remains:

> A normal new gameplay effect should be approximately 90% effect data + reusable assets. If it requires another effect-specific runtime bridge, the architecture is failing.

## Planned public V1 effect set

1. Dust Puff ✅
2. Critical Hit — P4.4 review
3. Goal Celebration — P4.4 review
4. Explosion
5. Magic Burst
6. Rain / Environment

## P0 mobile baseline retained

Galaxy S20+ 5G:

```text
~150 simple particles   60.0 avg / 59.5 1% low
~400 simple particles   60.0 avg / 59.9 1% low
~800 simple particles   57.4 avg / 30.0 1% low
```

## Changelog

- **P4.4 / Session 4:** Session 3 technical and visual gates accepted from user testing.
- **P4.4 / Session 4:** added Critical Hit and Goal Celebration as pure Schema V1 hero effects.
- **P4.4 / Session 4:** added constrained `tint` / `teamColor` → `color` replace bindings.
- **P4.4 / Session 4:** fixed public semantic `direction` compilation for schema effects.
- **P4.4 / Session 4:** added three original reusable hero alpha assets.
- **P4.4 / Session 4:** deliberately did not add ribbon capability because the Goal effect did not require it.
- **P4.4 / Session 4:** preserved the established Runtime Lab UI and existing diagnostics.
- **P4.3 / Session 3:** added manifest asset manager, Dust Puff, reusable dust alphas and semantic drag.
- **P4.2 / Session 2:** added strict Schema V1, validator, compiler and JSON regression fixtures.
- **P4.1 / Session 1:** browser topology/lifecycle gate accepted.
- **P4.0 / Session 0:** recovery branches and safety checkpoint completed.
