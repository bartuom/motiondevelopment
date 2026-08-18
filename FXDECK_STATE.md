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
- **Status:** ACTIVE — P3.4.0 moves beyond the Heavy Impact vertical slice. Explosion is implemented as the second real effect using the same production `shared-scheduled` burst path, EffectInstance lifecycle, runtime parameters and only the small helpers now proven by two effects.
- **Previous milestone:** P2 — Heavy Impact Vertical Slice — **DONE** after desktop visual acceptance and clean P2.3 overlap benchmark on 2026-08-18.
- **Next action:** in Runtime Lab **Build P3.4.0**, leave `Explosion` selected and `Shared scheduled — production default`. First run several single `FXDeck.play()` calls at intensity `1.0` and visually confirm the core sprite/fireball/sparks/debris/smoke read as one explosion with no obvious delayed layer. Then set intensity `2.0` and run **`Effect A/B`** once. Paste the resulting Explosion A/B log and visual verdict. If Explosion works without runtime redesign, the second-effect architecture proof passes and P3 can move to remaining production hardening (mobile/DPR/quality) instead of effect-specific framework work.
- **Current Runtime Lab:** `site/heavy-impact-lab.html` — P3.4.0
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

**Goal:** extract only abstractions demonstrated by real effects, then harden the runtime.

- [x] **Extract the smallest repeated effect helpers only after a second effect proves them:** P3.4 adds shared `burstTracked`, `scheduleAsync` and `runHook` helpers used by both Heavy Impact and Explosion. No generic timeline/track system was introduced.
- [x] **Extract one-shot particle burst abstraction from Heavy Impact duplication:** effect code calls `ParticleAdapter.burst()` and does not assume backend emitter topology.
- [x] **Research direct shared-container runtime API in tsParticles v4:** official ParticlesManager runtime operations support the direct/shared prototype and per-group ownership.
- [x] **Prototype Shared Emission Points path** and retain synchronous shared-direct only as diagnostic/reference after measurement.
- [x] **P3 Runtime Lab A/B harness:** one persistent Runtime Lab hosts real-effect tests and matched backend stress instead of adding a page per effect/milestone.
- [x] **P3.1/P3.2 matched stress isolated particle population timing:** emitter and shared-direct both produced long population frames; the frame-budgeted shared scheduler removed >20 ms population spikes under the tested 800-particle workload.
- [x] **P3.2.1 heterogeneous Emission Point stress passed:** per-point count/intensity, color, direction, speed, size and opacity variation produced no scheduler frame-pacing regression at matched 800 particles / 24 points.
- [x] **Real Heavy Impact A/B passed at intensity `2.0`:** emitter `57.4 avg / 30 low / 4 spikes / 262 peak particles`; shared-scheduled `60/60/0 / 384 peak particles / 36 peak queued`, cleanup clean. User visually preferred scheduled/B.
- [x] **Shared-scheduled adopted as the production default for semantic one-shot bursts in P3.3.0.** Explicit emitter APIs remain available for sustained/moving emitter archetypes; shared-direct remains diagnostic/reference.
- [x] **P3.3.0 cancellation gate passed 2026-08-18.** Phase 1 started with `1 instance / 1 group / 8 particles / 36 queued`; `FXDeck.stop(instance)` removed owned particles and queued work and no late respawn occurred. Phase 2 started with `6 instances / 6 groups / 48 particles / 216 queued`; `FXDeck.stopAll()` cleared all instances/groups/particles/queue and delayed Heavy Impact work did not respawn.
- [x] **Effect cancellation/cleanup hardened for active scheduled queue work:** per-instance queue ownership, stopAll cleanup and delayed no-respawn behavior are validated by the P3.3 gate.
- [x] **Second real effect implemented without a new runtime subsystem:** P3.4 adds `explosion/v1/default` with core image sprite, fireball particles, broad directional sparks, debris, smoke and screen kick. It uses the same `FXDeck.play`, EffectInstance ownership, runtime position/direction/intensity, semantic burst API and production shared scheduler as Heavy Impact.
- [x] **Runtime Lab generalized from Heavy-Impact-only UI to multi-effect selection:** Heavy Impact and Explosion share the same stage, `FXDeck.play`, Overlap ×6, Effect A/B, inspector, timeline and logs.
- [x] **Screen-kick integration reuse proven by a second effect:** Explosion uses the same accumulated screen-kick controller. Keep it as an integration/Lab helper for now rather than pushing browser camera behavior into FXDeck Core.
- [ ] **Validate Explosion visually and through real-effect A/B.** Confirm the core sprite/fireball/sparks/debris/smoke read as one cue, scheduled emission does not visibly smear the short explosion, direction/intensity remain meaningful, cleanup is clean and the selected-effect A/B remains stable at intensity `2.0`.
- [ ] **Formalize asset preload/ownership:** Explosion adds a second preloaded SVG (`fxdeck-explosion-core.svg`), proving the need is real; next step is to decide the smallest effect-owned preload declaration instead of growing a manual Lab preload list.
- [ ] **DOM hook policy:** Heavy Impact and Explosion both use browser integration hooks, but their visual implementations differ. Keep transient DOM animation implementation Lab-local until a third effect demonstrates a stable reusable surface beyond the existing small Lab helpers.
- [ ] Add quality controls based on measured costs rather than arbitrary particle-count presets.
- [ ] Re-run P0-style performance scenarios through FXDeck and compare runtime overhead against raw tsParticles after the shared-path decision.
- [ ] Validate resize/DPR/mobile behavior through the production runtime, including representative Heavy Impact and Explosion behavior on Galaxy S20+ or equivalent mobile hardware.
- [ ] Keep effect definitions predominantly declarative/config-driven where practical; flag any effect that requires large bespoke lifecycle code.

