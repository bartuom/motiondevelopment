# FXDeck Effect Schema V1

Build: **P4.3.0 / Session 3**

This directory defines the AI-facing authoring contract for Web2D effects. Normal effects should be data + reusable assets, not effect-specific JavaScript.

Pipeline:

```text
Effect JSON
  ↓
manifest asset-id hydration when needed
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
- optional semantic `motion.drag`,
- finite particle lifetime,
- two-point size/opacity over-life curves,
- circle / square / image shapes,
- normal / lighter blend,
- manifest asset IDs for production authoring,
- hydrated inline asset records for internal/regression compatibility,
- constrained `intensity` numeric bindings.

`motion.drag` was added only when the real Dust Puff effect proved the need. The Web2D compiler maps it internally to tsParticles movement decay; raw backend vocabulary remains excluded from authoring JSON.

Explicitly not supported in V1:

- arbitrary JavaScript/eval,
- raw tsParticles keys in effect JSON,
- node graphs,
- generic subemitters,
- custom shaders,
- collision authoring,
- 3D fields.

`effect.schema.json` is the machine-readable structural contract. `validator.js` is the dependency-free browser validator and adds semantic/mobile-budget checks that JSON Schema alone cannot express conveniently.

## Asset IDs

Production effect JSON can declare:

```json
"assets": ["dust-soft-01", "dust-soft-02"]
```

`FXDeckAssetManager` resolves these through `../assets/manifest.json` before semantic validation/compiler use. Effects do not need to duplicate URLs or texture dimensions.

## Regression fixtures

`examples/` contains three synthetic JSON effects used only to prove the pipeline:

1. `schema-test-burst.json`
2. `schema-test-smoke.json`
3. `schema-test-rain.json`

They are not portfolio effects. `../effects/dust-puff.json` is the first real asset-first Schema V1 effect.

The deployed lab exposes the Session 2 regression API:

```js
FXDeckSchemaV1.validate(effect)
FXDeckSchemaV1.compile(effect, params)
FXDeckSchemaV1.runGate()
```
