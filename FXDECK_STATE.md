# FXDeck — Project State, Roadmap & Changelog

> **Canonical project state.** Update with every material implementation change.
>
> Mandatory rules:
> - Add abstractions only after a real effect or measured failure proves the need.
> - P0 remains the raw-tsParticles performance reference.
> - Every changed browser module gets a fresh cache key before user handoff.
> - Every user-testable browser iteration advances the visible `P#.x.x` build.
> - Release flow: **code → commit/push `main` → Pages workflow → live/cache verification when available → user test**.

## Current state

- **Milestone:** P3 — Production Runtime Capability Completion.
- **Current build:** **P3.11.0**.
- **Status:** ACTIVE — Critical Hit implementation complete; visual/readability validation pending. Football Card P3.10.1 sports-art validation also remains pending.
- **Runtime Lab:** `site/heavy-impact-lab.html` — P3.11.0.
- **Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1.
- **Raw reference:** `site/webfx-lab.html` — P0.3.0.
- **Primary real-effect test:** Runtime Lab Play + Debug / Tests → Effect Grid Lab.
- Backend stress / topology isolation remains advanced diagnostics, not normal product workflow.

---

# Product target

FXDeck is a lightweight gameplay VFX runtime for web games. Game code triggers complete, versioned cues while FXDeck owns adapters, sequencing and lifecycle.

Architecture principle:

```text
Minimal Core
↓
Real effect
↓
Observe actual repetition / failure
↓
Extract only proven abstractions
```

Primary KPI: **how much bespoke runtime plumbing is required to add the next effect?**

---

# Accepted runtime archetypes

## Heavy Impact — accepted one-shot composite
- complete gameplay cue through one `FXDeck.play()`;
- flash / sparks / debris / target recoil / screen kick;
- lifecycle and overlap cleanup validated.

## Explosion — accepted one-shot composite
- second different cue without Core redesign;
- reuses semantic particle bursts, ownership and screen hooks.

## Fireball — accepted moving-source archetype
- independently owned moving hero visual;
- compositor-friendly motion;
- runtime direction/intensity;
- sparse trail;
- child `Explosion` handoff;
- concurrent ownership / cleanup;
- Grid compatible.

Remaining Fireball work is art / optional quality scaling, not missing runtime architecture.

## Environment Emitter — accepted sustained archetype

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

Proven:
- one explicit sustained emitter per source;
- multiple independent sources;
- live position + intensity on the same EffectInstance;
- direction spawn-time only;
- normal individual/stopAll cleanup.

## Rare Reward — retained fantasy UI/card reference

`rareReward/v1/default` remains intentionally separate. It proves large DOM/SVG composition, staged Web Animations, particle accents and owned cleanup. It is **not** the primary football portfolio target.

---

# Football Card Reveal

## Runtime identity

```js
const card = FXDeck.play("footballCardReveal", {
  version: "v1",
  variant: "elite",
  position: cardPosition,
  direction: 24,
  intensity: 1.0
});

FXDeck.update(card, { state: "reveal" });
```

`play()` creates a persistent collectible in back-card idle. The same EffectInstance reveals later through `update({state:"reveal"})` and stays readable until explicit stop.

No generic card framework, generic state machine or generic timeline was introduced.

## P3.10.0 — interaction / choreography baseline

Implemented:
- double-sided DOM/SVG card;
- persistent back-card idle;
- subtle float / pulse;
- intermittent shimmer;
- click-driven reveal;
- anticipation + pre-reveal elite tell;
- Y-axis 3D flip;
- midpoint flash / streak impact;
- staged information reveal;
- rating / portrait / name focus;
- rarity hit;
- settle;
- persistent revealed idle;
- multiple independently owned cards;
- normal stop/stopAll cleanup.

Approx click-relative timing:
- 80 ms elite tell;
- 110 ms flip start;
- 320 ms edge hit;
- 340 ms front visible;
- 430 nationality;
- 510 position;
- 590 club;
- 670 rating;
- 750 portrait;
- 840 name;
- 930 rarity hit;
- 1000 secondary accent;
- 1050–1420 settle;
- 1420+ readable final idle.

