# FXDeck — Project State, Roadmap & Changelog

> **Canonical project state.** Update this file with every material FXDeck implementation change.
>
> Rules:
> - A milestone is `DONE` only when all of its exit-criteria checkboxes are complete.
> - Do not add speculative framework work just to fill the roadmap. New abstractions should be added only when a real effect proves they are needed.
> - Every material FXDeck change should update both the relevant checkbox(es) and the changelog below.
> - P0 remains the raw-tsParticles reference benchmark; later runtime performance is compared against it rather than rewriting it.
> - **Browser labs must cache-bust every changed local module, not only the top-level HTML/script.** A build is not considered ready for visual validation if an edited effect/module can still resolve from an older cached URL.

## Current state

- **Current milestone:** P3 — Extract Proven Abstractions / Production Runtime
- **Status:** ACTIVE — P2 Heavy Impact is accepted as the first complete vertical slice. P3 now tests the runtime abstractions and performance fixes that P2 proved are actually needed.
- **Previous milestone:** P2 — Heavy Impact Vertical Slice — **DONE** after desktop visual acceptance and clean P2.3 overlap benchmark on 2026-08-18.
- **Next action:** research and prototype **Shared Emission Points / Burst Pooling**, then benchmark it against the current per-play-emitter path at matched particle counts. In parallel, extract only the smallest repeated sequencing/particle helpers that Heavy Impact actually demonstrated.
- **Current P2 Lab:** `site/heavy-impact-lab.html` — P2.3.1
- **Current Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1
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

## P1 — Minimal FXDeck Core — DONE

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
- [x] `Play ×10` completes with `0 active instances`, `0 emitters`, and `0 particles` after lifecycle completion. **P1.3.0 automated browser validator PASS, reported 2026-08-18.**
- [x] `FXDeck.stopAll()` immediately clears active instances and backend resources. **P1.3.0 automated browser validator PASS, reported 2026-08-18.**
- [x] No effect-level code needs tsParticles emitter naming, DPR conversion, or direct backend cleanup; those responsibilities remain in `EffectInstance`, `CoordinateAdapter`, and `TsParticlesAdapter`. **Code-reviewed 2026-08-18.**
- [x] Core Lab runtime log is fully copyable from the UI and available through `window.FXDeckLog`, so PASS/FAIL traces can be pasted directly into debugging conversations.

**P1 exit result:** minimal API accepted and frozen for the Heavy Impact vertical slice. Do not expand Core speculatively; only concrete P2 failures may justify Core changes.

---

## P2 — Heavy Impact Vertical Slice — DONE

**Goal:** build the first real gameplay VFX entirely through FXDeck and use it to discover what the runtime actually lacks.

