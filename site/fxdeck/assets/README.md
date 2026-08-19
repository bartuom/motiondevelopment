# FXDeck asset pipeline

`manifest.json` is the source of truth for reusable runtime assets.

Rules:

- effects reference assets by stable manifest id;
- URLs, dimensions and provenance live in the manifest, not in effect authoring data;
- `FXDeckAssetManager` resolves ids, de-duplicates image decode/load work and supports explicit prefetch;
- runtime/compiler still receive hydrated `{ id, src, width, height }` records internally;
- production definitions must not use data/base64 URIs;
- third-party-derived assets require provenance/license metadata;
- FXDeck-original assets are marked as such in the manifest.

Session 3 starts with three original soft-dust alpha sprites under `site/assets/vfx/`. More reusable assets should be added only when a real effect proves the need.
