# FXDeck — Project State, Roadmap & Changelog

> **Canonical project state.** Update this file with every material FXDeck implementation change.
>
> Mandatory rules:
> - A milestone is `DONE` only when its exit criteria are complete.
> - Add abstractions only after real effects or measured failures prove the need.
> - P0 remains the raw-tsParticles reference benchmark.
> - Every changed browser module must receive a fresh cache key.
> - Every user-testable browser iteration must advance the visible `P#.x.x` build label.
> - Browser release flow is mandatory: **code change → commit/push `main` → Pages workflow → live/cache verification when tooling allows → user test**.

## Current state

- **Current milestone:** P3 — Extract Proven Abstractions / Production Runtime
- **Current build:** **P3.5.0**
- **Status:** ACTIVE — the one-shot scheduler, ownership/cancellation and second-effect architecture proof have passed. P3.5 adds queue-aware quality/backpressure and more useful frame-time telemetry after Explosion exposed a large scheduler backlog under ×6 intensity-2 overlap.
- **Previous milestone:** P2 — Heavy Impact Vertical Slice — **DONE**.
- **Current Runtime Lab:** `site/heavy-impact-lab.html` — P3.5.0
- **Current Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1
- **Reference benchmark:** `site/webfx-lab.html` — P0.3.0
- **Next action:** on live **Build P3.5.0**, select `Explosion`, `Shared scheduled — production default`, intensity `2.0`, then run **Effect A/B**. Validate both performance and appearance. The scheduled result should report p95/p99/worst frame, frame-time debt, queue pressure and `quality admitted/requested/shed`. Success means backlog-aware shedding lowers queue/particle pressure or frame-time severity without visibly weakening the explosion hero read.

## Product target

FXDeck is a lightweight gameplay VFX runtime for web games. Game code should trigger a complete versioned cue with a small API while FXDeck owns backend topology, scheduling and lifecycle:

```js
FXDeck.play("explosion", {
  position: hitPosition,
  direction: hitDirection,
  intensity: 1.2
});
```

FXDeck is **not** intended to become a particle simulator, node editor, mini-Niagara, shader graph or generic animation engine. tsParticles is the initial backend behind `ParticleAdapter`.

---

# Roadmap

## P0 — tsParticles Technology Spike — DONE

- [x] Explicit `loadFull(tsParticles)` bootstrap.
- [x] Runtime emitter creation/movement/cleanup.
- [x] Exact CSS/gameplay → retina-canvas positioning.
- [x] Image/SVG particles and DOM compositing.
- [x] Resize/reflow validation.
- [x] Raw FPS/1% low/spike/particle cleanup benchmark.
- [x] Galaxy S20+ raw backend validation: ~150/~400 particles near 60 FPS; ~800 begins to expose the performance cliff.

**Exit:** tsParticles accepted as initial backend; P0 frozen as raw reference.

---

## P1 — Minimal FXDeck Core — DONE

- [x] `FXDeck.register`, `play`, `stop`, `stopAll`.
- [x] `EffectInstance` owns timers and cleanup callbacks.
- [x] `CoordinateAdapter` hides CSS/canvas/DPR conversion.
- [x] `TsParticlesAdapter` hides backend details.
- [x] Authored `id/version/variant` separated from runtime inputs.
- [x] Runtime `position`, normalized `direction`, and `intensity`.
- [x] Definition/runtime inspector and three-column workbench.
- [x] Repeated-play cleanup and stopAll validation.
- [x] Portable copyable logs.

**Exit:** minimal public API accepted and frozen unless a real effect proves a missing capability.

---

## P2 — Heavy Impact Vertical Slice — DONE

Heavy Impact proved that one `FXDeck.play("heavyImpact", ...)` call can coordinate a complete gameplay cue with particles + integration hooks.

