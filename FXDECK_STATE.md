# FXDeck — Project State, Roadmap & Changelog

> **Canonical project state.** Update with every material implementation change.
>
> Mandatory rules:
> - Add abstractions only after a real effect or measured failure proves the need.
> - P0 remains the raw-tsParticles performance reference.
> - Every changed browser module gets a fresh cache key before user handoff.
> - Every user-testable browser iteration advances the visible `P#.x.x` build.
> - Release flow: **code → commit/push `main` → Pages workflow → live/cache verification when available → user test**.

## Current state

- **Milestone:** P3 — Production Runtime Capability Completion
- **Current build:** **P3.9.0**
- **Status:** ACTIVE — Rare Reward visual validation pending.
- **Runtime Lab:** `site/heavy-impact-lab.html` — P3.9.0.
- **Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1.
- **Raw reference:** `site/webfx-lab.html` — P0.3.0.
- **Primary real-effect test:** Runtime Lab Play + Debug / Tests → **Effect Grid Lab**.
- **Advanced diagnostics:** historical overlap, matched backend stress, synthetic backend isolation and topology A/B remain available only when a real effect exposes a reason to use them.

---

# Product target

FXDeck is a lightweight gameplay VFX runtime for web games. Game code triggers complete, versioned cues through a small API while FXDeck owns backend topology, sequencing and lifecycle.

```js
FXDeck.play("rareReward", {
  position: rewardPosition,
  direction: 28,
  intensity: 1.0
});
```

FXDeck is **not** intended to become a custom particle simulator, node editor, mini-Niagara, shader graph or generic animation engine. tsParticles remains an implementation backend behind adapters.

Architecture principle:

```text
Minimal Core
↓
Real effect
↓
Observe actual repetition / failure
↓
Extract only proven abstractions
```

Primary architecture KPI: **how much bespoke runtime plumbing is required to add the next effect?**

---

# Accepted capability surface

## P0 — Raw tsParticles reference — DONE

- Runtime emitter creation/movement/cleanup works.
- CSS/gameplay → retina-canvas positioning works.
- Image/SVG particles, DOM compositing and resize/reflow work.
- Retained as the raw-backend performance/reference page.

## P1 — Minimal Core — DONE

- `FXDeck.register`, `play`, `stop`, `stopAll`.
- Authored `id/version/variant` separated from runtime `position/direction/intensity`.
- `EffectInstance` owns timers and cleanup callbacks.
- `CoordinateAdapter` hides CSS/canvas/DPR conversion.
- `TsParticlesAdapter` hides backend details.

## P2 — Heavy Impact — ACCEPTED

- First complete gameplay cue through one public `play()` call.
- Contact flash, directional sparks/debris, pressure-wave placeholder, target recoil and screen kick.
- Lifecycle/overlap cleanup validated.

## Explosion — ACCEPTED

- Second composite one-shot effect without Core redesign.
- Reuses burst abstraction, instance ownership and screen hooks.
- Proved that small helpers should only be extracted after repetition.

## Fireball — ACCEPTED MOVING-SOURCE ARCHETYPE

Proven:
- independently owned moving hero visual;
- compositor-friendly motion;
- runtime direction/intensity;
- sparse particle trail;
- child-cue handoff to `Explosion`;
- concurrent instances;
- owned cleanup;
- Effect Grid compatibility.

Remaining Fireball work is art/polish/quality scaling, not a missing runtime abstraction.

## Environment Emitter — ACCEPTED SUSTAINED ARCHETYPE

One `FXDeck.play("environmentEmitter")` = one independent long-running source.

```js
const source = FXDeck.play("environmentEmitter", {
  position: origin,
  direction: 270,
  intensity: 1.0
});

FXDeck.update(source, {
  position: nextPosition,
  intensity: 1.6
});

FXDeck.stop(source);
```

