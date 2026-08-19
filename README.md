# Motion FX Portfolio / FXDeck

> **Active development:** FXDeck — lightweight, AI-friendly gameplay VFX for 2D web games.
>
> - Canonical implementation plan: [`FXDECK_PLAN.md`](./FXDECK_PLAN.md)
> - Current execution status: [`FXDECK_STATE.md`](./FXDECK_STATE.md)

The repository is currently entering the **P4.0 Web2D V1 controlled reset**. The P3.x prototype remains useful as a technical baseline, but new development follows the schema-first Web2D plan rather than extending effect-specific bridge code.

## FXDeck direction

Target runtime architecture:

```text
Game
  ↓
FXDeck API
  ↓
FXDeck Core + Effect Schema
  ↓
Web2D compiler
  ↓
TsParticlesAdapter
  ↓
custom modular tsParticles build
  ↓
one persistent transparent canvas/container
```

Core goals:

- lightweight mobile-web integration,
- AI/vibe-coding-friendly effect data,
- reusable high-quality alpha/sprite assets,
- one production particle backend for Web2D V1,
- measurable bundle/performance budgets,
- new effects authored primarily as data + assets rather than custom runtime JavaScript.

Particlr is used as an authoring/reference source, not as a default production runtime dependency. 3D is intentionally out of scope for Web2D V1.

## Planned V1 showcase

1. Dust Puff
2. Critical Hit
3. Goal Celebration
4. Explosion
5. Magic Burst
6. Rain / Environment

Visual quality is the gate; the target is a small set of portfolio-grade gameplay VFX rather than a large preset catalog.

## Legacy portfolio

The original browser motion/VFX studies remain in the repository as references while FXDeck is developed into a reusable client-facing runtime.

Legacy studies include:

- explosions,
- flashes,
- impacts,
- spell effects,
- draw/reveal animations,
- trails and particles,
- CSS/SVG/sprite-sheet experiments.

## Run current site locally

```bash
python -m http.server 8080 --directory site
```

Then open `http://localhost:8080`.

## Live site

GitHub Pages publishes the `site/` directory directly. During the P4.0 reset, the live Runtime Lab may still reflect legacy P3.15 behavior until the corresponding migration session is completed.
