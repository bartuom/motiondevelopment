# FXDeck — Project State, Roadmap & Changelog

> **Canonical project state.** Update this file with every material FXDeck implementation change.
>
> Rules:
> - A milestone is `DONE` only when all of its exit-criteria checkboxes are complete.
> - Do not add speculative framework work just to fill the roadmap. New abstractions should be added only when a real effect proves they are needed.
> - Every material FXDeck change should update both the relevant checkbox(es) and the changelog below.
> - P0 remains the raw-tsParticles reference benchmark; later runtime performance is compared against it rather than rewriting it.

## Current state

- **Current milestone:** P1 — Minimal FXDeck Core
- **Status:** ACTIVE — only automated browser lifecycle validation remains.
- **Next action:** run the one-click `Run P1 validation` gate in Core Lab. If it reports `P1 VALIDATION: PASS`, mark P1 `DONE`, freeze the minimal Core API, and begin P2 Heavy Impact.
- **Current Core Lab:** `site/fxdeck-core-lab.html` — P1.3.0
- **Reference benchmark:** `site/webfx-lab.html` — P0.3.0

## Product target

FXDeck is a lightweight gameplay VFX runtime for web games. Its job is to let game code trigger a complete, versioned gameplay cue through a small API while FXDeck orchestrates the implementation details behind it.

Target call:

```js
FXDeck.play("heavyImpact", {
  position: hitPosition,
  direction: hitDirection,
  intensity: 1.2
});
```

FXDeck is **not** intended to become another particle simulator, node editor, mini-Niagara, shader graph, or generic animation engine. tsParticles is the initial particle backend behind an adapter.

---

# Roadmap

## P0 — tsParticles Technology Spike — DONE

**Goal:** prove that tsParticles is technically viable as the particle backend before building FXDeck around it.

- [x] Explicit `loadFull(tsParticles)` bootstrap works reliably.
- [x] Runtime one-shot emitter creation works.
- [x] Exact gameplay/CSS position maps correctly to retina canvas coordinates.
- [x] Moving emitter works.
- [x] Repeated burst stress test works and emitters clean themselves up.
- [x] Preloaded image/SVG particles work.
- [x] DOM + particle compositing works at the same gameplay position.
- [x] Resize/reflow preserves correct positioning.
- [x] Raw performance benchmark records avg FPS, 1% low, frame spikes, peak particles and cleanup.
- [x] Mobile validation completed on Galaxy S20+ 5G: ~150 and ~400 particles hold ~60 FPS; ~800 particles reveals the first meaningful performance cliff.

**Exit result:** tsParticles accepted as the initial `ParticleAdapter` backend. P0 Lab is now a frozen reference benchmark.

---

## P1 — Minimal FXDeck Core — ACTIVE

**Goal:** prove that a small FXDeck API can hide backend/lifecycle details without inventing a large framework first.

### Runtime foundation

- [x] `FXDeck.register()` registry exists.
- [x] `FXDeck.play()` returns an `EffectInstance`.
- [x] `FXDeck.stop()` exists.
- [x] `FXDeck.stopAll()` exists.
- [x] `EffectInstance` owns timers and cleanup callbacks.
- [x] `CoordinateAdapter` owns gameplay/CSS ↔ canvas coordinate conversion.
- [x] `TsParticlesAdapter` owns emitter spawn/move/stop/clear and backend-specific details.
- [x] Effect definitions do not call `addEmitter()` or handle DPR directly.

### Effect selection and authored data

- [x] Effect definitions support `id`.
- [x] Effect definitions support authored `version`.
- [x] Effect definitions support authored `variant`.
- [x] P1 test effect has visibly different authored revisions instead of magic labels: V1 primitive-circle burst; V2 SVG-spark rebuild; V2 Heavy denser/larger/longer.
- [x] Core Lab exposes a prefab-like definition inspector showing authored values separately from resolved runtime values.
- [x] Core Lab desktop UI uses a three-column workbench: authored/runtime controls, central canvas, and resolved definition/runtime inspector.

### Runtime parameters

- [x] `position` is a per-play runtime parameter.
- [x] `intensity` is a per-play runtime parameter and resolves into real effect values.
- [x] **True direction contract:** public input accepts degrees or a non-zero `{x,y}` vector; Core normalizes it to a unit vector and also exposes normalized degrees to effect code.
- [x] P1 `testBurst` uses continuous tsParticles angular offset instead of four-direction bucketing; authored `spread` controls cone width independently of runtime direction.

### P1 validation / exit criteria

