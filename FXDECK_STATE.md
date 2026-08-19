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
- **Current build:** **P3.12.0**.
- **Status:** ACTIVE — planned representative effect set is implemented. Magic Burst, Critical Hit and Football Card still need visual acceptance; after that run the P3 exit review instead of adding more effect archetypes.
- **Runtime Lab:** `site/heavy-impact-lab.html` — P3.12.0.
- **Core Lab:** `site/fxdeck-core-lab.html` — P1.3.1.
- **Raw reference:** `site/webfx-lab.html` — P0.3.0.
- **Primary real-effect test:** Runtime Lab Play + Debug / Tests → Effect Grid Lab.
- Backend stress / topology isolation remains advanced diagnostics, not normal product workflow.

---

# Product target

FXDeck is a lightweight gameplay VFX runtime for web games. Game code triggers complete, versioned cues while FXDeck owns adapters, sequencing and lifecycle.

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

# Representative runtime archetypes

## Heavy Impact — accepted one-shot composite
- one `FXDeck.play()` call;
- flash / sparks / debris / target recoil / screen kick;
- lifecycle and overlap cleanup validated.

## Explosion — accepted second one-shot composite
- different authored cue without Core redesign;
- reuses semantic particle bursts, ownership and screen hooks.

## Fireball — accepted moving-source archetype
- independently owned moving hero visual;
- runtime direction/intensity;
- sparse trail;
- child `Explosion` handoff;
- concurrent ownership / cleanup;
- Grid compatible.

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
- explicit stop / stopAll cleanup.

## Rare Reward — retained fantasy UI/card reference
- large DOM/SVG composition;
- staged Web Animations;
- particle accents;
- owned cleanup;
- intentionally separate from the football-card target.

## Football Card Reveal — implemented, visual acceptance pending

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

P3.10.0 proved persistent back-card idle, click-driven reveal, 3D flip, staged metadata, rarity hit, settle and persistent final card.

P3.10.1 pivoted the authored visual from astral/fantasy toward premium football collectible:
- ivory / warm white / metallic gold front;
- angular sports-card silhouette;
- graphite/gold back;
- conventional rating / position / flag / club / player / name hierarchy;
- restrained foil shimmer instead of sustained magical aura.

Validation gate: it must read immediately as a premium football collectible, not tarot/fantasy/sci-fi.

## Critical Hit — implemented, visual acceptance pending

```js
FXDeck.play("criticalHit", {
  version: "v1",
  variant: "default",
  position: hitPosition,
  direction: hitDirection,
  intensity: 1.0
});
```

P3.11.0 purpose: prove a very short gameplay cue whose essential readability does **not** depend on particle scheduling latency.

Timing:
- 0 ms — immediate directional DOM slash + compact flash;
- 0 ms — narrow hero streak burst;
- 6 ms — compact shards;
- 18 ms — target snap;
- 24 ms — restrained screen kick;
- 34 ms — small `CRIT` accent;
- 260 ms — hard cleanup.

Design rule: Critical Hit is not Heavy Impact with larger numbers. Slash/flash carry the hit signal; particles are secondary.

## Magic Burst — implemented, visual acceptance pending

```js
FXDeck.play("magicBurst", {
  version: "v1",
  variant: "default",
  position: origin,
  direction: 35,
  intensity: 1.0
});
```

P3.12.0 purpose: prove richer stylized motion/color without falling back to `core + radial ring + even particle burst`.

Timing:
- 0 ms — asymmetric core wedge + three curved DOM ribbons;
- 18 ms — primary colored mote fan;
- 42 ms — restrained screen response;
- 72 ms — offset secondary lobe + particle echo;
- 118 ms — irregular color pulse at the echo lobe;
- 640 ms — hard cleanup.

Composition decisions:
- hero motion is curved and directional rather than radial;
- three ribbons use different bend/angle/distance timing;
- secondary lobe is displaced forward + sideways from the origin;
- color language mixes cyan / violet / magenta with a small mint/blue echo;
- no generic ribbon/timeline/graph abstraction was added;
- no Core redesign was required.

Implementation:
- `site/fxdeck/effects/magic-burst.js`;
- `site/magic-burst.css`;
- `site/js/magic-burst-runtime-bridge.js`;
- Runtime Lab exposes Magic Burst in Play and Effect Grid.

---

# Production catalog

P3.12.0 closes an inconsistency from P3.11: Critical Hit had been available through its validation bridge but was missing from `registerProductionEffects()`.

The production catalog now registers:
- Heavy Impact;
- Explosion;
- Fireball;
- Environment Emitter;
- Rare Reward;
- Football Card Reveal;
- Critical Hit;
- Magic Burst.

`site/js/production-catalog-runtime-sync.js` imports the P3.12.0 catalog with a fresh cache key and re-registers the canonical definitions into the live Runtime Lab after bootstrap. Re-registration is safe because FXDeck registration replaces the same id/version/variant entry rather than creating duplicate instances.

---

# Runtime topology decisions

## One-shot particle paths
- `shared-scheduled` — production default for short one-shot bursts;
- `shared-direct` — immediate shared diagnostic path;
- `per-play emitter` — reference topology.

Shared scheduled path owns immediate seed, frame-budgeted queue, cancellation, per-burst ownership and semantic priority/backpressure machinery.

Critical Hit deliberately keeps essential readability outside deferred particles. Magic Burst keeps hero curvature in immediate DOM ribbons while particle lobes provide secondary texture.

## Sustained path
Environment uses one explicit sustained emitter per source. One-shot topology controls do not pretend to apply to it.

## DOM/SVG visuals
Short hook-driven transients remain effect-local. `DomSpriteAdapter` remains for independently owned persistent/moving visuals where a real effect requires it. Do not create a generic visual graph until repeated production need proves it.

