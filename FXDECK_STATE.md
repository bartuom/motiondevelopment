# FXDeck — Canonical Project State

> Update after material implementation changes.
>
> Rules:
> - visual reference first;
> - runtime serves the effect, not the reverse;
> - no Core abstraction without a real repeated need;
> - preserve P0 raw-tsParticles as the performance baseline;
> - version visual experiments instead of silently overwriting them;
> - record provenance/license for reference-derived material;
> - use a fresh browser cache key for every handoff.

## Current state — 2026-08-19

- **Milestone:** **P3.14 — Reference Fidelity Pass**.
- **Current user-testable build:** **P3.14.0**.
- **Canonical Runtime Lab:** `site/heavy-impact-lab.html`.
- **Core/runtime capability work:** FROZEN while visual quality catches up.
- **Current visual decision:** custom Explosion V2 and Magic Burst V2 are **experimental / visually rejected for showcase quality**.
- **Primary calibration targets now available in the Runtime Lab selector:**
  - `SOURCE — Particlr Explosion exact`
  - `SOURCE — tsParticles Ribbons exact`
  - `SOURCE — tsParticles Fireworks exact`

## Why P3.14 exists

P3.13 proved that merely harvesting configuration ideas was not enough. Two custom rebuilds technically worked but lost the visual quality of their references:

- Explosion V2 copied the broad `flash + fireball + smoke` structure but did not preserve the actual source presentation strongly enough.
- Magic Burst V2 used the real ribbon shape but forced it into a short local burst that no longer read like the source Ribbons effect.

New hard rule:

```text
GOOD SOURCE REFERENCE
        ↓
EXACT SOURCE REPRODUCTION IN OUR LAB
        ↓
USER VISUAL ACCEPTANCE
        ↓
ONE CHANGE AT A TIME
        ↓
FXDeck adaptation
```

Do not jump directly from a reference to a custom gameplay reinterpretation again.

---

# P3.14 calibration harness

The canonical Runtime Lab remains:

`site/heavy-impact-lab.html`

P3.14 adds an isolated source-reference iframe so third-party reference runtimes cannot interfere with the production FXDeck tsParticles container.

Files:
- `site/reference-fidelity-frame.html`
- `site/js/reference-fidelity-frame.js`
- `site/js/reference-fidelity-runtime-bridge.js`
- `site/reference-data/particlr-explosion.prt`

The iframe is deliberate: fidelity references must run with their source runtime/bundle, not through the FXDeck adapter first.

## SOURCE — Particlr Explosion exact

Source:
- upstream: `brac/particlr-runtime/test/fixtures/explosion.prt`
- deployed calibration copy: `site/reference-data/particlr-explosion.prt`
- renderer: `@particlr/runtime@0.8.0` + PixiJS 8.19.0
- deterministic seed: `1337`

Exact fixture layers:

```text
flash
- circle-soft
- additive
- count 1
- life 0.15 s
- size 140

fireball
- circle-soft
- additive
- burst 24
- life 0.4–0.7 s
- speed 60–160
- size 18–34
- gravity y=40
- drag 2.5

smoke
- smoke texture
- normal blend
- rate 20/sec
- delay 0.05 s
- life 0.8–1.4 s
- speed 10–40
- size 30–60
- gravity y=-20
- drag 1.5
```

This is now the baseline for judging any future FXDeck Explosion V3/custom adaptation.

## SOURCE — tsParticles Ribbons exact

Runtime:
- official `@tsparticles/ribbons@4.3.2` bundle

Exact harvested source options:

```text
count: 5
emitter width: 100%
positionX: 50
ribbon count: 60 points
drag: 0.02
mass: 1
oscillationDistance: 100–140
oscillationSpeed: 3–5
particleDist: 8
velocityInherit: 4–6
scalar: 1
```

This source effect is a calibration target only. Do not call a short local adaptation “Magic Burst” until the source quality has first been preserved.

## SOURCE — tsParticles Fireworks exact

Runtime:
- official `@tsparticles/fireworks@4.3.2` bundle

Harvested Playground settings:

