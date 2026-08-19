# FXDeck Effect Schema V1

Build: **P4.2.0 / Session 2**

This directory defines the AI-facing authoring contract for Web2D effects. Normal effects should be data + reusable assets, not effect-specific JavaScript.

Pipeline:

```text
Effect JSON
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
- optional gravity,
- finite particle lifetime,
- two-point size/opacity over-life curves,
- circle / square / image shapes,
- normal / lighter blend,
- effect-local image asset references,
- constrained `intensity` numeric bindings.

Explicitly not supported in V1:

- arbitrary JavaScript/eval,
- raw tsParticles keys in effect JSON,
- node graphs,
- generic subemitters,
- custom shaders,
- collision authoring,
- 3D fields.

`effect.schema.json` is the machine-readable structural contract. `validator.js` is the dependency-free browser validator and adds semantic/mobile-budget checks that JSON Schema alone cannot express conveniently.

## Session 2 proof fixtures

`examples/` contains three synthetic JSON effects used only to prove the pipeline:

1. `schema-test-burst.json`
2. `schema-test-smoke.json`
3. `schema-test-rain.json`

They are not portfolio effects. Visual authoring resumes in Session 3.

The deployed lab exposes:

```js
FXDeckSchemaV1.validate(effect)
FXDeckSchemaV1.compile(effect, params)
FXDeckSchemaV1.runGate()
```
