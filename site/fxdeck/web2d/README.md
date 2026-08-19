# FXDeck Web2D backend boundary

Build: **P4.3.0 / Session 3**

This directory is the canonical production boundary between FXDeck Core/schema data and the current 2D web renderer.

## Contract

```text
FXDeck Effect JSON
  ↓
validator + asset hydration
  ↓
compileWeb2D()
  ↓
Web2D backend boundary
  ↓
TsParticlesAdapter
  ↓
one persistent transparent tsParticles container
```

Rules:

- tsParticles is the only production particle runtime in Web2D V1;
- FXDeck public authoring data must not expose tsParticles-specific keys;
- capability/plugin registration happens before the persistent container is created;
- `play()` must never dynamically register particle plugins;
- normal effect playback reuses the persistent container;
- Particlr/Pixi reference runtimes are not part of the production dependency graph;
- Three.js/3D code does not belong in this cycle.

## Current development bundle

`create-web2d-runtime.js` still deliberately uses `loadFull(tsParticles)` while real schema-driven hero effects establish the actual feature set. Session 6 replaces it with a measured custom/slim build.

## Effect paths

Three legacy baseline definitions remain temporarily for regression:

- Heavy Impact v1
- Explosion v1
- Fireball v1

Normal new effects use Schema V1. `Dust Puff` is the first real effect on that path and introduces no effect-specific runtime bridge.

## Asset boundary

Production effect data may use stable asset ids. `FXDeckAssetManager` resolves/prefetches them before the Web2D compiler receives hydrated runtime asset records.

The backend does not own provenance or authoring metadata; it receives only the URL/dimensions needed to render.

## Lifecycle invariant

A Web2D runtime instance owns exactly one particle container for its lifetime. Repeated `FXDeck.play()` / `stop()` calls may create effect-owned emitters/groups/visual handles, but must not replace the particle container.

The canonical Runtime Lab keeps Session 1/2 regression gates and P4.3 adds an asset/Dust Puff technical gate checking:

- manifest resolution,
- cold load then warm cache hit,
- schema-driven Dust Puff playback,
- complete cleanup,
- stable persistent container identity,
- exactly one particle canvas.

No effect-specific bridge scripts should return to the canonical path.