```text
background: #0a1026
colors: white / gold / cyan / pink
sounds: false
rate: 2–4
speed: 10–25
```

Source temporal model:

```text
launch
→ upward rocket
→ minimum-height gate
→ destroy: split
→ 100 secondary particles
→ additive/lighter breakup
→ decay + fade
```

This is the baseline for future Fireball/rocket/spell sequencing work.

---

# Existing FXDeck architecture — still valid

Already proven:
- `FXDeckRuntime`
- `EffectInstance` lifecycle/ownership
- `CoordinateAdapter`
- `TsParticlesAdapter`
- version + variant catalog
- per-play emitter path
- shared-direct diagnostic path
- shared-scheduled production path
- semantic priority/backpressure
- sustained `update()` effects
- explicit `stop` / `stopAll`

**No Core redesign is justified by P3.14.**

The problem is visual fidelity/content, not missing runtime abstraction.

---

# Production/custom effects status

- Heavy Impact v1 — technically accepted; not showcase hero.
- Fireball v1 — technically accepted moving-source archetype; visual upgrade pending.
- Environment Emitter v1 — technically accepted sustained/updateable archetype.
- Rare Reward v1 — retained, not hero target.
- Football Card Reveal v1 — visually rejected/frozen.
- Critical Hit v1 — visually rejected; wait for stronger slash/impact source art.
- Explosion v1 — legacy primitive-heavy version.
- Explosion v2 — reference-inspired experiment; **not visually accepted**.
- Magic Burst v1 — legacy CSS/DOM ribbon experiment.
- Magic Burst v2 — real ribbon plugin experiment; **not visually accepted**.

Do not polish rejected custom effects before source fidelity is accepted.

---

# P0 mobile baseline

Technology spike passed.

Galaxy S20+ 5G reference:

```text
~150 simple particles   60.0 avg / 59.5 1% low
~400 simple particles   60.0 avg / 59.9 1% low
~800 simple particles   57.4 avg / 30.0 1% low
```

Keep for later raw-tsParticles vs FXDeck overhead comparison.

---

# Reference harvest status

- Particlr Explosion — exact public fixture harvested and now directly rendered in P3.14.
- Particlr Dust Puff — exact editor export still pending; do not fabricate.
- Particlr Rain — exact editor export still pending; do not fabricate.
- tsParticles Ribbons — exact source defaults harvested and direct bundle playback added.
- tsParticles Fireworks — exact source/Playground recipe harvested and direct bundle playback added.
- Pixi Particle Emitter Rain — exact numeric supporting reference recorded; `HardRain.png` not promoted yet.

See `references/PROVENANCE.md` for license/provenance.

---

# Immediate gate

User must now judge the **SOURCE** entries first:

1. Particlr Explosion exact — does it actually match the quality/reference the user had in mind?
2. tsParticles Ribbons exact — does it look like the good Playground Ribbons example?
3. tsParticles Fireworks exact — does it look like the good Playground Fireworks example?

Only after those are confirmed:

```text
Particlr Explosion exact
→ Explosion V3 adaptation

Ribbons exact
→ Magic/energy adaptation

Fireworks exact
→ Fireball / staged spell adaptation
```

Change one visual/behavioral dimension at a time and compare against the exact source after every step.

---

# Changelog — 2026-08-19

- **P3.14.0:** source-fidelity calibration added to canonical Runtime Lab.
- **P3.14.0:** exact Particlr Explosion fixture promoted to browser calibration data and rendered through `@particlr/runtime@0.8.0` + PixiJS.
- **P3.14.0:** official tsParticles Ribbons bundle playback added with harvested exact defaults.
- **P3.14.0:** official tsParticles Fireworks bundle playback added with harvested Playground settings.
- **P3.14.0:** source references run in an isolated iframe so they do not mutate the production FXDeck engine.
- **P3.14.0:** canonical boot opens the exact Particlr Explosion reference first.
- **P3.13.x:** custom Explosion V2 / Magic Burst V2 experiments implemented; both later rejected as insufficiently faithful visually.
