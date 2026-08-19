# FXDeck — Canonical Project State

> Update this file after material implementation changes.
>
> Rules:
> - reference/visual target first;
> - runtime serves the effect, not the reverse;
> - add Core abstractions only after a real effect proves the need;
> - preserve P0 raw-tsParticles as the performance baseline;
> - version visual iterations instead of overwriting useful history;
> - record provenance/license for reference-derived assets or code;
> - fresh cache key or fresh test page for every browser handoff.

## Current state — 2026-08-19

- **Milestone:** P3.13 — Reference-Driven Visual Quality Pass.
- **Current user-testable build:** **P3.13.1**.
- **Core/runtime capability work:** FROZEN while visual quality catches up.
- **Focused visual lab:** `site/visual-pass-lab.html` — P3.13.1.
- **Runtime Lab:** `site/heavy-impact-lab.html` — legacy/mixed P3 workspace; P3.13 V2 bridge also exists there.
- **Reference harvest:** `references/`.
- **Core Lab:** `site/fxdeck-core-lab.html`.
- **Raw backend baseline:** `site/webfx-lab.html` — P0.3.0.

## Why P3.13 exists

User visual review established:
- Football Card: visually weak; freeze it.
- Critical Hit: visually weak; do not polish the primitive-based version further.
- Magic Burst v1: best of recent cues, but still below portfolio quality.
- General failure: too much circle/triangle/CSS-gradient shape language and too little source art / proven particle behavior.

The runtime is ahead of the content. The immediate KPI is now:

> **Would this effect be strong enough to show in a Senior VFX / Motion Developer portfolio?**

If not, it is not finished.

---

# Product target

FXDeck is a lightweight gameplay VFX runtime for web games.

```text
GAME
  ↓
FXDeck.play(effect, params)
  ↓
versioned effect definition
  ↓
particles / textures / sprite or flipbook / ribbon / DOM / screen response
```

Representative call:

```js
FXDeck.play("explosion", {
  position: { x, y },
  direction,
  intensity,
  version,
  variant
});
```

`tsParticles` remains a backend implementation detail, not the public FXDeck API.

---

# Architecture already proven

- `FXDeckRuntime`
- `EffectInstance` ownership/lifecycle
- `CoordinateAdapter`
- `TsParticlesAdapter`
- per-play emitter reference path
- shared-direct diagnostic path
- shared-scheduled production path
- semantic burst priority/backpressure
- `FXDeck.update()` for sustained/interactive sources
- explicit cleanup / stop / stopAll
- effect catalog with version + variant
- DOM/SVG hooks remain effect-local unless repeated production usage proves an adapter need

## P3 architecture decision

**No Core redesign is justified.**

Critical Hit, Magic Burst and the P3.13 V2 effects were added without needing a new public timeline/node/layer abstraction. Runtime Lab UI duplication is tooling duplication, not a reason to grow Core.

---

# P0 raw-tsParticles baseline

Technology spike status: **PASSED**.

Validated:
- one-shot burst
- exact CSS/gameplay positioning
- retina coordinate conversion
- moving emitter
- repeated bursts / cleanup
- image particles
- particle + DOM composition
- resize/reflow
- mobile performance

Galaxy S20+ 5G reference:

```text
~150 simple particles   60.0 avg / 59.5 1% low
~400 simple particles   60.0 avg / 59.9 1% low
~800 simple particles   57.4 avg / 30.0 1% low
```

Keep these numbers for the later raw-tsParticles vs FXDeck matched overhead test.

---

# Production effect catalog

## Heavy Impact v1
Accepted technical one-shot composite. Not currently a hero visual target.

## Explosion

### v1
Legacy primitive-heavy implementation retained for comparison/regression.

### **v2 — current default — P3.13.1**
Reference-driven rebuild based on the harvested public Particlr Explosion fixture.

Visual model:

```text
0 ms      hot soft flash + fireball mass
18 ms     sparse supporting sparks
54 ms     smoke wave A
138 ms    smoke wave B
238 ms    smoke wave C
1480 ms   hard cleanup
```

Key changes:
- source-derived `particlr-circle-soft.png` instead of a hand-made explosion-core SVG as the main soft energy texture;
- source-derived `particlr-smoke.png` instead of circle smoke;
- 24-ish fireball particles with Particlr-inspired 0.4–0.7 s life and 18–34 size range;
- delayed textured smoke carries the breakup/read;
- sparks remain secondary gameplay accents.

Files:
- `site/fxdeck/effects/explosion-v2.js`
- `site/assets/particlr-circle-soft.png`
- `site/assets/particlr-smoke.png`

## Fireball v1
Accepted moving-source archetype. Its impact call does not pin an Explosion version, so the catalog default now hands off to **Explosion v2**.

## Environment Emitter v1
Accepted sustained/updateable archetype.

## Rare Reward v1
Retained UI/card reference; not a current hero target.

## Football Card Reveal v1
Implementation exists but visual direction is rejected/frozen. Do not spend current visual-pass time on it.

## Critical Hit v1
Implementation exists but visual result is rejected. Revisit only after a better slash/impact sprite or flipbook language has been harvested.

## Magic Burst

### v1
Legacy CSS/DOM-ribbon version retained for comparison.

### **v2 — current default — P3.13.1**
Reference-driven rebuild using the **real tsParticles ribbon shape**.

Official Ribbons behavior harvested/adapted:

```text
shape: ribbon
internal ribbon points: 60
drag: 0.02
mass: 1
oscillationDistance: adapted 72–112
oscillationSpeed: 3–5
particleDist: 8
velocityInherit: 4–6
```

FXDeck cue:

