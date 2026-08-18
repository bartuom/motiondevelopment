import { normalizeDirection } from './fxdeck.js?v=p3.6.0';

const INSTALL_KEY = Symbol.for('fxdeck.live-update.v1');

function normalizeUpdateParams(current, patch = {}) {
  const next = { ...current, ...patch };

  if ('position' in patch) {
    const position = patch.position;
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      throw new TypeError('FXDeck.update() position must be { x, y } in CSS/gameplay pixels.');
    }
    next.position = { x: position.x, y: position.y };
  } else {
    next.position = { ...current.position };
  }

  if ('direction' in patch) {
    const normalized = normalizeDirection(patch.direction);
    next.direction = normalized.vector;
    next.directionDegrees = normalized.degrees;
  } else {
    next.direction = { ...current.direction };
    next.directionDegrees = current.directionDegrees;
  }

  if ('intensity' in patch) {
    next.intensity = Number.isFinite(patch.intensity) ? Math.max(0, patch.intensity) : current.intensity;
  }

  return next;
}

export function installLiveUpdate(fx) {
  if (!fx?.play || !fx?.instances) throw new Error('installLiveUpdate() requires an FXDeckRuntime instance.');
  if (fx[INSTALL_KEY]) return fx[INSTALL_KEY];

  const handlers = new WeakMap();
  const pending = new WeakMap();
  const originalPlay = fx.play.bind(fx);

  fx.play = function playWithLiveUpdate(id, params = {}) {
    const instance = originalPlay(id, params);

    instance.setUpdateHandler = (handler) => {
      if (typeof handler !== 'function') throw new TypeError('EffectInstance.setUpdateHandler() requires a function.');
      if (instance.state !== 'playing') return instance;
      handlers.set(instance, handler);

      const queued = pending.get(instance);
      if (queued) {
        pending.delete(instance);
        handler(instance.params, queued.patch);
      }
      return instance;
    };

    return instance;
  };

  fx.update = function update(instanceOrId, patch = {}) {
    const instance = typeof instanceOrId === 'string' ? fx.instances.get(instanceOrId) : instanceOrId;
    if (!instance || instance.state !== 'playing') return false;

    const next = normalizeUpdateParams(instance.params, patch);
    instance.params = next;

    const handler = handlers.get(instance);
    if (!handler) {
      const queued = pending.get(instance)?.patch ?? {};
      pending.set(instance, {
        patch: {
          ...queued,
          ...structuredClone(patch)
        }
      });
      return instance;
    }

    handler(next, patch);
    return instance;
  };

  const api = {
    handlers,
    pending,
    update: fx.update.bind(fx)
  };

  fx[INSTALL_KEY] = api;
  return api;
}
