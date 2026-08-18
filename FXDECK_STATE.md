# FXDeck — Project State, Roadmap & Changelog

> **Canonical project state.** Update this file with every material FXDeck implementation change.
>
> Rules:
> - A milestone is `DONE` only when all of its exit-criteria checkboxes are complete.
> - Do not add speculative framework work just to fill the roadmap. New abstractions should be added only when a real effect proves they are needed.
> - Every material FXDeck change should update both the relevant checkbox(es) and the changelog below.
> - P0 remains the raw-tsParticles reference benchmark; later runtime performance is compared against it rather than rewriting it.
> - **Browser labs must cache-bust every changed local module, not only the top-level HTML/script.** A build is not considered ready for visual validation if an edited effect/module can still resolve from an older cached URL.
> - **Every testable browser iteration must bump the visible build/version.** A new commit hidden behind the same visible `P#.x.x` label is not an acceptable user handoff.
> - **Operational browser release flow:** code change → commit/push `main` → Pages workflow → live/cache verification when tooling allows it → user test.

## Current state

- **Current milestone:** P3 — Extract Proven Abstractions / Production Runtime
- **Status:** ACTIVE — P3.2.0 moves the successful frame-budgeted Shared Emission Point experiment from the Lab into `TsParticlesAdapter` as an explicit experimental `scheduled` burst mode with one global fair queue and per-frame CPU budget.
- **Previous milestone:** P2 — Heavy Impact Vertical Slice — **DONE** after desktop visual acceptance and clean P2.3 overlap benchmark on 2026-08-18.
- **Next action:** in Runtime Lab **Build P3.2.0**, run **`Synthetic Stress Compare` at 800 particles**. The compare now exercises the actual adapter modes: `emitter`, synchronous `shared`, and integrated `scheduled`. Require `workload MATCHED`, `cleanup CLEAN`, and a scheduled worst population frame around/under one 60 Hz frame with zero >20 ms population spikes before treating the scheduler as viable. If it passes, run **Heavy Impact A/B at intensity 2.0** to verify real-effect timing/visual parity between emitter and shared-scheduled.
- **Current Runtime Lab:** `site/heavy-impact-lab.html` — P3.2.0
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
- [x] **P2.2.1 cache-safe deployment fix:** the P2 Lab versions the imported `heavy-impact.js` module itself in addition to the HTML/top-level script, preventing an older effect definition from surviving behind a newer visible build label.
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
- [x] **Extract one-shot particle burst abstraction from Heavy Impact duplication:** effect code now calls `ParticleAdapter.burst()` for sparks/debris and no longer assumes that a one-shot burst must be implemented by a backend emitter object.
- [x] **Research direct shared-container runtime API in tsParticles v4:** official `ParticlesManager.addParticle/push` accepts runtime position, override particle options and a group id; Particle instances expose the group, allowing per-effect cleanup without clearing the whole container.
- [x] **Prototype Shared Emission Points path:** `TsParticlesAdapter` supports synchronous `burstMode = "shared"`, pushing authored particle options directly into the persistent container and grouping particles by burst id for per-instance cleanup.
- [x] **P3 Runtime Lab A/B harness:** the existing Heavy Impact page is the persistent Runtime Lab instead of creating another milestone page. It supports manual particle paths and automated real-effect/backend comparisons with portable logs.
- [x] **P3.0 real-effect A/B directional result recorded:** at intensity `2.0`, emitter path reported `59.3 FPS avg / 30.0 1% low / 1 spike / 237 peak particles`; shared-direct reported `60.0 / 60.0 / 0 spikes / 384 peak particles`. Shared looked promising despite ~62% more peak particles, but unequal peaks made the result directional evidence only.
- [x] **P3.1.1 matched synthetic backend benchmark implemented and run:** at 800 stationary matched particles / 24 points, workload was `MATCHED`, cleanup `CLEAN`. Emitter median setup ~`4 ms`; synchronous shared-direct ~`92 ms`; both rendered at ~`60/60/0` only after creation. This exposed that steady-state FPS sampling hid spawn cost.
- [x] **P3.1.2 spawn-hitch benchmark implemented and run:** matched 800-particle compare measured the actual population frames. Median results: emitter ~`2 ms` submit CPU / `2 ms` submit span but **`83.3 ms worst population frame / 1 >20 ms spike`**; shared-direct ~`76 ms` synchronous creation / **`66.7 ms worst / 1 spike`**; Lab-only shared-budgeted ~`118 ms` aggregate CPU / `242 ms` total population span but **`16.7 ms worst / 0 spawn spikes`**. All three reached peak `800`, steady `60/60`, workload `MATCHED`, cleanup `CLEAN`.
- [x] **P3.2.0 integrated Shared Emission Scheduler:** `TsParticlesAdapter` now has experimental `burstMode = "scheduled"`. It keeps one persistent container, creates a small immediate seed (`8`) for responsive impact feedback, then queues the remaining particles globally. A fair round-robin scheduler pushes chunks (`8`) under a `6 ms` CPU budget per animation frame so one large burst cannot monopolize creation. Queued work remains owned by its burst id and is cancellable through the existing handle/EffectInstance cleanup path.
- [x] **P3.2.0 benchmark upgraded to test the real adapter scheduler:** Synthetic Stress Compare no longer simulates frame yielding in Lab code. It submits matched workloads through `emitter`, `shared`, and actual `scheduled` adapter modes, measuring API submit CPU, total population span to target readiness, worst population frame, >20 ms population spikes, steady-state frame metrics, peak resources, queued work and cleanup.
- [ ] **Run P3.2.0 integrated stress at 800 particles.** Adoption requires `workload MATCHED`, `cleanup CLEAN`, no queued particles after cleanup, and scheduled worst population frame materially below emitter/shared-direct—target roughly one 60 Hz frame with zero >20 ms population spikes.
- [ ] **Run P3.2.0 Heavy Impact A/B at intensity `2.0` after the integrated stress passes.** Compare per-play emitter vs shared-scheduled for avg/low/spikes and visually confirm the scheduler does not make hero sparks/debris feel delayed, smeared, or too sparse during the first 1–3 frames.
- [ ] **Shared Emission Points / Burst Pooling adoption decision:** synchronous shared-direct is rejected as default in its current form. Promote shared-scheduled only if integrated stress and real Heavy Impact both preserve frame pacing, visual timing, ownership, direction, positioning, lifecycle and cleanup.
- [x] **Emitter overhead isolated from particle population cost:** matched tests show `addEmitter()` call/setup itself is cheap, but tsParticles can defer a heavy particle-population frame after the call. The optimization target is therefore bounded population work per frame, not merely reducing emitter object count.
- [ ] Keep DOM flash/wave helpers Lab-local until a second production effect proves they are genuinely reusable.
- [ ] Evaluate the accumulated screen-kick controller as a reusable gameplay/screen impulse helper when the next effect also needs it.
- [ ] Formalize asset preload/ownership required by real effects.
- [ ] Harden effect cancellation and cleanup for overlapping/restarted effects beyond the current Heavy Impact scenarios.
- [ ] Add quality controls based on measured costs rather than arbitrary particle-count presets.
- [ ] Re-run P0-style performance scenarios through FXDeck and compare runtime overhead against raw tsParticles after the shared-path decision.
- [ ] Validate resize/DPR/mobile behavior through the production runtime, including representative Heavy Impact behavior on Galaxy S20+ or equivalent mobile hardware.
- [ ] Keep effect definitions predominantly declarative/config-driven where practical; flag any effect that requires large bespoke lifecycle code.