```text
0 ms      real hero ribbons + small core accent
22 ms     sparse image motes
44 ms     restrained screen response
86 ms     displaced secondary ribbons
112 ms    echo motes
146 ms    secondary pulse
860 ms    cleanup
```

Required tsParticles additions on the existing engine:
- `@tsparticles/plugin-motion@4.3.2`
- `@tsparticles/shape-ribbon@4.3.2`

The hero ribbon is no longer a CSS fake.

Files:
- `site/fxdeck/effects/magic-burst-v2.js`
- `site/js/visual-pass-lab.js`

---

# P3.13 focused Visual Pass Lab

URL source: `site/visual-pass-lab.html`.

Purpose: visual acceptance only, without the legacy Runtime Lab noise.

Features:
- Explosion V2 / Magic Burst V2 selector
- intensity 0.5–2.0
- direction 0–359°
- click-to-play on large preview
- current particle/instance/canvas-scale readout
- clean log
- explicit P3.13.1 status
- fresh module/cache path

Do not resume synthetic backend benchmark work until these V2 looks are accepted or a real performance blocker appears.

---

# Reference Harvest

## Particlr Explosion — HARVESTED

Public exact fixture:
- upstream: `brac/particlr-runtime/test/fixtures/explosion.prt`
- local reference copy/analysis under `references/particlr/`

Source layering:
- flash: additive `circle-soft`, count 1, life 0.15 s, size 140;
- fireball: additive `circle-soft`, burst 24, life 0.4–0.7, speed 60–160, size 18–34, gravity + drag;
- smoke: normal blend `smoke`, delayed, life 0.8–1.4, expands over life, upward drift/drag.

Particlr built-in procedural texture source:
`brac/particlr-runtime/src/texgen/index.ts`.

Generated production assets:
- `site/assets/particlr-circle-soft.png`
- `site/assets/particlr-smoke.png`

They are generated from the public deterministic MIT-licensed formulas, not invented visual approximations.

## Particlr Dust Puff — EXACT EXPORT PENDING

User selected it as a strong reference, but the public `particlr-runtime` mirror explicitly does not ship the editor monorepo `presets/` directory. Do not fabricate the preset. Acquire/export exact preset when available.

## Particlr Rain — EXACT EXPORT PENDING

Same reason as Dust Puff.

## tsParticles Ribbons — HARVESTED

Sources recorded under `references/tsparticles/`.

Official defaults include:
- count 5
- angle 45
- darken 30
- internal count 60
- drag .02
- mass 1
- oscillation distance 100–140
- oscillation speed 3–5
- particle distance 8
- inherited velocity 4–6

P3.13 Magic Burst V2 uses the real shape/plugin and adapts the spatial scale for a local gameplay cue.

## tsParticles Fireworks — HARVESTED

Useful structural lesson:

```text
launch
→ inverse-gravity rocket motion
→ height bound
→ destroy: split
→ many secondary particles
→ outward velocity + decay + fade
```

Use this later for multi-stage spell/fireball/rocket timing rather than copying a fireworks aesthetic blindly.

## Pixi Particle Emitter Rain — SUPPORTING REF

Public example uses `HardRain.png`, alpha .5, speed 3000, rotation 65°, frequency .004 and a wide rectangular spawn strip.

No `HardRain.png` production asset has been copied.

---

# Provenance / licensing

See:
- `CREDITS.md`
- `references/PROVENANCE.md`

Recorded upstream licenses:
- tsParticles — MIT
- Particlr runtime — MIT
- Pixi Particle Emitter — MIT

Particlr editor preset claims are recorded separately; exact Dust Puff/Rain exports remain pending instead of being guessed.

---

# Immediate next gates

1. **User visual review — Explosion V2**
   - does texture/layering materially beat v1?
   - ignition/peak/readability?
   - smoke breakup and scale?
   - spam/overlap?

2. **User visual review — Magic Burst V2**
   - are real ribbons clearly better than CSS ribbons?
   - direction 0/90/180/270?
   - intensity 0.5/1/2?
   - is the cue still readable when overlapping?

3. If either fails visually: effect-local art/timing changes only. Do not redesign Core.

4. After both pass:
   - acquire/export Particlr Dust Puff and Rain if possible;
   - implement Dust Puff V1;
   - implement Rain V1;
   - then revisit Fireball V2 / Critical Hit V2 using the stronger visual language.

5. Only after visual showcase quality exists:
   - production DPR/resize/orientation/device hardening;
   - raw tsParticles vs FXDeck overhead benchmark;
   - per-effect quality presets;
   - slim/custom tsParticles bundle;
   - P4 docs/package/productization.

---

# Changelog — 2026-08-19

- **P3.13.1:** added focused `visual-pass-lab.html` for clean V2 visual review.
- **P3.13.1:** Explosion V2 added and made catalog default; Particlr source-derived soft/smoke texture pipeline.
- **P3.13.1:** Magic Burst V2 added and made catalog default; real tsParticles `shape-ribbon` + motion plugin.
- **P3.13.1:** v1 Explosion and Magic Burst retained for explicit regression/version comparison.
- **P3.13.1:** production catalog smoke gate updated to assert v2 defaults and retained v1 resolution.
- **P3.13:** reference harvest/provenance phase started; Particlr Explosion + tsParticles Ribbons/Fireworks harvested; Pixi Rain supporting config recorded.
- **P3.12:** representative technical effect set completed; code-level review found no reason for Core redesign.
- Earlier accepted runtime milestones: P0 backend spike; P1 Core; P2 Heavy Impact; P3 scheduler/cancellation; Explosion; Fireball; Environment/live update; Effect Grid; Rare Reward.
