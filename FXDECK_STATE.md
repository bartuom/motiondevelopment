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

- **Milestone:** P3 — Production Runtime Capability Completion.
- **Authored-effect build:** **P3.12.0**.
- **Hardening patches:** Critical Hit bridge **P3.11.1**; production catalog smoke gate **P3.12.1**.
- **Status:** ACTIVE — representative effect set implemented. Magic Burst, Critical Hit and Football Card still need visual acceptance. Code-level P3 exit review found no justified Core redesign.
- **Runtime Lab:** `site/heavy-impact-lab.html` — P3.12.0 authored build with current hardening patches.
- **Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1.
- **Raw reference:** `site/webfx-lab.html` — P0.3.0.

---

# Product target

FXDeck is a lightweight gameplay VFX runtime for web games. Game code triggers complete, versioned cues while FXDeck owns adapters, sequencing and lifecycle.

```text
Minimal Core
↓
Real effect
↓
Observe actual repetition / failure
↓
Extract only proven abstractions
```

Primary KPI: **how much bespoke runtime plumbing is required to add the next effect?**

---

# Production effect set

## Heavy Impact — accepted one-shot composite
- flash / sparks / debris / target recoil / screen kick;
- lifecycle and overlap cleanup validated.

## Explosion — accepted second one-shot composite
- different authored cue without Core redesign;
- reuses semantic particle bursts, ownership and screen hooks.

## Fireball — accepted moving-source archetype
- independently owned moving hero visual;
- runtime direction/intensity;
- sparse trail;
- child `Explosion` handoff;
- concurrent ownership / cleanup.

## Environment Emitter — accepted sustained archetype

```js
const source = FXDeck.play("environmentEmitter", {
  position: origin,
  direction: 270,
  intensity: 1.0
});
FXDeck.update(source, { position: nextPosition, intensity: 1.6 });
FXDeck.stop(source);
```

Proven: independent long-running sources, live position/intensity updates and explicit cleanup.

## Rare Reward — retained fantasy UI/card reference
Large DOM/SVG composition, staged Web Animations, particle accents and owned cleanup. Intentionally separate from Football Card.

## Football Card Reveal — implemented, visual acceptance pending
Persistent back-card idle → click reveal → 3D flip → staged football information → rarity hit → settled persistent front. P3.10.1 moved the art toward ivory/warm-white/metallic-gold premium football collectible language and away from astral/fantasy styling.

## Critical Hit — implemented, visual acceptance pending

```js
FXDeck.play("criticalHit", {
  position: hitPosition,
  direction: hitDirection,
  intensity: 1.0
});
```

P3.11.0 timing:
- 0 ms directional DOM slash + compact flash;
- 0 ms hero streaks;
- 6 ms shards;
- 18 ms target snap;
- 24 ms restrained screen kick;
- 34 ms small `CRIT` accent;
- 260 ms cleanup.

Essential hit readability is immediate DOM work; scheduled particles remain secondary.

### P3.11.1 inspector fix
`normalizeDirection()` returns `{ vector, degrees }`. The Critical Hit inspector incorrectly read `direction.x/y`, which could throw when the effect was selected. It now reads `direction.vector.x/y`. Authored Critical Hit behavior is unchanged.

## Magic Burst — implemented, visual acceptance pending

```js
FXDeck.play("magicBurst", {
  position: origin,
  direction: 35,
  intensity: 1.0
});
```

P3.12.0 timing:
- 0 ms asymmetric core wedge + three curved DOM ribbons;
- 18 ms primary colored mote fan;
- 42 ms restrained screen response;
- 72 ms offset secondary lobe + particle echo;
- 118 ms irregular color pulse;
- 640 ms cleanup.

Design rule: curved/directional/displaced composition, not `core + radial ring + even burst`.

---

# Production catalog

`registerProductionEffects()` now registers all eight production effects:

1. Heavy Impact
2. Explosion
3. Fireball
4. Environment Emitter
5. Rare Reward
6. Football Card Reveal
7. Critical Hit
8. Magic Burst

P3.12 fixed the earlier inconsistency where Critical Hit existed through its Runtime Lab bridge but was absent from the canonical catalog.

### P3.12.1 catalog smoke gate
`site/js/production-catalog-runtime-sync.js` now:
- imports the canonical P3.12 catalog with a fresh cache key;
- re-registers it into the live Runtime Lab after bootstrap;
- resolves all eight expected production IDs;
- writes `globalThis.FXDeckCatalogSmoke`;
- logs PASS/FAIL in the Runtime Lab console.

This regression guard exists because a real missing-catalog failure already occurred.

---

# P3 code-level exit review — 2026-08-19

## Result: **no Core redesign justified**

