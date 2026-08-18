export class EffectInstance {
  constructor({ id, effectId, version, variant, params, onStop }) {
    this.id = id;
    this.effectId = effectId;
    this.version = version;
    this.variant = variant;
    this.params = params;
    this.state = 'playing';
    this.stopReason = null;
    this.error = null;
    this.ready = Promise.resolve(this);
    this.#onStop = onStop;
  }

  #cleanups = [];
  #timers = new Set();
  #onStop;

  addCleanup(fn) {
    if (typeof fn !== 'function') return fn;
    if (this.state !== 'playing') {
      fn();
      return fn;
    }
    this.#cleanups.push(fn);
    return fn;
  }

  timeout(fn, delayMs) {
    if (this.state !== 'playing') return null;
    const id = window.setTimeout(() => {
      this.#timers.delete(id);
      if (this.state === 'playing') fn();
    }, Math.max(0, delayMs));
    this.#timers.add(id);
    return id;
  }

  stop(reason = 'manual') {
    if (this.state === 'stopped') return;
    this.state = 'stopped';
    this.stopReason = reason;

    for (const timer of this.#timers) clearTimeout(timer);
    this.#timers.clear();

    for (let i = this.#cleanups.length - 1; i >= 0; i -= 1) {
      try { this.#cleanups[i](); } catch (error) { console.error(error); }
    }
    this.#cleanups.length = 0;
    this.#onStop?.(this);
  }
}