**P3 exit:** runtime is stable enough that new effects should mostly exercise existing capabilities instead of forcing core redesign. High-frequency gameplay bursts must not create avoidable long main-thread population frames; if Shared Emission Points are adopted, their scheduling must bound per-frame creation work while retaining per-instance ownership and acceptable gameplay timing.

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
10. **Shared Emission Points are a first-class P3 candidate, not a presumed fix.** P2 exposed a real overlap frame-time problem, but particle-count changes strongly affected performance even with similar emitter counts. P3 must benchmark matched particle workloads before attributing gains to reduced emitter churn.
11. **Overlapping screen impulses should be aggregated.** P2.1 demonstrated that firing multiple independent transform animations on the same camera/stage target gives misleading and unstable feedback. The Lab accumulates kick impulses through one controller; a reusable runtime helper is considered only if later effects prove the same need.
12. **Visual hierarchy is also a performance control.** P2.2 reduced low-value particle density before runtime-level optimization; the clean P2.3 desktop benchmark cut peak particles from `454` to `229` while improving frame-time stability.
13. **Visible build labels must correspond to the modules actually executing.** When a local ESM dependency changes, its import URL must receive a new cache key/version. Versioning only the HTML or top-level controller is insufficient for reliable GitHub Pages iteration.
14. **Performance harness scheduling is part of measurement integrity.** A benchmark must own and cancel its own scheduled plays, prevent re-entrant captures and competing manual input, start from a known clean resource state, and distinguish harness scheduling from FXDeck lifecycle behavior.
15. **P2 pressure wave is not final art.** Its purpose was to prove sequencing and directional composition. A production pressure response may use distortion/refraction or another rendering technique; do not overfit Core around the current DOM arc.
16. **Mobile validation belongs to production-runtime hardening.** P0 established the raw backend envelope; P3 must validate the actual FXDeck production path after shared-emission and helper decisions are made.
17. **One-shot burst is a semantic adapter operation.** Heavy Impact asks for a burst; `TsParticlesAdapter` may satisfy it through emitter, synchronous direct particles, or a scheduler. Effect definitions should not encode backend object topology.
18. **Shared bursts must retain per-instance ownership.** Direct and scheduled shared particles use unique group ids so `EffectInstance.stop()` can remove only its own particles and cancel its own pending queued work rather than globally clearing the container.
19. **A visible browser build number is part of the release contract.** Any user-testable behavior, benchmark, UI or runtime change must advance the visible `P#.x.x` label; commits under an unchanged label are internal work and must not be handed off as a new build.
20. **Real-effect A/B and matched backend A/B answer different questions.** Heavy Impact measures production behavior; synthetic stress isolates backend population behavior only when workload is matched and repeated.
21. **Steady-state FPS after spawn is not sufficient for burst architecture decisions.** P3.1.1 exposed a ~92 ms synchronous shared-direct creation block at 800 matched particles that later 60 FPS sampling completely missed. Burst benchmarking must include the frame(s) in which particles are populated.
22. **Emitter call time is not emitter population cost.** P3.1.2 measured ~2 ms submit time yet ~83 ms worst population frame for the emitter path. Backend APIs may defer expensive work; measure frame pacing, not just call duration.
23. **Frame pacing is prioritized over fastest full-population latency for high-volume shared bursts.** The P3.1.2 Lab-only budgeted path intentionally took ~242 ms to finish 800 particles but bounded worst frame to ~16.7 ms and removed >20 ms spawn spikes. This trade is acceptable only if real effects remain visually responsive.
24. **Scheduled shared emission must be fair and cancellable.** P3.2 uses a global round-robin queue, small particle chunks, one shared CPU budget per animation frame, immediate seed particles for first-frame feedback, and burst ownership so large requests cannot starve newer gameplay hits and stopped effects cannot continue spawning.

