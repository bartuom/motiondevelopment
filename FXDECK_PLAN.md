# FXDeck — Web2D V1 Canonical Plan

> Canonical execution plan from 2026-08-19 onward.
>
> This document replaces the old P3.x roadmap as the source of truth for what we build next. `FXDECK_STATE.md` tracks only current execution status.

## Product goal

FXDeck is a **lightweight, AI-friendly gameplay VFX framework for 2D web games**, optimized first for mobile web and practical client integration.

The product is **not** a particle engine. It provides a small authoring/runtime layer over a modular particle backend.

Target client API:

```js
FXDeck.play("goal-celebration", {
  x,
  y,
  intensity: 1.2,
  teamColor: "#e31837"
});
```

Target authoring workflow:

```text
prompt
  ↓
AI generates / patches FXDeck effect data
  ↓
validator + semantic budget checks
  ↓
preview
  ↓
FXDeck compiler
  ↓
Web2D backend
  ↓
tsParticles
```

The framework must make new effects mostly **data + assets**, not new runtime code.

---

# 1. Hard architecture decisions

## 1.1 Production backend for Web2D V1

```text
GAME
  ↓
FXDeck API
  ↓
FXDeck Core
  ↓
FXDeck Effect Schema
  ↓
Web2D Compiler
  ↓
TsParticlesAdapter
  ↓
custom modular tsParticles build
  ↓
one persistent transparent canvas/container
```

### Rules

- tsParticles is the **only production particle runtime** in Web2D V1.
- FXDeck Core must not expose tsParticles-specific vocabulary in its public schema/API.
- One persistent tsParticles container is the default rendering model.
- Plugin/capability registration happens before container creation.
- No runtime plugin registration during `play()`.
- No second tsParticles container for standalone recipes/examples.
- No Particlr/Pixi runtime in the default client dependency graph.
- No Three.js / 3D implementation in this cycle.

## 1.2 Particlr role

Particlr is retained as an **authoring/reference laboratory**, not as the default runtime.

Use it to harvest:

- strong alpha textures / sprite ideas,
- emission patterns,
- lifetime ranges,
- velocity / gravity / drag,
- size curves,
- opacity curves,
- color gradients,
- blend modes,
- timing and layer composition.

Translate those ideas into FXDeck Schema + tsParticles.

A future `.prt → FXDeck` importer is explicitly postponed until several effects have been migrated manually and the mapping is proven.

## 1.3 Future 3D boundary

We preserve only naming/abstraction boundaries that do not prevent a future backend.

Use neutral concepts:

```text
Effect
Layer
Position
Direction
Velocity
Lifetime
Curve
Asset
Backend capability
```

Avoid backend-shaped names in the public schema such as:

```text
TsParticleEffect
CanvasExplosion
EmitterOptions
OutModes
RibbonDrawer
```

No 3D code is implemented now.

---

# 2. Controlled reset — keep / refactor / retire

This is **not** a rewrite from zero.

## Keep

- `FXDeckRuntime` concept and public `play/stop/stopAll` lifecycle.
- effect registry/versioning concepts where they remain useful.
- `EffectInstance` ownership/lifecycle ideas.
- `CoordinateAdapter` concept.
- one persistent tsParticles container.
- mobile/performance measurements and P0 baseline.
- existing reference/provenance material.
- Runtime Lab as a debug/authoring shell.
- existing quality/backpressure logic if it remains isolated and does not complicate authoring.

## Refactor

- `TsParticlesAdapter` into a clean Web2D backend boundary.
- Runtime Lab boot into a single initialization path.
- effect registration into schema-driven loading instead of effect-specific bridge scripts.
- asset loading into a manifest + cache/prefetch layer.
- quality settings into schema/budget-driven constraints.

## Retire from canonical path

- Particlr iframe/source-runtime experiments.
- separate source-demo canvases/backgrounds.
- effect-specific runtime bridges such as `*-runtime-bridge.js` once their effects migrate.
- global build-label fighting / mutation hacks.
- runtime code added solely for one visual effect.
- visually rejected P3 experiments as product/showcase content.

Legacy experiments remain available through Git history until deletion is explicitly safe.

---

# 3. Target repository shape

