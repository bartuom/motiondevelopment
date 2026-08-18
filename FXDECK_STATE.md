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
- **Current build:** **P3.6.4**
- **Status:** ACTIVE.
- **Runtime Lab:** `site/heavy-impact-lab.html` — P3.6.4.
- **Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1
- **Raw reference:** `site/webfx-lab.html` — P0.3.0
- **Current gate:** real-device Fireball concurrency on Galaxy S20+ after removing avoidable DOM/compositor and trail-submission cost. This is a real blocker discovered by the representative effect, not speculative benchmark tuning.
- **P3.6.1 user validation:** Runtime Lab UI cleanup works and is materially cleaner. Single Fireball works; runtime intensity works; direction/travel/Explosion handoff are functional.
- **P3.6.2 user validation:** clamping Fireball wall-clock advancement did not fix the actual concurrency bug.
- **P3.6.3 user validation:** independent projectile visuals fixed concurrent visibility; multiple Fireballs are now visible correctly. On Galaxy S20+ sustained concurrency exposed a real mobile cost: roughly 10 active Fireballs could fall toward ~40 FPS and ~15 toward ~30 FPS.
- **P3.6.4 mobile pass:** Fireball projectile motion is transform/compositor-only instead of per-frame `left/top`; moving projectile CSS no longer uses `mix-blend-mode`, filter blur/drop-shadow or animated expensive paint effects; the visual itself carries the main tail; particle embers are sampled every ~96 ms instead of ~32 ms and use one small particle per sample; Runtime HUD backdrop blur is disabled so diagnostics do not materially contaminate the thing being measured.
- **Diagnostics:** HUD now distinguishes tsParticles `Particles` from independent DOM `Visuals`, because Fireball heads are not tsParticles particles.
- **Next action:** on live **P3.6.4**, repeat the same Galaxy S20+ concurrency scenario. Hold roughly 10 and 15 active Fireballs if possible and note FPS plus HUD `Particles` and `Visuals`. Visual correctness must remain intact. Do not run synthetic stress unless a regression specifically needs isolation.
- **After Fireball:** if this real-device pass restores acceptable concurrency, close Fireball and implement a sustained **Environment emitter** with `start → live update position/intensity → stop`. If it still collapses badly, profile/isolate projectile visual vs ember trail vs Explosion before adding any broader framework.

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
- Raw benchmark established the mobile/backend envelope; Galaxy S20+ was near 60 FPS around 150/400 simple particles and began showing a cliff around 800.

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
- Do not continue generic threshold/scale tuning until representative final effects/mobile prove a need.

### P3.6 effect-owned assets — IMPLEMENTED

- Effect definitions can declare `assets`.
- `FXDeckRuntime.getAssets({ target })` collects and deduplicates manifests across registered definitions.
- `FXDeckRuntime.setAdapter(name, adapter)` allows registration/asset discovery before backend initialization.
- Runtime Lab builds particle preload ownership from registered effects instead of manual per-file lists.
- `site/fxdeck/effects/catalog.js` remains the production effect registration surface.

### P3.6 Fireball moving-source archetype — ACTIVE REAL-DEVICE VALIDATION

- `fireball/v1/default` is the third real effect.
- Authored default remains ~250 px travel over ~560 ms; optional runtime `distance`/`travelDuration` remain effect-local params.
- At endpoint Fireball reuses the existing `Explosion` via `FXDeck.play("explosion", ...)`.
- P3.6.1 proved single-instance travel and runtime intensity.
- P3.6.1/P3.6.2 showed tsParticles runtime emitter instances were not a reliable hero-visual owner for multiple simultaneous projectiles in this integration.
- P3.6.3 gave each Fireball one independently owned `DomSpriteAdapter` projectile visual; this fixed concurrent visibility.
- P3.6.3 originally sampled tiny semantic trail bursts every ~32 ms. With 10 concurrent Fireballs that means roughly 312 trail-burst submissions per second; with 15, roughly 469/sec, even before Explosion handoffs. That workload shape, not the HUD particle number alone, can dominate JS/lifecycle cost.
- P3.6.3 projectile CSS also used mobile-hostile moving-layer effects: per-frame `left/top`, `mix-blend-mode: screen`, multiple `filter: drop-shadow(...)`, blur and shadow layers.
- **P3.6.4 converts movement to CSS-variable `translate3d()` compositor transforms.** Projectile CSS is repainted cheaply/static and no longer uses moving blend/filter effects.
- **P3.6.4 makes the built-in projectile visual the primary trail.** Particle embers are now sparse (~96 ms interval), single-particle samples with shorter life/smaller size. This reduces trail submit frequency by about 3× per Fireball before any later quality logic.
- Runtime HUD no longer uses `backdrop-filter`, and Basic HUD exposes `Visuals` separately from `Particles` so Fireball cost is not misread as a raw particle-count problem.
- Fireball remains effect-local. No generic projectile framework was added.

