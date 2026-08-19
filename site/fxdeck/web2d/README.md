# FXDeck Web2D backend boundary

Build: **P4.1.0 / Session 1**

This directory is the canonical production boundary between FXDeck Core and the current 2D web renderer.

## Contract

```text
FXDeck Core
  ↓
Web2D backend boundary
  ↓
TsParticlesAdapter
  ↓
one persistent transparent tsParticles container
```

Rules:

- tsParticles is the only production particle runtime in Web2D V1.
- FXDeck public authoring data must not expose tsParticles-specific keys.
- capability/plugin registration happens before the persistent container is created.
- `play()` must never dynamically register particle plugins.
- normal effect playback reuses the persistent container.
- Particlr/Pixi reference runtimes are not part of the production dependency graph.
- Three.js/3D code does not belong in this cycle.

## Session 1 implementation

`create-web2d-runtime.js` deliberately keeps `loadFull(tsParticles)` for the reset phase. This is temporary. Session 6 replaces the full prototype bundle with a measured custom capability build after the schema-driven hero effects prove which features are actually required.

The canonical Runtime Lab registers only the three legacy baseline effects directly:

- Heavy Impact v1
- Explosion v1
- Fireball v1

Rejected/experimental P3 effects are not loaded into the P4 canonical lab. They remain available through `legacy-p3.15` and Git history.

## Lifecycle invariant

A Web2D runtime instance owns exactly one particle container for its lifetime. Repeated `FXDeck.play()` / `stop()` calls may create effect-owned emitters/groups/visual handles, but must not replace the particle container.

The canonical lab exposes:

```js
FXDeckLab.topology()
FXDeckLab.runSession1Gate()
```

The Session 1 gate checks:

- authoritative bootstrap count is exactly one,
- tsParticles engine identity is stable,
- persistent container identity is stable,
- exactly one particle canvas exists,
- repeated play/stop cycles leave zero instances/particles/emitters/groups/queued particles.

## Next boundary change

Session 2 adds a schema/compiler layer **above** this backend:

```text
Effect JSON
  ↓
structural + semantic validation
  ↓
compileWeb2D(effect)
  ↓
this backend
```

No effect-specific bridge scripts should return to the canonical path.
