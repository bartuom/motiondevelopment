# Motion FX Portfolio

A neutral, lightweight browser portfolio focused on six motion / game FX categories:

1. Explosions
2. Flash
3. Impact
4. Spell Effects
5. Draw Animations
6. Trails & Particles

The project is intentionally small and easy to integrate into existing browser game code.

## Stack

- HTML
- CSS animations / keyframes / transitions
- Vanilla JavaScript
- Sprite sheets
- Small reusable DOM particle pools

No framework, no runtime dependencies and no build step.

## Effect 01: Explosion

The first finished study uses:

- an 8-frame sprite sheet
- CSS `steps()` playback
- `transform` and `opacity` based animation
- a fixed reusable pool of up to 16 DOM particles
- three variants: Compact, Standard and Heavy

## Run locally

Any static HTTP server is enough:

```bash
python -m http.server 8080 --directory site
```

Then open `http://localhost:8080`.

## Live portfolio

GitHub Pages publishes the `site/` directory directly. No npm install or build command is required.
