# FXDeck Reference Harvest

This directory is the source-of-truth for reference-driven visual development.

The rule is simple: do not replace authored source art or proven particle behavior with circles, triangles, CSS gradients or ad-hoc DOM approximations when a better licensed reference exists.

## Current harvest

| Source | Reference | Status | Intended FXDeck use |
|---|---|---|---|
| Particlr | Explosion | HARVESTED — public runtime fixture | Explosion V2 visual/timing language |
| Particlr | Dust Puff | BLOCKED — exact editor preset export required | Dust Puff V1 |
| Particlr | Rain | BLOCKED — exact editor preset export required | Rain V1 |
| tsParticles | Ribbons | HARVESTED — exact bundle defaults + runtime recipe | Magic Burst V2 |
| tsParticles | Fireworks | HARVESTED — exact bundle defaults + launch/split recipe | multi-stage burst language |
| Pixi Particle Emitter | Rain | SUPPORTING REF — exact old example config | Rain texture/motion reference |

## Why Particlr Dust Puff / Rain are marked blocked

The public `brac/particlr-runtime` mirror explicitly states that preset fixtures live at the monorepo root `presets/` and are not shipped in the public runtime mirror. The editor advertises all 57 bundled presets as CC0, but the exact `.prt` documents for Dust Puff and Rain are therefore not available from the public runtime repository.

Do not fabricate their numeric settings. The correct next step is to open each preset in Particlr and export its `.prt`/JSON, then commit that export here.

## Production rule

A third-party asset/config may enter production only when:

1. its origin is recorded in `PROVENANCE.md`;
2. its license permits the intended use;
3. the copied file is clearly separated from FXDeck-authored content;
4. FXDeck-specific modifications are documented.

Reference code/config can also be used only as a technique reference without copying an asset into production.
