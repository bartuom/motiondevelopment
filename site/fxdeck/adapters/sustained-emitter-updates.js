const INSTALL_KEY = Symbol.for('fxdeck.sustained-emitter-updates.v1');

function resolveId(handleOrId) {
  if (typeof handleOrId === 'string') return handleOrId;
  return handleOrId?.id ?? null;
}

export function installSustainedEmitterUpdates(adapter) {
  if (!adapter?.container?.getEmitter || typeof adapter.move !== 'function') {
    throw new Error('installSustainedEmitterUpdates() requires a ready TsParticlesAdapter.');
  }
  if (adapter[INSTALL_KEY]) return adapter[INSTALL_KEY];

  adapter.updateEmitter = (handleOrId, patch = {}) => {
    const id = resolveId(handleOrId);
    if (!id) return false;

    const emitter = adapter.container.getEmitter(id);
    if (!emitter) return false;

    if (patch.position) adapter.move(id, patch.position);

    if (Number.isFinite(patch.rateQuantity)) {
      emitter.options.rate.quantity = Math.max(0, patch.rateQuantity);
    }

    return true;
  };

  const api = {
    updateEmitter: adapter.updateEmitter.bind(adapter)
  };

  adapter[INSTALL_KEY] = api;
  return api;
}