`intensity` affects whole reveal energy: particles, flash, border/glow, overshoot and screen kick. `direction` means shimmer/reveal-light angle and burst bias, not travel.

## P3.10.1 — SPORTS COLLECTIBLE VISUAL PIVOT

User feedback on P3.10.0: interaction/motion worked, but the visual language still felt too astral/fantasy compared with premium football cards.

P3.10.1 changes **authored visual design only**; runtime behavior and choreography remain unchanged.

New target:

```text
premium football collectible
NOT fantasy relic / astral card
```

Visual changes:
- angular sculpted shield/card silhouette;
- ivory / warm white / metallic gold front;
- gold foil as primary rarity language;
- geometric metallic facets instead of cosmic radial patterns;
- restrained side ornaments after front reveal;
- graphite/black + gold back;
- warmer player area and conventional sports-card information hierarchy;
- strongly reduced sustained glow/aura;
- warm white/gold midpoint flash;
- narrow metallic foil shimmer with quiet time between passes.

### P3.10.1 validation gate

Do **not** benchmark yet. Validate only art/readability:
1. Back card reads as premium football collectible, not tarot/fantasy/sci-fi.
2. Idle shimmer reads as foil/specular material, not magical energy.
3. Front is predominantly light ivory/gold with strong sports information hierarchy.
4. Gold frame / side ornaments sell rarity without hiding player/rating/name.
5. Midpoint flash may be strong, but sustained aura stays restrained.
6. Final card remains readable for several seconds without feeling like an active spell effect.
7. Existing click / flip / staged info / settle / cleanup behavior remains unchanged.

---

# Critical Hit

## P3.11.0 — ultra-short readability cue

Runtime identity:

```js
FXDeck.play("criticalHit", {
  version: "v1",
  variant: "default",
  position: hitPosition,
  direction: hitDirection,
  intensity: 1.0
});
```

Purpose: prove a very short gameplay cue whose **essential hit readability does not depend on particle scheduling latency**.

Authored timing:
- **0 ms** — immediate directional DOM slash;
- **0 ms** — immediate compact contact flash;
- **0 ms** — narrow hero streak burst;
- **6 ms** — compact shard burst;
- **18 ms** — target snap;
- **24 ms** — restrained screen kick;
- **34 ms** — small `CRIT` readability accent;
- **260 ms** — hard lifecycle cleanup.

Design decisions:
- this is intentionally **not Heavy Impact with larger numbers**;
- slash/flash are narrow, directional and asymmetric rather than radial/glowy;
- particles are secondary decoration; the hit signal exists immediately even if the shared scheduler delays particle population under pressure;
- hero streaks use a tight 18° fan; shards use a compact 42° fan;
- intensity affects energy/count/speed with caps rather than linearly exploding cost;
- no Core redesign or new generic abstraction was required.

Implementation files:
- `site/fxdeck/effects/critical-hit.js`;
- `site/critical-hit.css`;
- `site/js/critical-hit-runtime-bridge.js`;
- Runtime Lab exposes build P3.11.0.

Validation bridge note:
- the old base Runtime Lab controller still contains a P3.6-era three-effect selector (`heavyImpact` / `explosion` / `fireball`);
- Critical Hit therefore registers through its own cache-keyed Runtime Lab bridge and capture-phase play/pointer handlers for this validation build;
- Effect Grid receives the Critical Hit option after runtime/grid initialization and can spawn the real effect generically;
- do **not** extract a generic bridge/state framework from this unless Magic Burst or another real effect proves the same need;
- fold Critical Hit into the production catalog/base harness only when doing the next deliberate cache-key/harness cleanup, rather than risking a stale catalog import during visual validation.

### P3.11.0 validation gate

