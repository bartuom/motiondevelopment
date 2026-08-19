import { FXDeckRuntime } from '../core/fxdeck.js?v=p4.4.1';
import { DomSpriteAdapter } from '../adapters/dom-sprite-adapter.js?v=p4.4.1';
import { TsParticlesAdapter } from '../adapters/tsparticles-adapter.js?v=p4.4.1';
import { registerHeavyImpact } from '../effects/heavy-impact.js?v=p4.4.1';
import { registerExplosion } from '../effects/explosion.js?v=p4.4.1';
import { registerFireball } from '../effects/fireball.js?v=p4.4.1';
import { registerSchemaEffects } from './register-schema-effect.js?v=p4.4.1';

export const WEB2D_BUILD = 'P4.4.1';

const MOTION_PLUGIN_SRC = 'https://cdn.jsdelivr.net/npm/@tsparticles/plugin-motion@4.3.2/tsparticles.plugin.motion.min.js';
const RIBBON_SHAPE_SRC = 'https://cdn.jsdelivr.net/npm/@tsparticles/shape-ribbon@4.3.2/tsparticles.shape.ribbon.min.js';

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
    script.dataset.fxdeckCapability = 'true';
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => reject(new Error(`FXDeck Web2D failed to load capability script: ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function registerTsParticlesCapabilities(engine) {
  if (!engine) throw new Error('FXDeck Web2D requires the tsParticles engine.');
  if (typeof globalThis.loadFull !== 'function') {
    throw new Error('FXDeck Web2D requires loadFull() during the prototype phase.');
  }

  await globalThis.loadFull(engine);

  // Session 4 visual review proved Goal Celebration needs a real ribbon/trail shape.
  // These capability bundles are loaded and registered during boot, before the
  // persistent container exists. play() never performs plugin registration.
  await loadScriptOnce(MOTION_PLUGIN_SRC, () => typeof globalThis.loadMotionPlugin === 'function');
  await loadScriptOnce(RIBBON_SHAPE_SRC, () => typeof globalThis.loadRibbonShape === 'function');

  if (typeof globalThis.loadMotionPlugin !== 'function' || typeof globalThis.loadRibbonShape !== 'function') {
    throw new Error('FXDeck Web2D ribbon capability globals are unavailable after preload.');
  }

  await globalThis.loadMotionPlugin(engine);
  await globalThis.loadRibbonShape(engine);
}

function registerLegacyBaselineEffects(fx) {
  registerHeavyImpact(fx);
  registerExplosion(fx);
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

  const fx = registerLegacyBaselineEffects(new FXDeckRuntime());
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
    capabilities: Object.freeze({ ribbon: true }),

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
        ribbonCapability: true
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