Proven:
- explicit sustained emitter ownership;
- multiple independent sources;
- live position update on the same EffectInstance;
- live intensity/emission-density update;
- direction intentionally remains spawn-time/restart-only;
- individual stop and `stopAll()` cleanup.

`FXDeck.update()` exists because this real sustained effect proved the need. Do not broaden live mutation semantics without another real requirement.

---

# P3.9.0 — Rare Reward / UI-card archetype — IMPLEMENTED, VISUAL VALIDATION PENDING

## Purpose

Rare Reward is the first intentionally portfolio-facing **UI/card-space gameplay VFX**. It proves that FXDeck is not only a world-impact/particle runtime.

Target cue:

```text
play rareReward
↓
card materialize / 3D flip-in
↓
crest + rarity lighting reveal
↓
particle preflash + shards + glitter
↓
title / reward identity reveal
↓
crown motes + sheen + subtle screen accent
↓
settle
↓
fade + owned cleanup
```

## Authored effect

`rareReward/v1/default`

- Approx authored card size: **224 × 320 CSS px**.
- Approx lifecycle: **2200 ms**.
- One independently owned composite DOM/SVG hero visual per cue.
- Inline SVG crest/rune is part of the owned visual.
- Card styling uses dark premium fantasy framing with gold/purple rarity language.
- Browser Web Animations are owned by the EffectInstance and cancelled during cleanup.
- Particle layers use the existing semantic burst abstraction:
  - hero preflash;
  - rarity shards;
  - glitter field;
  - crown/rising motes.
- Subtle screen kick reuses the existing screen hook.
- `intensity` affects card/aura scale and particle richness.
- `direction` is repurposed meaningfully as reveal-light/ray angle and also biases the shard burst.
- No new Core timeline/editor abstraction was introduced.

## Small proven DOM abstraction extension

Fireball proved an independently owned simple DOM visual. Rare Reward is the second real DOM archetype and requires composite markup.

`DomSpriteAdapter.spawn()` therefore gained only:

```js
options.textContent
options.html
```

Existing ownership, positioning, stop and stats semantics remain unchanged. This is intentionally **not** a generic UI framework.

## Grid compatibility

Rare Reward uses the same Effect Grid as every other production cue:

- normal `FXDeck.play("rareReward", params)` per cell;
- large card spacing is automatically raised to at least ~340 px when Rare Reward is selected;
- `Fit Grid`, zoom and pan remain generic Lab features;
- one-shot topology selection affects only particle accents;
- each DOM/SVG card remains independently owned regardless of particle topology;
- start with 2×2 or 3×3 for visual composition; larger grids are scalability tests, not the current gate.

## P3.9.0 current validation gate

First validate **visual composition and lifecycle**, not performance tuning:

1. Runtime Lab opens on **Rare Reward — premium card reveal**.
2. `Reveal Rare Reward` produces a clearly readable card reveal rather than just a particle burst.
3. Expected visible hierarchy:
   - card materializes/flips in;
   - gold/purple frame and aura/rays appear;
   - crest/rune becomes readable;
   - shard/glitter particle accents support the card instead of covering it;
   - reward title/rarity resolves after the initial hit;
   - card settles, then fades and cleans up.
4. `0.5×` vs `2.0×` intensity should visibly alter richness while remaining the same authored version.
5. Direction should rotate/change the reveal-light/ray orientation.
6. Rapidly trigger 2–3 reveals: each card must remain independently owned and animate correctly.
7. After natural completion or `stopAll()`:
   - card DOM visuals clean up;
   - EffectInstances clean up;
   - particle groups/work clean up.
8. Debug / Effect Grid:
   - Rare Reward appears as a selectable effect;
   - recommended cell size is at least ~340 px;
   - 2×2 / 3×3 + Fit should display full cards without arbitrary clipping.

If the visual direction is strong, accept Rare Reward as the UI/card-space archetype. If it feels weak, polish **this cue's art/timing**, not the Core.

