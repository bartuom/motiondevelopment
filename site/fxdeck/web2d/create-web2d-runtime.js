import { FXDeckRuntime } from '../core/fxdeck.js?v=p4.1.0';
import { DomSpriteAdapter } from '../adapters/dom-sprite-adapter.js?v=p4.1.0';
import { TsParticlesAdapter } from '../adapters/tsparticles-adapter.js?v=p4.1.0';
import { registerHeavyImpact } from '../effects/heavy-impact.js?v=p4.1.0';
import { registerExplosion } from '../effects/explosion.js?v=p4.1.0';
import { registerFireball } from '../effects/fireball.js?v=p4.1.0';

export const WEB2D_BUILD = 'P4.1.0';

function requireElement(value, label) {
  if (!(value instanceof Element)) throw new TypeError(`${label} must be a DOM Element.`);
  return value;
}

function resolveHostId(host) {
  if (!host.id) throw new Error('FXDeck Web2D particle host requires a stable id.');
  return host.id;
}

async function registerTsParticlesCapabilities(engine) {
  if (!engine) throw new Error('FXDeck Web2D requires the tsParticles engine.');
  if (typeof globalThis.loadFull !== 'function') {
    throw new Error('FXDeck Web2D requires loadFull() during the prototype phase.');
  }

  // Session 1 intentionally keeps the full bundle while the actual capability
  // set is discovered. The important invariant is ordering: all capabilities
  // are registered once, before the persistent container is created.
  await globalThis.loadFull(engine);
}

function registerLegacyBaselineEffects(fx) {
  // P4.1 does not migrate effect authoring yet. Only the three proven baseline
  // effects are retained in the canonical lab so rejected P3 bridge effects do
  // not leak back into the new runtime path.
  registerHeavyImpact(fx);
  registerExplosion(fx);
  registerFireball(fx);
  return fx;
}

export async function createWeb2DRuntime({
  stage,
  particleHost,
  visualHost,
  burstMode = 'scheduled'
} = {}) {
  requireElement(stage, 'stage');
  requireElement(particleHost, 'particleHost');
  requireElement(visualHost, 'visualHost');

  const engine = globalThis.tsParticles;
  await registerTsParticlesCapabilities(engine);

  const fx = registerLegacyBaselineEffects(new FXDeckRuntime());
  const particlePreload = fx
    .getAssets({ target: 'particles' })
    .map(({ target, ...asset }) => asset);

  const particles = await new TsParticlesAdapter({
    engine,
    stage,
    hostId: resolveHostId(particleHost),
    preload: particlePreload,
    burstMode,
    sharedFrameBudgetMs: 6,
    sharedChunkSize: 8,
    sharedImmediateCount: 8,
    backpressureMedium: 96,
    backpressureHigh: 160,
    backpressureCritical: 240
  }).init();

  const visuals = new DomSpriteAdapter({ host: visualHost });

  fx.setAdapter('particles', particles);
  fx.setAdapter('visuals', visuals);

  const persistentContainer = particles.container;
  if (!persistentContainer) throw new Error('FXDeck Web2D failed to create the persistent tsParticles container.');

  let disposed = false;

  const runtime = {
    build: WEB2D_BUILD,
    fx,
    engine,
    adapters: { particles, visuals },
    persistentContainer,
    particlePreload,

    topology() {
      return {
        build: WEB2D_BUILD,
        engine,
        container: particles.container,
        persistentContainer,
        registeredEffects: fx.getStats().registeredEffects,
        activeInstances: fx.getStats().activeInstances,
        particleCanvasCount: particleHost.querySelectorAll('canvas').length
      };
    },

    assertTopology() {
      if (particles.container !== persistentContainer) {
        throw new Error('FXDeck Web2D topology violation: particle container identity changed.');
      }
      const canvasCount = particleHost.querySelectorAll('canvas').length;
      if (canvasCount !== 1) {
        throw new Error(`FXDeck Web2D topology violation: expected 1 particle canvas, found ${canvasCount}.`);
      }
      return true;
    },

    resize() {
      particles.resize();
    },

    dispose(reason = 'web2d-dispose') {
      if (disposed) return;
      disposed = true;
      fx.stopAll(reason);
      particles.container?.destroy?.();
    }
  };

  runtime.assertTopology();
  return runtime;
}