Do not benchmark yet. Validate feel/readability first:
1. At 0°, 90°, 180° and 270° the hit direction is immediately obvious.
2. The first ~100 ms reads as a **critical strike**, not a small explosion or magic burst.
3. Slash/flash dominate readability; particles support them instead of burying them.
4. `intensity 0.5 / 1.0 / 2.0` changes energy without changing the effect identity.
5. `CRIT` label stays secondary; remove/reduce it if it becomes the main readable element.
6. Repeated clicks at different positions do not leave persistent DOM/particle resources.
7. Visual duration feels sharp; if it feels soft/floaty, shorten the tail rather than adding more particles.

---

# Runtime topology decisions

## One-shot particle paths
- `shared-scheduled` — production default for short one-shot bursts;
- `shared-direct` — immediate shared diagnostic path;
- `per-play emitter` — reference topology.

Shared scheduled path owns immediate seed, frame-budgeted queue, cancellation, per-burst ownership and semantic priority/backpressure machinery.

Critical Hit explicitly treats scheduled particles as secondary visual support so gameplay readability survives scheduler pressure.

## Sustained path
Environment uses one explicit sustained emitter per source. One-shot topology controls do not pretend to apply to it.

## DOM/SVG visuals
`DomSpriteAdapter` owns independently positioned visuals where a real effect requires it. Short hook-driven transients remain effect-local; do not promote them into a generic visual graph without repeated need.

---

# Runtime Lab / Grid

- One Runtime Lab for production effects.
- Play vs Debug / Tests; center Preview persists.
- HUD Off = clean authored preview; no diagnostic reticles/labels.
- Basic HUD = FPS / Particles / Visuals / Instances.
- Full HUD adds frame percentiles / debt / queue / emitters / groups / topology.
- Effect Grid is the primary real-effect scale harness.
- Grid supports presets, cell spacing, Fit, 10–200% zoom, wheel zoom, pan, direction patterns and Replace/Stack loop modes.
- Virtual logical world uses safe overscan and a fixed viewport-sized tsParticles backing canvas to avoid giant DPR buffers.
- Large Football/Rare Reward cards use larger cell spacing when tested in Grid.
- Critical Hit Grid is available for scale/readability inspection, but performance is not the current P3.11.0 gate.

---

# Important measured history

These numbers explain architecture; they are not the current gate.

- P0 Galaxy S20+: ~150 and ~400 simple particles remained ~60 FPS; ~800 exposed first cliff at ~57.4 avg / 30 1% low.
- Heavy Impact early: ~454 particles / 55.4 avg FPS / 20 low / 5 >20ms.
- Heavy Impact later: ~229 particles / 59.3 avg / 30 low / 1 >20ms.
- Matched backend tests showed shared-direct particle creation front-loads CPU cost.
- Frame-budgeted scheduled creation removed tested creation spikes at the cost of longer population span.
- Representative Explosion P3.5:
  - emitter ~57.4 avg / 30 low / 67ms debt / 4 spikes / ~611 particles;
  - scheduled ~59.3 avg / 30 low / 17ms debt / 1 spike / ~870 particles.
- Galaxy S20+ exposed high-concurrency Fireball cost; avoidable moving-DOM/filter/trail cost was reduced.
- Desktop Explosion Grid proved real authored workloads can reach thousands of particles.

Performance tuning stays deferred unless a representative final effect exposes a product blocker.

---

# Remaining P3 roadmap

1. **P3.10.1 Football Card visual acceptance / effect-local polish.**
2. **P3.11.0 Critical Hit visual/readability acceptance / effect-local polish.**
3. Optional football-card polish only after visual acceptance:
   - stronger generic footballer art;
   - audio beats;
   - subtle pointer-reactive foil/parallax;
   - additional authored rarity variants if useful.
4. **Magic Burst** — richer stylized motion/noise/color cue.
5. Asset lifecycle hardening only if representative effects expose a real issue.
6. Production catalog/base Runtime Lab cache-key cleanup when folding accepted late-P3 effects into the canonical catalog.
7. Then production resize/DPR/device matrix/raw-vs-runtime overhead and deferred quality tuning.

P3 exits when representative one-shot, ultra-short hit, moving, sustained and UI/card interaction archetypes all use FXDeck without repeated Core redesign.

