# Reference provenance / license ledger

This file records third-party material used for FXDeck visual research. It does **not** mean every referenced file is part of the production bundle.

## Particlr

- Source: `brac/particlr-runtime`
- Runtime license: MIT, copyright 2026 particlr contributors.
- Editor site states all 57 bundled presets are CC0.
- Public runtime mirror explicitly does **not** ship the monorepo `presets/` directory.
- Harvested locally:
  - `particlr/explosion-runtime-fixture.prt` — exact public runtime test fixture from `test/fixtures/explosion.prt`; treat under the runtime repository's MIT terms.
  - `particlr/dust-puff.pending.md` — no copied preset data.
  - `particlr/rain.pending.md` — no copied preset data.
- Production rule: if an editor preset is exported later, record the exact exported filename and preserve the CC0 provenance note.

## tsParticles

- Source: `tsparticles/tsparticles`
- License: MIT, copyright 2020 Matteo Bruni.
- Harvested locally:
  - `tsparticles/ribbons-defaults.json` — normalized record derived from `bundles/ribbons/src/RibbonsOptions.ts`, `ribbons.ts`, and `utils.ts`.
  - `tsparticles/fireworks-defaults.json` — normalized record derived from `bundles/fireworks/src/FireworkOptions.ts`, `utils.ts`, plus current Playground bundle defaults.
- Production rule: copied/substantial source or bundle code requires retention of the MIT notice. FXDeck-authored configs inspired by the behavior should still retain source attribution in project docs.

## Pixi Particle Emitter

- Source: `pixijs-userland/particle-emitter`
- License: MIT, copyright 2015 CloudKid.
- Harvested locally:
  - `pixi-particle-emitter/rain-reference.json` — exact numeric configuration transcribed from `docs/examples/rain.html`.
- Referenced texture in upstream example: `docs/examples/images/HardRain.png`.
- The texture itself has **not** been copied into this repository yet.
- If copied later, preserve the upstream attribution/license record alongside it.

## Safety rule

No third-party binary art/audio enters `site/assets/` without a provenance entry first. Reference configs stay under `references/` until intentionally promoted into an authored FXDeck effect.
