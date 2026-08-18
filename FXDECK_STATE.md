# FXDeck — Project State, Roadmap & Changelog

> **Canonical project state.** Update with every material implementation change.
>
> Mandatory rules:
> - Add abstractions only after a real effect or measured failure proves the need.
> - P0 remains the raw-tsParticles performance reference.
> - Every changed browser module gets a fresh cache key.
> - Every user-testable browser iteration advances the visible `P#.x.x` build.
> - Release flow: **code → commit/push `main` → Pages workflow → live/cache verification when available → user test**.

## Current state

- **Milestone:** P3 — Production Runtime Capability Completion
- **Current build:** **P3.7.2**
- **Status:** ACTIVE.
- **Runtime Lab:** `site/heavy-impact-lab.html` — P3.7.2.
- **Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1.
- **Raw reference:** `site/webfx-lab.html` — P0.3.0.
- **Primary real-effect test:** Debug / Tests → **Effect Grid Lab**.
- **Advanced diagnostics:** historical fixed-overlap, matched backend stress, synthetic backend isolation and topology A/B remain available, but are not the normal effect-scaling workflow.

### Latest validated observations

- P3.6.1 Runtime Lab UI cleanup was accepted as materially cleaner.
- Single Fireball works; runtime intensity, direction/travel and Explosion handoff work.
- P3.6.2 wall-clock clamp did not solve the actual multi-Fireball visual bug.
- P3.6.3 independent DOM projectile ownership fixed concurrent Fireball visibility.
- On Galaxy S20+ P3.6.3 exposed a real mobile scalability blocker: roughly 10 active Fireballs could fall toward ~40 FPS and ~15 toward ~30 FPS.
- P3.6.4 reduced avoidable Fireball cost: transform-only projectile movement, no moving blend/filter blur/drop-shadow, built-in visual tail, sparse ~96 ms ember samples, HUD backdrop blur removed, and `Visuals` separated from `Particles` in diagnostics.
- P3.7.0 introduced the generic Effect Grid Lab with preset real-effect instance grids, virtual-world zoom/pan/Fit and direction patterns.
- P3.7.0 desktop grid testing proved that real effects scale into meaningful heavy workloads. With Explosion selected, the HUD showed roughly 567 particles for a 3×3 / 9-instance grid. User-observed desktop scaling: 16 instances already dip below the 60 FPS ceiling, 24 are around ~55 FPS, 36 around ~50 FPS, and a 36-instance one-second loop could dip toward ~33 FPS on a high-end desktop.
- That result is not treated as a grid failure by itself: one Explosion grid batch can represent thousands of live particles and repeated cue setup. The grid is doing useful product-level load discovery.

### P3.7.1 changes

- Debug hierarchy is reorganized so **Real Effect Scaling** is the primary workflow.
- Effect Grid Lab appears first in Debug / Tests.
- **Effect Regression** is a secondary tier for real-effect A/B and lifecycle/cancellation checks.
- **Backend Diagnostics — Advanced** is collapsed by default and contains matched backend stress, synthetic isolation and the historical fixed ×6 overlap fixture.
- Grid preset/direction changes while active perform a clean respawn instead of mixing generations.
- Grid `Loop` defaults to **Replace batch**; explicit **Stack / Soak** remains available for intentional accumulation.
- Loop logging is reduced and the readout tracks cycle count.

### P3.7.2 changes

- **Effect Grid is now self-contained.** Debug / Tests no longer requires switching back to Play to choose what is being tested.
- Grid `Test setup` exposes and synchronizes:
  - real effect under test,
  - particle spawn topology,
  - runtime intensity,
  - base direction.
- Debug and Play controls are two views of the same runtime state; changes remain synchronized both ways.
- Grid exposes the three already-proven particle topology modes directly:
  - **Shared scheduled — Emission Points + scheduler** (`scheduled`) — production one-shot default;
  - **Shared direct — Emission Points immediate** (`shared`) — diagnostic immediate shared path;
  - **Per-play emitter — emitter per burst** (`emitter`) — reference topology.
- Changing topology while a grid is active performs a clean real-effect respawn so the same grid/effect/load can be compared without stale workload.
- Fireball note is explicit: its hero projectile remains an independent DOM visual; selected topology affects sparse ember bursts and the Explosion handoff. Explosion and Heavy Impact use the selected topology for their particle layers.
- Grid readout is decorated with the current topology (`scheduled EP`, `direct EP`, or `per-burst emitter`).
- The old Debug callout that instructed users to return to Play has been replaced with a statement that Debug owns the current test setup.

