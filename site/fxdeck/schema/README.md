# FXDeck Effect Schema V1

Build: **P4.4.0 / Sessions 2–4**

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
- spread and speed ranges,
- optional gravity + drag,
- finite particle lifetime,
- two-point size/opacity over-life curves,
- circle / square / image shapes,
- normal / lighter blend,
- manifest-backed image assets,
- constrained numeric `intensity` bindings,
- constrained color replacement bindings:
  - `tint -> color`,
  - `teamColor -> color`.

Color bindings are deliberately restricted to `replace`. There is no color expression language or arbitrary runtime scripting.

Explicitly not supported in V1:

- arbitrary JavaScript/eval,
- raw tsParticles keys in effect JSON,
- node graphs,
- generic subemitters,
- custom shaders,
- collision authoring,
- 3D fields.

`effect.schema.json` is the machine-readable structural contract. `validator.js` is the dependency-free browser validator and adds semantic/mobile-budget checks that JSON Schema alone cannot express conveniently.

## Regression fixtures

`examples/` contains three synthetic JSON effects used only to prove the pipeline:

1. `schema-test-burst.json`
2. `schema-test-smoke.json`
3. `schema-test-rain.json`

They are not portfolio effects.

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