---

# Runtime Lab / Grid

- One Runtime Lab for production effects.
- Play vs Debug / Tests; center Preview persists.
- HUD Off = clean authored preview.
- Basic HUD = FPS / Particles / Visuals / Instances.
- Full HUD adds frame percentiles / debt / queue / emitters / groups / topology.
- Effect Grid is the primary real-effect scale harness.
- Grid supports presets, spacing, Fit, zoom, pan, direction patterns and Replace/Stack loop modes.
- Virtual logical world uses safe overscan and a fixed viewport-sized tsParticles backing canvas.
- Late-P3 effects are exposed to Grid without introducing a new generic bridge framework.

---

# Important measured history

These numbers explain architecture; they are not the current visual gate.

- P0 Galaxy S20+: ~150 and ~400 simple particles remained ~60 FPS; ~800 exposed the first cliff at ~57.4 avg / 30 1% low.
- Heavy Impact early: ~454 particles / 55.4 avg FPS / 20 low / 5 >20ms.
- Heavy Impact later: ~229 particles / 59.3 avg / 30 low / 1 >20ms.
- Shared-direct particle creation front-loaded CPU cost in matched backend tests.
- Frame-budgeted scheduled creation reduced tested creation spikes at the cost of longer population span.
- Representative Explosion P3.5: emitter ~57.4 avg / 30 low / 67ms debt / 4 spikes / ~611 particles; scheduled ~59.3 avg / 30 low / 17ms debt / 1 spike / ~870 particles.
- Galaxy S20+ exposed high-concurrency Fireball cost; avoidable moving-DOM/filter/trail cost was reduced.
- Desktop Explosion Grid proved real authored workloads can reach thousands of particles.

Performance tuning remains deferred until the representative effects are visually accepted.

---

# Remaining P3 roadmap

1. **Magic Burst visual acceptance / effect-local polish.**
2. **Critical Hit visual/readability acceptance / effect-local polish.**
3. **Football Card P3.10.1 visual acceptance / effect-local polish.**
4. **P3 exit architecture review:** inspect how much bespoke plumbing each representative effect needed and identify only genuinely repeated abstractions.
5. Asset lifecycle hardening only if the review or representative effects expose a real issue.
6. Production resize / DPR / device matrix.
7. Raw tsParticles vs equivalent FXDeck overhead benchmark.
8. Deferred per-effect quality presets / bundle slimming.

Do **not** add more effect archetypes before this review unless a real product requirement proves a missing capability.

P3 exits when representative one-shot, ultra-short hit, stylized burst, moving, sustained and UI/card interaction archetypes all run through FXDeck without repeated Core redesign and without unresolved lifecycle blockers.

---

# P4 production VFX library status

- [x] Heavy Impact.
- [x] Explosion.
- [x] Fireball moving-source baseline.
- [x] Environment sustained-source baseline.
- [x] Rare Reward fantasy UI reference.
- [~] Football Card Reveal — interaction implemented; sports visual acceptance pending.
- [~] Critical Hit — implementation complete; visual/readability acceptance pending.
- [~] Magic Burst — implementation complete; stylized-motion/color acceptance pending.

---

# Key decisions

1. tsParticles is backend, not public API.
2. Real effects prove abstractions before extraction.
3. Version/variant are authored; runtime params alter one play.
4. Scheduled shared bursts are default for short one-shots; explicit emitters remain valid for sustained/moving/reference cases.
5. Every resource is owned by an EffectInstance or explicit adapter handle.
6. Fireball reuses Explosion rather than duplicating child impact logic.
7. `FXDeck.update()` exists because real sustained/interactive effects required it; there is still no generic state-machine framework.
8. HUD/debug state never masquerades as authored VFX.
9. Effect Grid is product-level scale testing; synthetic backend stress is advanced isolation.
10. Intensity affects authored visual energy, not only particle count.
11. Football Card and Rare Reward remain separate effects with different product purposes.
12. Critical Hit keeps primary readability in immediate DOM hooks.
13. Magic Burst keeps curved/asymmetric hero motion effect-local until repetition proves a reusable abstraction.
14. Performance work resumes after visual acceptance or for a real blocker.
15. Every user-testable iteration advances visible build/cache keys and lands on `main`.

---

# Changelog — 2026-08-19

- **P3.12.0 — Magic Burst:** added `magicBurst/v1/default`, a 640 ms asymmetric stylized cue with curved ribbons, colored motes and an offset echo lobe.
- **P3.12.0 — no radial fallback:** hero motion and secondary energy are intentionally directional/displaced rather than centered rings.
- **P3.12.0 — no Core redesign:** implementation uses existing hooks, EffectInstance ownership and semantic particle bursts.
- **P3.12.0 — production catalog cleanup:** added both Critical Hit and Magic Burst to `registerProductionEffects()`.
- **P3.12.0 — Runtime Lab:** added fresh catalog runtime sync, static Play options and cache-keyed Magic Burst presentation/bridge.
- **P3.11.0 — Critical Hit:** added ultra-short scheduler-independent readability cue.
- **P3.10.1 — Football Card:** premium ivory/gold sports collectible visual pivot.
- **P3.10.0 — Football Card:** persistent interactive reveal lifecycle.

# Earlier accepted milestones

- P3.9 Rare Reward UI-card reference.
- P3.8 Environment + live update.
- P3.7 generic Effect Grid / debug hierarchy.
- P3.6 Fireball moving source / effect-owned assets.
- P3.5 queue-aware quality experiments.
- P3.4 Explosion.
- P3.3 scheduled one-shot default + cancellation gate.
- P3.2 integrated scheduler validation.
- P2 Heavy Impact.
- P1 minimal Core.
- P0 raw tsParticles reference.
