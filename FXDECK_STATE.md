# FXDeck — Project State, Roadmap & Changelog

> **Canonical project state.** Update with every material implementation change.
>
> Mandatory rules:
> - Add abstractions only after a real effect or measured failure proves the need.
> - P0 remains the raw-tsParticles performance reference.
> - Every changed browser module gets a fresh cache key before user handoff.
> - Every user-testable authored-effect iteration advances the visible `P#.x.x` build.
> - Release flow: **code → commit/push `main` → Pages workflow → live/cache verification when available → user test**.

## Current state

- **Milestone:** **P3.13 — Reference-Driven Visual Quality Pass**.
- **Last authored-effect build:** P3.12.0.
- **Hardening patches:** Critical Hit bridge P3.11.1; production catalog smoke gate P3.12.1.
- **Status:** ACTIVE — Core/runtime capability work is frozen while visual quality catches up.
- **Runtime Lab:** `site/heavy-impact-lab.html`.
- **Reference harvest:** `references/`.
- **Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1.
- **Raw reference:** `site/webfx-lab.html` — P0.3.0.

---

# Product target

FXDeck is a lightweight gameplay VFX runtime for web games. Game code triggers complete, versioned cues while FXDeck owns adapters, sequencing and lifecycle.

```text
GAME
  ↓
FXDeck.play(effect, params)
  ↓
asset/config driven cue
  ↓
particles / sprite / ribbon / DOM / screen response
```

The runtime serves the visual effect. The visual effect must not exist merely to demonstrate the runtime.

Primary visual gate:

> **Would this effect be strong enough to show in a Senior VFX / Motion Developer portfolio?**

If not, it is not finished regardless of how clean the runtime implementation is.

---

# P3.13 direction change — 2026-08-19

User review established that Football Card and Critical Hit are visually weak, while Magic Burst is the strongest recent cue but still below the desired bar. The main failure is not missing runtime capability; it is weak source art / shape language caused by over-reliance on circles, triangles, CSS gradients and improvised DOM shapes.

## New rule: reference first

For visual V2 work:

1. choose a strong source reference;
2. harvest its legal config/assets/behavior;
3. record origin and license;
4. identify what creates the visual quality: texture/sprite, blend, timing, curves, layering, trail/ribbon behavior;
5. reproduce/adapt that language in FXDeck;
6. preserve FXDeck lifecycle/API, not the old weak visuals.

Do **not** rebuild a proven textured/ribbon effect from primitives unless profiling or licensing forces it.

## Core freeze

Until the visual pass produces strong showcase effects, do not spend time on:
- new Core abstractions;
- scheduler redesign;
- generic node/timeline systems;
- extra synthetic benchmarks;
- quality tiers;
- bundle slimming;
- more unrelated archetypes.

Resume those only after visual acceptance or a measured blocker.

---

# Reference Harvest

## Particlr — Explosion

**Status: HARVESTED public runtime fixture.**

Files:
- `references/particlr/explosion-runtime-fixture.prt`
- `references/particlr/explosion-analysis.md`

Important language:
- flash: additive `circle-soft`, 0.15 s;
- fireball: 24 additive soft particles, 0.4–0.7 s, warm color decay, gravity + drag;
- smoke: real `smoke` texture, normal blend, delayed 0.05 s, 0.8–1.4 s, expands while fading;
- three distinct temporal/material layers rather than one radial burst.

**Target:** Explosion V2.

## Particlr — Dust Puff

**Status: exact editor preset export pending.**

The public `brac/particlr-runtime` mirror explicitly says monorepo `presets/` fixtures are not shipped there. Do not invent numeric settings.

File:
- `references/particlr/dust-puff.pending.md`

**Target:** Dust Puff V1.

## Particlr — Rain

**Status: exact editor preset export pending.**

File:
- `references/particlr/rain.pending.md`

Supporting exact reference while waiting:
- `references/pixi-particle-emitter/rain-reference.json`
- upstream Pixi Rain uses `HardRain.png`, 0.81 s life, 0.004 s frequency, speed 3000, alpha 0.5, fixed 65° rotation and a long thin rectangular spawn field.

**Target:** Rain V1.

## tsParticles — Ribbons

**Status: HARVESTED exact bundle defaults/runtime recipe.**

File:
- `references/tsparticles/ribbons-defaults.json`

Key defaults:
- count 5;
- ribbon internal count 60;
- drag 0.02;
- oscillation distance 100–140;
- oscillation speed 3–5;
- particle distance 8;
- velocity inherit 4–6;
- particle shape `ribbon`;
- actual ribbon plugin + motion plugin + emitter stack.

**Target:** Magic Burst V2 should use actual ribbon behavior instead of DOM/CSS imitation.

## tsParticles — Fireworks

**Status: HARVESTED exact bundle defaults/runtime recipe.**

File:
- `references/tsparticles/fireworks-defaults.json`

Important language:
- bottom emitter launches one rocket at a time;
- line/round-cap rocket follows path;
- inverse gravity launch;
- `destroy: split` triggers the detonation;
- split particles move outside, decay, fade and die independently;
- `lighter` blend creates luminous accumulation;
- structure is **launch → split/detonation → secondary decay**, not all layers at t=0.

**Target:** multi-stage language for Fireball V2 / spell launches / later explosive cues.

## Provenance

- `references/PROVENANCE.md`
- `CREDITS.md`

No third-party binary art/audio enters `site/assets/` without a provenance/license entry first.

