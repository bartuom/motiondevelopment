# FXDeck Effect Schema V1

Build: **P4.4.1 / Sessions 2–4**

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
- spread and speed ranges,
- optional gravity + drag,
- finite particle lifetime,
- two-point size/opacity over-life curves,
- circle / square / image shapes,
- constrained ribbon shape for effects that prove the need,
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

### Why origin/orientation/ribbon were added

These capabilities were not speculative framework expansion. Session 4 visual review exposed concrete failures:

- Critical Hit read as a generic point burst because its slash/streak shapes did not own a stable directional composition.
- Goal Celebration read as a generic point explosion because every layer originated from the clicked point.
- Goal Celebration needed a sustained curved celebration shape rather than more short radial particles.

P4.4.1 therefore adds the smallest reusable semantic features that solve those real effects:

```text
origin       → spatial composition
orientation  → direction/motion-aware sprite shape language
ribbon       → sustained celebration/trail shape
```

Backend-specific ribbon options remain hidden behind the Web2D compiler.

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

They are **not portfolio effects and are not exposed in the normal Play effect selector**. They remain registered so automated Debug regression gates can exercise burst, image and finite-rate paths.

In particular, `schema-test-rain.json` is not the planned Rain / Environment effect. It is only a point-origin finite-rate emitter proof.

## Real Schema V1 effects

- `../effects/dust-puff.json`
- `../effects/critical-hit.json`
- `../effects/goal-celebration.json`

These effects use the same generic schema runtime and do not have effect-specific runtime bridge scripts.

The deployed lab exposes:

```js
FXDeckSchemaV1.validate(effect)
FXDeckSchemaV1.compile(effect, params)
FXDeckSchemaV1.runGate()
```
