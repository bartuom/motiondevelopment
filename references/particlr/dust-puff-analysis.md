# Particlr Dust Puff — FXDeck reference analysis

Status: **visual/reference analysis only; exact Particlr `.prt` export is still pending.**

Source: https://particlr.com/

The public Particlr site confirms that its bundled presets are CC0 and that the free authoring/runtime model includes emission, curves/gradients, velocity, gravity, drag, noise and blend modes. The exact Dust Puff preset document is not present in the public runtime mirror currently archived in this repository, so FXDeck must not claim or invent Particlr-authored numeric settings.

## What FXDeck takes from the reference direction

The target is the visual language, not a literal config transcription:

- use soft, irregular alpha sprites instead of geometric circles for the main dust mass;
- create a fast low lateral/radial push at contact;
- decelerate the cloud quickly so it reads as displaced dust rather than projectiles;
- follow with a slower, larger secondary billow and sparse rising wisps;
- grow sprite size while alpha fades;
- keep the main material on normal alpha blend rather than additive light;
- overlap multiple texture variants so repeated particles do not reveal one obvious stamp;
- keep particle count modest and let alpha art/timing do the visual work.

## FXDeck P4.3 implementation

`site/fxdeck/effects/dust-puff.json` is an **original FXDeck effect**, authored from the principles above and not copied from the Particlr preset.

It uses four data-driven layers:

1. `ground-roll` — primary soft textured radial mass;
2. `body` — delayed, slower expanding cloud body;
3. `wisps` — sparse upward secondary breakup;
4. `grit` — brief small contact particles for readable ground energy.

The three main alpha sprites are original FXDeck assets under `site/assets/vfx/` and are registered through the FXDeck asset manifest.

## Remaining reference task

If the exact Particlr Dust Puff export becomes available later, compare it against this original implementation for:

- texture choice;
- burst count/timing;
- lifetime/size/alpha curves;
- drag/gravity/noise;
- blend mode;
- number of contributing layers.

Do not replace a visually stronger FXDeck result merely to match the reference numerically.
