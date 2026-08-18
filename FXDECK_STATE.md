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
- **Current build:** **P3.8.1**
- **Status:** ACTIVE.
- **Runtime Lab:** `site/heavy-impact-lab.html` — P3.8.1.
- **Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1.
- **Raw reference:** `site/webfx-lab.html` — P0.3.0.
- **Primary real-effect test:** Runtime Lab Play + Debug / Tests → **Effect Grid Lab**.
- **Advanced diagnostics:** historical fixed-overlap, matched backend stress, synthetic backend isolation and one-shot topology A/B remain available, but are not the normal product workflow.

### Latest validated observations

- Runtime Lab UI cleanup was accepted as materially cleaner.
- Heavy Impact and Explosion remain accepted one-shot composite cues.
- Fireball single-play, intensity, direction/travel, Explosion handoff and multi-instance visual ownership work.
- Fireball concurrent visibility was fixed by independently owned projectile visuals.
- Galaxy S20+ exposed a real Fireball mobile scalability issue at higher concurrency; P3.6.4 removed avoidable moving-DOM/filter/trail cost. That performance question is retained as a future optimization/quality concern, not a blocker for the moving-source capability.
- Effect Grid is now the standard real-effect scaling harness with zoom/pan/Fit, safe overscan, controlled Replace loop and optional Stack / Soak.
- Desktop Explosion grid tests proved the harness reaches meaningful production-level load rather than only synthetic particle tests.
- Initial P3.8.0 Environment feedback: moving the same source worked conceptually, but the demo was ambiguous because repeated clicks looked like replacement and intensity only changed a narrow emission range that was difficult to see.

### Fireball capability decision

- **Fireball is conceptually accepted as the moving-source archetype.**
- Proven runtime behavior:
  - independently owned moving hero visual,
  - runtime direction/intensity,
  - sparse trail support,
  - child-cue handoff to `Explosion`,
  - multiple concurrent instances,
  - owned cleanup,
  - Grid compatibility.
- Remaining Fireball work is effect polish / art / optional quality scaling, not a missing runtime abstraction.
- Do not keep expanding projectile-specific architecture unless another real effect proves repetition.

### P3.7.x — Effect Grid / debug harness

- Debug hierarchy promotes **Real Effect Scaling** above backend-isolation tests.
- Effect Grid is self-contained: real effect, intensity, base direction and one-shot topology can be selected directly in Debug.
- One-shot topology modes remain:
  - **Shared scheduled — Emission Points + scheduler** (`scheduled`) — production one-shot default;
  - **Shared direct — Emission Points immediate** (`shared`) — diagnostic immediate path;
  - **Per-play emitter** (`emitter`) — reference topology.
- Grid mutations cleanly respawn controlled workloads.
- Loop defaults to **Replace batch**; Stack / Soak is explicit accumulation.
- Virtual world supports Fit, wheel zoom, pan and effect-aware safe overscan so outward Fireball travel/impact is not clipped by cell bounds.
- tsParticles backing canvas remains viewport-sized and projected across the logical world to avoid giant DPR-scaled debug buffers.
- Runtime HUD keeps blur disabled and uses a lighter translucent background.

### P3.8.0 — Sustained Environment Source

- Added `environmentEmitter/v1/default` as the first long-running effect archetype.
- Added a small live-update capability because the sustained effect proved the need:

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

- `FXDeck.update(instance, patch)` updates normalized runtime params and lets the effect-specific update handler mutate owned resources.
- Updates issued before effect startup completes are merged and replayed when the update handler becomes ready.
- Environment uses one explicit sustained tsParticles emitter per FXDeck source.
- Current live semantics:
  - **position:** live;
  - **intensity / emission density:** live;
  - **direction:** spawn-time only; restart is required to change flow direction.
- Stop cleanup uses the normal EffectInstance lifecycle.

### P3.8.1 — Clear multi-source sustained probe

- Clarified the model: **one `FXDeck.play("environmentEmitter")` = one independent long-running source** such as smoke, steam, flame or dust.
- Play-mode Environment now supports two distinct operations:
  - `Restart active source` — replaces only the selected source;
  - `+ Add source` — creates another sustained source while previous sources remain alive.
- Clicking Preview now means **move the active source** with `FXDeck.update(position)`; it does not create additional sources.
- Added per-source debug markers (`S1`, `S2`, …) in Play so ownership and movement are visually explicit.
- Added `Remove active`; normal `FXDeck.stopAll()` still clears every source/resource.
- Runtime intensity is explicitly labeled **Active source intensity** for Environment.
- Intensity mapping was widened from a weak narrow quantity range to roughly **1 → 10 particles per emission tick** across the existing `0.5× → 2.0×` slider.
- Live intensity still mutates emission density on the same emitter; it does not recreate the FXDeck EffectInstance. Existing particles naturally age out, so density transition is visible over a short settling period.
- Inspector now exposes:
  - running source count,
  - active source label/id,
  - current emission quantity and approximate particles/second,
  - live-update semantics.
- Effect Grid still treats Environment as explicit sustained topology; each grid cell is an independent sustained source and one-shot topology selection remains disabled.

