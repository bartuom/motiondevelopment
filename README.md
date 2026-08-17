# Motion Development

Lightweight browser-game motion portfolio built for practical CSS/JavaScript gameplay effects.

## Effect 01: Power Shot Impact

The first demo intentionally uses a very small production-style stack:

- HTML
- CSS animations and keyframes
- vanilla JavaScript for sequencing
- one 8-frame sprite sheet
- 12 reusable DOM particles
- no framework
- no runtime libraries
- no build step

The effect combines a ball shot, trail, flash, sprite-sheet impact, short particle burst, goal-net punch and screen shake.

## Why this architecture

The goal is not to build an FX framework. The goal is to show effects that can be dropped into an existing browser game with minimal integration cost.

CSS handles most visual motion through `transform` and `opacity`. JavaScript only selects presets, calculates the responsive shot vector and sequences the effect.

```text
site/
├── index.html
├── styles.css
├── assets/
│   └── impact-sprite.svg
└── js/
    └── main.js
```

## Run locally

Any static server is enough:

```bash
python -m http.server 8080 --directory site
```

There is no install or build command.

## GitHub Pages

The repository deploys `site/` directly through GitHub Actions.

Live portfolio:

`https://bartuom.github.io/motiondevelopment/`

## Planned portfolio effects

1. Power Shot Impact
2. Explosion Sprite Sheet
3. Spell Cast
4. Player Draw / Reward Reveal
5. Gameplay Trails
6. Small Particle Emitters

The set is focused on reusable browser-game motion patterns, sprite sheets, gameplay feedback and mobile-friendly performance.