### Current gate

Use P3.7.2 Effect Grid Lab as the standard scaling/topology harness:

1. Stay in **Debug / Tests**.
2. Choose the real effect directly in Grid `Test setup`.
3. Keep Loop behavior on **Replace batch** for normal performance/scalability tests.
4. Test the same grid under:
   - `Shared scheduled — Emission Points + scheduler`,
   - `Shared direct — Emission Points immediate`,
   - `Per-play emitter — emitter per burst`.
5. Use representative tiers such as 2×5=10, 3×5=15, 4×6=24 and 6×6=36.
6. Record `FPS / Particles / Visuals / Instances`, selected topology and visual correctness.
7. Use **Stack / Soak** only when intentionally testing accumulated or sustained workload.

This topology comparison is now the preferred way to investigate the unexpectedly poor scaling before adding more optimization machinery. It lets the same authored effect and same spatial workload isolate whether the dominant cost comes from shared scheduled work, immediate shared creation, per-burst emitters, or simply the total authored particle workload.

For Fireball specifically, repeat the Galaxy S20+ comparison using the grid. If mobile still collapses badly across all topology modes, isolate hero visual vs sparse embers vs Explosion handoff before creating broader optimization machinery.

After Fireball mobile scalability is acceptable, continue with the sustained **Environment emitter** (`start → live update position/intensity → stop`). The same Effect Grid Lab should scale-test Environment and later Rare Reward.

---

# Product target

FXDeck is a lightweight gameplay VFX runtime for web games. Game code triggers complete, versioned cues through a small API while FXDeck owns backend topology, scheduling and lifecycle.

```js
FXDeck.play("fireball", {
  position: origin,
  direction: aimDirection,
  intensity: 1.0
});
```

FXDeck is **not** intended to become a custom particle simulator, node editor, mini-Niagara, shader graph or generic animation engine. tsParticles remains an implementation backend behind adapters.

---

# Proven architecture

## P0 — tsParticles spike — DONE

- Raw runtime emitter creation/movement/cleanup works.
- CSS/gameplay → retina-canvas positioning works.
- Image/SVG particles, DOM compositing and resize/reflow work.
- Galaxy S20+ raw reference was near 60 FPS around 150/400 simple particles and began showing a cliff around ~800.

## P1 — Minimal Core — DONE

- `FXDeck.register`, `play`, `stop`, `stopAll`.
- `EffectInstance` owns timers and cleanup callbacks.
- `CoordinateAdapter` hides CSS/canvas/DPR conversion.
- `TsParticlesAdapter` hides backend details.
- Authored `id/version/variant` are separated from runtime `position/direction/intensity`.
- Portable inspector/log/lifecycle validation passed.

## P2 — Heavy Impact — DONE

- First complete gameplay cue through one `FXDeck.play("heavyImpact")` call.
- Contact flash, directional sparks/debris, pressure-wave placeholder, target recoil and accumulated screen kick.
- Cleanup and overlap lifecycle validated.
- Visual hierarchy pass materially reduced the high-load particle peak and improved frame pacing.

## P3 — Extract only proven runtime capabilities — ACTIVE

### One-shot burst topology — ACCEPTED

- `ParticleAdapter.burst()` is semantic; effect code does not encode backend topology.
- `shared-scheduled` is the production default for short one-shot bursts.
- `shared-direct` remains a diagnostic immediate shared path.
- `per-play emitter` remains a reference path and is still relevant for sustained emitter archetypes.
- Shared work uses a persistent container, immediate seed, frame-budgeted queue and per-burst ownership.
- Heterogeneous emission-point parameters were validated.
- Heavy Impact and Explosion proved the scheduled topology visually and through real-effect tests.
- Per-instance cancellation and `stopAll()` clear queued/live shared work with no late respawn.

### Explosion / second effect — ACCEPTED

- `explosion/v1/default` added a different composite cue without Core redesign.
- Reuses the runtime, lifecycle, burst abstraction and screen-kick integration.
- Small helpers `burstTracked`, `scheduleAsync`, `runHook` were extracted only after repetition by Heavy Impact + Explosion.
- User visually preferred the scheduled Explosion path.

### Queue-aware quality — IMPLEMENTED, GENERIC TUNING DEFERRED