### Current gate

Validate **P3.8.1 Environment semantics**, not performance tuning:

1. Runtime Lab opens on `Environment Emitter`.
2. `Start source` creates one sustained source with a visible `S#` marker.
3. Clicking several Preview positions moves that same active source; source count stays unchanged.
4. `+ Add source` keeps the previous source alive and creates another independent source; source count and HUD Emitters should rise together.
5. After adding a source, it becomes active; clicking Preview moves only that active source.
6. Moving Active source intensity from `0.5×` to `2.0×` should create an obvious density difference after existing particles settle, while the source/EffectInstance remains alive.
7. `Remove active` stops only the selected source.
8. `FXDeck.stopAll()` removes all Environment emitters and remaining owned workload cleanly.
9. Direction remains restart-only in this gate.

If this passes, sustained Environment is conceptually accepted and the next product-capability effect is **Rare Reward**: a large UI/card-space cue combining DOM/SVG + particles.

---

# Product target

FXDeck is a lightweight gameplay VFX runtime for web games. Game code triggers complete, versioned cues through a small API while FXDeck owns backend topology, scheduling and lifecycle.

FXDeck is **not** intended to become a custom particle simulator, node editor, mini-Niagara, shader graph or generic animation engine. tsParticles remains an implementation backend behind adapters.

---

# Proven architecture

## P0 — tsParticles spike — DONE

- Raw runtime emitter creation/movement/cleanup works.
- CSS/gameplay → retina-canvas positioning works.
- Image/SVG particles, DOM compositing and resize/reflow work.
- Galaxy S20+ raw reference established the initial simple-particle mobile envelope.

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
- Visual hierarchy pass materially reduced high-load particle pressure and improved frame pacing.

## P3 — Extract only proven runtime capabilities — ACTIVE

### One-shot burst topology — ACCEPTED

- `ParticleAdapter.burst()` is semantic; effect code does not encode backend topology.
- `shared-scheduled` is the production default for short one-shot bursts.
- `shared-direct` remains a diagnostic immediate shared path.
- `per-play emitter` remains a reference topology.
- Shared work uses a persistent container, immediate seed, frame-budgeted queue and per-burst ownership.
- Heterogeneous emission-point parameters were validated.
- Heavy Impact and Explosion proved the scheduled topology visually and through real-effect tests.
- Per-instance cancellation and `stopAll()` clear queued/live shared work with no late respawn.

### Explosion / second effect — ACCEPTED

- `explosion/v1/default` added a different composite cue without Core redesign.
- Reuses runtime, lifecycle, burst abstraction and screen-kick integration.
- Small repeated helpers were extracted only after Heavy Impact + Explosion proved repetition.

### Queue-aware quality — IMPLEMENTED, GENERIC TUNING DEFERRED

- Priority/backpressure machinery remains an experimental safeguard.
- Scheduled Explosion demonstrated meaningful frame-pacing improvements under heavy load.
- Generic thresholds/scales stay deferred until representative final effects/mobile prove a need.

### Effect-owned assets — IMPLEMENTED

- Effect definitions can declare `assets`.
- Runtime collects/deduplicates effect-owned assets by target.
- Runtime Lab no longer owns a manual per-effect preload list.
- `site/fxdeck/effects/catalog.js` is the production effect registration surface.

### Fireball moving-source archetype — ACCEPTED BASE CAPABILITY

- Independent hero projectile ownership.
- Moving compositor-friendly visual.
- Runtime direction/intensity.
- Sparse particle trail.
- Explosion child cue at impact.
- Concurrent visibility and cleanup work.
- Further work is polish/quality scaling unless another effect proves a missing abstraction.

### Sustained Environment archetype — ACTIVE VALIDATION

- First indefinitely running source archetype.
- One explicit sustained emitter per FXDeck source.
- `FXDeck.update()` capability introduced because a real sustained effect requires mutation after play.
- Live position and intensity are implemented without replacing the EffectInstance.
- Multiple independent sustained sources are now exposed clearly in Play.
- Direction remains spawn-time for the current backend path.
- Stop cleanup uses normal instance ownership.

### Runtime Lab UX — ACCEPTED / EVOLVING

- Play vs Debug / Tests with persistent center Preview.
- Runtime diagnostics are an Off / Basic / Full HUD.
- Basic HUD exposes FPS, Particles, Visuals and active Instances.
- Full HUD adds low-percentile/frame-time/queue/topology diagnostics.
- Debug is self-contained for real-effect scaling.
- Advanced backend isolation stays collapsed below product-level tests.

### Effect Grid Lab — PRIMARY REAL-EFFECT SCALING HARNESS

- Grid calls normal `FXDeck.play(effect, params)` per cell.
- Supports real one-shot, moving and sustained effects.
- Presets cover small through high-concurrency grids.
- Direction patterns, zoom, Fit and pan are generic Lab concerns.
- Cell layout bounds are not particle-world clip bounds; safe overscan protects authored travel/impact envelopes.
- Normal Loop replaces the previous batch; Stack / Soak is explicit.
- One-shot topology comparison remains available where the effect actually uses burst topology.
- Sustained Environment reports explicit sustained topology rather than pretending one-shot topology selection applies.

