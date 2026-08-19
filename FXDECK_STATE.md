# FXDeck — Canonical Project State

> Current execution status only. The canonical implementation roadmap is [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).

## Current state — 2026-08-19

- **Milestone:** **P4.3 — Asset Pipeline + Dust Puff**.
- **Execution status:** **Session 2 browser accepted. Session 3 implementation is complete and awaiting deployed technical + visual acceptance.**
- **Canonical plan:** [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).
- **Canonical Runtime Lab:** `site/heavy-impact-lab.html`.
- **Temporary P4.1 harness:** `site/web2d-runtime-lab.html` redirects to the canonical Runtime Lab.
- **Production Web2D backend:** tsParticles only.
- **Particlr:** authoring/reference only; not a production runtime dependency.
- **3D:** architectural boundary only; zero implementation in Web2D V1.

## Hard UI preservation rule

Runtime, architecture, schema, optimization, backend or refactor work must **preserve the established Runtime Lab UI/UX and working controls by default**.

A technical refactor is not permission to:

- replace the canonical interface,
- remove working controls,
- reduce debug/authoring functionality,
- silently promote a temporary test harness to the product/canonical UI.

If an isolated harness is useful for architecture testing, it may exist only as an internal developer page. It must not replace the established UI unless the user explicitly requests a UI redesign.

---

## Session 0 — Safety checkpoint

**Status: PASS.**

Recovery points:

- `legacy-p3.15` → `26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`
- `checkpoint-web2d-v1-reset-start` → `9f4217d992c4cf0a6a732df28952a18557eb7439`

---

## Session 1 — Architecture Reset

**Status: PASS / browser accepted.**

Accepted topology:

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

P4 keeps this topology underneath the established Runtime Lab UI.

---

## Session 2 — Schema + Compiler + Validator

**Status: PASS / browser accepted.**

User-provided deployed P4.2.1 log confirmed:

```text
PASS P4.2.1 BOOT: preserved Runtime Lab UI / 1 FXDeck runtime / 1 tsParticles engine / 1 persistent container / 1 canvas / 6 registered effects
PASS P4.2.1 SESSION 1 GATE: 6 play/stop cycles / 1 engine / 1 persistent container / 1 canvas / bootCount 1
PASS P4.2.1 SESSION 2 GATE: 3 JSON effects / structural + semantic validation / compiler / 0 effect-specific runtime JS / 1 persistent canvas
```

Canonical authoring path:

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

Core files:

- `site/fxdeck/schema/effect.schema.json`
- `site/fxdeck/schema/validator.js`
- `site/fxdeck/schema/effect-loader.js`
- `site/fxdeck/schema/README.md`
- `site/fxdeck/web2d/compiler.js`
- `site/fxdeck/web2d/register-schema-effect.js`
- `site/js/session2-schema-gate.js`

Three synthetic fixtures remain regression-only:

1. `schema-test-burst.json`
2. `schema-test-smoke.json`
3. `schema-test-rain.json`

They contain zero effect-specific runtime JavaScript.

---

## Session 3 — Asset Pipeline + Dust Puff

### Implemented architecture

```text
Dust Puff JSON
  ↓
manifest asset ids
  ↓
FXDeckAssetManager
  ↓
hydrated runtime asset records
  ↓
Schema V1 validator
  ↓
compileWeb2D()
  ↓
TsParticlesAdapter
  ↓
1 persistent canvas
```

New asset pipeline:

- `site/fxdeck/assets/manifest.json`
- `site/fxdeck/assets/README.md`
- `site/fxdeck/core/asset-manager.js`

Asset manager responsibilities:

- manifest loading,
- stable asset-id resolution,
- URL/dimension hydration,
- request/decode de-duplication,
- cold prefetch,
- warm cache hits,
- per-effect prefetch.

### First reusable original alpha assets

- `site/assets/vfx/dust-soft-01.svg`
- `site/assets/vfx/dust-soft-02.svg`
- `site/assets/vfx/dust-soft-03.svg`

