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
- **Current build:** **P3.10.0**
- **Status:** ACTIVE — Football Card Reveal visual/motion validation pending.
- **Runtime Lab:** `site/heavy-impact-lab.html` — P3.10.0.
- **Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1.
- **Raw reference:** `site/webfx-lab.html` — P0.3.0.
- **Primary real-effect test:** Runtime Lab Play + Debug / Tests → **Effect Grid Lab**.
- **Advanced diagnostics:** historical overlap, matched backend stress, synthetic backend isolation and topology A/B remain available only when a real effect exposes a reason to use them.

---

# Product target

FXDeck is a lightweight gameplay VFX runtime for web games. Game code triggers complete, versioned cues through a small API while FXDeck owns backend topology, sequencing and lifecycle.

```js
const card = FXDeck.play("footballCardReveal", {
  version: "v1",
  variant: "elite",
  position: cardPosition,
  direction: 24,
  intensity: 1.0
});

FXDeck.update(card, { state: "reveal" });
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
- Authored `id/version/variant` separated from runtime parameters.
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

`FXDeck.update()` exists because a real sustained effect proved the need. Do not broaden live mutation semantics without another real requirement.

---

# P3.9.0 — Rare Reward / fantasy UI-card archetype — RETAINED REFERENCE

Rare Reward remains a separate portfolio-facing fantasy reward cue rather than being replaced by the football-card direction.

`rareReward/v1/default` proves:
- large owned DOM/SVG hero visual;
- staged Web Animations owned by EffectInstance;
- rarity frame / aura / rays / sheen;
- particle accents through the existing burst abstraction;
- intensity-driven richness;
- direction-driven reveal-light orientation;
- card-space compatibility with Runtime Lab / Grid.

User feedback: the cue is visually good as a baseline, but its fantasy relic concept is not the primary portfolio target for football-game motion work. Therefore it stays as an independent effect/reference while the new football-card cue is developed separately.

The small `DomSpriteAdapter.spawn()` extension (`html` / `textContent`) remains justified by multiple real DOM visual archetypes and is not a generic UI framework.

---

# P3.10.0 — Football Card Reveal — IMPLEMENTED, VISUAL VALIDATION PENDING

## Purpose

`footballCardReveal/v1/elite` targets a premium collectible-football pack opening rather than a generic fantasy reward.

The key difference is **interaction and anticipation**:

```text
play()
↓
BACK CARD IDLE
↓
intermittent shimmer + subtle pulse
↓
CLICK / update(state:"reveal")
↓
anticipation + elite tell
↓
3D flip
↓
edge flash / streak hit
↓
front shell
↓
information cascade
↓
rarity hit
↓
settle
↓
PERSISTENT REVEALED CARD
```

## Authored card

- `id`: `footballCardReveal`
- `version`: `v1`
- `variant`: `elite`
- Approx card size: **246 × 354 CSS px**.
- Generic fictional player content avoids copying licensed EA/FIFA card assets:
  - rating `92`;
  - position `ST`;
  - fictional nationality/club language;
  - generic inline SVG football-player portrait;
  - player name `ADRIAN NOVAK`;
  - six football stats.
- Dark navy / graphite sports-card back with geometric/stadium motifs.
- Front uses gold + cool-blue elite language rather than the existing Rare Reward fantasy purple theme.

## Idle behavior

`FXDeck.play("footballCardReveal")` creates a **persistent back card**, not an immediate autoplay reveal.

Idle owns:
- subtle ~1% breathing/pulse;
- tiny vertical float;
- intermittent narrow specular shimmer with intentional quiet time between sweeps;
- low-energy aura;
- premium back-card emblem/pattern.

The card remains alive until reveal or explicit stop.

## Reveal trigger

The same EffectInstance is revealed through live state:

```js
FXDeck.update(card, { state: "reveal" });
```

This reuses the already-proven `FXDeck.update()` mechanism without adding a generic state-machine/event framework.

Runtime Lab interaction:
- `Spawn Football Card` creates an idle back card;
- clicking that card reveals that exact instance;
- clicking empty Preview creates another card;
- `Reveal active` exists as an explicit Lab control;
- multiple independent cards can coexist;
- `Remove active` and `Stop All` use normal ownership cleanup.

## Reveal choreography

Approx click-relative timing:

- `0–110 ms` — anticipation / micro scale / energy charge;
- `80 ms` — elite tell: back border shifts toward gold;
- `110 ms` — 3D Y flip starts;
- `320 ms` — hero edge flash, streaks/sparks and subtle screen kick;
- `340 ms` — front shell visible;
- `430 ms` — nationality;
- `510 ms` — position;
- `590 ms` — club;
- `670 ms` — rating hit;
- `750 ms` — masked player portrait reveal;
- `840 ms` — player name;
- `~920 ms` — stats;
- `930 ms` — elite rarity border/energy hit + shard burst;
- `1000 ms` — secondary glitter accent;
- `1050–1420 ms` — settle overshoot/bounce;
- `1420+ ms` — persistent final idle.

The information cascade intentionally treats football metadata as part of the motion instead of showing the whole face in one frame.

## Parameter semantics

### `intensity`

Unlike the initial Rare Reward pass, Football Card intensity affects the **whole reveal energy**, not only particle count:
- particle accent count;
- edge flash alpha;
- border/glow energy;
- anticipation / scale overshoot;
- screen-kick amplitude;
- rarity-hit energy.

Timing remains essentially authored/fixed across intensity levels.

### `direction`

Direction is effect-specific and means:
- shimmer/light-sweep angle;
- reveal-light orientation;
- particle streak/shard bias.

It is not card travel.

## Ownership / lifecycle

- One independently owned double-sided DOM/SVG visual per EffectInstance.
- Back and front live inside one 3D flipper.
- All Web Animations are EffectInstance-owned and cancelled on cleanup.
- Particle edge/rarity accents reuse semantic burst topology.
- The revealed front intentionally remains alive/readable until `FXDeck.stop(card)` or `stopAll()`.
- No generic timeline, card framework, state machine or parallax abstraction was added.

## Audio seam

Effect-local hook `footballCardBeat` exposes authored beat names:
- `edge-hit`;
- `rarity-hit`;
- `settled`.

No audio engine or generic sequencing system was added. The seam exists so portfolio sound can be attached later without rewriting reveal timing.

## Grid note

Football Card is selectable in the shared Debug/Grid effect selector and its Play bridge raises large-card spacing to ~380 px when available. The primary P3.10.0 gate is **single/multi-card interaction and reveal quality**, not Grid/performance tuning. Grid-wide synchronized reveal behavior can be hardened after visual acceptance if needed.

## P3.10.0 validation gate

Validate motion/feel first:

1. Runtime Lab opens on **Football Card Reveal — interactive elite pack**.
2. `Spawn Football Card` produces a readable premium **back** card that does not auto-flip.
3. Back idle has subtle pulse/float plus intermittent shimmer; it should feel premium rather than noisy.
4. Clicking the card reveals the same instance.
5. Reveal should clearly read as:
   - anticipation;
   - 3D flip;
   - strong but short midpoint hit;
   - staged metadata;
   - player/rating focus;
   - elite rarity accent;
   - controlled settle.
6. Final front stays visible/readable after settle.
7. `0.5×`, `1.0×`, `2.0×` intensity should change overall reveal energy, not just particle count.
8. Light-angle slider should visibly affect shimmer/reveal direction before reveal.
9. Spawn 2–3 cards in different positions and reveal them independently.
10. `Remove active` / `Stop All` must remove owned DOM/particle resources cleanly.
11. Judge art/timing before any performance work.

If the motion direction is strong, accept Football Card as the primary portfolio UI interaction archetype. If weak, polish **this effect's choreography/art**, not Core.

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

1. **P3.10.0 Football Card Reveal visual/motion validation and effect-local polish.**
2. **Optional P3.10.x interaction polish** — subtle pointer parallax / reactive foil only if the reveal already works without it.
3. **Critical Hit** — ultra-short readability cue; should reuse existing runtime with almost no new plumbing.
4. **Magic Burst** — richer motion/noise/color cue; use it to expose any final authoring pressure.
5. **Effect-owned asset lifecycle hardening** only if the representative effects expose a real problem.
6. **Then:** production resize/DPR hardening, target-device matrix, raw-vs-runtime overhead, deferred quality/backpressure tuning.

P3 exits when representative one-shot, moving, sustained and UI/card-space effects all run through FXDeck without repeated Core redesign.

---

# P4 production VFX library status

- [x] Heavy Impact — composite impact baseline.
- [x] Explosion — multi-layer one-shot baseline.
- [x] Fireball — moving-source baseline accepted.
- [x] Environment Emitter — sustained-source baseline accepted.
- [x] Rare Reward — retained fantasy UI/card reveal reference.
- [~] Football Card Reveal — implementation complete, portfolio visual acceptance pending.
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
- generic card UI framework;
- generic state machine for effects;
- hot-swapping authored definitions on already-playing short cues.

---

# Key decisions

1. tsParticles is a backend, not the public API.
2. Proof-first architecture: real effects drive abstractions.
3. Version/variant are authored; gameplay parameters are runtime.
4. One-shot bursts default to shared-scheduled; shared-direct and per-play-emitter remain explicit references.
5. Shared scheduled work is bounded, fair and cancellable.
6. Effects own their assets and lifecycle.
7. Fireball reuses Explosion rather than duplicating impact logic.
8. Moving hero visuals need independent ownership and compositor-friendly movement.
9. `FXDeck.update()` was introduced because Environment required real live mutation and can be reused by another proven interactive requirement without inventing a new state system.
10. Live semantics are effect-owned; do not claim a parameter is live when backend recreation is required.
11. Environment `play()` creates a source; Environment `update()` mutates that source.
12. Football Card `play()` creates the idle collectible; `update({state:"reveal"})` triggers authored reveal on the same instance.
13. Runtime diagnostics are Lab concerns, not Core concerns.
14. HUD Off must not leave debug overlays that can be mistaken for authored content.
15. Real-effect Grid is the default scalability tool; backend stress is advanced isolation.
16. Grid repeated tests default to Replace batch; accumulation must be explicit.
17. Cell bounds are not authored VFX clip bounds.
18. Rare Reward and Football Card prove composite DOM/SVG ownership before any generic UI/card abstraction is considered.
19. Intensity must affect authored visual energy meaningfully, not be reduced to particle-count scaling.
20. Performance optimization resumes only when a representative effect exposes a product-relevant blocker.
21. Every user-testable iteration advances visible build/cache keys and is pushed to `main`.

---

# Changelog — 2026-08-19

- **P3.10.0 — Football Card Reveal:** added a separate football pack-opening cue instead of replacing Rare Reward.
- **P3.10.0 — interactive lifecycle:** `play()` creates persistent idle back card; the same EffectInstance reveals through `FXDeck.update(card,{state:"reveal"})` and remains as a readable front until stop.
- **P3.10.0 — premium back idle:** added subtle pulse/float, intermittent specular shimmer, stadium/geometric back design and elite pre-reveal tell.
- **P3.10.0 — reveal choreography:** anticipation → 3D flip → midpoint edge hit → nationality/position/club/rating/portrait/name cascade → rarity hit → settle → final idle.
- **P3.10.0 — football front:** fictional 92 ST player card with generic portrait, club/nationality language and six football stats; no licensed EA/FIFA card assets copied.
- **P3.10.0 — intensity semantics:** intensity now influences flash, glow, overshoot, screen kick and particle accents across the whole football reveal.
- **P3.10.0 — direction semantics:** direction acts as shimmer/reveal-light angle and particle bias.
- **P3.10.0 — audio seam:** added effect-local `footballCardBeat` hooks for future edge-hit / rarity-hit / settled audio without a generic audio framework.
- **P3.10.0 — Runtime Lab:** added Spawn / click-to-reveal / Reveal active / Remove active interaction and football-card inspector/API preview.
- **P3.10.0 — Debug integration:** Football Card appears in the shared effect selector; large-card spacing is raised by the Play bridge when the Grid is present.

# Changelog — 2026-08-18

- **P3.9.0 — Rare Reward:** first large UI/card-space cue with card flip/materialize, inline SVG crest, rarity frame, aura/rays, sheen, title reveal, particle accents and owned cleanup.
- **P3.9.0 — composite DOM visual:** minimally extended `DomSpriteAdapter` with static `html/textContent` initialization after the second real DOM archetype proved the need.
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
