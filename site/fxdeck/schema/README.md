# FXDeck Effect Schema V1

Build: **P4.5.0 / Sessions 2–5**

This directory defines the AI-facing authoring contract for Web2D effects. Normal effects are data + reusable assets, not effect-specific JavaScript.

Pipeline:

```text
Effect JSON
  ↓
manifest hydration when assets are referenced by id
  ↓
validateEffectDefinition()
  ↓
semantic mobile budget checks
  ↓
compileWeb2D(effect, params)
  ↓
TsParticlesAdapter
  ↓
one persistent tsParticles container
```

## V1 scope

Supported now:

- particle layers only,
- burst and finite rate spawn,
- inherited or explicit 2D direction,
- per-layer semantic origin offset (`origin.x/y`), optionally rotated with gameplay direction,
- layer anchors:
  - `event` — normal gameplay position,
  - `stage-top-center` — environmental stage-relative source,
- optional percent emitter area through `spawn.area.widthPercent/heightPercent`,
- spread and speed ranges,
- optional gravity + drag,
- finite particle lifetime,
- two-point size/opacity over-life curves,
- circle / square / image shapes,
- constrained ribbon shape remains available when justified,
- normal / lighter blend,
- manifest-backed image assets,
- static random rotation,
- semantic sprite orientation:
  - `orientation.mode: "direction"`,
  - `orientation.mode: "motion"`,
- constrained numeric `intensity` bindings,
- constrained color replacement bindings:
  - `tint -> color`,
  - `teamColor -> color`.

Color bindings are deliberately restricted to `replace`. There is no color expression language or arbitrary runtime scripting.

## Capability provenance

Capabilities are added only when a real effect proves the need.

Session 4 added:

```text
origin       → local spatial composition
orientation  → direction/motion-aware image alignment
ribbon       → constrained sustained shape capability
```

The accepted Goal Celebration later stopped using ribbon because the real visual review showed it was unstable for that composition. The capability remains available but is not mandatory.

Session 5 real Rain added:

```text
anchor: "stage-top-center"
spawn.area: { widthPercent, heightPercent }
```

These solve a concrete environmental requirement: a sustained rain field must originate across the stage top rather than from the user's clicked gameplay point.

Explicitly not supported in V1:

- arbitrary JavaScript/eval,
- raw tsParticles keys in effect JSON,
- node graphs,
- generic subemitters,
- custom shaders,
- collision authoring,
- general particle scripting,
- 3D fields.

`effect.schema.json` is the machine-readable structural contract. `validator.js` is the dependency-free browser validator and adds semantic/mobile-budget checks that JSON Schema alone cannot express conveniently.

## Regression fixtures

`examples/` contains three synthetic JSON effects used only to prove the pipeline:

1. `schema-test-burst.json`
2. `schema-test-smoke.json`
3. `schema-test-rain.json`

They are **not portfolio effects and are not exposed in the normal Play effect selector**. In particular, `schema-test-rain.json` is only the old point-origin finite-rate proof; the real environmental effect is `../effects/rain.json`.

## Real Schema V1 effects

- `../effects/dust-puff.json`
- `../effects/critical-hit.json`
- `../effects/goal-celebration.json`
- `../effects/explosion.json`
- `../effects/magic-burst.json`
- `../effects/rain.json`

All six use the generic schema runtime and require no effect-specific runtime bridge scripts.

The deployed lab exposes:

```js
FXDeckSchemaV1.validate(effect)
FXDeckSchemaV1.compile(effect, params)
FXDeckSchemaV1.runGate()
```