- [x] Register `heavyImpact / v1 / default` as the first real production-style effect.
- [x] Consume real `position`, normalized `direction`, and `intensity` from the FXDeck play context.
- [x] Contact flash implemented as a browser DOM cue hook in the P2 Lab.
- [x] Directional sparks implemented through `TsParticlesAdapter` using the shared runtime direction.
- [x] Directional debris implemented as a second timed particle burst.
- [x] Pressure wave implemented as a browser DOM cue hook in the P2 Lab.
- [x] Target recoil/kick hook implemented and demonstrated by the movable Lab target.
- [x] Screen/camera kick hook implemented and demonstrated by the Lab stage.
- [x] Minimum sequencing implemented directly inside `heavyImpact`; no generic timeline/layer framework added.
- [x] Whole composite is owned by one `EffectInstance` with registered cleanup callbacks. **Repeated-play browser validation returned final `0/0/0`.**
- [x] Runtime `intensity` visibly increases particle count/impact strength and runtime `direction` visibly steers the effect. **User visually validated 2026-08-18.**
- [x] `FXDeck.stopAll()` clears active Heavy Impact playback. **User validated 2026-08-18.**
- [x] P2.1 isolates camera/screen kick from the outer stage: one persistent inner gameplay-layer kick controller accumulates overlapping impulses instead of starting multiple competing transform animations on the whole Lab canvas.
- [x] P2.1 adds rolling FPS / 1% low / >20 ms telemetry and an automatic `Overlap ×6` capture logging avg FPS, 1% low, frame spikes, peak instances/emitters/particles and final resource state.
- [x] Run P2.1 `Overlap ×6 + perf` and confirm final resource cleanup. **Measured 2026-08-18:** at intensity `0.5`, peak `6 emitters / 130 particles`, `60.0 FPS avg / 60.0 1% low / 0 >20ms`, final `0/0/0`; at intensity `2.0`, peak `6 emitters / 454 particles`, `55.4 FPS avg / 20.0 1% low / 5 >20ms`, final `0/0/0`.
- [x] **High-load performance cliff confirmed:** the heavy overlap slowdown remains after screen-kick isolation. Both measured loads peaked at the same `6 emitters`, while particle count rose from `130` to `454`; current evidence therefore points strongly to particle/render workload as a major bottleneck and does **not** prove emitter-object churn is the dominant cause.
- [x] **P2.2 visual hierarchy pass implemented:** hero sparks reduced from base `34` to `22`, made faster/shorter/tighter and oriented roughly with the emission direction; debris reduced from base `16` to `10`, made smaller/shorter/darker; contact flash shortened/reduced; pressure wave changed from a generic circular ring to a directional offset ellipse/arc; target/screen kick amplitudes slightly reduced. Runtime API remains unchanged.
- [x] **P2.2.1 cache-safe deployment fix:** the P2 Lab versions the imported `heavy-impact.js` module itself (`?v=p2.2.1`) in addition to the HTML/top-level script, preventing an older effect definition from surviving behind a newer visible build label.
- [x] **P2.3 pressure-wave readability pass implemented:** enlarged the directional arc, increased its contrast/glow and leading-edge emphasis, moved it farther forward along the runtime direction, and changed its animation to a short high-opacity peak followed by a fast fade. No Core/API change.
- [x] **P2.3.1 benchmark harness hardened:** `Overlap ×6 + perf` performs a clean pre-test reset, prevents re-entrant benchmark starts, disables competing input, owns/cancels scheduled overlap timers and makes Stop All cancel pending scheduled plays as well as current FXDeck resources.
- [x] **P2.3 single-impact desktop look accepted for vertical-slice purposes.** User confirmed all components are visible and coherent enough to proceed. The current pressure wave is intentionally treated as a browser placeholder and is somewhat over-visible; future rendering may replace it with a subtler distortion/refraction-style pressure response rather than continuing to polish the DOM arc now.
- [x] **Clean post-polish desktop benchmark accepted:** intensity `2.0`, exactly `6 instances`, peak `5 emitters / 229 particles`, `59.3 FPS avg / 30.0 1% low / 1 >20ms`, final `0/0/0`. Compared with P2.1 (`454 particles`, `55.4 FPS avg`, `20.0 1% low`, `5 >20ms`), this is ~50% fewer peak particles, +3.9 avg FPS, +50% 1% low and 80% fewer >20ms frames.
- [x] **Repeated/awkward patterns recorded for P3:** per-play particle emitter creation needs a Shared Emission Points/Burst Pooling experiment; Heavy Impact contains small repeated timing and particle-burst boilerplate worth evaluating for minimal helpers; screen-kick accumulation is reusable candidate behavior; DOM flash/wave lifecycle helpers remain Lab-specific until another effect proves repetition.
- [x] **Mobile Heavy Impact validation moved to P3 production hardening instead of blocking the vertical slice.** P0 already established the raw tsParticles mobile performance envelope on Galaxy S20+; P3 will revalidate the production runtime, shared-emission path, resize/DPR and representative effects on mobile.

**P2 exit result:** Heavy Impact proves the core product thesis: one `FXDeck.play("heavyImpact", ...)` call can drive a complete composite gameplay cue with runtime position/direction/intensity, integration hooks, predictable lifecycle and backend isolation. Visual authoring reduced high-load particle cost substantially before runtime optimization. P3 now targets only the abstractions and performance work that this real effect exposed.

---

## P3 — Extract Proven Abstractions / Production Runtime — ACTIVE

**Goal:** extract only abstractions that Heavy Impact demonstrated are genuinely reusable, then harden the runtime.

