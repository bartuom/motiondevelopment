# FXDeck — Canonical Project State

> Current execution status only. Canonical roadmap: [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).

## Current state — 2026-08-20

- **Milestone:** **P4.5.0 — Session 5 Coverage Effects**.
- **Sessions 0–4:** accepted for progression.
- **Session 5:** implemented; deployed technical + visual acceptance pending.
- **Canonical Runtime Lab:** `site/heavy-impact-lab.html`.
- **Production Web2D backend:** tsParticles only.
- **Particlr:** reference/authoring source only.
- **3D:** out of scope for Web2D V1.

## Hard UI preservation rule

Runtime, architecture, schema, optimization and refactor work must preserve the established Runtime Lab UI/UX and working controls by default. P4.5.0 changes runtime/schema/effect data under the existing UI; it does not replace the Play / Debug / HUD / inspector / overlap / A/B / cancellation / stress interface.

---

## Accepted foundation

### Session 0 — Safety checkpoint

**PASS.**

Recovery points:

- `legacy-p3.15` → `26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`
- `checkpoint-web2d-v1-reset-start` → `9f4217d992c4cf0a6a732df28952a18557eb7439`

### Session 1 — Architecture reset

**PASS / browser accepted.**

```text
GAME / Runtime Lab
  ↓
FXDeck Core
  ↓
Web2D backend
  ↓
TsParticlesAdapter
  ↓
1 tsParticles engine
  ↓
1 persistent transparent canvas/container
```

### Session 2 — Schema + Compiler + Validator

**PASS / browser accepted.**

Normal authoring path:

```text
FXDeck Effect JSON
  ↓
validation
  ↓
compileWeb2D()
  ↓
generic schema runtime
  ↓
TsParticlesAdapter
```

Synthetic `schema-test-*` effects remain regression fixtures only and are hidden from normal Play.

### Session 3 — Asset Pipeline + Dust Puff

**PASS / browser + visual accepted.**

Dust Puff remains the first accepted asset-first Schema V1 effect.

Known debt: many overlapping Dust Puff instances are expensive. Current large translucent SVG dust sprites/blur create overdraw/raster cost. Measure and optimize this in Session 6; do not rewrite the runtime now.

### Session 4 — Critical Hit + Goal Celebration

**PASS for progression / visual polish debt retained.**

The first two visual passes were rejected. P4.4.2 fixed image-size semantics and Critical Hit transforms. P4.4.3 removed unstable ribbon geometry and random confetti rotation from Goal Celebration, leaving compact mirrored confetti jets.

User review on 2026-08-20 accepted the current result as good enough to progress, while explicitly noting it is not final polish quality.

Retained Session 4 capabilities:

- semantic per-layer `origin`,
- `orientation: direction | motion`,
- constrained ribbon capability remains available in the backend/schema but is not used by the accepted Goal Celebration,
- image-size authoring is treated as tsParticles radius semantics and checked conservatively.

---

## Session 5 — Coverage Effects

### Goal

Complete the public Web2D V1 effect set without adding effect-specific runtime bridges.

Public set:

1. Dust Puff ✅
2. Critical Hit ✅
3. Goal Celebration ✅ for progression
4. Explosion — P4.5 review
5. Magic Burst — P4.5 review
6. Rain / Environment — P4.5 review

### Explosion

`site/fxdeck/effects/explosion.json`

Pure Schema V1 replacement for the old legacy `explosion` definition. Registering the same `explosion / v1 / default` key replaces the runtime definition in-place while preserving the public `FXDeck.play("explosion")` API.

Reference hierarchy is intentionally based on the accepted Particlr Explosion composition:

```text
flash
→ fireball body
→ sparks + debris
→ delayed smoke
```

The new effect uses reusable assets rather than a custom explosion bridge:

- `hero-flare`
- `fire-soft`
- `hero-streak`
- `smoke-soft`

### Magic Burst

`site/fxdeck/effects/magic-burst.json`

Designed around readable asymmetric direction rather than a radial particle explosion:

```text
small core
→ dominant directional magic arc
→ sparse forward motes
→ offset delayed echo arc
→ small echo motes
```

The dominant shape uses the reusable `magic-arc` asset and semantic direction/origin/orientation. No ribbon and no custom runtime hook is required.

### Rain / Environment

`site/fxdeck/effects/rain.json`

This is the first real Rain effect. It replaces the misleading point-origin behavior of the old synthetic `schema-test-rain` fixture.

Rain required two generic Schema V1 additions justified by the real environmental use case:

```text
anchor: "stage-top-center"
spawn.area: { widthPercent, heightPercent }
```

The compiler maps `spawn.area` to the backend emitter region, and generic schema playback resolves `stage-top-center` independently of the clicked gameplay position.

Rain uses two finite rate layers:

- far rain,
- near rain.

Both span the stage width, use motion-oriented `rain-streak` image particles, and remain finite/lifecycle-owned.

### P4.5 reusable assets

Added FXDeck-original assets:

- `fire-soft`
- `smoke-soft`
- `magic-arc`
- `rain-streak`

All are manifest-managed and intentionally avoid filter blur in the new P4.5 assets.

### Session 5 integration

- `site/js/session5-coverage-effects.js`
- `site/js/session5-coverage-gate.js`

No `explosion-runtime-bridge.js`, `magic-burst-runtime-bridge.js`, or `rain-runtime-bridge.js` was added.

### Expected technical gate

```text
PASS P4.5.0 SESSION 5 TECH GATE: 6 public schema effects / Explosion asset hierarchy / directional Magic Burst / stage-wide Rain rate emitters / 0 effect bridges / 1 persistent canvas
```

The gate verifies:

- all six public showcase effects resolve as schema-driven,
- Explosion uses additive flash/fireball and delayed normal-blend smoke,
- Explosion streaks orient to motion,
- Magic Burst uses a dominant direction-oriented `magic-arc`,
- Rain uses stage-top-center anchoring,
- Rain compiles 100% wide finite rate emitter regions,
- Rain streaks orient to motion,
- burst and sustained playback can be cleaned up,
- persistent container identity remains unchanged,
- exactly one particle canvas remains.

### Session 5 acceptance status

**Technical browser gate: pending deployed user run.**

**Visual gate: pending user review for Explosion, Magic Burst and real Rain.**

Do not mark Session 5 complete until the deployed log passes and the three effects are visually reviewed.

---

## Immediate next work

1. Open `site/heavy-impact-lab.html?v=p4.5.0` on GitHub Pages.
2. Review **Explosion** at intensity `0.5 / 1 / 2` and several directions.
3. Review **Magic Burst** at `0° / 90° / 180° / 270°` and several intensities.
4. Review **Rain / Environment**. It must spawn across the stage top and must not originate from the click point.
5. Inspect `PASS/FAIL P4.5.0 SESSION 5 TECH GATE`.
6. If visuals fail, tune JSON/assets/timing first; do not add effect-specific runtime code.

## Deferred to Session 6

- Dust Puff overlap optimization,
- raster WebP/PNG vs SVG measurements,
- explicit slim tsParticles allowlist/build,
- mobile quality scaling and physical-device profiling,
- bundle gzip/Brotli measurement,
- sustained rain + hero-effect stress testing.
