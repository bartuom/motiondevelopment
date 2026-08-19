# FXDeck — Canonical Project State

> Current execution status only. The canonical implementation roadmap is [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).

## Current state — 2026-08-19

- **Milestone:** **P4.4.1 — Session 4 Hero Visual Correction**.
- **Execution status:** **Sessions 0–3 accepted. Initial Session 4 art pass rejected in user visual review. P4.4.1 correction implemented and awaiting deployed technical + visual acceptance.**
- **Canonical plan:** [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).
- **Canonical Runtime Lab:** `site/heavy-impact-lab.html`.
- **Production Web2D backend:** tsParticles only.
- **Particlr:** authoring/reference only; not a production runtime dependency.
- **3D:** architectural boundary only; zero implementation in Web2D V1.

## Hard UI preservation rule

Runtime, architecture, schema, optimization, backend or refactor work must **preserve the established Runtime Lab UI/UX and working controls by default**. Technical work is not permission to replace the interface, remove controls, reduce diagnostics, or promote a temporary harness to canonical UI.

P4.4.1 preserves the existing Play / Debug / HUD / inspector / overlap / A/B / cancellation / stress interface. No new replacement UI was introduced.

---

## Session 0 — Safety checkpoint

**Status: PASS.**

Recovery points:

- `legacy-p3.15` → `26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`
- `checkpoint-web2d-v1-reset-start` → `9f4217d992c4cf0a6a732df28952a18557eb7439`

---

## Session 1 — Architecture Reset

**Status: PASS / browser accepted.**

```text
GAME / Runtime Lab
  ↓
1 authoritative Web2D bootstrap
  ↓
FXDeck Core
  ↓
Web2D backend boundary
  ↓
TsParticlesAdapter
  ↓
1 tsParticles engine
  ↓
1 persistent transparent tsParticles container/canvas
```

---

## Session 2 — Schema + Compiler + Validator

**Status: PASS / browser accepted.**

Canonical authoring path:

```text
FXDeck Effect JSON
  ↓
structural + semantic validation
  ↓
compileWeb2D(effect, params)
  ↓
generic schema runtime
  ↓
TsParticlesAdapter
  ↓
1 persistent container
```

The three synthetic fixtures remain registered for automated regression only:

- `schema-test-burst`
- `schema-test-smoke`
- `schema-test-rain`

As of P4.4.1 they are **hidden from the normal Play effect selector**. They are not product effects. In particular, `schema-test-rain` is only a point-origin finite-rate proof and must not be judged as the planned Rain / Environment effect.

---

## Session 3 — Asset Pipeline + Dust Puff

**Status: PASS / browser + visual accepted.**

User-provided deployed P4.3.0 log confirmed the technical gate, including manifest loading, cold decode, warm cache hits, JSON-only effect authoring, cleanup and one persistent canvas.

The user then repeatedly reviewed Dust Puff and judged the visual result good enough to continue.

Retained architecture:

- manifest-backed reusable assets,
- `FXDeckAssetManager`,
- cold/warm prefetch and decode cache,
- `dust-puff.json`,
- semantic `motion.drag`,
- zero Dust Puff bridge.

### Known Dust Puff performance debt

The user observed that Dust Puff looks good but becomes expensive when many instances overlap. Current soft dust art uses relatively large translucent SVG alpha sprites, including blur, so overdraw/asset rasterization quality must be measured and optimized in Session 6.

Do **not** treat this as a reason to rewrite the runtime now. Planned Session 6 work includes raster WebP/PNG comparison, particle-count/quality scaling, DPR/overdraw measurements and overlap stress tests.

---

## Session 4 — Hero Effects

### Initial P4.4 visual result — REJECTED

The first P4.4 implementation was technically data-driven but failed the visual direction review:

- **Critical Hit** read as another generic particle explosion with a slash mixed in.
- **Goal Celebration** read as a strange point-origin particle explosion rather than a celebration composition.
- too much of the design was still `point → burst particles`, repeating the exact technology-first failure the reset was meant to avoid.

This visual pass is not accepted and must not be represented as portfolio-ready.

### P4.4.1 corrective rule

Framework capabilities may be added only because the rejected real effects prove a concrete visual need.

P4.4.1 adds three small reusable semantic capabilities:

```text
origin
→ per-layer spatial offset from gameplay position
→ optional rotateWithDirection

orientation
→ direction-aware image orientation
→ motion-path orientation

ribbon
→ constrained sustained ribbon shape
→ registered before container creation
```

These stay in FXDeck vocabulary. Authored JSON does not expose raw tsParticles configuration.

### Critical Hit P4.4.1

`site/fxdeck/effects/critical-hit.json`

Rebuilt around a dominant readable shape instead of particle quantity:

1. micro flare,
2. **one dominant primary slash**,
3. one delayed echo slash,
4. six supporting directional streaks,
5. small spark support.

Key behavior:

- primary slash orientation follows gameplay `direction`,
- slash origin offsets may rotate with gameplay direction,
- streak sprites orient to their movement path,
- support particle counts are materially lower than the rejected pass,
- `intensity` controls support density/speed,
- optional `tint` remains constrained to color replacement,
- zero Critical Hit bridge.

### Goal Celebration P4.4.1

`site/fxdeck/effects/goal-celebration.json`

Rebuilt as a spatial celebration rather than one clicked-point explosion:

1. center flare,
2. left ribbon launcher,
3. right ribbon launcher,
4. left team-color confetti cannon,
5. right team-color confetti cannon,
6. delayed accent confetti from above center,
7. delayed sparkles.

Spatial composition is explicit in data. Left/right launch points are separated around the gameplay position instead of sharing the click origin.

`teamColor` controls the flare, ribbons and team confetti. A new reusable `confetti-strip` image asset is manifest-managed.

### Ribbon capability decision

The previous “ribbon not required” decision is superseded.

User visual review proved that more short point-burst particles did not create a convincing Goal Celebration. P4.4.1 therefore adds the already-researched tsParticles motion + ribbon capability during Web2D boot **before** the persistent particle container is created. `play()` does not register plugins.

The existing one-container architecture remains unchanged.

### P4.4.1 technical gate

Expected deployed success line:

```text
PASS P4.4.1 SESSION 4 CORRECTION TECH GATE: directional Critical Hit / spatial Goal Celebration / ribbons / origin offsets / motion orientation / regression fixtures hidden from Play / 0 effect bridges / 1 persistent canvas
```

The gate verifies:

- both hero effects remain Schema V1/data-driven,
- Critical Hit direction/orientation compiles,
- streaks orient to motion,
- spatial origin data survives compilation,
- Goal compiles two actual ribbon layers,
- Goal left/right launch origins are separated,
- `teamColor` and `tint` bindings still work,
- ribbon capability registered at boot,
- synthetic schema fixtures are not visible in Play,
- cleanup returns runtime resources to zero,
- persistent container identity is unchanged,
- canvas count remains one.

### Acceptance status

**P4.4.1 technical browser gate: pending deployed user run.**

**P4.4.1 visual gate: pending user review.**

Do not proceed to Session 5 until the corrected Critical Hit and Goal Celebration are actually reviewed.

---

## Deferred, not lost

### Debug grid

The user mentioned that a grid/technical overlay would be useful for testing. Do not redesign the Runtime Lab for this now. If reintroduced later, it should be an optional Debug overlay such as:

```text
[ ] Grid
[ ] Spawn points
[ ] Bounds
[ ] Origins
```

### Session 6 performance debt

Dust Puff overlap cost and hero-effect overlap cost must be measured on mobile before final packaging. Do not guess bundle or performance numbers.

---

## Immediate next work

1. Browser-check P4.4.1 correction gate.
2. Visually review Critical Hit with several direction values and intensities.
3. Visually review Goal Celebration at several intensities.
4. Tune JSON/assets/timing if either still reads as generic particle noise.
5. Only after acceptance proceed to Session 5 — Explosion + Magic Burst + real Rain / Environment.

Primary architecture KPI remains:

> A normal new gameplay effect should be approximately 90% effect data + reusable assets. If it requires another effect-specific runtime bridge, the architecture is failing.

## Planned public V1 effect set

1. Dust Puff ✅
2. Critical Hit — P4.4.1 review
3. Goal Celebration — P4.4.1 review
4. Explosion
5. Magic Burst
6. Rain / Environment

## P0 mobile baseline retained

Galaxy S20+ 5G:

```text
~150 simple particles   60.0 avg / 59.5 1% low
~400 simple particles   60.0 avg / 59.9 1% low
~800 simple particles   57.4 avg / 30.0 1% low
```

## Changelog

- **P4.4.1:** recorded initial Session 4 hero art pass as visually rejected rather than accepted.
- **P4.4.1:** added semantic per-layer `origin` offsets with optional direction rotation.
- **P4.4.1:** added semantic sprite `orientation` for gameplay direction or motion path.
- **P4.4.1:** added constrained ribbon capability because Goal Celebration proved the visual need.
- **P4.4.1:** rebuilt Critical Hit around one dominant directional slash with reduced particle support.
- **P4.4.1:** rebuilt Goal Celebration around spatial left/right ribbons and confetti launchers.
- **P4.4.1:** added reusable `confetti-strip` asset.
- **P4.4.1:** moved synthetic schema fixtures out of the normal Play selector while retaining regression coverage.
- **P4.4.1:** aligned canonical runtime/build/cache labels and retained the existing Runtime Lab UI.
- **P4.4.1:** recorded Dust Puff overlap cost as Session 6 performance debt.
- **P4.3 / Session 3:** asset pipeline + Dust Puff accepted.
- **P4.2 / Session 2:** Schema V1 + compiler + validator accepted.
- **P4.1 / Session 1:** browser topology/lifecycle gate accepted.
- **P4.0 / Session 0:** recovery branches and safety checkpoint completed.