These are FXDeck-original assets. The main Dust Puff mass no longer relies on geometric circles.

### Dust Puff V1

`site/fxdeck/effects/dust-puff.json`

Properties:

- fully Schema V1 driven,
- zero effect-specific runtime bridge,
- 4 layers:
  - `ground-roll`,
  - `body`,
  - `wisps`,
  - `grit`,
- 3 reusable manifest alpha assets,
- intensity-driven count/speed bindings,
- semantic motion drag mapped by the Web2D compiler to tsParticles movement decay,
- normal alpha blend for the main dust mass.

The effect is original FXDeck work. It is **reference-informed**, not a copied Particlr config.

Reference notes:

- `references/particlr/dust-puff-analysis.md`
- exact Particlr `.prt` export is still pending; no numeric Particlr settings were fabricated.

### Schema change justified by the real effect

Session 3 adds one real capability requested by Dust Puff:

```text
motion.drag
```

This remains semantic FXDeck vocabulary and compiles to the Web2D backend internally. The same pass also fixes validation of `motion.speed.min/max` runtime bindings exposed by Session 2.

### Runtime Lab integration

The existing Runtime Lab UI is unchanged structurally.

P4.3 adds:

- Dust Puff to the existing effect selector,
- asset manager/prefetch behind the existing runtime,
- existing Play / Debug / HUD / inspector / overlap / A/B / cancellation / stress tools remain intact.

Integration modules:

- `site/js/session3-dust-puff.js`
- `site/js/session3-asset-gate.js`

### Session 3 technical gate

Expected deployed log:

```text
PASS P4.3.0 SESSION 2 GATE: ... / 1 persistent canvas
P4.3.0 DUST PUFF: registered from JSON / 3 manifest assets / cold decode 3 / cache hits 0
PASS P4.3.0 SESSION 3 TECH GATE: manifest / 3 reusable alpha assets / cold decode 3 / warm cache hit 3 / dust-puff JSON / 0 effect bridge / 1 persistent canvas
P4.3.0 SESSION 3 VISUAL GATE: USER REVIEW REQUIRED ...
```

Technical gate verifies:

- manifest resolves all Dust Puff assets,
- first prefetch is cold,
- second prefetch is cache-only,
- Dust Puff is schema-driven,
- 4 data layers compile/play,
- cleanup returns runtime resources to zero,
- persistent container identity is unchanged,
- canvas count remains exactly one.

### Visual gate

**Not automatically accepted.**

The user must review Dust Puff in the Play tab. Session 3 is fully complete only if the effect is strong enough to remain in the public portfolio. If it is weak, improve texture art/timing/motion/scale/blend before adding framework features.

---

## Immediate next work

1. Deploy/browser-check P4.3 technical gate.
2. User judges Dust Puff visual quality.
3. Tune `dust-puff.json` + alpha assets only if needed.
4. Only after visual acceptance proceed to Session 4 — Critical Hit + Goal Celebration.

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

- **P4.3 / Session 3:** Session 2 browser gate accepted from user-provided deployed log.
- **P4.3 / Session 3:** added manifest-driven asset manager with decode/load cache and prefetch.
- **P4.3 / Session 3:** added three original reusable soft-dust alpha assets.
- **P4.3 / Session 3:** added `dust-puff.json` as first real asset-first Schema V1 effect.
- **P4.3 / Session 3:** added semantic `motion.drag` and Web2D decay compilation.
- **P4.3 / Session 3:** fixed `motion.speed.min/max` binding validation.
- **P4.3 / Session 3:** added technical cold/warm asset + lifecycle gate while preserving the established Runtime Lab UI.
- **P4.2.1 UI correction:** restored `site/heavy-impact-lab.html` as the canonical Runtime Lab shell and recorded UI preservation as a hard constraint.
- **P4.2 / Session 2:** added strict Schema V1, validator, compiler and three JSON regression fixtures.
- **P4.1 / Session 1:** browser topology/lifecycle gate accepted.
- **P4.0 / Session 0:** recovery branches and safety checkpoint completed.
