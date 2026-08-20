# FXDeck asset pipeline

`manifest.json` is the source of truth for reusable runtime assets.

Rules:

- effects reference assets by stable manifest id;
- URLs, dimensions and provenance live in the manifest, not in effect authoring data;
- `FXDeckAssetManager` resolves ids, de-duplicates image decode/load work and supports explicit prefetch;
- runtime/compiler receive hydrated `{ id, src, width, height }` records internally;
- production definitions must not use data/base64 URIs;
- third-party-derived assets require provenance/license metadata;
- FXDeck-original assets are marked as such in the manifest.

Current original reusable set:

```text
dust-soft-01
dust-soft-02
dust-soft-03
critical-slash
hero-streak
hero-flare
confetti-strip
fire-soft
smoke-soft
magic-arc
rain-streak
```

Assets are added only when a real effect proves the need.

P4.5 additions:

- `fire-soft` — soft additive fireball alpha for Explosion,
- `smoke-soft` — normal-blend smoke alpha for Explosion,
- `magic-arc` — dominant direction-readable Magic Burst shape,
- `rain-streak` — neutral horizontal streak oriented to particle motion by the compiler/runtime.

The new P4.5 SVGs avoid filter blur. This does not imply SVG is the final production format; Session 6 will measure raster WebP/PNG alternatives, overdraw and decode/runtime cost.

## Performance note

The current Dust Puff soft sprites are deliberately retained for visual continuity, but repeated overlap was observed to be expensive. Their large translucent coverage and SVG blur make them explicit Session 6 optimization candidates. Measure raster WebP/PNG alternatives and overdraw before changing art or runtime behavior.
