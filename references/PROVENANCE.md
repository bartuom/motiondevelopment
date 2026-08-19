# Reference provenance / license ledger

This file records third-party material used for FXDeck visual research and the P3.14 source-fidelity calibration harness. It does **not** mean every referenced file is part of the production FXDeck runtime.

## Particlr

- Source: `brac/particlr-runtime`
- Runtime package: `@particlr/runtime`
- Runtime license: MIT, copyright 2026 particlr contributors.
- Editor site states all 57 bundled presets are CC0.
- Public runtime mirror explicitly does **not** ship the monorepo `presets/` directory.
- Harvested reference:
  - `references/particlr/explosion-runtime-fixture.prt` — exact public runtime test fixture from `test/fixtures/explosion.prt`; MIT runtime terms.
  - `references/particlr/dust-puff.pending.md` — no copied preset data.
  - `references/particlr/rain.pending.md` — no copied preset data.
- P3.14 promoted calibration copy:
  - `site/reference-data/particlr-explosion.prt` — text-equivalent copy of the public Explosion fixture from the **0.5.2 release commit** (`112a750a30ff61dae60058e3c600d2c8bf0ff726`).
  - rendered by the matching published `@particlr/runtime@0.5.2` + PixiJS 8.19.0 in `site/reference-fidelity-frame.html`.
  - the 0.5.2 release README explicitly documents the `parseParticle` + `Effect` + `PixiParticleRenderer` API used by the calibration frame.
- Important distinction: this is the exact **public runtime Explosion fixture**, not a claim that it is byte-identical to the separate CC0 editor preset named Explosion.
- Production rule: if an editor preset is exported later, record the exact exported filename and preserve the CC0 provenance note.

## tsParticles

- Source: `tsparticles/tsparticles`
- License: MIT, copyright 2020 Matteo Bruni.
- Harvested references:
  - `references/tsparticles/ribbons-defaults.json` — normalized record derived from the Ribbons bundle source/defaults.
  - `references/tsparticles/fireworks-defaults.json` — normalized record derived from Fireworks bundle source/defaults and Playground settings.
- P3.14 calibration runtime:
  - `@tsparticles/ribbons@4.3.2` — official bundle loaded in an isolated reference frame with the harvested exact options.
  - `@tsparticles/fireworks@4.3.2` — official bundle loaded in an isolated reference frame with the harvested Playground settings.
- Production rule: copied/substantial source or bundle code requires retention of the MIT notice. FXDeck-authored configs inspired by the behavior should still retain source attribution in project docs.

## Pixi Particle Emitter

- Source: `pixijs-userland/particle-emitter`
- License: MIT, copyright 2015 CloudKid.
- Harvested locally:
  - `pixi-particle-emitter/rain-reference.json` — exact numeric configuration transcribed from `docs/examples/rain.html`.
- Referenced texture in upstream example: `docs/examples/images/HardRain.png`.
- The texture itself has **not** been copied into this repository yet.

## P3.14 fidelity rule

Source references are rendered in an isolated iframe and are explicitly labeled `SOURCE`. They are calibration targets, not production FXDeck cues. The current custom `Explosion V2` and `Magic Burst V2` remain experimental until they can be compared against and materially preserve the quality of these source references.

## Safety rule

No third-party binary art/audio enters `site/assets/` without a provenance entry first. Exact text configs/fixtures promoted into the calibration harness must retain a provenance record and must not be silently presented as FXDeck-authored content.