The final folder names may change slightly during implementation, but responsibilities must remain separated.

```text
fxdeck/
├── core/
│   ├── runtime
│   ├── registry
│   ├── effect-instance
│   ├── validator
│   ├── asset-manager
│   └── quality
│
├── schema/
│   ├── effect.schema.json
│   ├── semantic-validator
│   └── examples/
│
├── web2d/
│   ├── tsparticles-loader
│   ├── tsparticles-adapter
│   ├── compiler
│   └── capabilities
│
├── effects/
│   ├── dust-puff.json
│   ├── critical-hit.json
│   ├── goal-celebration.json
│   ├── explosion.json
│   ├── magic-burst.json
│   └── rain.json
│
├── assets/
│   ├── manifest.json
│   └── vfx/
│
└── authoring/
    └── FXDECK_AI_AUTHORING.md
```

---

# 4. FXDeck Effect Schema V1

V1 must be deliberately small and predictable for AI.

## Supported concepts

### Effect/meta

- `schemaVersion`
- `id`
- `durationMs`
- `priority`
- `features`
- public runtime `params`
- quality/budget declaration

### Layer

- `id`
- `type`
- `delayMs`
- `z`
- `blend`

### Spawn

- burst
- finite rate emitter
- count
- rate/sec
- duration

### Motion

- direction
- spread
- speed
- gravity
- drag
- rotation

### Lifetime / visuals

- lifetime
- image/circle/line/ribbon capability where enabled
- asset reference
- size over life
- opacity over life
- color / simple color over life
- blend mode

### Runtime parameter bindings

A constrained binding model such as:

```text
param
→ layer
→ property
→ operation: replace | multiply | add
```

No arbitrary JavaScript or expression language in V1.

## Explicitly out of V1

- arbitrary scripts/eval,
- node graph,
- collision authoring,
- general noise fields,
- subemitters as a generic system,
- dissolve shader language,
- texture masks,
- custom shader authoring,
- generic 3D fields.

Add a capability only after a real hero effect proves the need.

---

# 5. Validation contract

AI-generated effects are never trusted directly.

## Structural validation

Use JSON Schema with rules such as:

- `additionalProperties: false`,
- known schema version,
- valid IDs,
- unique layer IDs,
- known layer/shape/blend types,
- valid asset references,
- valid parameter bindings.

## Semantic validation

Must catch valid JSON that is unsafe or nonsensical.

At minimum:

- opacity in `[0,1]`,
- curves monotonic in normalized `t`,
- finite lifetime/duration,
- finite continuous/rate emitters,
- max layer count budget,
- max particle budget per quality tier,
- no missing capabilities,
- no missing assets,
- no absurd texture dimensions/bytes,
- no base64/data URI assets in production definitions,
- no invalid binding target.

Errors should be short and AI-fixable.

Example:

```text
FXD_BUDGET_01: layer "sparks" requests 1200 particles; medium budget allows 220.
```

---

# 6. Asset strategy

Visual quality comes primarily from good source art + timing, not primitive geometry.

Start with roughly 6–10 reusable assets, for example:

```text
soft-glow.webp
smoke-soft-01.webp
smoke-soft-02.webp
dust.webp
spark.webp
streak.webp
slash.webp
flare.webp
```

Rules:

- assets live outside core JS,
- manifest-driven references,
- lazy load / prefetch per effect,
- request de-duplication and decode cache,
- no effect-specific megabyte sprite packs by default,
- measure asset bytes independently from JS runtime size,
- record provenance/license for every third-party-derived asset.

Preferred workflow:

```text
reference
→ identify alpha / curves / timing
→ create or legally reuse lightweight asset
→ FXDeck asset manifest
→ effect JSON
```

---

# 7. Implementation sessions

The work is organized into coding sessions rather than a large speculative rewrite.

## Session 0 — Safety checkpoint

Goal: make the reset reversible.

Tasks:

- record the current P3.15 commit as the legacy baseline in docs,
- optionally create a Git tag/branch before destructive cleanup,
- do not modify visual behavior yet.

Gate:

- current prototype can always be recovered from Git.

---

## Session 1 — Architecture Reset

Goal: one clean Web2D runtime path.

Tasks:

- remove Particlr/iframe runtime from canonical path,
- collapse boot to one authoritative initializer,
- ensure tsParticles capabilities register before container creation,
- preserve one persistent transparent tsParticles container,
- remove/neutralize build-label mutation hacks,
- isolate old effect bridges pending migration,
- document the Web2D backend boundary.

Gate:

```text
1 FXDeck runtime
1 tsParticles engine
1 persistent container
0 iframe runtimes
0 second particle containers for reference effects
```

Lifecycle gate:

- repeated play/stop cycles do not increase container/listener count.

No new showcase effect is authored in this session.

---

## Session 2 — Schema + Compiler + Validator

Goal: prove that an effect can exist as data rather than custom JS.

Tasks:

- create `effect.schema.json`,
- create structural validator,
- create semantic validator,
- create `compileWeb2D(effect)` mapping FXDeck schema to tsParticles,
- add capability checks,
- add three synthetic schema effects:
  - simple burst,
  - smoke/image burst,
  - finite rain/rate emitter.

Gate:

- all three effects run with **zero effect-specific runtime JS**,
- invalid AI configs fail with actionable errors,
- no tsParticles-specific keys are required in effect JSON.

This is the key framework milestone.

---

## Session 3 — Asset Pipeline + Dust Puff

Goal: prove asset-first visual quality.

Tasks:

- create asset manifest/loader/cache/prefetch,
- prepare first reusable high-quality alpha assets,
- manually analyze a strong Dust Puff reference,
- author `dust-puff.json`,
- tune only schema + assets; no special bridge.

Gate:

- Dust Puff is visually strong enough to remain in the public portfolio,
- cold/warm asset loading works,
- effect is fully schema-driven.

If the effect looks weak, improve art/timing rather than adding framework features.

---

## Session 4 — Hero Effects: Critical Hit + Goal Celebration

Goal: build the strongest client-facing proof.

### Critical Hit

Demonstrates:

- low-latency response,
- directional burst,
- image alpha/slash,
- sparks/streaks,
- additive flash,
- runtime direction/intensity/tint.

### Goal Celebration

Demonstrates:

- layered sequencing,
- team color parameter,
- confetti/sparks,
- optional ribbon capability,
- mobile-friendly sustained hero cue.

Gate:

- both are portfolio-grade,
- both are data-driven,
- no `critical-hit-runtime-bridge.js` / `goal-runtime-bridge.js` equivalent is created,
- adding ribbon is allowed only if the Goal effect proves it is needed.

---

## Session 5 — Coverage Effects

Goal: complete the V1 showcase set without expanding the framework blindly.

Effects:

1. Explosion
2. Magic Burst
3. Rain / Environment

Portfolio set after this session:

1. Dust Puff
2. Critical Hit
3. Goal Celebration
4. Explosion
5. Magic Burst
6. Rain / Environment

Each effect proves a different runtime/visual case.

Gate:

- six effects total,
- visual quality > quantity,
- no effect-specific runtime plumbing,
- burst + sustained + image + optional ribbon cases are covered.

---

## Session 6 — Production Slim Build + Mobile Performance

Goal: convert prototype backend usage into a measured lightweight client runtime.

Tasks:

- replace convenience/full/slim loading with an explicit tsParticles feature allowlist,
- build incremental bundle variants,
- measure minified/gzip/brotli,
- add size budget CI,
- profile physical mobile devices,
- tune DPR/quality/particle budgets/overdraw,
- test idle pause/resume,
- test lifecycle and memory trends.

Initial expected capability set to evaluate:

```text
engine
move
hex color
blend
emitters
image
circle
life
opacity
size
rotate
out-modes
paint
```

Optional only when effects require them:

```text
line
ribbon
destroy/split
trail
```

Do not assume final bundle size. Measure it.

Provisional first gate:

```text
FXDeck Core + Web2D mandatory backend <= 100 KB gzip
```

This is a product budget to validate and tighten, not a claimed current size.

Mobile test scenarios:

- single hero burst,
- 5 hits/sec gameplay churn,
- rain + hero effects,
- stress ramp,
- 100–500 play/stop cycles,
- 60 s sustained,
- cold vs warm asset,
- background/foreground,
- resize/orientation.