### P3.6.1 Runtime Lab UX — USER-ACCEPTED

- Main workbench remains three columns with the existing width balance; Preview stays persistent in the center.
- Workspace has **Play** and **Debug / Tests** modes instead of exposing every dev control simultaneously.
- Play left pane contains only effect/version/variant/path/intensity/direction plus `FXDeck.play()` and `stopAll()`.
- Play right pane contains authored timing + resolved cue only.
- Debug left pane contains overlap/A-B/cancellation/synthetic stress controls and stress parameters.
- Debug right pane contains validation log, Copy/Clear, API call and HUD legend.
- Runtime diagnostics live on Preview as an engine-style translucent HUD with **Off / Basic / Full** modes.
- P3.6.4 Basic HUD: FPS, tsParticles particle count, active independent visuals, active FXDeck instances.
- Full HUD adds 1% low, p95/p99/worst/debt, >20ms frames, queued work, emitters, groups, queue pressure, quality shedding, burst path and canvas scale.
- HUD health color coding remains green / amber / red with informational blue workload counters.
- Workspace mode and HUD mode persist locally in the browser.
- UI behavior stays outside FXDeck Core.

---

# Remaining P3 capability roadmap

1. **P3.6.4 Fireball Galaxy S20+ concurrency validation** — current gate. Verify simultaneous projectile correctness and compare roughly 10/15 active Fireballs to the observed ~40/~30 FPS P3.6.3 behavior. Record `FPS / Particles / Visuals`.
2. **Environment emitter** — sustained lifetime and real live-update pressure.
3. **Effect-owned asset lifecycle hardening** — only if Fireball/Environment expose real preload/unload problems.
4. **Rare Reward** — UI/DOM + particles to prove non-world-impact cue composition.
5. **Critical Hit / Magic Burst** — broaden short-cue authoring without new Core if possible.
6. **Only then:** broader production resize/DPR, mobile matrix, raw-vs-runtime overhead and deferred quality/backpressure tuning.

P3 exits when representative one-shot, moving and sustained effects all use the runtime without repeated Core redesign.

---

# P4 — Production VFX Library — PLANNED

- [x] Heavy Impact — short composite impact.
- [x] Explosion — multi-layer one-shot.
- [ ] Fireball — concurrency visually fixed; P3.6.4 mobile cost validation pending.
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
7. Performance work is deferred unless a representative effect on a real target device exposes a blocker; the P3.6.3 Galaxy S20+ Fireball concurrency drop qualifies as such a blocker.
8. One Runtime Lab hosts all production effects; no page per effect.
9. Runtime diagnostics are a toggleable preview HUD; test controls/logs belong to Debug / Tests.
10. Lab UI concerns stay outside FXDeck Core.
11. Moving hero visuals need independent ownership and compositor-friendly movement; backend emitter objects are not the Fireball hero visual.
12. Diagnostics must not materially distort measured runtime cost; avoid backdrop blur and distinguish DOM visuals from particle counts.
13. Every user-testable iteration advances visible build/cache keys.

---

# Changelog — 2026-08-18

- **P3.6.4 — Fireball mobile concurrency pass:** changed projectile movement from `left/top` to transform-only `translate3d()` through `DomSpriteAdapter`; removed moving `mix-blend-mode`, filter blur/drop-shadows and related expensive CSS effects.
- **P3.6.4 — sparse trail:** built-in projectile visual now carries the primary tail; particle embers changed from ~32 ms / ~31 submits per second per Fireball to ~96 ms / ~10.4 submits per second, one small particle per sample.
- **P3.6.4 — clean diagnostics:** removed Runtime HUD `backdrop-filter` and added separate `Visuals` counter so DOM projectile count is not confused with tsParticles particle count.
- **P3.6.3 — Fireball concurrent visual ownership fix:** replaced tsParticles emitter-owned projectile head with an independent `DomSpriteAdapter` handle per Fireball instance; trail used sampled semantic particle bursts.
- **P3.6.3 — adapter composition:** added minimal DOM visual adapter and generalized `spawnTracked` so EffectInstance lifecycle can own non-particle visual handles.
- **P3.6.2 — Fireball timing attempt:** clamped rendered-frame travel advancement; user confirmed the actual multi-instance visibility bug remained.
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
