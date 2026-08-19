# FXDeck — Canonical Project State

> Update after material implementation changes.

## Current state — 2026-08-19

- **Milestone:** **P3.15 — Native Reference Integration**.
- **Current user-testable build:** **P3.15.0**.
- **Canonical Runtime Lab:** `site/heavy-impact-lab.html`.
- **Core/runtime capability work:** FROZEN while visual quality catches up.
- **Particle architecture remains:** `FXDeck → TsParticlesAdapter → tsParticles`.
- **Important correction:** P3.14's isolated iframe/source-runtime calibration was the wrong main-lab workflow and is retired from the canonical Runtime Lab.

## Architecture rule

FXDeck is **not** a replacement particle engine.

```text
GAME
  ↓
FXDeck
  ↓
TsParticlesAdapter
  ↓
one persistent transparent tsParticles container
```

Reference examples should be harvested into this backend whenever technically possible. Do not spin up a second tsParticles container or standalone demo just to reproduce a tsParticles example.

## P3.15 reference recipes

The Runtime Lab selector now adds:

- `REF — tsParticles Ribbons / FXDeck canvas`
- `REF — tsParticles Fireworks / FXDeck canvas`

Both run on the **existing `FXDeckLab.particleAdapter.container`**.

### Ribbons

Source: official `@tsparticles/ribbons@4.3.2` recipe.

Integrated via the same container's `addEmitter()`:

```text
count: 5
emitter: top / width 100%
shape: ribbon
ribbon points: 60
drag: 0.02
oscillationDistance: 100–140
oscillationSpeed: 3–5
velocity: 4–6
```

No iframe. No second canvas. No external runtime boot.

### Fireworks

Source: official `@tsparticles/fireworks@4.3.2` recipe.

Integrated into the existing container:

```text
bottom emitter
→ line rocket
→ inverse gravity
→ top bound 10–30%
→ destroy: split
→ 100 fragments
→ lighter blend
→ 0.5–1.0 s decay
```

The standalone demo's blue background is intentionally **not** copied. FXDeck retains its own transparent gameplay stage.

## Particlr

Particlr is a different runtime, so it is now treated as **reference/config/art research only** inside the canonical FXDeck workflow.

The public Explosion fixture remains harvested under `references/particlr/`, but the Particlr runtime is no longer booted inside the main Runtime Lab. If a Particlr preset is worth reproducing, translate its assets/config/timing into the FXDeck/tsParticles backend and label the result as an adaptation rather than claiming exact runtime fidelity.

The previous P3.14 Particlr iframe error (`Extension type batcher already has a handler`) is therefore no longer relevant to the canonical path.

## Visual status

- Heavy Impact v1 — technically accepted; not showcase hero.
- Fireball v1 — technically accepted moving-source archetype.
- Environment Emitter v1 — technically accepted sustained archetype.
- Critical Hit v1 — visually rejected.
- Football Card Reveal v1 — visually rejected/frozen.
- Explosion v2 — experimental reference adaptation; visually rejected so far.
- Magic Burst v2 — experimental ribbon adaptation; visually rejected so far.
- Ribbons native reference — calibration/reference recipe on the real FXDeck backend.
- Fireworks native reference — calibration/reference recipe on the real FXDeck backend.

## Immediate next gate

1. Verify P3.15 native Ribbons in the canonical Runtime Lab.
2. Verify P3.15 native Fireworks in the same stage/background as every other FXDeck effect.
3. If these look correct, derive gameplay effects from them **one change at a time**.
4. For Particlr Explosion/Dust Puff/Rain, obtain exact editor exports/assets where possible, then translate them to tsParticles rather than adding Particlr as a second production runtime.

## P0 performance baseline

Galaxy S20+ 5G:

```text
~150 simple particles   60.0 avg / 59.5 1% low
~400 simple particles   60.0 avg / 59.9 1% low
~800 simple particles   57.4 avg / 30.0 1% low
```

Keep for later raw-tsParticles vs FXDeck overhead comparison.

## Changelog

- **P3.15.0:** retired isolated source iframe from canonical workflow.
- **P3.15.0:** Ribbons recipe moved onto the existing FXDeck tsParticles container.
- **P3.15.0:** Fireworks launch/split recipe moved onto the existing FXDeck tsParticles container.
- **P3.15.0:** standalone Fireworks background removed; Runtime Lab background remains canonical.
- **P3.15.0:** Particlr returned to reference-only status for the main FXDeck runtime.
- **P3.14.x:** source-fidelity iframe experiment; useful diagnosis, wrong production/main-lab integration model.