- [x] Contact flash, directional sparks, debris, pressure-wave placeholder, target recoil and accumulated screen kick.
- [x] Runtime direction/intensity affect real authored values.
- [x] One `EffectInstance` owns the composite lifecycle.
- [x] P2.1 high-load baseline at intensity `2.0`: `454 peak particles`, `55.4 avg / 20 low / 5 >20ms`, final clean.
- [x] P2.2/P2.3 visual hierarchy reduced low-value density.
- [x] Clean post-polish desktop benchmark: `229 peak particles`, `59.3 avg / 30 low / 1 >20ms`, final `0/0/0`.
- [x] User accepted the single-impact visual slice; pressure wave remains a browser placeholder for possible future distortion/refraction treatment.

**Exit:** product thesis proven; P3 targets only abstractions/performance failures exposed by Heavy Impact.

---

## P3 — Extract Proven Abstractions / Production Runtime — ACTIVE

### Semantic one-shot burst + Shared Emission Scheduler

- [x] Effect code uses semantic `ParticleAdapter.burst()` rather than assuming emitter objects.
- [x] Retained explicit paths for testing/other archetypes: `emitter`, `shared-direct`, `shared-scheduled`.
- [x] Matched backend stress established that emitter call time is not population cost.
- [x] P3.1.2 matched 800/24 result: emitter ~`83.3ms worst / 1 population spike`; shared-direct ~`66.7ms / 1`; frame-budgeted shared ~`16.7ms / 0`.
- [x] Integrated global shared scheduler: persistent container, immediate seed, fair queue, `8`-particle chunks, `6ms` CPU budget/frame.
- [x] Heterogeneous 800/24 profile supports per-point count/intensity, color, direction, speed, size and opacity with no scheduler frame-pacing regression.
- [x] Heavy Impact real A/B intensity `2.0`: emitter `57.4 avg / 30 low / 4 spikes / 262 peak`; scheduled `60/60/0 / 384 peak / 36 queued`; cleanup clean. User visually preferred scheduled.
- [x] `shared-scheduled` promoted to production default for semantic one-shot bursts in P3.3. Explicit emitter APIs remain for sustained/moving emitter archetypes; shared-direct is diagnostic/reference.

### Ownership / cancellation

- [x] Scheduled bursts retain unique group ownership and queued-work ownership.
- [x] P3.3 cancellation gate PASS: `FXDeck.stop(instance)` removed one active group + queue with no late respawn.
- [x] `FXDeck.stopAll()` removed six active instances/groups/queue with no delayed respawn.

### Second real effect / abstraction pressure

- [x] P3.4 added `explosion/v1/default` without a new runtime subsystem.
- [x] Explosion reuses `FXDeck.play`, `EffectInstance`, runtime position/direction/intensity, semantic burst API and shared scheduler.
- [x] Small helpers `burstTracked`, `scheduleAsync`, `runHook` extracted only after both Heavy Impact and Explosion repeated them.
- [x] One persistent Runtime Lab supports Heavy Impact and Explosion; no new page/tab per effect.
- [x] Screen-kick integration reused by a second effect while remaining Lab/integration-level rather than Core.
- [x] **Explosion second-effect architecture proof PASS (2026-08-18).** User visually preferred scheduled/B. Across three intensity-2 ×6 A/B runs, emitter produced `53.4–55.4 avg`, `15–20 1% low`, `5–8 >20ms`, `538–604 peak particles`; scheduled produced `53.4 avg`, `30 low`, `10 >20ms`, `870 peak particles`, `176–224 peak queued`. All runs cleaned to zero. Scheduled did not win simple avg/spike-count metrics, but preserved a materially better low while carrying ~57% more peak particles and was visually preferred.
- [x] Explosion therefore confirms the architecture can add a different composite cue without Core redesign.

### P3.5 — queue-aware quality/backpressure

Explosion exposed the next real production issue: the scheduler could accept a large amount of low-value work even when backlog was already high. P3.5 adds semantic quality priority instead of globally reducing every effect.

