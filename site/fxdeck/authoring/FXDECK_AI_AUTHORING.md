# FXDeck AI Authoring — Web2D V1

Use this contract when generating or patching FXDeck effects. Normal visual iteration should change **effect JSON + reusable assets**, not runtime JavaScript.

## Runtime contract

```text
FXDeck JSON
→ validator
→ Web2D compiler
→ TsParticlesAdapter
→ one persistent canvas
```

Do not emit raw tsParticles keys in effect JSON.

## Available public concepts

Effect:

- `schemaVersion: 1`
- `id`
- `label`
- `durationMs`
- `priority`
- `assets`
- `bindings`
- `layers`

Layer:

- `delayMs`
- `priority`
- `z`
- `blend`
- `anchor: event | stage-top-center`
- local `origin`
- `spawn: burst | rate`
- optional `spawn.area` in percent
- `shape: circle | square | image | ribbon`
- `color`
- finite `lifetimeMs`
- `motion.direction/spreadDeg/speed/gravity/drag`
- `size`
- `opacity`
- `rotationDeg` OR semantic `orientation`

## Current reusable asset ids

```text
dust-soft-01
dust-soft-02
dust-soft-03
critical-slash
hero-streak
hero-flare
confetti-strip
fire-soft
smoke-soft
magic-arc
rain-streak
```

## Critical transform rule

For tsParticles image shapes, FXDeck `size.start/end` currently compiles to particle radius semantics.

Approximate rendered image dimensions are:

```text
renderedWidth  ≈ size * 2
renderedHeight ≈ renderedWidth / assetAspectRatio
```

Do **not** author `size` as direct CSS pixel width.

Before creating an image layer, calculate the expected rendered dimensions and keep them deliberate. A 4:1 sprite with `size: 60` renders roughly `120 × 30px`.

## Positioning rules

- Normal gameplay effects use `anchor: event` or omit `anchor`.
- `origin.x/y` is a small local composition offset from the event.
- Use `rotateWithDirection: true` only when that local offset belongs to the directional shape language.
- Environmental stage effects may use `anchor: stage-top-center`.
- Rain-like emitters should use a stage anchor + `spawn.area`, not a huge local origin hack.
- Avoid local offsets above roughly 100 px unless a reviewed effect proves the need.

## Orientation rules

Use:

```json
"orientation": { "mode": "direction", "offsetDeg": 0, "jitterDeg": 0 }
```

for a dominant authored image that must follow gameplay direction.

Use:

```json
"orientation": { "mode": "motion", "offsetDeg": 0, "jitterDeg": 0 }
```

for streaks, rain and projectile-like support sprites.

Do not combine `rotationDeg` and `orientation` on the same layer.

## Visual rules

1. Start from a composition/reference, not from a particle feature list.
2. One dominant readable shape is better than 30 undifferentiated particles.
3. Particles support the hero shape; they do not automatically define the effect.
4. Use delayed layers to create hierarchy rather than spawning everything at frame zero.
5. Keep additive layers sparse; large additive overlaps quickly become white noise.
6. Keep large translucent smoke/dust counts low because overdraw dominates mobile cost.
7. Ribbon is optional and must not be added simply because the backend supports it.
8. If an effect looks wrong, first fix source art, timing, scale, origin and orientation. Do not add custom runtime code.

## Runtime bindings

Numeric bindings currently use `intensity` only.

Color replacement bindings use:

- `tint`
- `teamColor`

No expressions/eval.

## Current public reference effects

- `dust-puff.json` — asset-first soft burst
- `critical-hit.json` — dominant directional image shape
- `goal-celebration.json` — compact mirrored composition
- `explosion.json` — layered flash/fire/spark/smoke hierarchy
- `magic-burst.json` — asymmetric directional arc
- `rain.json` — stage-wide finite rate environment emitter

## Forbidden patterns

- effect-specific runtime bridge for normal VFX authoring,
- one canvas/container per effect,
- raw backend configuration in public schema,
- giant image radii authored as if they were sprite width,
- arbitrary large origins to fake emitter regions,
- infinite rate emitters in V1,
- base64/data URI production assets,
- 3D/WebGPU/node-editor scope creep before Web2D V1 ships.