- [x] Clicking the Core Lab stage reliably spawns the selected definition at the clicked position. **User visually validated 2026-08-18.**
- [x] V1 / V2 / Heavy visibly resolve to different authored constructions/values shown in the inspector. **User visually validated 2026-08-18.**
- [x] Arbitrary non-cardinal direction visibly steers the burst continuously and intensity visibly scales the effect. **User visually validated 2026-08-18; Core also self-checks normalized direction math.**
- [ ] `Play ×10` completes with `0 active instances`, `0 emitters`, and `0 particles` after lifecycle completion. **Automated P1.3.0 validator added; awaiting browser PASS.**
- [ ] `FXDeck.stopAll()` immediately clears active instances and backend resources. **Automated P1.3.0 validator added; awaiting browser PASS.**
- [x] No effect-level code needs tsParticles emitter naming, DPR conversion, or direct backend cleanup; those responsibilities remain in `EffectInstance`, `CoordinateAdapter`, and `TsParticlesAdapter`. **Code-reviewed 2026-08-18.**

**P1 exit:** freeze the minimal API. Do **not** add timeline/layer systems merely because they might be useful later. Move immediately to Heavy Impact.

---

## P2 — Heavy Impact Vertical Slice — PLANNED

**Goal:** build the first real gameplay VFX entirely through FXDeck and use it to discover what the runtime actually lacks.

- [ ] Register `heavyImpact / v1 / default` as the first real production-style effect.
- [ ] Consume real `position`, normalized `direction`, and `intensity` from the FXDeck play context.
- [ ] Contact flash.
- [ ] Directional sparks.
- [ ] Directional debris.
- [ ] Pressure wave.
- [ ] Target recoil/kick hook.
- [ ] Screen/camera kick hook.
- [ ] Implement only the minimum sequencing/timing needed by this effect; do not create a large timeline framework first.
- [ ] Whole composite owns one predictable lifecycle and cleans up completely.
- [ ] Validate repeated playback and overlapping Heavy Impacts.
- [ ] Validate visual alignment and performance on desktop and mobile.
- [ ] Record which code patterns are actually repeated or awkward enough to deserve extraction.

**P2 exit:** Heavy Impact feels like one coherent gameplay cue and can be triggered from one `FXDeck.play("heavyImpact", ...)` call without backend-specific work in game code.

---

## P3 — Extract Proven Abstractions / Production Runtime — PLANNED

**Goal:** extract only abstractions that Heavy Impact demonstrated are genuinely reusable, then harden the runtime.

- [ ] Extract repeated timing/sequencing behavior into the smallest useful timeline/cue primitive **if P2 proves it necessary**.
- [ ] Extract reusable particle burst/helper patterns **only where P2 produced duplication**.
- [ ] Extract DOM/screen/target helpers **only where P2 produced reusable behavior**.
- [ ] Formalize asset preload/ownership required by real effects.
- [ ] Harden effect cancellation and cleanup for overlapping/restarted effects.
- [ ] Add quality controls based on measured costs rather than arbitrary particle-count presets.
- [ ] Re-run P0-style performance scenarios through FXDeck and compare runtime overhead against raw tsParticles.
- [ ] Validate resize/DPR/mobile behavior through the production runtime, not only the spike harness.
- [ ] Keep effect definitions predominantly declarative/config-driven where practical; flag any effect that requires large bespoke lifecycle code.

**P3 exit:** runtime is stable enough that new effects should mostly exercise existing capabilities instead of forcing core redesign.

---

## P4 — Production VFX Library — PLANNED

**Goal:** prove FXDeck across different gameplay-effect archetypes and measure whether it actually reduces custom implementation work.

- [ ] **Heavy Impact** — composite timing, direction, screen/target hooks.
- [ ] **Explosion** — sprite/image + particles.
- [ ] **Fireball** — moving source + trail + impact transition.
- [ ] **Critical Hit** — ultra-short timing and readable impact hierarchy.
- [ ] **Rare Reward** — UI/DOM + particles.
- [ ] **Magic Burst** — more complex motion/noise/color behavior.
- [ ] **Environment emitter** — sustained/long-running lifecycle; evaluate live parameter updates only if this real use case demonstrates a need.
- [ ] Track custom code required per effect; identify regressions where a new effect needs large one-off infrastructure.
- [ ] Validate representative effects on mobile quality targets.

**P4 success metric:** adding a new gameplay VFX is materially faster and simpler than hand-wiring tsParticles + DOM/sprites/lifecycle each time.

