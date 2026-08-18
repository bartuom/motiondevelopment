import { EffectInstance } from './effect-instance.js';

export class FXDeckRuntime {
  constructor({ adapters = {} } = {}) {
    this.adapters = adapters;
    this.registry = new Map();
    this.defaults = new Map();
    this.instances = new Map();
    this.serial = 0;
  }

  register(definition) {
    const id = definition?.id;
    const version = definition?.version ?? 'v1';
    const variant = definition?.variant ?? 'default';

    if (!id || typeof id !== 'string') throw new TypeError('FXDeck.register() requires definition.id.');
    if (typeof definition.play !== 'function') throw new TypeError(`FXDeck effect "${id}" requires play(ctx).`);

    if (!this.registry.has(id)) this.registry.set(id, new Map());
    const versions = this.registry.get(id);
    if (!versions.has(version)) versions.set(version, new Map());
    versions.get(version).set(variant, { ...definition, id, version, variant });

    if (definition.default === true || !this.defaults.has(id)) {
      this.defaults.set(id, { version, variant });
    }

    return this;
  }

  resolve(id, { version, variant } = {}) {
    const versions = this.registry.get(id);
    if (!versions) throw new Error(`FXDeck effect "${id}" is not registered.`);

    const defaults = this.defaults.get(id) ?? {};
    const resolvedVersion = version ?? defaults.version ?? versions.keys().next().value;
    const variants = versions.get(resolvedVersion);
    if (!variants) throw new Error(`FXDeck effect "${id}" has no version "${resolvedVersion}".`);

    const resolvedVariant = variant ?? (resolvedVersion === defaults.version ? defaults.variant : null) ?? (variants.has('default') ? 'default' : variants.keys().next().value);
    const definition = variants.get(resolvedVariant);
    if (!definition) throw new Error(`FXDeck effect "${id}" ${resolvedVersion} has no variant "${resolvedVariant}".`);

    return { definition, version: resolvedVersion, variant: resolvedVariant };
  }

  play(id, params = {}) {
    const { definition, version, variant } = this.resolve(id, params);
    const normalized = this.#normalizeParams(params);
    const instanceId = `fx-${++this.serial}`;

    const instance = new EffectInstance({
      id: instanceId,
      effectId: id,
      version,
      variant,
      params: normalized,
      onStop: (stopped) => this.instances.delete(stopped.id)
    });

    this.instances.set(instance.id, instance);

    const context = {
      fx: this,
      instance,
      params: normalized,
      version,
      variant,
      adapters: this.adapters,
      particles: this.adapters.particles
    };

    instance.ready = Promise.resolve()
      .then(() => definition.play(context))
      .then((cleanup) => {
        if (typeof cleanup === 'function') instance.addCleanup(cleanup);
        return instance;
      })
      .catch((error) => {
        instance.error = error;
        instance.stop('error');
        throw error;
      });

    return instance;
  }

  stop(instanceOrId, reason = 'manual') {
    const instance = typeof instanceOrId === 'string' ? this.instances.get(instanceOrId) : instanceOrId;
    instance?.stop(reason);
  }

  stopAll(reason = 'stopAll') {
    for (const instance of [...this.instances.values()]) instance.stop(reason);
    for (const adapter of Object.values(this.adapters)) adapter?.clear?.();
  }

  getStats() {
    return {
      registeredEffects: this.registry.size,
      activeInstances: this.instances.size,
      particles: this.adapters.particles?.getStats?.() ?? null
    };
  }

  #normalizeParams(params) {
    const position = params.position ?? { x: 0, y: 0 };
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      throw new TypeError('FXDeck.play() requires position { x, y } in CSS/gameplay pixels.');
    }

    return {
      ...params,
      position: { x: position.x, y: position.y },
      direction: Number.isFinite(params.direction) ? params.direction : 0,
      intensity: Number.isFinite(params.intensity) ? Math.max(0, params.intensity) : 1
    };
  }
}
