import { FXDeckRuntime } from '../core/fxdeck.js?v=p4.6.0';
import { DomSpriteAdapter } from '../adapters/dom-sprite-adapter.js?v=p4.6.0';
import { TsParticlesAdapter } from '../adapters/tsparticles-adapter.js?v=p4.6.0';
import { registerHeavyImpact } from '../effects/heavy-impact.js?v=p4.6.0';
import { registerFireball } from '../effects/fireball.js?v=p4.6.0';
import { registerSchemaEffects } from './register-schema-effect.js?v=p4.6.0';

export const WEB2D_BUILD = 'P4.6.0';

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
  if (typeof globalThis.loadSlim !== 'function') {
    throw new Error('FXDeck Web2D requires the tsParticles slim loader.');
  }
  if (typeof globalThis.loadEmittersPlugin !== 'function') {
    throw new Error('FXDeck Web2D requires the emitters plugin loader.');
  }

  // P4.6 production trim: the accepted runtime set does not require Full,
  // ribbons or the motion plugin. Slim already supplies image/square shapes,
  // life/rotate updaters and interactivity; emitters are the only extra plugin.
  await globalThis.loadSlim(engine);
  await globalThis.loadEmittersPlugin(engine);
}

function registerInternalBaselineEffects(fx) {
  // Heavy Impact stays internal because the long-running topology regression
  // gate uses it. Fireball is retained because the user judged its projectile
  // motion useful. The old legacy Explosion is no longer registered here;
  // Session 6 loads the schema Explosion instead.
  registerHeavyImpact(fx);
  registerFireball(fx);
  return fx;
}

export async function createWeb2DRuntime({
  stage,
  particleHost,
  visualHost,
  burstMode = 'scheduled',
  schemaEffects = [],
  assetManager = null
} = {}) {
  requireElement(stage, 'stage');
  requireElement(particleHost, 'particleHost');
  requireElement(visualHost, 'visualHost');

  const engine = globalThis.tsParticles;
  await registerTsParticlesCapabilities(engine);

  if (assetManager) await assetManager.loadManifest();
  const resolvedSchemaEffects = schemaEffects.map((effect) => assetManager ? assetManager.hydrateEffect(effect) : structuredClone(effect));

  const fx = registerInternalBaselineEffects(new FXDeckRuntime());
  registerSchemaEffects(fx, resolvedSchemaEffects);

  const assetWarmup = assetManager
    ? await Promise.all(resolvedSchemaEffects.map((effect) => assetManager.prefetchEffect(effect)))
    : [];

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
    schemaEffects: structuredClone(resolvedSchemaEffects),
    assetManager,
    assetWarmup,
    backendBundle: 'slim+emitters',
    capabilities: Object.freeze({ ribbon: false, emitters: true, image: true, square: true, life: true, rotate: true }),

    async prefetchEffect(id) {
      if (!assetManager) return { effectId: id, requested: 0, coldLoads: 0, cacheHits: 0, durationMs: 0 };
      const { definition } = fx.resolve(id);
      return assetManager.prefetchEffect(definition.source ?? definition);
    },

    topology() {
      return {
        build: WEB2D_BUILD,
        engine,
        container: particles.container,
        persistentContainer,
        registeredEffects: fx.getStats().registeredEffects,
        schemaEffectCount: resolvedSchemaEffects.length,
        activeInstances: fx.getStats().activeInstances,
        particleCanvasCount: particleHost.querySelectorAll('canvas').length,
        cachedAssets: assetManager?.getStats?.().cachedAssets ?? 0,
        backendBundle: 'slim+emitters',
        ribbonCapability: false
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
