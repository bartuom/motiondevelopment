# FXDeck — Gameplay VFX Runtime for Web Games

FXDeck is being rebuilt as a lightweight, AI-friendly 2D gameplay VFX framework for mobile/web games.

## Canonical docs

- [`FXDECK_PLAN.md`](./FXDECK_PLAN.md) — Web2D V1 implementation roadmap.
- [`FXDECK_STATE.md`](./FXDECK_STATE.md) — current execution state and next gate.
- [`site/fxdeck/web2d/README.md`](./site/fxdeck/web2d/README.md) — Web2D backend boundary/invariants.

## Canonical Runtime Lab

`site/heavy-impact-lab.html`

Live on GitHub Pages after deployment:

`https://bartuom.github.io/motiondevelopment/heavy-impact-lab.html`

`site/web2d-runtime-lab.html` is only the retired P4.1 architecture harness and redirects to the established Runtime Lab.

## Current architecture

```text
GAME
  ↓
FXDeck API
  ↓
FXDeck Core
  ↓
FXDeck Effect Schema V1
  ↓
Web2D compiler
  ↓
TsParticlesAdapter
  ↓
one persistent tsParticles container
```

Web2D V1 uses tsParticles as the only production particle runtime. Particlr is retained as an authoring/reference source, not a default client dependency. 3D is intentionally out of scope for this cycle.

Current real schema-driven effects:

- Dust Puff
- Critical Hit
- Goal Celebration

The Runtime Lab UI/UX is preserved by default during runtime/schema/backend refactors.

## Run locally

```bash
python -m http.server 8080 --directory site
```

Then open:

`http://localhost:8080/heavy-impact-lab.html`

## Legacy recovery

- `legacy-p3.15` — final P3.15 prototype baseline.
- `checkpoint-web2d-v1-reset-start` — repository state immediately before Session 1 implementation.