- Priority/backpressure machinery exists as an experimental production safeguard.
- P3.5.0 showed scheduled Explosion could materially reduce frame-time debt/spikes while carrying a heavy workload.
- P3.5.1 changed admission from current-backlog to projected-backlog pressure.
- Do not tune generic thresholds/scales unless representative final effects/mobile prove a need.

### Effect-owned assets — IMPLEMENTED

- Effect definitions can declare `assets`.
- `FXDeckRuntime.getAssets({ target })` collects/deduplicates manifests across definitions.
- `FXDeckRuntime.setAdapter(name, adapter)` supports registration/asset discovery before backend initialization.
- Runtime Lab builds particle preload ownership from registered effects instead of a manual per-file list.
- `site/fxdeck/effects/catalog.js` remains the production effect registration surface.

### Fireball moving-source archetype — ACTIVE REAL-DEVICE VALIDATION

- `fireball/v1/default` is the third real effect.
- Default travel remains ~250 px over ~560 ms; optional runtime distance/travel duration stay effect-local.
- Impact reuses the existing Explosion cue.
- Hero projectile is an independently owned `DomSpriteAdapter` visual, not a tsParticles emitter object.
- P3.6.4 moves the hero through compositor-friendly `translate3d()` and removes moving blend/filter effects.
- Built-in projectile geometry carries the main trail; tsParticles embers are sparse one-particle samples around every 96 ms.
- Fireball remains effect-local. No generic projectile framework was added.

### Runtime Lab UX — ACCEPTED / EVOLVING

- Main workbench remains Play vs Debug / Tests with persistent center Preview.
- Runtime diagnostics live as an Off / Basic / Full preview HUD.
- Basic HUD exposes FPS, tsParticles `Particles`, independent DOM `Visuals`, and active FXDeck `Instances`.
- Full HUD adds 1% low, p95/p99/worst/debt, >20 ms frames, queued work, emitters, groups, queue pressure, quality shedding, burst path and canvas scale.
- HUD avoids backdrop blur so diagnostics do not materially contaminate measured runtime cost.
- P3.7.1 separates primary real-effect scaling from advanced backend isolation.
- P3.7.2 makes Debug self-sufficient for effect/topology/intensity/direction selection.

### Effect Grid Lab — PRIMARY REAL-EFFECT SCALING HARNESS

- Grid calls normal `FXDeck.play(effect, params)` for each cell.
- Presets currently cover 4, 9, 10, 15, 16, 24, 30, 36 and 64 instances.
- Direction patterns: Same, Radial, Alternating, Seeded spread.
- Virtual logical world supports Fit Grid, 10–200% viewport zoom, mouse-wheel zoom and drag pan.
- tsParticles backing canvas remains viewport-sized while the logical world is projected across it, avoiding huge DPR-scaled debug canvases on mobile.
- Lab-only shared target/screen hooks are omitted from grid cells so cells do not fight over one target. Effect-owned particles/adapters/child effects remain real.
- Normal Loop mode replaces the previous batch; Stack / Soak is explicit advanced accumulation.
- P3.7.2 adds direct topology comparison on identical grid/effect settings.

---

# Remaining P3 capability roadmap

1. **P3.7.2 real-effect topology/scaling validation** — desktop + Galaxy S20+ using Effect Grid and identical grids across scheduled/shared/emitter paths.
2. **Environment emitter** — sustained lifetime and real live-update pressure.
3. **Effect-owned asset lifecycle hardening** — only if Fireball/Environment expose real preload/unload problems.
4. **Rare Reward** — UI/DOM + particles; test large card-sized cells through the same zoomable grid.
5. **Critical Hit / Magic Burst** — broaden short-cue authoring without new Core if possible.
6. **Only then:** broader production resize/DPR, mobile matrix, raw-vs-runtime overhead and deferred quality/backpressure tuning.

P3 exits when representative one-shot, moving and sustained effects all use the runtime without repeated Core redesign.

---

# P4 — Production VFX Library — PLANNED

- [x] Heavy Impact — short composite impact.
- [x] Explosion — multi-layer one-shot.
- [ ] Fireball — concurrency visually fixed; P3.7.2 topology/mobile scaling validation pending.
- [ ] Environment emitter — sustained/long-running.
- [ ] Rare Reward — UI/DOM + particles.
- [ ] Critical Hit — ultra-short readability.
- [ ] Magic Burst — more complex motion/noise/color.
- [ ] Track effect-specific custom code/authoring pressure.

