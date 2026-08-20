import { assertValidEffectDefinition } from '../schema/validator.js?v=p4.6.0';
import { compileWeb2D } from './compiler.js?v=p4.6.0';

function toRuntimeAssets(effect) {
  return (effect.assets ?? []).map((asset) => ({
    target: 'particles',
    src: asset.src,
    width: asset.width,
    height: asset.height
  }));
}

function attachHandle(instance, handle) {
  if (!handle) return null;
  if (instance.state !== 'playing') {
    handle.stop?.();
    return null;
  }
  instance.addCleanup(() => handle.stop?.());
  return handle;
}

function directionDegrees(params) {
  const value = Number(params?.directionDegrees ?? params?.direction ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function anchorBasePosition(basePosition, anchor, stage) {
  if (anchor === 'stage-top-center' && stage) {
    return {
      x: Math.max(1, Number(stage.clientWidth ?? 0)) * 0.5,
      y: 0
    };
  }
  return basePosition ?? { x: 0, y: 0 };
}

function resolveLayerPosition(basePosition, origin = {}, params = {}, stage = null, anchor = 'event') {
  const base = anchorBasePosition(basePosition, anchor, stage);
  let x = Number(origin.x ?? 0);
  let y = Number(origin.y ?? 0);

  if (origin.rotateWithDirection) {
    const radians = directionDegrees(params) * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    x = rx;
    y = ry;
  }

  const resolved = {
    x: Number(base.x ?? 0) + x,
    y: Number(base.y ?? 0) + y
  };

  if (stage) {
    const margin = anchor === 'stage-top-center' ? 0 : 4;
    const width = Math.max(1, Number(stage.clientWidth ?? 0));
    const height = Math.max(1, Number(stage.clientHeight ?? 0));
    resolved.x = clamp(resolved.x, margin, Math.max(margin, width - margin));
    resolved.y = clamp(resolved.y, margin, Math.max(margin, height - margin));
  }

  return resolved;
}

function scheduleLayer(instance, particles, layer, params) {
  const launch = async () => {
    if (instance.state !== 'playing') return null;
    const position = resolveLayerPosition(params.position, layer.origin, params, particles.stage, layer.anchor);
    const handle = layer.spawnMode === 'burst'
      ? await particles.burst(layer.emitter, position, { priority: layer.priority })
      : await particles.spawn(layer.emitter, position);
    return attachHandle(instance, handle);
  };

  if (layer.delayMs > 0) {
    instance.timeout(() => {
      launch().catch((error) => {
        instance.error = error;
        instance.stop('error');
        console.error(error);
      });
    }, layer.delayMs);
    return Promise.resolve(null);
  }

  return launch();
}

export function createSchemaEffectDefinition(effect, compilerOptions) {
  assertValidEffectDefinition(effect, compilerOptions);
  const source = structuredClone(effect);

  return {
    id: source.id,
    version: 'v1',
    variant: 'default',
    default: true,
    label: source.label ?? source.id,
    summary: `FXDeck Schema V${source.schemaVersion} data-driven effect`,
    schemaDriven: true,
    source: structuredClone(source),
    assets: toRuntimeAssets(source),

    async play({ params, particles, instance }) {
      if (!particles) throw new Error(`FXD_RUNTIME_01: schema effect ${source.id} requires particles adapter`);
      const compiled = compileWeb2D(source, params, compilerOptions);
      instance.resolved = {
        schemaDriven: true,
        schemaVersion: compiled.schemaVersion,
        compiledLayerCount: compiled.layers.length,
        durationMs: compiled.durationMs,
        quality: compiled.quality
      };

      const immediate = compiled.layers.map((layer) => scheduleLayer(instance, particles, layer, params));
      instance.timeout(() => instance.stop('completed'), compiled.durationMs);
      await Promise.all(immediate);
    }
  };
}

export function registerSchemaEffects(fx, effects, compilerOptions) {
  if (!Array.isArray(effects)) throw new TypeError('FXD_RUNTIME_00: effects must be an array');
  for (const effect of effects) fx.register(createSchemaEffectDefinition(effect, compilerOptions));
  return fx;
}
