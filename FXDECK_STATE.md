# FXDeck — Canonical Project State

> Current execution status only. Canonical roadmap: [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).

## Current state — 2026-08-20

- **Milestone:** **P4.4.2 — Session 4 Hero Transform Normalization**.
- **Sessions 0–3:** accepted.
- **Session 4:** not accepted yet.
- **Canonical Runtime Lab:** `site/heavy-impact-lab.html`.
- **Production Web2D backend:** tsParticles only.
- **Particlr:** reference/authoring source only.
- **3D:** out of scope for Web2D V1.

## Hard UI preservation rule

Runtime, architecture, schema, optimization and refactor work must preserve the established Runtime Lab UI/UX and working controls by default. A technical change is not permission to replace the UI or remove functionality.

P4.4.2 changes effect data/runtime behavior only. The existing Play / Debug / HUD / inspector / overlap / A/B / cancellation / stress UI remains canonical.

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

---

## Session 4 — Hero effects

### P4.4 initial pass — VISUAL FAIL

Rejected by user review:

- Critical Hit read as another particle explosion.
- Goal Celebration read as a strange point-origin particle burst.

### P4.4.1 correction — VISUAL FAIL

The second pass introduced useful capabilities (`origin`, `orientation`, `ribbon`) but the actual visual result still had badly normalized positions, rotations and scales.

Important root cause found in P4.4.2:

> tsParticles image `size.value` is a particle radius; the image drawer renders width as `radius * 2` and height from the asset ratio.

The rejected Critical Hit used image radii up to ~220 with a 2:1 sprite, producing hundreds of pixels of visual width/height. The art values had been authored as if they were direct sprite dimensions. This is now treated as an authoring error, not an artistic preference.

### P4.4.2 — current correction

#### Critical Hit

`site/fxdeck/effects/critical-hit.json`

Changes:

- replaced the diagonal slash source with a neutral **horizontal 4:1 alpha** (`256×64`),
- runtime direction is now the only primary orientation source,
- primary slash max image radius reduced to `76` → max rendered width ~`152px`, height ~`38px`,
- echo slash max radius reduced to `62`,
- removed arbitrary primary/echo positional offsets,
- support streaks reduced to 4 base particles,
- sparks reduced to 6 base particles,
- flash reduced materially,
- Critical Hit remains pure Schema V1 with zero effect bridge.

Composition target:

```text
small flash
→ one readable directional slash
→ one subtle echo
→ a few motion-aligned streaks
→ small spark support
```

#### Goal Celebration

`site/fxdeck/effects/goal-celebration.json`

Changes:

- removed the central explosion-style flare,
- reduced all local launch offsets from the previous large ±150/160px layout to a compact composition around the gameplay point,
- ribbons start above-left / above-right and descend through the celebration area,
- confetti launches from two small side cannons,
- small delayed crown confetti + sparkles provide secondary timing,
- confetti image radii kept below `5px`,
- ribbon widths/oscillation reduced,
- generic schema origin resolution now clamps authored offsets to the Runtime Lab stage bounds.

Composition target:

```text
ribbon L      ribbon R
    ↓            ↓

 confetti L    confetti R
       \        /

  small delayed crown confetti
          + sparkles
```

#### Transform sanity gate

`site/js/session4-hero-gate.js` now rejects regressions such as:

- Critical slash asset not being 4:1,
- Critical slash rendered dimensions exceeding the intended visual budget,
- dominant slash drifting away from the impact point,
- oversized Goal confetti sprites,
- Goal offsets exceeding compact-layout budget,
- missing direction alignment,
- regression fixtures leaking into Play,
- second canvas/container creation.

Expected deployed line:

```text
PASS P4.4.2 SESSION 4 TRANSFORM GATE: normalized image scale / 4:1 neutral slash / direction aligned / compact Goal layout / edge-clamped origins / Debug-only fixtures / 1 persistent canvas
```

### Session 4 acceptance status

**P4.4.2 technical browser gate: pending user run.**

**P4.4.2 visual gate: pending user review.**

Do not move to Session 5 until both hero effects are visually accepted.

---

## Immediate next work

1. Open P4.4.2 Runtime Lab.
2. Check Critical Hit at `0° / 90° / 180° / 270°` and intensity `0.5 / 1 / 2`.
3. Check Goal Celebration at center and near stage edges.
4. Check several rapid plays for visual overlap/perf.
5. Inspect `PASS/FAIL P4.4.2 SESSION 4 TRANSFORM GATE`.
6. If visuals still fail, tune the effect data/assets again — do not proceed to Session 5.

## Planned public V1 effect set

1. Dust Puff ✅
2. Critical Hit — P4.4.2 review
3. Goal Celebration — P4.4.2 review
4. Explosion
5. Magic Burst
6. Rain / Environment

## Deferred

- optional Debug grid/origins/bounds overlay,
- Dust Puff overlap optimization,
- slim tsParticles build and mobile measurements,
- real Rain / Environment effect (the old `schema-test-rain` is only a regression fixture).
