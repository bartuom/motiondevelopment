# Asset & Reference Credits

FXDeck uses third-party runtime/reference material only when origin and license are recorded.

## Runtime dependency

- **tsParticles** — MIT License, copyright 2020 Matteo Bruni.
- FXDeck uses tsParticles as its production particle backend.
- P3.13 Magic Burst V2 also loads the official `@tsparticles/plugin-motion` and `@tsparticles/shape-ribbon` packages.
- P3.14 source-fidelity calibration additionally runs the official `@tsparticles/ribbons@4.3.2` and `@tsparticles/fireworks@4.3.2` bundles inside an isolated reference iframe. These are calibration sources, not FXDeck-authored effects.

## Reference harvest

- **Particlr runtime** — MIT License, copyright 2026 particlr contributors.
  - Public `Explosion` runtime fixture is stored under `references/particlr/`.
  - P3.14.1 deploys the fixture from the `@particlr/runtime` **0.5.2 release commit** as `site/reference-data/particlr-explosion.prt` and renders it through the matching published `@particlr/runtime@0.5.2` + PixiJS 8.19.0.
  - This is explicitly the public runtime fixture, not a claim that it is the separate editor preset with the same name.
  - `site/assets/particlr-circle-soft.png` and `site/assets/particlr-smoke.png` remain reference-derived assets used only by the experimental custom Explosion V2.
  - The Particlr editor states its 57 bundled presets are CC0. Exact Dust Puff and Rain editor exports are still pending and have not been fabricated.
- **tsParticles Ribbons / Fireworks** — MIT-licensed source/config behavior recorded under `references/tsparticles/` and rendered directly in P3.14 source calibration.
- **Pixi Particle Emitter Rain example** — MIT License, copyright 2015 CloudKid. Its numeric example config is recorded under `references/pixi-particle-emitter/`. The upstream `HardRain.png` texture has not been copied into FXDeck production assets.

See `references/PROVENANCE.md` for the per-file provenance ledger.

## Production asset rule

Third-party or reference-derived binary art/code is promoted into `site/assets/` or production runtime only when its provenance and license are explicitly recorded here or in `references/PROVENANCE.md`.
