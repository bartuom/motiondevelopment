# FXDeck — Canonical Project State

> Current execution status only. The canonical implementation roadmap is [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).

## Current state — 2026-08-19

- **Milestone:** **P4.2 — FXDeck Effect Schema V1**.
- **Execution status:** **Session 1 browser gate accepted; Session 2 implemented and awaiting deployed browser acceptance.**
- **Canonical plan:** [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).
- **Canonical Runtime Lab:** `site/web2d-runtime-lab.html`.
- **Legacy Runtime Lab:** `site/heavy-impact-lab.html`.
- **Production Web2D backend:** tsParticles only.
- **Particlr:** authoring/reference only; not a production runtime dependency.
- **3D:** architectural boundary only; zero implementation in Web2D V1.

## UI preservation rule

Runtime/architecture/schema work must preserve the existing Runtime Lab UI/UX by default. A backend refactor is not permission to replace the interface or remove working controls. Temporary harnesses may exist only as developer tools and must not silently become the canonical UI.

Session 2 follows this rule: the existing P4.1 Runtime Lab markup/layout is preserved. Only an additional schema gate module is loaded behind the existing UI.

---

## Session 0 — Safety checkpoint

**Status: PASS.**

Recovery points:

- `legacy-p3.15` → `26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`
- `checkpoint-web2d-v1-reset-start` → `9f4217d992c4cf0a6a732df28952a18557eb7439`

---

## Session 1 — Architecture Reset

**Status: PASS / browser accepted.**

User-provided deployed log confirmed:

```text
PASS P4.1.0 BOOT: 1 FXDeck runtime / 1 tsParticles engine / 1 persistent container / 1 canvas / 3 baseline effects
PASS P4.1.0 SESSION 1 GATE: 6 play/stop cycles / 1 engine / 1 persistent container / 1 canvas / bootCount 1
PASS P4.1.0 SESSION 1 GATE: 8 play/stop cycles / 1 engine / 1 persistent container / 1 canvas / bootCount 1
```

Accepted topology remains:

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

### Implemented

Canonical authoring path now exists:

```text
FXDeck Effect JSON
  ↓
structural validator
  ↓
semantic/mobile budget validator
  ↓
compileWeb2D(effect, params)
  ↓
generic schema effect runtime definition
  ↓
TsParticlesAdapter
  ↓
existing persistent container
```

New files:

- `site/fxdeck/schema/effect.schema.json`
- `site/fxdeck/schema/validator.js`
- `site/fxdeck/schema/effect-loader.js`
- `site/fxdeck/schema/README.md`
- `site/fxdeck/web2d/compiler.js`
- `site/fxdeck/web2d/register-schema-effect.js`
- `site/js/session2-schema-gate.js`

### Schema V1 principles

- no raw tsParticles vocabulary in effect JSON,
- `additionalProperties`-style strict structural checking,
- finite duration/lifetime only,
- burst + finite rate emitters,
- circle/square/image shapes,
- two-point size/opacity over-life curves,
- direction/spread/speed/gravity,
- normal/lighter blend,
- constrained numeric `intensity` bindings,
- no arbitrary JavaScript/eval,
- no 3D fields.

### Semantic/mobile gates

The dependency-free validator catches cases such as:

```text
unknown properties
missing assets
invalid ranges/opacity
duplicate IDs
unsupported capabilities
unbounded/invalid emitters
burst/rate budget violations
effect duration shorter than layer lifetime
invalid parameter bindings
data URI assets
oversized image dimensions
```

Errors use short AI-fixable codes such as:

```text
FXD_SCHEMA_01
FXD_BUDGET_01
FXD_ASSET_06
FXD_DURATION_02
```

### Synthetic proof effects

Three JSON fixtures are registered through the same generic schema runtime path:

1. `schema-test-burst.json`
2. `schema-test-smoke.json`
3. `schema-test-rain.json`

They contain **zero effect-specific runtime JavaScript** and are deliberately not exposed as portfolio content.

### Session 2 browser gate

`site/js/session2-schema-gate.js` runs behind the existing Runtime Lab UI and verifies:

- all three JSON definitions load and validate,
- all three compile to Web2D emitter options,
- registry definitions are marked schema-driven,
- invalid backend-specific property fails,
- over-budget particle count fails,
- missing asset reference fails,
- all three effects can play/stop through FXDeck,
- runtime resources return to zero,
- persistent container identity remains stable,
- particle canvas count remains exactly one.

Expected deployed log:

```text
PASS P4.2.0 SESSION 2 GATE: 3 JSON effects / structural + semantic validation / compiler / 0 effect-specific runtime JS / 1 persistent canvas
```

Browser API after gate:

```js
FXDeckSchemaV1.validate(effect)
FXDeckSchemaV1.compile(effect, params)
FXDeckSchemaV1.runGate()
```

Do not mark Session 2 browser-accepted until the deployed gate returns `PASS`.

---

## Immediate next work — Session 3

Only after Session 2 browser acceptance:

- asset manifest + loader/cache/prefetch,
- first reusable alpha assets,
- reference-driven Dust Puff analysis,
- `dust-puff.json` authored entirely through Schema V1,
- visual quality gate before adding more framework capabilities.

Primary architecture KPI remains:

> A normal new gameplay effect should be approximately 90% effect data + reusable assets. If it requires another effect-specific runtime bridge, the architecture is failing.

## Planned public V1 effect set

1. Dust Puff
2. Critical Hit
3. Goal Celebration
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

- **P4.2 / Session 2:** added strict FXDeck Effect Schema V1 contract.
- **P4.2 / Session 2:** added structural + semantic/mobile budget validation.
- **P4.2 / Session 2:** added generic `compileWeb2D()` and schema effect registration path.
- **P4.2 / Session 2:** added burst/image/rate JSON proof fixtures and automated browser gate.
- **P4.2 / Session 2:** preserved the existing Runtime Lab UI; no replacement UI was introduced.
- **P4.1 / Session 1:** browser topology/lifecycle gate accepted from deployed user test.
- **P4.0 / Session 0:** recovery branches and safety checkpoint completed.
