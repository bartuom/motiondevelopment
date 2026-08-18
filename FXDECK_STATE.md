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
- **Current build:** **P3.6.3**
- **Status:** ACTIVE.
- **Runtime Lab:** `site/heavy-impact-lab.html` — P3.6.3.
- **Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1
- **Raw reference:** `site/webfx-lab.html` — P0.3.0
- **Current gate:** Fireball multi-instance visual/lifecycle correctness. Performance tuning remains deferred.
- **P3.6.1 user validation:** Runtime Lab UI cleanup works and is materially cleaner. Single Fireball works; runtime intensity works; direction/travel/Explosion handoff are functional.
- **P3.6.2 user validation:** clamping Fireball wall-clock advancement did not fix the actual concurrency bug. With more than one Fireball active, projectile visuals still failed to remain independently visible.
- **P3.6.3 architectural fix:** Fireball no longer uses tsParticles emitter instances as the projectile head. Each Fireball owns an independent DOM visual handle through `DomSpriteAdapter`; its trail is emitted as small semantic particle bursts sampled along the flight path. Explosion remains the impact cue. This removes visual ownership/lookup coupling between concurrent projectile instances while preserving the public `FXDeck.play("fireball")` API.
- **Next action:** on live **P3.6.3**, launch several Fireballs quickly or use Debug / Tests → `Overlap ×6 + perf` only as a convenient multi-instance launcher. Verify that multiple projectile heads are visible simultaneously, maintain their own directions, leave separate trails, then trigger Explosion at their own endpoints. Benchmark numbers are not the gate.
- **After Fireball:** implement a sustained **Environment emitter** with `start → live update position/intensity → stop`. That real sustained effect decides whether first-class live `EffectInstance` updates are needed.

## Product target

FXDeck is a lightweight gameplay VFX runtime for web games. Game code should trigger complete, versioned cues through a small API while FXDeck owns backend topology, scheduling and lifecycle.

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
- Raw benchmark established the mobile/backend envelope; Galaxy S20+ was near 60 FPS around 150/400 particles and began showing a cliff around 800.

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
- Visual hierarchy pass reduced the high-load desktop case from the earlier ~454-particle baseline to ~229 peak with cleaner frame pacing.

## P3 — Extract only proven runtime capabilities — ACTIVE

### One-shot burst topology — ACCEPTED

- `ParticleAdapter.burst()` is semantic; effect code does not encode backend topology.
- `shared-scheduled` is the production default for short one-shot bursts.
- Explicit emitter mode remains available for sustained emitter archetypes.
- Shared work uses a persistent container, immediate seed, fair frame-budgeted queue and per-burst ownership.
- Heterogeneous emission-point parameters were validated.
- Heavy Impact real A/B favored scheduled visually and in frame pacing.
- Per-instance cancellation and `stopAll()` clear queued/live shared work with no late respawn.

### Explosion / second effect — ACCEPTED

- `explosion/v1/default` added a different composite cue without Core redesign.
- Reuses the same runtime, lifecycle, burst abstraction and screen-kick integration.
- Small helpers `burstTracked`, `scheduleAsync`, `runHook` were extracted only after repetition by Heavy Impact + Explosion.
- User visually preferred the scheduled Explosion path.

### P3.5 queue-aware quality — IMPLEMENTED, TUNING DEFERRED

- Priority/backpressure machinery exists and remains available as an experimental production safeguard.
- P3.5.0 showed scheduled Explosion materially reduced frame-time debt/spikes while carrying the full workload.
- P3.5.1 changed admission from current-backlog to projected-backlog pressure.
- **Do not continue tuning thresholds/scales now.** This is not a product gate until representative final effects/mobile prove it is needed.

### P3.6 effect-owned assets — IMPLEMENTED

- Effect definitions can declare `assets`.
- `FXDeckRuntime.getAssets({ target })` collects and deduplicates manifests across registered definitions.
- `FXDeckRuntime.setAdapter(name, adapter)` allows registration/asset discovery before backend initialization.
- Runtime Lab no longer hardcodes individual spark/explosion preload files; it builds the particle preload list from the registered effect catalog.
- `site/fxdeck/effects/catalog.js` is the production effect registration surface.

### P3.6 Fireball moving-source archetype — IMPLEMENTED, MULTI-INSTANCE VALIDATION PENDING

- `fireball/v1/default` is the third real effect.
- Authored default remains ~250 px travel over ~560 ms; optional runtime `distance`/`travelDuration` remain effect-local params.
- At endpoint Fireball reuses the existing `Explosion` via `FXDeck.play("explosion", ...)`.
- P3.6.1 proved single-instance travel and runtime intensity.
- P3.6.1/P3.6.2 exposed that tsParticles runtime emitter instances were not a reliable visual owner for several simultaneous projectile heads in this integration. A local rendered-frame clock fix did not solve the independent visibility problem.
- **P3.6.3 replaces the projectile-head topology:** each Fireball owns one `DomSpriteAdapter` handle and moves that handle directly in CSS/gameplay coordinates.
- Fireball trail is now a sequence of tiny semantic one-shot bursts sampled every ~32 ms along the projectile path. Because each pulse is small, it is admitted immediately by the shared burst path and remains independently owned by the Fireball instance.
- Parent Fireball remains alive briefly after impact so recent trail particles can decay; then normal EffectInstance cleanup removes its remaining groups/visual handle.
- `spawnTracked` is now adapter-generic rather than particle-emitter-specific.
- The old explicit-emitter projectile implementation is no longer the production Fireball path. Explicit emitters remain reserved for the upcoming sustained Environment archetype, where their lifecycle matches the use case.

