import { FXDeckRuntime } from '../core/fxdeck.js?v=p4.6.1';
import { DomSpriteAdapter } from '../adapters/dom-sprite-adapter.js?v=p4.6.1';
import { TsParticlesAdapter } from '../adapters/tsparticles-adapter.js?v=p4.6.1';
import { registerHeavyImpact } from '../effects/heavy-impact.js?v=p4.6.1';
import { registerFireball } from '../effects/fireball.js?v=p4.6.1';
import { registerSchemaEffects } from './register-schema-effect.js?v=p4.6.1';

export const WEB2D_BUILD = 'P4.6.1';
const FULL_BUNDLE_SRC = 'https://cdn.jsdelivr.net/npm/tsparticles@4.3.2/tsparticles.bundle.min.js';

function requireElement(value, label) {
  if (!(value instanceof Element)) throw new TypeError(`${label} must be a DOM Element.`);
  return value;
}

function resolveHostId(host) {
  if (!host.id) throw new Error('FXDeck Web2D particle host requires a stable id.');
  return host.id;
}

async function loadScriptOnce(src, readyCheck) {
  if (readyCheck()) return;
  const existing = [...document.scripts].find((script) => script.src === src);
  if (existing) {
    if (readyCheck()) return;
    await new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
    return;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.fxdeckFallback = 'full';
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => reject(new Error(`FXDeck Web2D failed to load fallback script: ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function registerTsParticlesCapabilities(engine) {
  if (!engine) throw new Error('FXDeck Web2D requires the tsParticles engine.');

  if (typeof globalThis.loadSlim === 'function' && typeof globalThis.loadEmittersPlugin === 'function') {
    await globalThis.loadSlim(engine);
    await globalThis.loadEmittersPlugin(engine);
    return 'slim+emitters';
  }

  // P4.6.0 proved that the CDN emitters loader is not reliable in the current
  // GitHub Pages path. Recover the canonical lab first instead of leaving the
  // product broken. Session 6 slimming stays an optimization experiment until
  // its exact modular loader path is browser-proven.
  await loadScriptOnce(FULL_BUNDLE_SRC, () => typeof globalThis.loadFull === 'function');
  if (typeof globalThis.loadFull !== 'function') {
    throw new Error('FXDeck Web2D recovery failed: full tsParticles loader is unavailable.');
  }
  await globalThis.loadFull(engine);
  return 'full-fallback';
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
  const backendBundle = await registerTsParticlesCapabilities(engine);

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
    backendBundle,
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
        backendBundle,
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
