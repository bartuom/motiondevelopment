# Particlr — Dust Puff

**Status:** exact preset export pending.

The Particlr editor advertises its bundled presets as CC0, but the public `brac/particlr-runtime` mirror does not ship the monorepo `presets/` directory. Do not invent settings for this effect.

## Export needed

Open **Dust Puff** in the Particlr editor and export the `.prt` / JSON document. Commit it here as:

`references/particlr/dust-puff.prt`

## What to inspect once exported

- texture refs and whether the soft look comes from `smoke` or another texture;
- emission count/burst timing;
- spawn radius/shape;
- lifetime and size-over-life;
- alpha/color curve;
- velocity, drag, gravity and noise;
- normal/additive blend choice;
- rotation/angular velocity;
- whether multiple layers are responsible for the final silhouette.

## Intended FXDeck use

`Dust Puff V1`: reusable landing / footstep / impact / debris / dash / vehicle-dust building block.