Critical Hit and Magic Burst were both added without changes to `FXDeckRuntime`, EffectInstance ownership, CoordinateAdapter or the particle adapter contract.

Existing proven helpers cover real runtime repetition:
- `runHook()`;
- `burstTracked()`;
- `spawnTracked()`;
- `scheduleAsync()`;
- EffectInstance timeout/cleanup ownership;
- semantic burst priority/scheduler;
- `FXDeck.update()` for real sustained/interactive cases.

### Repetition that should NOT move into Core
Critical Hit and Magic Burst have similar Runtime Lab bridge plumbing: option injection, inspector text, API preview, capture-phase click handlers and authored DOM animations. This is **tooling/presentation duplication**, not consumer runtime plumbing. Do not turn it into a Core timeline/state/visual graph.

A future Runtime Lab helper may be warranted if more effects are added to the lab, but that belongs under lab tooling, not `site/fxdeck/core`.

### Minor effect-local repetition
Small helpers such as numeric range scaling repeat across several authored effects. That is not currently expensive enough to justify a new public abstraction.

---

# Runtime topology decisions

## One-shot particles
- `shared-scheduled` — production default;
- `shared-direct` — immediate diagnostic path;
- `per-play emitter` — reference path.

## Sustained particles
Environment uses one explicit sustained emitter per source.

## DOM/SVG
Short transient hooks stay effect-local. `DomSpriteAdapter` remains for independently owned persistent/moving visuals where a real effect requires it.

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

# Remaining work

1. **User visual acceptance:** Magic Burst.
2. **User visual/readability acceptance:** Critical Hit.
3. **User visual acceptance:** Football Card P3.10.1.
4. Effect-local polish only where those reviews identify a problem.
5. Production resize / DPR / orientation / device matrix.
6. Asset/lifecycle hardening only if real tests expose a blocker.
7. Matched raw-tsParticles vs FXDeck runtime-overhead benchmark.
8. Per-effect low/medium/high quality policy from representative workloads.
9. Bundle slimming/custom tsParticles load after behavior is locked.
10. P4 productization: cleaner package/API docs, integration examples and optional schema/agent authoring layer.

Do **not** add more effect archetypes before the visual gates and production hardening unless a real product requirement proves a missing capability.

---

# P4 library status

- [x] Heavy Impact.
- [x] Explosion.
- [x] Fireball.
- [x] Environment Emitter.
- [x] Rare Reward.
- [~] Football Card Reveal — implementation complete, visual acceptance pending.
- [~] Critical Hit — implementation complete, visual acceptance pending; P3.11.1 inspector bug fixed.
- [~] Magic Burst — implementation complete, visual acceptance pending.

---

# Key decisions

1. tsParticles is backend, not public API.
2. Real effects prove abstractions before extraction.
3. Version/variant are authored; runtime params alter one play.
4. Scheduled shared bursts are default for short one-shots.
5. Every resource is owned by an EffectInstance or explicit adapter handle.
6. Fireball reuses Explosion instead of duplicating impact logic.
7. `FXDeck.update()` exists only because real sustained/interactive effects required it.
8. Effect Grid is product-level scaling; synthetic stress is advanced isolation.
9. Intensity affects authored visual energy, not only particle count.
10. Critical Hit keeps essential readability outside deferred particle work.
11. Magic Burst keeps curved/asymmetric hero motion effect-local.
12. Runtime Lab presentation duplication is not a reason to grow FXDeck Core.
13. Performance work resumes after visual acceptance or for a real blocker.
14. Every changed browser module receives a fresh cache key before handoff.

---

# Changelog — 2026-08-19

- **P3.12.1 hardening:** production catalog smoke gate validates all eight canonical effects.
- **P3.11.1 fix:** corrected Critical Hit inspector access from `direction.x/y` to `direction.vector.x/y`.
- **P3.12.0 Magic Burst:** asymmetric 640 ms stylized cue; no Core redesign.
- **P3.12.0 catalog cleanup:** Critical Hit + Magic Burst added to `registerProductionEffects()`.
- **P3.11.0 Critical Hit:** ultra-short scheduler-independent gameplay readability cue.
- **P3.10.1 Football Card:** premium ivory/gold sports collectible visual pivot.
- **P3.10.0 Football Card:** persistent interactive reveal lifecycle.

Earlier accepted milestones: P3.9 Rare Reward; P3.8 Environment/live update; P3.7 Effect Grid/debug hierarchy; P3.6 Fireball; P3.5 scheduler quality experiments; P3.4 Explosion; P3.3 cancellation gate; P3.2 scheduler integration; P2 Heavy Impact; P1 Core; P0 raw tsParticles spike.