---

# Runtime topology

## One-shot particle paths

`ParticleAdapter.burst()` remains semantic. Effect code does not hard-code backend topology.

- **Shared scheduled** — Emission Points + global frame-budgeted scheduler; production default for one-shot bursts.
- **Shared direct** — immediate shared ParticlesManager path; diagnostic reference.
- **Per-play emitter** — tsParticles emitter per burst; reference topology.

Scheduled work uses:
- persistent shared container;
- immediate seed;
- frame-budgeted queue;
- per-burst ownership;
- cancellation;
- semantic priorities/backpressure machinery.

Quality/backpressure broad tuning remains deferred until representative final effects/mobile prove it is necessary.

## Sustained path

Environment uses one explicit emitter per sustained source. One-shot topology controls are intentionally disabled for that archetype.

---

# Runtime Lab UX

- One Runtime Lab for all effects; no page per effect.
- Play vs Debug / Tests with persistent center Preview.
- Runtime HUD: Off / Basic / Full.
- **HUD Off = clean Preview**, including diagnostic reticles/markers/caption.
- Basic HUD: FPS / Particles / Visuals / Instances.
- Full HUD adds percentile frame metrics, queue state, emitters/groups, quality state, burst path and canvas scale.
- Diagnostics avoid backdrop blur to reduce measurement contamination.

## Effect Grid Lab

Primary real-effect scaling harness:
- grid presets from small to high concurrency;
- real `FXDeck.play()` per cell;
- cell-size control;
- Same / Radial / Alternating / Seeded direction patterns;
- Fit Grid;
- 10–200% zoom;
- mouse-wheel zoom and drag pan;
- Replace batch loop default;
- explicit Stack / Soak mode;
- effect-aware logical safe world so authored travel/halo can extend beyond cell centers without being clipped by cell bounds.

Backend stress tools remain advanced diagnostics, not normal product workflow.

---

# Important measured history

These measurements explain prior architectural decisions; they are **not** the current gate.

- Heavy Impact early load: ~454 particles / ~55.4 avg FPS / ~20 FPS 1% low / 5 frames >20 ms.
- Heavy Impact later pass: ~229 particles / ~59.3 avg / ~30 low / 1 frame >20 ms.
- Matched high-load testing showed shared-direct particle creation front-loaded significant synchronous CPU work.
- Frame-budgeted scheduled creation eliminated the tested spawn spikes at the cost of longer total population time.
- Explosion P3.5 representative A/B:
  - emitter: ~57.4 avg / 30 low / 67 ms frame-time debt / 4 spikes / ~611 peak particles;
  - scheduled: ~59.3 avg / 30 low / 17 ms debt / 1 spike / ~870 peak particles.
- Galaxy S20+ exposed a real high-concurrency Fireball scalability concern; avoidable DOM/filter/trail costs were reduced, while broader tuning remains deferred.
- Desktop Explosion Effect Grid proved real authored workloads can reach thousands of particles; large grids are intentionally meaningful stress loads.

---

# Remaining P3 roadmap

1. **P3.9.0 Rare Reward visual validation / effect-local polish if needed.**
2. **Critical Hit** — ultra-short readability cue; should reuse existing runtime with almost no new plumbing.
3. **Magic Burst** — richer motion/noise/color cue; use it to expose any final authoring pressure.
4. **Effect-owned asset lifecycle hardening** only if the representative effects expose a real problem.
5. **Then:** production resize/DPR hardening, target-device matrix, raw-vs-runtime overhead, deferred quality/backpressure tuning.

P3 exits when representative one-shot, moving, sustained and UI/card-space effects all run through FXDeck without repeated Core redesign.

---

# P4 production VFX library status