**P3 exit:** runtime is stable enough that new effects mostly exercise existing capabilities instead of forcing core redesign. The scheduler/ownership path is accepted for one-shot bursts. Explosion is the current second-effect proof; remaining blockers after it passes are asset ownership, quality controls, production-runtime comparison and mobile/DPR hardening.

---

## P4 — Production VFX Library — PLANNED

**Goal:** prove FXDeck across different gameplay-effect archetypes and measure whether it actually reduces custom implementation work.

- [x] **Heavy Impact** — composite timing, direction, screen/target hooks; first production-style effect accepted in P2/P3.
- [ ] **Explosion** — implementation exists in P3.4 with sprite/image + particles; pending visual/performance acceptance before counting it complete.
- [ ] **Fireball** — moving source + trail + impact transition.
- [ ] **Critical Hit** — ultra-short timing and readable impact hierarchy.
- [ ] **Rare Reward** — UI/DOM + particles.
- [ ] **Magic Burst** — more complex motion/noise/color behavior.
- [ ] **Environment emitter** — sustained/long-running lifecycle; use this effect to decide whether live EffectInstance parameter updates are actually necessary.
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
- large timeline/track system
- hot-swapping an authored effect definition on an already-playing short-lived effect instance

---

# Key architectural decisions

1. **tsParticles is the initial particle backend, not the public FXDeck API.** Backend-specific behavior stays behind `TsParticlesAdapter`.
2. **P0 remains raw.** It is the performance and behavior reference against which FXDeck overhead can later be measured.
3. **Version and variant are authored definitions.** They are saved config revisions, not runtime sliders.
4. **Position, direction and intensity are runtime inputs.** They modify one play instance without creating a new authored version.
5. **Vertical-slice-first / proof-first.** New abstractions are extracted only after real effects prove repetition.
6. **Primary product KPI:** how much effect-specific custom code is required to add the next production effect while preserving quality, cleanup and performance.
7. **Active short-lived definitions remain immutable.** Live parameter mutation is deferred until a sustained effect proves it useful.
8. **Runtime diagnostics are portable.** Lab logs remain copy/paste friendly.
9. **Browser integration hooks remain explicit.** Target/camera/DOM behavior is supplied through effect hooks rather than hard-coded into Core.
10. **Shared Emission Points were measured before adoption.** Population scheduling, not emitter-object count alone, was the meaningful optimization target.
11. **Overlapping screen impulses are aggregated.** Heavy Impact and Explosion now both use the same Lab-level controller.
12. **Visual hierarchy is also a performance control.** Reduce low-value particles before runtime-level optimization.
13. **Visible build labels must correspond to the modules actually executing.** Changed local ESM dependencies receive new cache keys.
14. **Performance harness scheduling is part of measurement integrity.** Benchmarks own/cancel their tasks and start from clean state.
15. **Heavy Impact pressure wave is not final art.** It remains a placeholder for possible distortion/refraction-style treatment.
16. **Mobile validation belongs to production-runtime hardening.** P0 established the raw backend envelope; P3 validates the actual production path.
17. **One-shot burst is a semantic adapter operation.** Effect code asks for `burst()` and does not encode backend topology.
18. **Shared bursts retain per-instance ownership.** Scheduled particles and queued jobs are removable per EffectInstance.
19. **A visible browser build number is part of the release contract.** Any user-testable behavior advances the visible `P#.x.x` label.
20. **Real-effect A/B and matched backend A/B answer different questions.** Both are required for architecture decisions.
21. **Steady-state FPS after spawn is insufficient.** Burst benchmarking includes population frames.
22. **Emitter call time is not emitter population cost.** Backend APIs may defer expensive work.
23. **Frame pacing is prioritized over fastest full-population latency** when real-effect responsiveness is preserved.
24. **Scheduled shared emission is fair and cancellable by design.** It uses a global round-robin queue, small chunks, per-frame CPU budget, immediate seed particles and burst ownership.
25. **Shared Emission Points support heterogeneous runtime data.** P3.2.1 measured this without scheduler frame-pacing regression at 800/24.
26. **`shared-scheduled` is the production default for semantic one-shot bursts from P3.3 onward.** This does not eliminate explicit emitters for sustained/moving use.
27. **Small effect helpers are extracted only when repeated by two real effects.** P3.4 introduced `effect-utils.js` only after Explosion repeated Heavy Impact's burst ownership, async cue scheduling and hook cleanup patterns.
28. **One Runtime Lab, many effects.** New production effects should be selectable in the existing Lab; do not create a new page/tab for each effect.