Primary success metric: adding a new gameplay VFX should be materially simpler than hand-wiring tsParticles + DOM/sprites/lifecycle each time.

---

# Explicitly out of scope until proven necessary

- node graph/editor
- custom particle simulator
- generic curve editor
- GPU particle simulation
- mesh particle engine
- 3D renderer
- shader graph
- generic multi-backend plugin framework
- large timeline/track system
- child-effect graph system
- hot-swapping authored definitions on already-playing short cues

---

# Key decisions

1. tsParticles is a backend, not the public API.
2. Proof-first architecture: real effects drive abstractions.
3. One-shot bursts default to shared-scheduled; shared-direct and per-play-emitter remain explicit diagnostic/reference paths.
4. Shared scheduled work is bounded, fair and cancellable.
5. Effect assets belong to effect definitions, not to Runtime Lab bootstrap code.
6. Fireball reuses Explosion instead of duplicating impact logic.
7. Performance work is deferred unless a representative real effect on a target device exposes a blocker.
8. One Runtime Lab hosts all production effects; no page per effect.
9. Runtime diagnostics are a toggleable Preview HUD; dev-only controls/logs belong to Debug / Tests.
10. Lab UI concerns stay outside FXDeck Core.
11. Moving hero visuals need independent ownership and compositor-friendly movement.
12. Diagnostics must not materially distort measured runtime cost.
13. **Real-effect grid scaling is the default scalability test. Backend stress is an advanced isolation tool, not the product workflow.**
14. Repeated grid tests default to **Replace batch** so measured workload is controlled. Accumulation must be explicit through Stack / Soak.
15. Grid topology selection compares already-existing backend paths; it does not introduce a new particle engine abstraction.
16. Every user-testable iteration advances visible build/cache keys.

---

# Changelog — 2026-08-18

- **P3.7.2 — self-contained Grid setup:** added effect, particle topology, intensity and base-direction controls directly to Effect Grid; synchronized them with Play.
- **P3.7.2 — topology comparison:** exposed `shared-scheduled`, `shared-direct` and `per-play-emitter` under clear Emission Points/reference labels for identical real-effect grid tests.
- **P3.7.2 — clean topology mutation:** changing particle topology while Grid is active respawns the selected grid cleanly; Fireball topology scope is explicitly documented.
- **P3.7.1 — Debug hierarchy:** promoted Effect Grid to `Real Effect Scaling`; moved effect regression to a secondary tier; collapsed matched/synthetic backend tooling under `Backend Diagnostics — Advanced`.
- **P3.7.1 — clean grid mutation:** changing preset/direction or committing cell size while active stops the old batch and respawns the selected grid cleanly.
- **P3.7.1 — loop semantics:** default loop is `Replace batch`; explicit `Stack / Soak` is retained for intentional accumulated/sustained load.
- **P3.7.0 — Effect Grid Lab:** added real-effect grid presets, logical-world Fit, wheel zoom, drag pan, direction patterns and looping.
- **P3.7.0 — desktop scaling observation:** Explosion grid showed visible scaling cost at 16/24/36 instances; 36-instance repeated waves could dip toward ~33 FPS on a high-end desktop, confirming the grid reaches meaningful production-level load.
- **P3.6.4 — Fireball mobile concurrency pass:** transform-only projectile movement, cheaper visual, sparse trail, clean HUD diagnostics.
- **P3.6.3 — Fireball concurrent visual ownership fix:** independent `DomSpriteAdapter` handle per Fireball instance.
- **P3.6.2 — Fireball timing attempt:** clamped rendered-frame travel advancement; insufficient for the ownership bug.
- **P3.6.1 — Runtime Lab UI cleanup + runtime HUD.**
- **P3.6.0 — product-capability priority reset, effect-owned assets and initial Fireball.**
- **P3.5.x:** queue-aware priority/backpressure + projected-backlog policy; generic tuning deferred.
- **P3.4.0:** Explosion second-effect proof + multi-effect Runtime Lab + small repeated effect helpers.
- **P3.3.0:** shared-scheduled production default + cancellation gate PASS.
- **P3.2.x:** integrated scheduler, matched/heterogeneous stress and Heavy Impact A/B acceptance.
- **P3.0/P3.1:** semantic burst + Shared Emission Points prototype and population-hitch isolation.
- **P2:** Heavy Impact vertical slice accepted.
- **P1:** minimal Core accepted.
- **P0:** raw tsParticles viability/performance spike accepted.