- [ ] Extract repeated timing/sequencing behavior into the smallest useful timeline/cue primitive **only where Heavy Impact proves it reduces boilerplate without obscuring the effect definition**.
- [ ] Extract reusable particle burst/helper patterns from the concrete sparks/debris duplication in Heavy Impact.
- [ ] Keep DOM flash/wave helpers Lab-local until a second production effect proves they are genuinely reusable.
- [ ] Evaluate the accumulated screen-kick controller as a reusable gameplay/screen impulse helper when the next effect also needs it.
- [ ] **Shared Emission Points / Burst Pooling:** research, prototype and benchmark persistent shared particle systems that accept many runtime emission/burst points (`position`, `direction`, `intensity`, counts/speeds/variant data) instead of creating a new tsParticles emitter object for every particle layer of every `FXDeck.play()`. Adopt the shared-point path only if it materially reduces overlap cost without breaking per-impact variation, lifecycle, positioning or cleanup.
- [ ] **Isolate emitter overhead from particle workload:** benchmark comparable total particle counts using many per-play emitters versus a small shared-emitter/emission-point path. P2 showed that particle workload is already a major cost, so matched-count A/B testing is mandatory before attributing gains to reduced emitter churn.
- [ ] Formalize asset preload/ownership required by real effects.
- [ ] Harden effect cancellation and cleanup for overlapping/restarted effects.
- [ ] Add quality controls based on measured costs rather than arbitrary particle-count presets.
- [ ] Re-run P0-style performance scenarios through FXDeck and compare runtime overhead against raw tsParticles, including a direct **per-play emitters vs Shared Emission Points** overlap benchmark at matched particle counts.
- [ ] Validate resize/DPR/mobile behavior through the production runtime, including representative Heavy Impact behavior on Galaxy S20+ or equivalent mobile hardware.
- [ ] Keep effect definitions predominantly declarative/config-driven where practical; flag any effect that requires large bespoke lifecycle code.

**P3 exit:** runtime is stable enough that new effects should mostly exercise existing capabilities instead of forcing core redesign. High-frequency gameplay bursts must not scale primarily through expensive backend object churn when a measurably better shared emission-point path is available, and quality scaling must respect the measured particle/render budget.

---

## P4 — Production VFX Library — PLANNED

**Goal:** prove FXDeck across different gameplay-effect archetypes and measure whether it actually reduces custom implementation work.

- [ ] **Heavy Impact** — composite timing, direction, screen/target hooks.
- [ ] **Explosion** — sprite/image + particles.
- [ ] **Fireball** — moving source + trail + impact transition.
- [ ] **Critical Hit** — ultra-short timing and readable impact hierarchy.
- [ ] **Rare Reward** — UI/DOM + particles.
- [ ] **Magic Burst** — more complex motion/noise/color behavior.
- [ ] **Environment emitter** — sustained/long-running lifecycle; use this effect to decide whether live `EffectInstance` parameter updates are actually necessary.
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
- hot-swapping an authored effect definition on an already-playing short-lived effect instance

---

# Key architectural decisions

1. **tsParticles is the initial particle backend, not the public FXDeck API.** Backend-specific behavior stays behind `TsParticlesAdapter`.
2. **P0 remains raw.** It is the performance and behavior reference against which FXDeck overhead can later be measured.
3. **Version and variant are authored definitions.** They are analogous to saved prefab/config revisions, not runtime sliders.
4. **Position, direction and intensity are runtime inputs.** They modify one play instance without creating a new authored version. Direction is normalized by Core to a unit vector; degrees are retained as a convenience representation.
5. **Vertical-slice-first.** Heavy Impact drives the next abstractions; the architecture must not expand speculatively.
6. **Primary product KPI:** how much effect-specific custom code is required to add the next production effect while preserving quality, cleanup and performance.
7. **Active definitions are immutable for P1/P2.** Version/variant can be selected independently on every new `play()` call. Live parameter mutation on long-running instances is deferred until a real sustained effect proves it useful.
8. **Runtime diagnostics must be portable.** Lab logs should remain easy to copy/paste so browser failures can be debugged from complete traces rather than screenshots alone.
9. **P2 integration hooks remain explicit.** Target/camera behavior is supplied through effect hooks rather than hard-coded into Core. Browser-specific flash/wave implementations stay in the Lab until repetition proves a reusable DOM helper is warranted.
10. **Shared Emission Points are a first-class P3 candidate, not a presumed fix.** P2 exposed a real overlap frame-time problem, but particle-count changes strongly affected performance even with similar emitter counts. P3 must benchmark matched particle counts before attributing gains to reduced emitter churn.
11. **Overlapping screen impulses should be aggregated.** P2.1 demonstrated that firing multiple independent transform animations on the same camera/stage target gives misleading and unstable feedback. The Lab accumulates kick impulses through one controller; a reusable runtime helper is considered only if later effects prove the same need.
12. **Visual hierarchy is also a performance control.** P2.2 reduced low-value particle density before runtime-level optimization; the clean P2.3 desktop benchmark cut peak particles from `454` to `229` while improving frame-time stability.
13. **Visible build labels must correspond to the modules actually executing.** When a local ESM dependency changes, its import URL must receive a new cache key/version. Versioning only the HTML or top-level controller is insufficient for reliable GitHub Pages iteration.
14. **Performance harness scheduling is part of measurement integrity.** A benchmark must own and cancel its own scheduled plays, prevent re-entrant captures and competing manual input, start from a known clean resource state, and distinguish harness scheduling from FXDeck lifecycle behavior.
15. **P2 pressure wave is not final art.** Its purpose was to prove sequencing and directional composition. A production pressure response may use distortion/refraction or another rendering technique; do not overfit Core around the current DOM arc.
16. **Mobile validation belongs to production-runtime hardening.** P0 established the raw backend envelope; P3 must validate the actual FXDeck production path after shared-emission and helper decisions are made.

