# FXDeck — Gameplay VFX Runtime for Web Games

FXDeck is being rebuilt as a lightweight, AI-friendly 2D gameplay VFX framework for mobile/web games.

## Canonical docs

- [`FXDECK_PLAN.md`](./FXDECK_PLAN.md) — Web2D V1 implementation roadmap.
- [`FXDECK_STATE.md`](./FXDECK_STATE.md) — current execution state and next gate.
- [`site/fxdeck/web2d/README.md`](./site/fxdeck/web2d/README.md) — Web2D backend boundary/invariants.

## Canonical Runtime Lab

`site/web2d-runtime-lab.html`

Live on GitHub Pages after deployment:

`https://bartuom.github.io/motiondevelopment/web2d-runtime-lab.html`

The old `site/heavy-impact-lab.html` is now a legacy P3 prototype page and is not the canonical Web2D V1 runtime path.

## Current architecture

```text
GAME
  ↓
FXDeck API
  ↓
FXDeck Core
  ↓
Web2D backend boundary
  ↓
TsParticlesAdapter
  ↓
one persistent tsParticles container
```

Web2D V1 uses tsParticles as the only production particle runtime. Particlr is retained as an authoring/reference source, not a default client dependency. 3D is intentionally out of scope for this cycle.

## Run locally

```bash
python -m http.server 8080 --directory site
```

Then open:

`http://localhost:8080/web2d-runtime-lab.html`

## Legacy recovery

- `legacy-p3.15` — final P3.15 prototype baseline.
- `checkpoint-web2d-v1-reset-start` — repository state immediately before Session 1 implementation.