- [x] Scheduled burst priorities: `hero`, `high`, `medium`, `low`.
- [x] Weighted scheduler service favors hero/high work while still servicing medium/low work.
- [x] Explosion priority map: core `hero`, fireball `hero`, sparks `high`, debris `medium`, smoke `low`.
- [x] Heavy Impact: sparks `hero`, debris `medium`.
- [x] Queue pressure thresholds: medium `96`, high `160`, critical `240` queued particles.
- [x] Backpressure admission policy keeps hero at 100%; progressively sheds lower-value work as pressure rises. At critical pressure the current scales are hero `1.0`, high `.8`, medium `.5`, low `.15`.
- [x] Adapter telemetry records requested/admitted/shed particles, shed bursts, peak pressure and priority breakdown.
- [x] Synthetic matched backend stress explicitly sets `backpressure:false`, preserving matched-workload integrity.
- [x] Real Effect A/B uses the production quality policy.
- [x] Runtime telemetry now includes p95, p99, worst frame and **frame-time debt** (`Σ max(0, frameMs - 16.667)`) in addition to avg FPS, 1% low and >20ms count.
- [ ] **Run P3.5 Explosion Effect A/B at intensity `2.0`.** Compare p95/p99/worst/debt, peak queue/particles, admitted/requested/shed and visual quality against P3.4 behavior.
- [ ] Tune thresholds/scales only if measured P3.5 behavior justifies it; do not keep adding policy knobs speculatively.

### Remaining P3 hardening after quality gate

- [ ] Formalize effect-owned asset preload/ownership. Explosion's second SVG proves manual Lab preload lists no longer scale.
- [ ] Keep DOM/transient visual helpers Lab-local until a third effect proves a stable reusable surface.
- [ ] Re-run representative P0-style scenarios through production FXDeck and quantify runtime overhead against raw tsParticles.
- [ ] Validate resize/DPR behavior through production Heavy Impact + Explosion.
- [ ] Validate production runtime on mobile / Galaxy S20+ or equivalent target.
- [ ] Keep effect definitions predominantly config-driven; flag any new effect requiring large bespoke lifecycle code.

**P3 exit:** new effects mostly exercise existing capabilities rather than forcing Core redesign; one-shot scheduling has bounded frame work, ownership/cancellation and priority-aware quality; production asset ownership, runtime overhead and mobile/DPR behavior are validated.

---

## P4 — Production VFX Library — PLANNED

- [x] **Heavy Impact** — first production-style effect.
- [x] **Explosion** — second-effect architecture proof accepted; current quality/backpressure tuning remains P3 runtime hardening.
- [ ] **Fireball** — moving source + trail + impact transition.
- [ ] **Critical Hit** — ultra-short timing/readability.
- [ ] **Rare Reward** — UI/DOM + particles.
- [ ] **Magic Burst** — more complex motion/noise/color.
- [ ] **Environment emitter** — sustained/long-running lifecycle; use it to decide whether live `EffectInstance` updates are actually needed.
- [ ] Track effect-specific custom code and authoring time.
- [ ] Validate representative effects on mobile quality targets.

**P4 success metric:** adding a new gameplay VFX is materially faster/simpler than hand-wiring tsParticles + DOM/sprites/lifecycle.

---

## P5 — Productization Decision — PLANNED

- [ ] Review runtime stability, authoring speed, bundle/runtime overhead and mobile results.
- [ ] Decide internal library vs open-source runtime vs commercial toolkit/content packs.
- [ ] If public: minimal docs/examples/packaging/supported browser baseline.
- [ ] If commercial: validate gameplay-ready effect/workflow value rather than competing as another generic particle editor.
- [ ] Rebuild public showcase around production effects after the productization decision.

---

# Explicitly out of scope until proven necessary

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
- hot-swapping authored definitions on already-playing short effects

---

# Key architectural decisions