- [x] Heavy Impact — composite impact baseline.
- [x] Explosion — multi-layer one-shot baseline.
- [x] Fireball — moving-source baseline accepted.
- [x] Environment Emitter — sustained-source baseline accepted.
- [~] Rare Reward — implementation complete, visual acceptance pending.
- [ ] Critical Hit — ultra-short readability.
- [ ] Magic Burst — richer stylized burst.

---

# Explicitly out of scope until proven necessary

- node graph/editor;
- custom particle simulator;
- generic curve editor;
- GPU particle simulation;
- mesh particle engine;
- 3D renderer;
- shader graph;
- generic multi-backend plugin framework;
- large timeline/track system;
- generic child-effect graph system;
- hot-swapping authored definitions on already-playing short cues.

---

# Key decisions

1. tsParticles is a backend, not the public API.
2. Proof-first architecture: real effects drive abstractions.
3. Version/variant are authored; position/direction/intensity are runtime.
4. One-shot bursts default to shared-scheduled; shared-direct and per-play-emitter remain explicit references.
5. Shared scheduled work is bounded, fair and cancellable.
6. Effects own their assets and lifecycle.
7. Fireball reuses Explosion rather than duplicating impact logic.
8. Moving hero visuals need independent ownership and compositor-friendly movement.
9. `FXDeck.update()` exists only because a real sustained effect required it.
10. Live semantics are effect-owned; do not claim a parameter is live when backend recreation is required.
11. Environment `play()` creates a source; Environment `update()` mutates that source.
12. Runtime diagnostics are Lab concerns, not Core concerns.
13. HUD Off must not leave debug overlays that can be mistaken for authored content.
14. Real-effect Grid is the default scalability tool; backend stress is advanced isolation.
15. Grid repeated tests default to Replace batch; accumulation must be explicit.
16. Cell bounds are not authored VFX clip bounds.
17. Rare Reward proves composite DOM/SVG visual ownership before any generic UI abstraction is considered.
18. Performance optimization resumes only when a representative effect exposes a product-relevant blocker.
19. Every user-testable iteration advances visible build/cache keys and is pushed to `main`.

---

# Changelog — 2026-08-18

- **P3.9.0 — Rare Reward:** added first large UI/card-space production cue with card flip/materialize, inline SVG crest, rarity frame, aura/rays, sheen, title reveal, particle accents, subtle screen kick, settle/fade and owned cleanup.
- **P3.9.0 — composite DOM visual:** minimally extended `DomSpriteAdapter` with static `html/textContent` initialization after the second real DOM archetype proved the need.
- **P3.9.0 — parameter semantics:** intensity controls reward richness; direction controls reveal-light/ray orientation and shard bias.
- **P3.9.0 — Grid integration:** Rare Reward participates in the existing real-effect Grid; large-card spacing is raised automatically and particle topology remains independent from card ownership.
- **P3.8.2 — HUD Off semantics:** Off hides diagnostic metric panel, caption, reticles, Environment source markers and Grid zoom chip while authored VFX remain visible.
- **P3.8.2 — Environment accepted:** sustained-source baseline accepted after user confirmation of live intensity and stop cleanup.
- **P3.8.1 — Environment multi-source UI + clearer live density.**
- **P3.8.0 — Environment Emitter + `FXDeck.update()` live-mutation proof.**
- **P3.7.x — generic Effect Grid, debug hierarchy, topology controls, safe world/zoom/pan.**
- **P3.6.x — effect-owned assets + Fireball moving-source capability/concurrency fixes.**
- **P3.5.x — queue-aware quality/backpressure experiments; broad tuning deferred.**
- **P3.4.0 — Explosion second-effect proof.**
- **P3.3.0 — shared-scheduled production default + cancellation gate.**
- **P3.2.x — integrated scheduler + matched/heterogeneous validation.**
- **P3.0/P3.1 — semantic burst + Emission Points/shared topology experiments.**
- **P2 — Heavy Impact vertical slice.**
- **P1 — minimal Core.**
- **P0 — raw tsParticles viability/performance reference.**
