import { assertValidEffectDefinition } from '../schema/validator.js?v=p4.3.0';
import { compileWeb2D } from './compiler.js?v=p4.3.0';

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

function scheduleLayer(instance, particles, layer, params) {
  const launch = async () => {
    if (instance.state !== 'playing') return null;
    const position = params.position;
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
        durationMs: compiled.durationMs
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
