# FXDeck — Canonical Project State

> Current execution status only. Canonical roadmap: [`FXDECK_PLAN.md`](./FXDECK_PLAN.md).

## Current state — 2026-08-20

- **Milestone:** **P4.6.1 — Session 6 Runtime Recovery / Performance Pass**.
- **Sessions 0–3:** accepted.
- **Sessions 4–5:** technically useful coverage completed, but visual review was mixed; rejected effects are no longer public portfolio content.
- **Session 6:** in progress. P4.6.0 modular CDN boot failed in the deployed browser; P4.6.1 restores the canonical lab with a known-good full-bundle fallback. Browser recovery gate is pending.
- **Canonical Runtime Lab:** `site/heavy-impact-lab.html`.
- **Production Web2D backend:** tsParticles only.
- **Particlr:** reference/authoring source only.
- **3D:** out of scope for Web2D V1.

## Hard UI preservation rule

Runtime, architecture, schema, optimization and refactor work must preserve the established Runtime Lab UI/UX and working controls by default.

P4.6.1 changes runtime/bootstrap behavior only. The Play / Debug / HUD / inspector / overlap / A/B / cancellation / stress shell remains canonical.

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

Known debt: many overlapping Dust Puff instances are expensive because large translucent SVG sprites create significant overdraw/raster work. Quality scaling exists; raster asset comparison is still pending.

---

## Sessions 4–5 — visual review outcome

Technical success is not treated as portfolio success.

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

Normal Play is curated to:

1. `dust-puff`
2. `fireball`
3. `explosion`
4. `rain`

`Critical Hit`, `Goal Celebration` and `Magic Burst` are not production boot dependencies. `Heavy Impact` remains internal only because the Session 1 topology/lifecycle gate uses it.

---

# Session 6 — Production / Performance

## P4.6.0 modular trim — DEPLOYED BOOT FAIL

P4.6.0 attempted to replace the known-good full bundle with:

```text
@tsparticles/engine 4.3.2
@tsparticles/slim 4.3.2
@tsparticles/plugin-emitters 4.3.2
```

The deployed browser produced:

```text
BOOT FAIL P4.6.0: FXDeck Web2D requires the emitters plugin loader.
BOOTSTRAP FAIL P4.6.0: FXDeck Web2D requires the emitters plugin loader.
```

Root cause: the chosen CDN combination did not expose the expected `globalThis.loadEmittersPlugin` loader in the canonical page. The hard precondition failed before `FXDeckLab` initialized, which also caused the stress benchmark warning.

**Conclusion:** the modular trim is **not accepted**. Do not put an unproven slim-loader path back on the canonical Runtime Lab.

## P4.6.1 recovery hotfix — CURRENT

Canonical HTML is restored to the known-good browser bundle:

```text
@tsparticles/engine 4.3.2
tsparticles full bundle 4.3.2
```

`createWeb2DRuntime()` is now recovery-aware:

```text
if loadSlim + loadEmittersPlugin are both genuinely available
  → slim+emitters
else
  → loadFull fallback
```

Current canonical HTML intentionally loads the full bundle so the user-facing Runtime Lab is reliable while modular slimming is moved back to an isolated proof task.

Runtime reports one of:

```text
backendBundle = "slim+emitters"
backendBundle = "full-fallback"
```

Ribbon/motion capability remains disabled for the curated production set.

## Generic quality tiers retained

`compileWeb2D()` accepts:

```js
FXDeck.play("dust-puff", {
  position: { x, y },
  intensity: 1,
  quality: "low" | "medium" | "high"
});
```

Quality scaling remains priority-aware and must satisfy monotonic density checks for Dust Puff and Rain.

## P4.6.1 recovery gate

`site/js/session6-production-gate.js` checks:

- public selector contains only Dust Puff / Projectile / Explosion / Rain,
- rejected hero effects do not leak back into Play,
- ribbon/motion scripts are absent,
- backend is either browser-proven modular or explicit full fallback,
- Dust Puff low/medium/high burst counts scale monotonically,
- Rain low/medium/high rates scale monotonically,
- low-quality burst + sustained playback clean up correctly,
- one persistent particle container/canvas remains.

Expected recovery success line on the current canonical path:

```text
PASS P4.6.1 SESSION 6 RECOVERY GATE: curated 4-effect Play / full-fallback / quality scaling / ribbon absent / 1 persistent canvas
```

Expected diagnostic:

```text
P4.6.1 MODULAR STATUS: P4.6.0 slim+emitters CDN boot failed because loadEmittersPlugin was unavailable; canonical runtime recovered on known-good full bundle. Slimming remains pending and must be browser-proven before replacing the fallback.
```

### P4.6.1 acceptance status

**Browser recovery gate: pending user run.**

**Modular slim build: NOT accepted / pending isolated browser proof.**

**Physical mobile performance measurements: pending.**

**Asset raster comparison (SVG vs PNG/WebP): pending.**

Do not mark Session 6 complete from source inspection alone.

---

## Immediate next work

1. Open `site/heavy-impact-lab.html?v=p4.6.1` on GitHub Pages.
2. Confirm normal Runtime Lab boot is restored.
3. Confirm Play contains only Dust Puff / Projectile / Explosion / Rain.
4. Inspect Debug for `PASS P4.6.1 SESSION 6 RECOVERY GATE`.
5. Only after recovery is confirmed, test the modular loader separately from the canonical page.
6. Continue Session 6 with Dust Puff SVG vs PNG/WebP, overlap stress, Rain + burst stress and physical Galaxy S20+ profiling.

---

## Portfolio direction after performance pass

Do not spend repeated blind iterations rescuing rejected hero effects.

Future portfolio replacements use:

```text
reference lock
→ layer breakdown
→ asset requirements
→ timing / motion targets
→ Schema JSON
→ visual review
```

Target final portfolio can be:

```text
Dust Puff        KEEP
Projectile       KEEP / polish
Explosion        polish
Rain             polish
+ 2 new reference-locked hero effects
```