Metrics:

- p50/p95/p99 frame time,
- first visible frame latency,
- JS heap trend,
- active particle count,
- canvases/listeners,
- asset/network bytes,
- init time,
- gzip/brotli size.

---

## Session 7 — Portfolio + Client Package

Goal: ship something understandable to a hiring manager/client.

### Public showcase

Main page should lead with effects, not internal runtime diagnostics.

Hero set:

- Goal Celebration
- Critical Hit
- Dust Puff
- Explosion
- Magic Burst
- Rain / Environment

Controls should expose only useful authoring parameters such as:

- Play
- Intensity
- Direction
- Color
- Quality

Internal Runtime Lab remains available as a debug route/page.

### Client integration package

Provide a minimal integration surface:

```text
init
prefetch
play
update (only where needed)
stop
stopAll
destroy
```

Client proof gate:

- a clean sample web project can integrate FXDeck without knowing tsParticles internals,
- client code can add a new schema effect without modifying FXDeck runtime,
- documentation explains runtime weight and asset loading separately.

---

# 8. AI / vibe-coding workflow

After Session 2 create `FXDECK_AI_AUTHORING.md` containing:

- exact schema contract,
- allowed fields,
- available assets,
- supported backend capabilities,
- budgets,
- visual rules,
- examples of good effects,
- forbidden patterns.

Target loop:

```text
USER
"Make a red goal celebration around 1.2 s: hard flash, ribbons, delayed confetti."

AI
→ creates/patches goal-celebration.json

FXDeck validator
→ validates structure + cost

Runtime Lab
→ preview

USER
"Less confetti, faster ribbons, stronger first 100 ms."

AI
→ patches only effect data
```

Framework source should not be edited for normal visual iteration.

---

# 9. Non-goals until Web2D V1 is client-ready

Do **not** build:

- own particle physics/simulation engine,
- Three.js backend,
- 3D particle schema,
- WebGPU particle engine,
- node editor,
- visual graph,
- generic shader editor,
- arbitrary JS expressions in effect JSON,
- Particlr production backend,
- `.prt` importer,
- plugin marketplace,
- large preset catalog,
- SaaS/accounts/cloud authoring.

If any of these appear before the six-effect Web2D package is complete, treat it as scope creep.

---

# 10. Architecture failure conditions

Stop and correct course if any of these become true:

1. A normal new effect requires a new `*-runtime-bridge.js`.
2. A normal visual tweak requires changing FXDeck Core.
3. Effect JSON starts exposing raw tsParticles configuration objects.
4. The client must load tsParticles + Particlr + Pixi for the default Web2D package.
5. Every new effect adds hundreds of lines of runtime code.
6. Runtime engineering keeps growing while visual quality remains below portfolio level.
7. Bundle size is discussed without a reproducible build/gzip/brotli measurement.
8. Performance is judged only by desktop average FPS instead of mobile frame-time tests.

Primary KPI:

> A new gameplay effect should be approximately **90% effect data + reusable assets**, with framework changes required only for a genuinely new capability.

---

# 11. Visual quality gate

Every public effect must pass:

> Would this effect be strong enough to put in a professional gameplay VFX portfolio without explaining that it is "just a technical prototype"?

If no:

- do not add another effect,
- do not add another runtime abstraction,
- improve alpha art, motion, timing, layering, scale/opacity curves, blend and composition.

---

# 12. Current execution order

Start here:

```text
Session 0 — safety checkpoint
        ↓
Session 1 — architecture reset
        ↓
Session 2 — schema/compiler/validator
        ↓
Session 3 — asset pipeline + Dust Puff
        ↓
Session 4 — Critical Hit + Goal Celebration
        ↓
Session 5 — Explosion + Magic + Rain
        ↓
Session 6 — slim build + mobile performance
        ↓
Session 7 — portfolio + client package
```

Do not resume P3.x visual iteration before Sessions 1–2 are complete.

---

# 13. Legacy baseline

The prototype immediately before this reset is P3.15.0 (`26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`).

It proved useful concepts such as persistent-container runtime, lifecycle/performance work and reference analysis, but its effect-specific bridges and experimental visual integration are **not** the architecture to continue extending.