---

# Remaining P3 capability roadmap

1. **P3.8.1 Environment validation** — multiple sustained sources + live active-source position/intensity + stop ownership.
2. **Rare Reward** — large UI/card-space cue using DOM/SVG + particles; validate large-cell zoom/grid behavior.
3. **Effect-owned asset lifecycle hardening** — only if representative effects expose a real preload/unload problem.
4. **Critical Hit / Magic Burst** — broaden short-cue authoring without new Core if possible.
5. **Only then:** broader production resize/DPR, device matrix, raw-vs-runtime overhead and deferred quality/backpressure tuning.

P3 exits when representative one-shot, moving, sustained and UI-space effects all use the runtime without repeated Core redesign.

---

# P4 — Production VFX Library — PLANNED

- [x] Heavy Impact — short composite impact.
- [x] Explosion — multi-layer one-shot.
- [x] Fireball — moving-source concept/runtime capability accepted; polish/perf scaling can continue later.
- [ ] Environment Emitter — P3.8.1 multi-source/live-update validation pending.
- [ ] Rare Reward — UI/DOM + particles.
- [ ] Critical Hit — ultra-short readability.
- [ ] Magic Burst — more complex motion/noise/color.
- [ ] Track effect-specific custom code/authoring pressure.

Primary success metric: adding a new gameplay VFX should be materially simpler than hand-wiring tsParticles + DOM/SVG/sprites/lifecycle each time.

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
5. Effect assets belong to effect definitions, not Runtime Lab bootstrap code.
6. Fireball reuses Explosion instead of duplicating impact logic.
7. Fireball moving-source capability is accepted; further projectile work needs a new real requirement.
8. **Live update is added only because the sustained Environment effect requires it.**
9. Live update semantics are effect-owned: Core carries normalized params; each effect/adapter decides which real resources can mutate safely.
10. Do not claim a parameter is live if the backend requires recreation; Environment direction remains spawn-time.
11. One Environment `play()` is one source; moving a source is `update()`, creating another source is another `play()`.
12. Performance work is deferred unless a representative real effect exposes a blocker relevant to the current product capability.
13. One Runtime Lab hosts all production effects; no page per effect.
14. Runtime diagnostics are a toggleable Preview HUD; dev-only controls/logs belong to Debug / Tests.
15. Real-effect Grid scaling is the default scalability test. Backend stress is advanced isolation.
16. Repeated Grid tests default to Replace batch. Accumulation is explicit through Stack / Soak.
17. Grid camera framing includes authored travel/impact envelope; cell bounds are not particle-world clip bounds.
18. Every user-testable iteration advances visible build/cache keys.

---

# Changelog — 2026-08-18

- **P3.8.1 — Environment semantics/UI:** separated `Restart active source` from `+ Add source`; added source markers, source count/readout and `Remove active`.
- **P3.8.1 — visible live intensity:** widened Environment density mapping to roughly 1–10 particles per emission tick across the 0.5×–2.0× slider while keeping the same emitter/EffectInstance alive.
- **P3.8.1 — Environment inspector:** reports running/active source, emission rate and live-update semantics; Grid still treats each cell as an independent explicit sustained source.
- **P3.8.0 — Environment Emitter:** added first sustained/indefinite FXDeck effect with explicit emitter ownership.
- **P3.8.0 — live update capability:** added `FXDeck.update(instance, patch)` support for real effects that need post-play mutation; updates can be queued/merged until the effect installs its update handler.
- **P3.8.0 — sustained adapter update:** added live emitter position and emission-quantity mutation behind an adapter extension rather than leaking tsParticles emitter internals into effect code.
- **P3.8.0 — Environment semantics:** position and intensity are live; direction is intentionally spawn-time only.
- **P3.7.3 — safe Grid world:** separated cell layout from logical particle bounds and added effect-aware overscan.
- **P3.7.3 — HUD transparency:** reduced Runtime HUD opacity while keeping blur disabled.
- **P3.7.2 — self-contained Grid setup/topology comparison.**
- **P3.7.1 — Debug hierarchy + Replace loop semantics.**
- **P3.7.0 — generic Effect Grid Lab.**
- **P3.6.4 — Fireball mobile concurrency pass.**
- **P3.6.3 — Fireball concurrent visual ownership fix.**
- **P3.6.0 — effect-owned assets + initial Fireball.**
- **P3.5.x — queue-aware quality/backpressure experiments; broad tuning deferred.**
- **P3.4.0 — Explosion second-effect proof.**
- **P3.3.0 — shared-scheduled production default + cancellation gate.**
- **P3.2.x — integrated scheduler + real-effect/matched validation.**
- **P3.0/P3.1 — semantic burst + Emission Points/shared topology experiments.**
- **P2 — Heavy Impact vertical slice accepted.**
- **P1 — minimal Core accepted.**
- **P0 — raw tsParticles viability/performance spike accepted.**