---

## P5 — Productization Decision — PLANNED

**Goal:** decide what FXDeck should become only after the runtime and workflow are proven.

- [ ] Review runtime stability, authoring speed, bundle/runtime overhead and mobile results.
- [ ] Decide primary direction: internal library, open-source runtime, commercial toolkit/content packs, or a combination.
- [ ] If public: define minimal documentation, examples, packaging/build strategy and supported browser/mobile baseline.
- [ ] If commercial: validate that the sellable value is gameplay-ready effects/workflow rather than competing as another generic particle editor.
- [ ] Rebuild the public showcase/portfolio around production FXDeck effects only after the above decision.

---

# Explicitly out of scope until proven necessary

Do not build these pre-emptively:

- node graph/editor
- custom particle simulator
- generic curve editor
- GPU particle simulation
- mesh particle engine
- 3D renderer
- shader graph
- marketplace/cloud/account system
- generic plugin abstraction for many particle engines
- large timeline/track system before Heavy Impact proves a need

---

# Key architectural decisions

1. **tsParticles is the initial particle backend, not the public FXDeck API.** Backend-specific behavior stays behind `TsParticlesAdapter`.
2. **P0 remains raw.** It is the performance and behavior reference against which FXDeck overhead can later be measured.
3. **Version and variant are authored definitions.** They are analogous to saved prefab/config revisions, not runtime sliders.
4. **Position, direction and intensity are runtime inputs.** They modify one play instance without creating a new authored version. Direction is normalized by Core to a unit vector; degrees are retained as a convenience representation.
5. **Vertical-slice-first.** Heavy Impact must drive the next abstractions; the architecture must not expand speculatively.
6. **Primary product KPI:** how much effect-specific custom code is required to add the next production effect while preserving quality, cleanup and performance.
7. **Definition selection is per-play, not hot-swapped mid-instance.** Game code can choose `version`/`variant` on every `FXDeck.play()` call. An already-running `EffectInstance` keeps the definition it started with. Live parameter mutation will be added only if a real long-running effect proves it necessary.

---

# Changelog

## 2026-08-18

- **P1.3.0:** Added one-click automated P1 exit validation. The Lab now verifies authored definition resolution, normalized direction math, 10-instance lifecycle cleanup to `0/0/0`, and immediate `stopAll()` cleanup. Visual position/version/direction behavior was confirmed by the user; backend isolation was code-reviewed.
- **P1.2.3:** Locked desktop workbench proportions to explicit `31.25% / 37.5% / 31.25%` columns so intrinsic panel content cannot let the preview dominate the screen; bumped CSS/JS cache keys for reliable Pages refresh.
- **P1.2.2:** Rebalanced the desktop three-column workbench to approximately `1 : 1.2 : 1`, so the preview is only ~20% wider than the controls and inspector instead of dominating the screen.
- **P1.2.1:** Rebuilt Core Lab as a widescreen three-column editor/workbench: controls on the left, large live canvas in the center, authored/resolved inspector and runtime metrics on the right. Diagnostics remain in a compact strip below; mobile/tablet collapse responsively.
- **P1.2.0:** Replaced four-way direction bucketing with a true direction contract. `FXDeck.play()` now accepts degrees or `{x,y}`, Core normalizes to a unit vector, and `testBurst` uses continuous tsParticles angular offset with authored cone spread. Core Lab exposes full 0–359° control and the resolved unit vector.
- **P1.1.0:** Added authored-definition inspector to Core Lab. V1/V2/Heavy now expose real construction and parameter differences; authored data and runtime-resolved values are displayed separately.
- Added shared FXDeck project navigation between P0 Spike, P1 Core and the legacy portfolio.
- **P1.0.0:** Added the first modular FXDeck Core: registry, `play/stop/stopAll`, `EffectInstance`, `CoordinateAdapter`, `TsParticlesAdapter`, test effect, and separate Core Lab.
- **P0.3.0:** Added raw performance test with Normal (~150), Heavy (~400) and Extreme (~800) loads. Desktop passed all loads at 60 FPS. Galaxy S20+ 5G held ~60 FPS at 150/400 and reached ~57.4 FPS avg / 30 FPS 1% low at ~800.
- **P0.2.2:** Fixed tsParticles v4 bootstrap by explicitly awaiting `loadFull(tsParticles)` before creating the container.
- **P0.2.1:** Fixed CSS/gameplay ↔ retina-canvas coordinate handling, preload, emitter lifecycle observation, resize validation, and persistent/copyable P0 logs.