---

# Changelog

## 2026-08-18

- **P3.2.0 — integrated Shared Emission Scheduler:** Added experimental `scheduled` burst mode to `TsParticlesAdapter`. It seeds up to `8` particles immediately, queues the remainder, and drains a global round-robin queue in `8`-particle chunks under a `6 ms` CPU budget per animation frame. Queue state is owned per burst, exposed in adapter stats, cancelled by burst/EffectInstance cleanup, and cleared on adapter reset.
- **P3.2.0 — integrated scheduler benchmark + real-effect gate:** Synthetic Stress Compare now benchmarks actual adapter `emitter`, `shared`, and `scheduled` modes rather than simulating yielding in Lab code. Population measurement spans API submission through matched target readiness and includes worst population frame. Runtime Lab also exposes `Shared scheduled` manually and changes Heavy Impact A/B to emitter vs shared-scheduled for the next real-effect validation.
- **P3.1.2 — matched 800 spawn-hitch result:** User ran the 3-round compare. Median emitter: `2.0 ms` CPU/span, `83.3 ms` worst spawn frame, `1` >20 ms spawn spike. Shared-direct: `76.0 ms` synchronous CPU/span, `66.7 ms` worst, `1` spike. Lab-only shared-budgeted: `118.0 ms` CPU, `242.0 ms` span, `16.7 ms` worst, `0` spawn spikes. All paths reached peak `800`, steady `60.0/60.0`, workload `MATCHED`, cleanup `CLEAN`. Conclusion: population scheduling—not emitter object count alone—is the meaningful optimization target.
- **P3.1.2 — spawn-hitch measurement + budgeted shared experiment:** Synthetic Stress Compare measures CPU creation time, total population span, worst frame during creation and >20 ms creation frames in addition to steady-state metrics. Added a Lab-only frame-budgeted direct-particle path to test whether yielding can remove the synchronous hitch before touching runtime semantics.
- **P3.1.1 — matched 800 result:** Workload `MATCHED`, cleanup `CLEAN`. Emitter median ~`4 ms` setup with `60/60/0` steady metrics; shared-direct ~`92 ms` synchronous creation with the same `60/60/0` steady metrics. The old post-spawn FPS sample hid shared-direct's creation hitch.
- **P3.1.1 — benchmark repeatability:** Hardened Synthetic Stress A/B to 3 rounds per path with alternating execution order. Final decision line reports median metrics and requires both `workload MATCHED` and `cleanup CLEAN`.
- **P3.1.0 — matched synthetic backend stress:** Added `400 / 800 / 1200` matched particle presets across `16 / 24 / 32` emission points, with explicit workload and cleanup validity checks.
- **P3.1.0 — release/version discipline:** Advanced visible Runtime Lab versioning and made version advancement/cache-busting mandatory for user-testable browser iterations.
- **P3.0 real-effect A/B result:** At intensity `2.0`, per-play emitter reported `59.3 FPS avg / 30.0 1% low / 1 >20ms / 237 peak particles`; shared-direct `60.0 / 60.0 / 0 / 384`. Directional evidence only because temporal peaks differed.
- **P3.0.0 — Shared Emission Points prototype:** Added `ParticleAdapter.burst()` and existing emitter vs synchronous persistent-container direct strategies with per-burst group ownership.
- **P3.0.0 Runtime Lab:** Promoted Heavy Impact page into persistent Runtime Lab rather than creating another milestone tab.
- **P2 DONE / P3 ACTIVE:** Heavy Impact vertical-slice look accepted; pressure wave retained as browser placeholder for possible future distortion/refraction implementation. Mobile production validation moved to P3.
- **P2.3 clean desktop benchmark:** Intensity `2.0`, exactly `6 instances`, peak `5 emitters / 229 particles`, `59.3 FPS avg / 30.0 1% low / 1 >20ms`, final `0/0/0`.
- **P2.3.1:** Hardened overlap benchmark scheduling, reset and Stop All behavior.
- **P2.3.0:** Increased pressure-wave readability without Core/API changes.
- **P2.2.1:** Fixed stale-module deployment behavior with cache-safe imported module versioning.
- **P2.2.0:** Heavy Impact visual hierarchy pass reduced particle density and improved readability/performance.
- **P2.1 measured baseline:** Intensity `0.5`: `6 emitters / 130 particles`, `60/60/0`; intensity `2.0`: `6 emitters / 454 particles`, `55.4 avg / 20 low / 5 spikes`; both final `0/0/0`.
- **P2.1.0:** Added measured overlap diagnostics and accumulated inner-layer screen kick.
- **P2 finding / P3 requirement:** Added Shared Emission Points / Burst Pooling as a measured optimization candidate.
- **P2.0.0:** Added first Heavy Impact vertical slice and three-column Lab.
- **P1.3.1 / P1 DONE:** Automated lifecycle validation PASS and portable runtime logs.
- **P1.3.0:** Added one-click lifecycle validator.
- **P1.2.3:** Locked desktop workbench proportions.
- **P1.2.2:** Rebalanced desktop columns.
- **P1.2.1:** Rebuilt Core Lab as widescreen three-column workbench.
- **P1.2.0:** Added true continuous direction contract.
- **P1.1.0:** Added authored-definition inspector.
- **P1.0.0:** Added minimal FXDeck Core.
- **P0.3.0:** Added raw 150/400/800 performance test; Galaxy S20+ held ~60 FPS at 150/400 and ~57.4 avg / 30 low at ~800.
- **P0.2.2:** Fixed tsParticles v4 bootstrap with explicit `loadFull(tsParticles)`.
- **P0.2.1:** Fixed coordinate/preload/lifecycle/resize validation and portable P0 logs.
