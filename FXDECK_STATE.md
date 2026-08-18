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
- **Current build:** **P3.6.0**
- **Status:** ACTIVE.
- **Runtime Lab:** `site/heavy-impact-lab.html` — P3.6.0
- **Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1
- **Raw reference:** `site/webfx-lab.html` — P0.3.0
- **Current gate:** functionality, not performance tuning.
- **Next action:** visually validate **Fireball** on P3.6.0: one `FXDeck.play("fireball")` should create a moving projectile head + trail, follow runtime direction, reach its authored endpoint, trigger the existing `Explosion` at impact, and clean the projectile emitters. No synthetic/performance benchmark is required for this gate.
- **After Fireball:** implement a sustained **Environment emitter** with `start → live update position/intensity → stop`. Use that real effect to decide whether FXDeck needs first-class live `EffectInstance` parameter updates.

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
- Explicit emitter mode remains available for sustained/moving archetypes.
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
- `site/fxdeck/effects/catalog.js` is now the production effect registration surface.

### P3.6 Fireball moving-source archetype — IMPLEMENTED, VISUAL VALIDATION PENDING

- `fireball/v1/default` added as the third real effect.
- Uses two explicit moving emitters: projectile head + trail.
- Per-frame movement updates both emitter positions along normalized runtime direction.
- Authored default: ~250 px travel over ~560 ms; optional runtime `distance`/`travelDuration` are accepted without changing Core normalization.
- At endpoint Fireball stops its moving emitters and reuses the existing `Explosion` via `FXDeck.play("explosion", ...)`.
- Fireball owns its particle asset declaration.
- `spawnTracked` was added as the minimal lifecycle helper for explicit moving emitters.
- No generic projectile system, timeline, child-effect framework or live-update API was added pre-emptively.

---

# Remaining P3 capability roadmap

1. **Fireball visual/lifecycle validation** — current gate.
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
- [ ] Fireball — implemented; pending visual acceptance.
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
3. One-shot bursts default to shared-scheduled; sustained/moving sources may use explicit emitters.
4. Shared scheduled work is bounded, fair and cancellable.
5. Effect assets belong to effect definitions, not to the Runtime Lab bootstrap.
6. Fireball intentionally reuses Explosion instead of duplicating impact logic.
7. Performance diagnostics remain available, but optimization is not allowed to block completion of the representative effect set unless a real blocker appears.
8. One Runtime Lab hosts all production effects; no page per effect.
9. Every user-testable iteration advances visible build/cache keys.

---

# Changelog — 2026-08-18

- **P3.6.0 — product-capability priority reset:** stopped treating backpressure tuning as the current gate; performance remains diagnostic until representative runtime capabilities are complete.
- **P3.6.0 — effect-owned assets:** added effect `assets`, runtime asset collection/deduplication, late adapter attachment, and production effect catalog; removed manual per-file particle preload ownership from Runtime Lab.
- **P3.6.0 — Fireball:** added moving projectile head + trail through explicit tracked emitters, per-frame position updates, runtime direction, and impact handoff to existing Explosion.
- **P3.5.1:** projected-backlog admission policy implemented; further tuning deferred.
- **P3.5.0:** queue-aware priority/backpressure and richer frame-time diagnostics added.
- **P3.4.0:** Explosion second-effect proof + multi-effect Runtime Lab + small repeated effect helpers.
- **P3.3.0:** shared-scheduled production default + cancellation gate PASS.
- **P3.2.x:** integrated scheduler, matched/heterogeneous stress and Heavy Impact A/B acceptance.
- **P3.0/P3.1:** semantic burst + Shared Emission Points prototype and population-hitch isolation.
- **P2:** Heavy Impact vertical slice accepted.
- **P1:** minimal Core accepted.
- **P0:** raw tsParticles viability/performance spike accepted.