1. **tsParticles is a backend, not the public API.**
2. **P0 remains raw** as the backend reference.
3. **Version/variant are authored; position/direction/intensity are runtime inputs.**
4. **Proof-first architecture:** extract only after real repetition/failure.
5. **Primary KPI:** effect-specific custom code required for the next production effect.
6. **Short-lived active definitions remain immutable.** Live mutation waits for a sustained effect.
7. **Diagnostics must be portable/copyable.**
8. **Browser target/camera/DOM behavior stays behind explicit integration hooks.**
9. **One-shot burst is semantic.** Effects do not encode backend object topology.
10. **Population scheduling, not emitter-object count alone, is the important burst optimization target.**
11. **`shared-scheduled` is the production default for one-shot bursts; explicit emitters remain for sustained/moving use.**
12. **Shared scheduled work is fair, bounded and cancellable.**
13. **Per-point heterogeneous data is supported.**
14. **Visual hierarchy is also runtime quality policy.** Hero/high/medium/low priorities let FXDeck degrade low-value particles first instead of applying a blind global count multiplier.
15. **Matched synthetic benchmarks must disable adaptive shedding.** Production quality tests and backend-isolation tests answer different questions.
16. **Frame severity matters more than spike count alone.** p95/p99/worst/debt are first-class diagnostics because Explosion showed more >20ms frames could still feel visually smoother with a better 1% low.
17. **Small effect helpers are extracted only after two real effects repeat them.**
18. **One Runtime Lab, many effects.** Do not create a page per effect/milestone.
19. **Every user-testable browser iteration advances the visible build and cache keys.**
20. **Release completion means push + Pages deployment verification when accessible, not local/repo edits alone.**

---

# Changelog

## 2026-08-18

- **P3.5.0 — queue-aware quality/backpressure:** Added semantic scheduled-burst priorities, weighted queue service, medium/high/critical backlog thresholds and admission shedding that protects hero work while reducing low-value particles first.
- **P3.5.0 — quality telemetry:** Added requested/admitted/shed counts, shed bursts, queue pressure, priority breakdown and peak pressure.
- **P3.5.0 — frame-time diagnostics:** Added p95, p99, worst frame and frame-time debt to Runtime Lab and real Effect A/B output.
- **P3.5.0 — benchmark integrity:** Synthetic Stress explicitly disables backpressure so matched backend workloads remain comparable; real Effect A/B uses production quality policy.
- **P3.4.0 — Explosion architecture proof PASS:** user visually preferred scheduled/B. Three intensity-2 ×6 runs showed emitter `53.4–55.4 avg / 15–20 low / 5–8 spikes / 538–604 peak`; scheduled `53.4 avg / 30 low / 10 spikes / 870 peak / 176–224 queued`; all cleanup clean. The large backlog became the P3.5 quality/backpressure motivation.
- **P3.4.0 — Explosion + multi-effect Runtime Lab:** Added second real effect and generalized existing Lab without a new page.
- **P3.4.0 — proven effect helpers:** Added `burstTracked`, `scheduleAsync`, `runHook` after repetition by two effects.
- **P3.3.0 — cancellation gate PASS:** per-instance stop and stopAll clear live/queued work with no late respawn.
- **P3.3.0 — shared-scheduled production default.**
- **P3.2.1 — Heavy Impact scheduled A/B PASS:** emitter `57.4/30/4`, scheduled `60/60/0`; scheduled visually preferred.
- **P3.2.1 — matched heterogeneous stress PASS:** scheduled held ~`16.7ms worst / 0 population spikes` at 800/24 for uniform and heterogeneous profiles.
- **P3.2.0 — integrated Shared Emission Scheduler.**
- **P3.1.2 — matched spawn-hitch isolation:** emitter `83.3ms worst`, shared-direct `66.7ms`, budgeted shared `16.7ms`.
- **P3.1.0/P3.1.1 — matched synthetic stress + repeatability + release/version discipline.**
- **P3.0.0 — semantic burst abstraction + Shared Emission Points prototype + persistent Runtime Lab.**
- **P2 DONE:** Heavy Impact visual slice accepted; clean post-polish benchmark `229 peak / 59.3 avg / 30 low / 1 spike`.
- **P1 DONE:** minimal Core/lifecycle/runtime params/portable logs accepted.
- **P0.3.0:** raw tsParticles performance envelope including Galaxy S20+ reference.
