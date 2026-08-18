# Motion FX Portfolio

> **Active development:** FXDeck — Gameplay VFX Runtime for Web Games. See [`FXDECK_STATE.md`](./FXDECK_STATE.md) for the canonical roadmap, milestone checklists, architectural decisions, current status, and changelog.

The original portfolio remains in the repository as a reference while FXDeck is developed as a reusable gameplay VFX runtime.

A neutral, lightweight browser portfolio focused on six motion / game FX categories:

1. Explosions
2. Flash
3. Impact
4. Spell Effects
5. Draw Animations
6. Trails & Particles

The project is intentionally small, buildless and easy to integrate into existing browser game code.

## Stack

- HTML
- CSS animations / keyframes / transitions
- Vanilla JavaScript
- SVG
- Sprite sheets
- Small reusable DOM particle pools

No framework, no runtime dependencies and no build step.

## Included studies

### 01 Explosions
- Small and Big as separate sprite sheets
- hand-tuned frame pacing instead of uniform playback
- sparks, embers, debris, flash and pressure rings

### 02 Flash
- Small and Big
- pure CSS white core, bloom, radial rays and ring

### 03 Impact
- Light and Heavy
- directional projectile, contact flash, recoil, asymmetric burst and debris

### 04 Spell Effects
- Arcane and Fire
- charge, release, projectile, trail and hit sequencing

### 05 Draw Animations
- Common and Rare
- anticipation, CSS 3D flip, reveal flash, rays and rarity particles

### 06 Trails & Particles
- Energy Trail
- SVG Slash Trail
- Sparks / Dust / Magic particle study

## Performance approach

- `transform` and `opacity` are preferred for runtime motion
- no framework or animation library
- small bounded particle counts
- DOM elements are reused within demos
- only one stage/layout read is used where travel distance must adapt to viewport width
- app FPS is measured live with `requestAnimationFrame`

## Run locally

```bash
python -m http.server 8080 --directory site
```

Then open `http://localhost:8080`.

## Live portfolio

GitHub Pages publishes the `site/` directory directly. No npm install or build command is required.
