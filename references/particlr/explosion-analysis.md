# Particlr — Explosion public runtime fixture

**Source file:** `references/particlr/explosion-runtime-fixture.prt`

This is the exact public runtime test fixture named `Explosion`; it is **not claimed to be the exact current editor preset** with the same name.

## Layer breakdown

### Flash
- blend: `add`
- texture: `circle-soft`
- one particle at `t=0`
- life: `0.15 s`
- initial size: `140`
- size: `1.0 -> 0.2`
- color/alpha: white-yellow opaque -> warm transparent

### Fireball
- blend: `add`
- texture: `circle-soft`
- `24`-particle burst at `t=0`
- circle spawn radius: `8`
- life: `0.4–0.7 s`
- speed: `60–160`
- size: `18–34`
- size over life: `1 -> 0`
- color: yellow-white -> orange-red -> dark red transparent
- gravity Y: `40`
- drag: `2.5`

### Smoke
- blend: `normal`
- texture: `smoke`
- continuous rate: `20/s`
- delayed by `0.05 s`
- circle spawn radius: `12`
- life: `0.8–1.4 s`
- speed: `10–40`
- size: `30–60`
- angular velocity: `-30..30`
- size over life: `0.6 -> 1.6`
- alpha: `0 -> 0.5 at t=0.2 -> 0`
- gravity Y: `-20`
- drag: `1.5`

## What actually makes this read better than our primitive Explosion

1. **Three distinct temporal/material layers**, not one radial burst.
2. `circle-soft` + additive blending makes the flash/fire mass read as light rather than geometry.
3. `smoke` is a real soft texture and uses normal blending, delayed onset and expansion instead of additive circles.
4. Fire contracts while smoke expands — opposing size curves give the effect a believable transition.
5. Smoke starts after the ignition and lives roughly twice as long as the fire layer.

## FXDeck Explosion V2 target

Rebuild the effect as an authored layered cue:

`flash -> fire mass -> delayed smoke breakup -> optional sparks/debris`

Do not preserve the current FXDeck Explosion visuals just because they already exist. Preserve only useful runtime orchestration/lifecycle behavior.
