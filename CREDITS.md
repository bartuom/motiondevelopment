# Asset & Reference Credits

FXDeck uses third-party runtime/reference material only when origin and license are recorded.

## Runtime dependency

- **tsParticles** — MIT License, copyright 2020 Matteo Bruni.
- FXDeck uses tsParticles as its particle backend.
- P3.13 Magic Burst V2 also loads the official `@tsparticles/plugin-motion` and `@tsparticles/shape-ribbon` packages and adapts the public Ribbons bundle behavior.

## Reference harvest

- **Particlr runtime** — MIT License, copyright 2026 particlr contributors.
  - Public `Explosion` runtime fixture is stored under `references/particlr/` as a visual/timing reference.
  - `site/assets/particlr-circle-soft.png` and `site/assets/particlr-smoke.png` are generated from the deterministic public procedural texture formulas in Particlr `src/texgen/index.ts` and are used by Explosion V2.
  - The Particlr editor states its 57 bundled presets are CC0. Exact Dust Puff and Rain exports are not present in the public runtime mirror and have not been fabricated or copied.
- **tsParticles Ribbons / Fireworks** — MIT-licensed source/config behavior recorded under `references/tsparticles/`.
- **Pixi Particle Emitter Rain example** — MIT License, copyright 2015 CloudKid. Its numeric example config is recorded under `references/pixi-particle-emitter/`. The upstream `HardRain.png` texture has not been copied into FXDeck production assets.

See `references/PROVENANCE.md` for the per-file provenance ledger.

## Production asset rule

Third-party or reference-derived binary art/code is promoted into `site/assets/` or production runtime only when its provenance and license are explicitly recorded here or in `references/PROVENANCE.md`.
