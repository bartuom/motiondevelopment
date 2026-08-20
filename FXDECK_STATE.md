# FXDeck — Canonical Project State

> Current execution status only. Canonical roadmap: [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).

## Current state — 2026-08-20

- **Milestone:** **P4.6.0 — Session 6 Production / Performance Pass**.
- **Sessions 0–3:** accepted.
- **Sessions 4–5:** technically useful coverage completed, but visual review was mixed; rejected effects are no longer public portfolio content.
- **Session 6:** first production trim implemented; deployed browser gate + real mobile measurements pending.
- **Canonical Runtime Lab:** `site/heavy-impact-lab.html`.
- **Production Web2D backend:** tsParticles only.
- **Particlr:** reference/authoring source only.
- **3D:** out of scope for Web2D V1.

## Hard UI preservation rule

Runtime, architecture, schema, optimization and refactor work must preserve the established Runtime Lab UI/UX and working controls by default.

P4.6.0 keeps the same Play / Debug / HUD / inspector / overlap / A/B / cancellation / stress shell. Production work happens underneath it.

---

## Accepted foundation

### Session 0 — Safety checkpoint

**PASS.**

Recovery points:

- `legacy-p3.15` → `26b4622e68f4a2457dda6b84bf55c0fdb9a7112c`
- `checkpoint-web2d-v1-reset-start` → `9f4217d992c4cf0a6a732df28952a18557eb7439`

### Session 1 — Architecture reset

**PASS / browser accepted.**

```text
GAME / Runtime Lab
  ↓
FXDeck Core
  ↓
Web2D backend
  ↓
TsParticlesAdapter
  ↓
1 tsParticles engine
  ↓
1 persistent transparent canvas/container
```

### Session 2 — Schema + Compiler + Validator

**PASS / browser accepted.**

Normal authoring path:

```text
FXDeck Effect JSON
  ↓
validation
  ↓
compileWeb2D()
  ↓
generic schema runtime
  ↓
TsParticlesAdapter
```

Synthetic `schema-test-*` effects remain Debug-only regression fixtures.

### Session 3 — Asset Pipeline + Dust Puff

**PASS / browser + visual accepted.**

Dust Puff remains the strongest accepted asset-first Schema V1 proof.

Known debt: many overlapping Dust Puff instances are expensive because large translucent SVG sprites create significant overdraw/raster work. P4.6 adds quality scaling; raster asset comparison is still pending.

---

## Sessions 4–5 — visual review outcome

These sessions proved runtime capabilities, but technical success is not treated as portfolio success.

User visual review on 2026-08-20 classified the effects approximately as:

| Effect | Runtime/technical role | Visual status |
| --- | --- | --- |
| Dust Puff | Schema + asset pipeline proof | **KEEP / good** |
| Projectile / Fireball | moving-source reference | **KEEP / good, reads more like a rocket** |
| Rain / Environment | sustained stage-wide emitter | **KEEP / usable** |
| Explosion | layered schema coverage | **KEEP FOR NOW / polish needed** |
| Critical Hit | direction/orientation proof | **REJECT visual** |
| Goal Celebration | spatial/origin proof | **REJECT visual** |
| Magic Burst | directional image-shape proof | **REJECT visual** |
| Heavy Impact | old topology/lifecycle baseline | **REJECT visual / internal only** |

### Consequence

Do not represent the rejected effects as portfolio-ready merely because they pass runtime gates.

As of P4.6.0 the normal Play surface is curated to:

1. `dust-puff`
2. `fireball`
3. `explosion`
4. `rain`

`Critical Hit`, `Goal Celebration` and `Magic Burst` are not loaded by the production bootstrap. Their source remains in Git history/repo for reference, but they are not current product content.

`Heavy Impact` remains registered internally only because the long-running Session 1 topology/lifecycle regression gate uses it. It is hidden from Play.

The old synthetic schema fixtures remain internal Debug regression data and are hidden from Play.

---

# Session 6 — Production / Performance

## P4.6.0 implemented

### 1. tsParticles production trim

Canonical Runtime Lab no longer loads:

```text
tsparticles full bundle
plugin-motion
shape-ribbon
```

It now loads:

```text
@tsparticles/engine 4.3.2
@tsparticles/slim 4.3.2
@tsparticles/plugin-emitters 4.3.2
```

Runtime reports:

```text
backendBundle = "slim+emitters"
ribbon capability = false
```

This is the first safe production trim. Exact byte savings must come from deployed measurements; do not invent bundle-size numbers.

### 2. Production effect curation

New integration:

- `site/js/session6-production-effects.js`

It loads/prefetches only the coverage JSON still needed by the curated public set:

- `explosion.json`
- `rain.json`

Rejected Session 4/5 hero modules are not canonical boot dependencies.

### 3. Generic quality tiers

`compileWeb2D()` now accepts:

```js
FXDeck.play("dust-puff", {
  position: { x, y },
  intensity: 1,
  quality: "low" | "medium" | "high"
});
```

Quality scaling is backend-generic and priority-aware:

```text
high   → authored particle/rate density
medium → preserve hero layers, reduce support layers
low    → preserve readability, aggressively reduce medium/low support density
```

Quality is applied after normal runtime parameter bindings and before compilation/semantic validation.

### 4. P4.6 production gate

New gate:

- `site/js/session6-production-gate.js`

It checks:

- public selector contains only Dust Puff / Projectile / Explosion / Rain,
- Critical Hit / Goal Celebration / Magic Burst are not registered by production boot,
- full tsParticles bundle is absent,
- ribbon/motion scripts are absent,
- runtime is `slim+emitters`,
- Dust Puff low/medium/high burst counts scale monotonically,
- Rain low/medium/high rates scale monotonically,
- low-quality burst + sustained playback clean up correctly,
- one persistent particle container/canvas remains,
- browser Resource Timing / CDN HEAD size data is logged when available, without pretending unavailable bytes are known.

Expected success line:

```text
PASS P4.6.0 SESSION 6 PRODUCTION GATE: curated 4-effect Play / slim+emitters / full bundle absent / ribbon absent / quality scaling / 1 persistent canvas
```

### P4.6.0 acceptance status

**Browser technical gate: pending deployed user run.**

**Physical mobile performance measurements: pending.**

**Asset raster comparison (SVG vs PNG/WebP): pending.**

Do not mark Session 6 complete from source inspection alone.

---

## Immediate next work

1. Open `site/heavy-impact-lab.html?v=p4.6.0` on GitHub Pages.
2. Confirm the Play selector contains only:
   - Dust Puff
   - Projectile / Fireball
   - Explosion
   - Rain / Environment
3. Inspect the Debug log for `PASS P4.6.0 SESSION 6 PRODUCTION GATE`.
4. Copy the P4.6 log back into the project conversation.
5. Then run real overlap/stress measurements, especially Dust Puff and Rain + gameplay bursts.
6. After browser acceptance, continue Session 6 with raster asset comparison and physical Galaxy S20+ profiling.

---

## Portfolio direction after performance pass

Do **not** spend repeated blind iterations rescuing rejected hero effects.

For future portfolio replacements use:

```text
reference lock
→ layer breakdown
→ asset requirements
→ timing / motion targets
→ Schema JSON
→ visual review
```

No new hero effect should be invented from primitive particle noise without an agreed visual reference.

Target final portfolio can be:

```text
Dust Puff        KEEP
Projectile       KEEP / polish
Explosion        polish
Rain             polish
+ 2 new reference-locked hero effects
```

This is preferable to forcing Critical Hit / Goal Celebration / Magic Burst into the final package.