---

# Current production effect set

1. Heavy Impact — technically accepted; visual quality not considered final showcase bar.
2. Explosion — technically accepted; **visual V2 planned from Particlr language**.
3. Fireball — moving-source archetype accepted; visual V2 later.
4. Environment Emitter — sustained/update archetype accepted.
5. Rare Reward — retained secondary reference, not current hero target.
6. Football Card Reveal — implementation complete; **visual direction rejected/frozen for now**.
7. Critical Hit — implementation complete; **visual quality rejected; V2 postponed until better slash/impact source art is chosen**.
8. Magic Burst — strongest recent cue, but **V2 planned using actual tsParticles ribbon behavior**.

`registerProductionEffects()` and the P3.12.1 catalog smoke gate still cover all eight canonical effects.

---

# Immediate roadmap

## A. Complete Reference Harvest
- [x] Particlr public Explosion fixture.
- [ ] Particlr exact Dust Puff editor export.
- [ ] Particlr exact Rain editor export.
- [x] tsParticles Ribbons exact source recipe.
- [x] tsParticles Fireworks exact source recipe.
- [x] Pixi Particle Emitter Rain supporting config.

## B. First visual rebuilds
1. **Magic Burst V2** — actual ribbon plugin/shape behavior, no fake CSS hero ribbons.
2. **Explosion V2** — flash + fire mass + delayed textured smoke + secondary breakup based on harvested Particlr language.
3. **Dust Puff V1** — after exact Particlr export.
4. **Rain V1** — after exact Particlr export, using Pixi Rain as supporting texture/motion reference.

## C. Then reassess
- Fireball V2 using improved multi-stage language;
- Critical Hit V2 only after sourcing/creating a good slash/impact sprite or flipbook;
- Football Card remains frozen until gameplay VFX hero examples meet the quality bar.

## D. Only after visual acceptance
- production resize/DPR/orientation/device matrix;
- matched raw tsParticles vs FXDeck overhead benchmark;
- per-effect low/medium/high quality policy;
- bundle slimming/custom tsParticles load;
- P4 packaging/docs/productization.

---

# Runtime topology decisions retained

## One-shot particles
- `shared-scheduled` — production default;
- `shared-direct` — diagnostic path;
- `per-play emitter` — reference path.

## Sustained particles
Environment uses one explicit sustained emitter per source.

## DOM/SVG
Use only where it is the correct authored medium. Do not use DOM primitives as a substitute for proper particle textures, spritesheets or ribbon behavior.

---

# Important measured history

- P0 Galaxy S20+: ~150 and ~400 simple particles stayed ~60 FPS; ~800 exposed the first cliff at ~57.4 avg / 30 1% low.
- Heavy Impact early: ~454 particles / 55.4 avg FPS / 20 low / 5 >20ms.
- Heavy Impact later: ~229 particles / 59.3 avg / 30 low / 1 >20ms.
- Shared-direct particle creation front-loaded CPU cost in matched tests.
- Frame-budgeted scheduled creation reduced creation spikes at the cost of longer population span.
- Representative Explosion P3.5: emitter ~57.4 avg / 30 low / 67ms debt / 4 spikes / ~611 particles; scheduled ~59.3 avg / 30 low / 17ms debt / 1 spike / ~870 particles.
- Galaxy S20+ exposed high-concurrency Fireball cost; avoidable moving-DOM/filter/trail cost was reduced.

---

# Key decisions

1. tsParticles remains the particle backend, not the public FXDeck API.
2. FXDeck Core is frozen during P3.13 visual work.
3. Reference assets/configs/behavior are preferred over re-inventing quality from primitives.
4. Every copied third-party asset/config requires provenance/license tracking.
5. Particlr exact Dust Puff/Rain values must come from real editor exports; never fabricate them.
6. Magic Burst V2 should test the actual tsParticles ribbon technology.
7. Explosion V2 should preserve the harvested layered timing/material logic, not the current weak visuals.
8. Football Card is frozen and not a hero showcase target.
9. Critical Hit V2 waits for better source art/flipbook language.
10. Performance work resumes after visual acceptance or for a real blocker.

---

# Changelog — 2026-08-19

- **P3.13 Reference Harvest:** added licensed/provenance-tracked source material under `references/`.
- Harvested Particlr public Explosion runtime fixture and layer analysis.
- Recorded Particlr Dust Puff/Rain as exact-export-pending instead of fabricating configs.
- Harvested exact tsParticles Ribbons bundle defaults + runtime recipe.
- Harvested exact tsParticles Fireworks defaults + launch/split/decay recipe.
- Harvested exact Pixi Particle Emitter Rain config as supporting Rain reference.
- Replaced old `CREDITS.md` assumption that all visuals are repository-native with a provenance-based third-party reference policy.
- **P3.12.1:** production catalog smoke gate validates all eight canonical effects.
- **P3.11.1:** Critical Hit inspector direction access fix.
- **P3.12.0:** Magic Burst implementation; no Core redesign.
- **P3.11.0:** Critical Hit implementation.
- **P3.10.1:** Football Card visual pivot.

Earlier accepted milestones: P3.9 Rare Reward; P3.8 Environment/live update; P3.7 Effect Grid/debug hierarchy; P3.6 Fireball; P3.5 scheduler experiments; P3.4 Explosion; P3.3 cancellation gate; P3.2 scheduler integration; P2 Heavy Impact; P1 Core; P0 raw tsParticles spike.