---

# Changelog

## 2026-08-18

- **P3.4.0 — Explosion second-effect proof:** Added `explosion/v1/default` with a preloaded SVG core sprite plus fireball, sparks, debris and smoke bursts, broad runtime direction bias, intensity scaling and screen kick. It uses the existing production shared-scheduled path and EffectInstance lifecycle; no new runtime subsystem was added.
- **P3.4.0 — proven effect helpers:** Added `effect-utils.js` containing only `burstTracked`, `scheduleAsync` and `runHook`, extracted because both Heavy Impact and Explosion now repeat those patterns. Heavy Impact was migrated to the same helpers.
- **P3.4.0 — multi-effect Runtime Lab:** Added an Effect selector and generalized the existing Runtime Lab play/overlap/A-B/inspector/timeline workflow so Explosion and Heavy Impact use one page and one runtime. Explosion is selected by default in this build.
- **P3.3.0 — cancellation gate PASS:** User-run gate started phase 1 with `1 instance / 1 group / 8 particles / 36 queued` and phase 2 with `6 instances / 6 groups / 48 particles / 216 queued`. `stop(instance)` and `stopAll()` both cleared owned/live/queued work, and delayed checks found no respawn.
- **P3.3.0 — production one-shot scheduler default:** Promoted `TsParticlesAdapter` default burst mode from emitter to scheduled; direct emitter behavior remains available explicitly.
- **P3.3.0 — cancellation/late-respawn gate:** Added the two-phase runtime ownership validation.
- **P3.2.1 — real Heavy Impact scheduler A/B PASS:** intensity `2.0` emitter `57.4 avg / 30 low / 4 spikes / 262 particles`; shared-scheduled `60/60/0 / 384 particles / 36 peak queued`, cleanup clean; user visually preferred scheduled/B.
- **P3.2.1 — matched heterogeneous stress PASS:** uniform and heterogeneous 800/24 profiles both `MATCHED/CLEAN`; shared-scheduled held `16.7 ms worst / 0 population spikes / 60/60 steady` in both.
- **P3.2.1 — heterogeneous Emission Point stress harness:** Added controlled per-point count/intensity, color, direction, speed, size and opacity variation.
- **P3.2.0 — integrated Shared Emission Scheduler:** Added scheduled burst mode with immediate seed, fair global queue, 8-particle chunks and 6 ms frame budget.
- **P3.1.2 — matched 800 spawn-hitch result:** emitter `83.3 ms worst / 1 spike`, shared-direct `66.7 / 1`, Lab-only shared-budgeted `16.7 / 0`; workload matched and cleanup clean.
- **P3.1.1 — matched 800 result:** emitter setup cheap; shared-direct synchronous creation expensive; post-spawn steady FPS shown insufficient.
- **P3.1.0 — matched synthetic backend stress + release/version discipline.**
- **P3.0.0 — Shared Emission Points prototype:** Added semantic `ParticleAdapter.burst()` and emitter/shared-direct strategies with per-burst ownership.
- **P3.0.0 Runtime Lab:** Promoted Heavy Impact page into persistent Runtime Lab.
- **P2 DONE / P3 ACTIVE:** Heavy Impact vertical-slice look accepted; mobile production validation moved to P3.
- **P2.3 clean desktop benchmark:** intensity `2.0`, exactly `6 instances`, `229` peak particles, `59.3 avg / 30 low / 1 spike`, final `0/0/0`.
- **P2.3.1:** Hardened overlap benchmark scheduling/reset/Stop All.
- **P2.3.0:** Increased pressure-wave readability without Core/API changes.
- **P2.2.1:** Fixed stale-module deployment with cache-safe imported module versioning.
- **P2.2.0:** Heavy Impact visual hierarchy pass reduced particle density and improved performance.
- **P2.1 measured baseline:** intensity `2.0` `454 particles`, `55.4 avg / 20 low / 5 spikes`, final `0/0/0`.
- **P2.1.0:** Added measured overlap diagnostics and accumulated screen kick.
- **P2.0.0:** Added first Heavy Impact vertical slice and three-column Lab.
- **P1.3.1 / P1 DONE:** Automated lifecycle validation PASS and portable runtime logs.
- **P1.0.0:** Added minimal FXDeck Core.
- **P0.3.0:** Added raw 150/400/800 performance test; Galaxy S20+ held ~60 FPS at 150/400 and ~57.4 avg / 30 low at ~800.
- **P0.2.2:** Fixed tsParticles v4 bootstrap with explicit `loadFull(tsParticles)`.
- **P0.2.1:** Fixed coordinate/preload/lifecycle/resize validation and portable P0 logs.
