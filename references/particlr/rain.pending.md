# Particlr — Rain

**Status:** exact preset export pending.

The Particlr editor advertises its bundled presets as CC0, but the public `brac/particlr-runtime` mirror does not ship the monorepo `presets/` directory. Do not fabricate the editor preset's numeric settings.

## Export needed

Open **Rain** in the Particlr editor and export the `.prt` / JSON document. Commit it here as:

`references/particlr/rain.prt`

## What to inspect once exported

- drop/streak texture;
- rectangular spawn region;
- direction and velocity variance;
- alpha and scale;
- lifetime and continuous rate;
- layering / secondary streaks;
- wind/noise if present;
- blend mode and particle budget.

## Supporting reference

Until the exact Particlr export is available, `references/pixi-particle-emitter/rain-reference.json` records the exact older Pixi Particle Emitter Rain example using `HardRain.png`. It is a technique reference only, not a substitute claimed to be the Particlr preset.

## Intended FXDeck use

`Rain V1`: sustained environment effect with `start/update/stop`, intensity scaling and later mobile quality tiers.