### P3.6.1 Runtime Lab UX — USER-ACCEPTED

- Main workbench remains three columns with the existing width balance; Preview stays persistent in the center.
- Workspace has **Play** and **Debug / Tests** modes instead of exposing every dev control simultaneously.
- Play left pane contains only effect/version/variant/path/intensity/direction plus `FXDeck.play()` and `stopAll()`.
- Play right pane contains authored timing + resolved cue only; runtime telemetry was removed from the inspector.
- Debug left pane contains overlap/A-B/cancellation/synthetic stress controls and stress parameters.
- Debug right pane contains the validation log, Copy/Clear actions, current public API call and HUD color legend.
- Runtime diagnostics live on Preview as an engine-style translucent HUD with **Off / Basic / Full** modes.
- Basic HUD: FPS, particle count, active instances.
- Full HUD adds 1% low, p95/p99/worst/debt, >20ms frames, queued work, emitters, groups, queue pressure, quality shedding, burst path and canvas scale.
- HUD health color coding: healthy FPS/no pressure = green, degraded/medium = amber, low FPS/high/critical pressure = red; particles/instances use informational blue.
- Workspace mode and HUD mode persist locally in the browser.
- UI behavior lives in `site/js/runtime-lab-ui.js`; it is Lab UX, not FXDeck Core.

---

# Remaining P3 capability roadmap

1. **P3.6.3 Fireball multi-instance visual validation** — current gate. Verify simultaneous independent projectile heads/trails and lifecycle only; do not turn this back into a performance-tuning task.
2. **Environment emitter** — sustained lifetime and real live-update pressure.
3. **Effect-owned asset lifecycle hardening** — only if Fireball/Environment expose real preload/unload problems.
4. **Rare Reward** — UI/DOM + particles to prove non-world-impact cue composition.
5. **Critical Hit / Magic Burst** — broaden short-cue authoring without new Core if possible.
6. **Only then:** production resize/DPR, mobile validation, raw-vs-runtime overhead, quality/backpressure tuning.

P3 exits when representative one-shot, moving and sustained effects all use the runtime without repeated Core redesign.

---

# P4 — Production VFX Library — PLANNED

- [x] Heavy Impact — short composite impact.
- [x] Explosion — multi-layer one-shot.
- [ ] Fireball — single instance accepted; P3.6.3 concurrent visual regression pending.
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
3. One-shot bursts default to shared-scheduled; sustained sources may use explicit emitters.
4. Shared scheduled work is bounded, fair and cancellable.
5. Effect assets belong to effect definitions, not to the Runtime Lab bootstrap.
6. Fireball intentionally reuses Explosion instead of duplicating impact logic.
7. Performance diagnostics remain available, but optimization is not allowed to block completion of the representative effect set unless a real blocker appears.
8. One Runtime Lab hosts all production effects; no page per effect.
9. Runtime diagnostics are a toggleable preview HUD; test controls/logs belong to Debug / Tests, not the main authoring workflow.
10. Lab UI concerns stay outside FXDeck Core.
11. A moving gameplay projectile needs an independently owned renderable visual. Backend emitter objects are not used as the Fireball hero visual after the multi-instance failure; emitters remain for sustained emission use cases.
12. Every user-testable iteration advances visible build/cache keys.

---

# Changelog — 2026-08-18

- **P3.6.3 — Fireball concurrent visual ownership fix:** replaced tsParticles emitter-owned projectile head with an independent `DomSpriteAdapter` handle per Fireball instance; trail now uses sampled semantic particle bursts along the path.
- **P3.6.3 — adapter composition:** added minimal DOM visual adapter and generalized `spawnTracked` so EffectInstance lifecycle can own non-particle visual handles through the same cleanup pattern.
- **P3.6.3 — Fireball integration:** Runtime Lab attaches the visual adapter without changing the public play API; Explosion remains the impact handoff.
- **P3.6.2 — Fireball timing attempt:** clamped rendered-frame travel advancement to avoid wall-clock fast-forward; user confirmed the actual multi-instance visibility bug remained, so this was insufficient by itself.
- **P3.6.1 — Runtime Lab UI cleanup:** split side panes into Play vs Debug / Tests while keeping the Preview persistent; removed benchmarks and telemetry clutter from normal authoring.
- **P3.6.1 — runtime HUD:** added translucent engine-style Off/Basic/Full diagnostics overlay with FPS/queue health color coding and local mode persistence.
- **P3.6.0 — product-capability priority reset, effect-owned assets and initial Fireball.**
- **P3.5.x:** queue-aware priority/backpressure + projected-backlog policy; further tuning deferred.
- **P3.4.0:** Explosion second-effect proof + multi-effect Runtime Lab + small repeated effect helpers.
- **P3.3.0:** shared-scheduled production default + cancellation gate PASS.
- **P3.2.x:** integrated scheduler, matched/heterogeneous stress and Heavy Impact A/B acceptance.
- **P3.0/P3.1:** semantic burst + Shared Emission Points prototype and population-hitch isolation.
- **P2:** Heavy Impact vertical slice accepted.
- **P1:** minimal Core accepted.
- **P0:** raw tsParticles viability/performance spike accepted.