---

# P4 production VFX library status

- [x] Heavy Impact.
- [x] Explosion.
- [x] Fireball moving-source baseline.
- [x] Environment sustained-source baseline.
- [x] Rare Reward fantasy UI reference.
- [~] Football Card Reveal — interaction implemented; sports visual acceptance pending.
- [~] Critical Hit — implementation complete; visual/readability acceptance pending.
- [ ] Magic Burst.

---

# Key decisions

1. tsParticles is backend, not public API.
2. Real effects prove abstractions before extraction.
3. Version/variant are authored; runtime params alter one play.
4. Scheduled shared bursts are default for short one-shots; emitter remains valid for sustained/moving/reference cases.
5. Every resource is owned by an EffectInstance or explicit adapter handle.
6. Fireball reuses Explosion rather than duplicating child impact logic.
7. `FXDeck.update()` exists because a sustained real effect required it; Football Card reuses it without inventing a generic state system.
8. One Environment `play()` = one source; one Football Card `play()` = one persistent collectible.
9. HUD/debug state never masquerades as authored VFX.
10. Effect Grid is product-level scale testing; synthetic backend stress is advanced isolation.
11. Intensity should affect authored visual energy, not only particle count.
12. Football Card and Rare Reward remain separate effects with different visual/product purposes.
13. Football-card references guide category language only; do not copy licensed EA/FIFA card assets or exact templates.
14. Performance work resumes only for real product-relevant blockers.
15. Every user-testable iteration advances visible build/cache keys and lands on `main`.
16. Critical Hit keeps its primary readability in immediate DOM hooks; scheduled particles are deliberately non-essential.
17. No generic transient/timeline/state abstraction was added for Critical Hit because one real effect does not prove that abstraction yet.

---

# Changelog — 2026-08-19

- **P3.11.0 — Critical Hit effect:** added `criticalHit/v1/default` as a 260 ms directional gameplay cue.
- **P3.11.0 — scheduler-independent readability:** immediate DOM slash/flash carries the hit signal; shared-scheduled particles remain secondary accents.
- **P3.11.0 — authored layers:** hero streaks at 0 ms, shards at 6 ms, target snap at 18 ms, screen kick at 24 ms, small CRIT accent at 34 ms.
- **P3.11.0 — no Core redesign:** implemented through existing EffectInstance ownership, semantic burst priorities and hook lifecycle.
- **P3.11.0 — Runtime Lab:** added cache-keyed Critical Hit presentation/bridge and Effect Grid availability; visual/readability acceptance is now the gate.
- **P3.10.1 — Football Card sports visual pivot:** replaced the dark astral/cosmic front with a premium ivory/gold collectible-card treatment.
- **P3.10.1 — sculpted silhouette:** angular shield/card outline and restrained gold side ornamentation now appear as part of the front reveal.
- **P3.10.1 — sports hierarchy:** rating, position, flag, club, player, name and stats moved toward conventional football collectible readability.
- **P3.10.1 — restrained VFX:** aura/cyan language heavily reduced; metallic foil/shimmer and warm white/gold flash become the primary reveal materials.
- **P3.10.1 — runtime unchanged:** interaction, reveal timing, ownership, Grid compatibility and public API remain the P3.10.0 implementation.
- **P3.10.0 — Football Card Reveal:** persistent back-card idle, click-driven reveal, 3D flip, staged football metadata, player/rating focus, rarity hit, settle and persistent final card.

# Earlier accepted milestones

- P3.9 Rare Reward UI-card reference.
- P3.8 Environment + live update.
- P3.7 generic Effect Grid / debug hierarchy.
- P3.6 Fireball moving source / effect-owned assets.
- P3.5 queue-aware quality experiments (broad tuning deferred).
- P3.4 Explosion.
- P3.3 scheduled one-shot default + cancellation gate.
- P3.2 integrated scheduler validation.
- P2 Heavy Impact.
- P1 minimal Core.
- P0 raw tsParticles reference.