---

# Changelog

## 2026-08-18

- **P2 DONE / P3 ACTIVE:** User accepted the Heavy Impact vertical-slice look as sufficient to proceed and confirmed the pressure wave is clearly visible, though stronger than desired for final art. Recorded the wave as a placeholder for a possible future distortion/refraction implementation rather than polishing the DOM arc further. Moved representative Heavy Impact mobile validation into P3 production hardening.
- **P2.3 clean desktop benchmark:** Final intensity `2.0` overlap sample reached exactly `6 instances`, peak `5 emitters / 229 particles`, `59.3 FPS avg / 30.0 1% low / 1 >20ms`, final `0/0/0`. Versus P2.1 (`454 particles`, `55.4 FPS avg`, `20.0 1% low`, `5 >20ms`), visual hierarchy/authoring alone roughly halved peak particle load and materially improved frame-time stability before any Shared Emission Points work.
- **P2.3.1:** Hardened the overlap benchmark after rapid stress testing. The harness runs one capture at a time, resets FXDeck to a clean resource state before capture, locks competing manual input, tracks/cancels all overlap timers, and makes Stop All cancel pending scheduled plays as well as current FXDeck resources.
- **P2.3 provisional measurement:** Earlier stress test produced a clean-ending intensity `2.0` sample at `269 particles`, `58.0 FPS avg`, `30.0 1% low`, `3 >20ms`, final `0/0/0`, materially better than P2.1 but contaminated by one extra manual instance; retained only as directional evidence.
- **P2.3.0:** Pressure-wave readability pass after visual review found the P2.2 arc too subtle. Increased the directional wave footprint, leading-edge contrast/glow and forward offset, and changed its browser animation to a short strong peak followed by a fast fade. No Core/API change.
- **P2.2.1:** Fixed stale-module deployment behavior. `heavy-impact-lab.js` imports a versioned `heavy-impact.js` URL, and the Lab HTML/CSS/controller cache keys plus visible build label were bumped. Added a project rule that every changed browser module must receive a new cache key before a build is considered ready for validation.
- **P2.2.0:** Heavy Impact visual-hierarchy pass. Reduced hero spark base count `34 → 22`, tightened spread `38° → 28°`, shortened lifetime and aligned spark image rotation approximately with emission direction; reduced debris base count `16 → 10`, size/lifetime/brightness; shortened contact flash; converted the generic pressure ring into a directional offset elliptical arc; slightly reduced target/screen kick. Same public `FXDeck.play()` contract and lifecycle model.
- **P2.1 measured baseline:** User ran `Overlap ×6 + perf`. Intensity `0.5` produced peak `6 emitters / 130 particles` at `60.0 FPS avg / 60.0 1% low / 0 >20ms`; intensity `2.0` produced peak `6 emitters / 454 particles` at `55.4 FPS avg / 20.0 1% low / 5 >20ms`. Both returned final `0/0/0`.
- **P2.1.0:** Added measured overlap diagnostics and replaced competing whole-stage screen-kick animations with one accumulated kick controller on an inner gameplay layer.
- **P2 finding / P3 requirement:** Repeated FXDeck plays exposed a possible scaling issue from separately-created emitter objects. Added **Shared Emission Points / Burst Pooling** to P3 as a prioritized optimization candidate, with matched-particle-count benchmarking required before adoption.
- **P2.0.0:** Added the first Heavy Impact vertical slice. `heavyImpact/v1/default` orchestrates contact flash, directional SVG sparks, timed debris, pressure wave, target kick and screen kick from one `FXDeck.play()` call with an owned lifecycle. Added dedicated three-column P2 Lab, runtime inspector, overlap test control, copyable logs and P2 navigation from P0/P1.
- **P1.3.1 / P1 DONE:** User reported `P1 VALIDATION: PASS`. Marked Play ×10 lifecycle cleanup and `stopAll()` cleanup gates complete. Added compact `Copy log` / `Clear` controls to the Core Lab runtime log plus `window.FXDeckLog.getText()/getLines()/copy()/clear()` for portable debugging traces.
- **P1.3.0:** Added one-click automated P1 lifecycle validator covering reset cleanliness, authored-definition resolution, direction normalization, 10 overlapping plays with automatic cleanup, and active-effect `stopAll()` cleanup.
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