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
```

Assets are added only when a real effect proves the need. P4.4.1 added `confetti-strip` because Goal Celebration needed readable rectangular confetti rather than more geometric point-burst noise.

## Performance note

The current Dust Puff soft sprites are deliberately retained for visual continuity, but repeated overlap was observed to be expensive. Their large translucent coverage and SVG blur make them explicit Session 6 optimization candidates. Measure raster WebP/PNG alternatives and overdraw before changing art or runtime behavior.
