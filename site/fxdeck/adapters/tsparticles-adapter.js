import { CoordinateAdapter } from '../core/coordinate-adapter.js';

const BURST_MODES = new Set(['emitter', 'shared', 'scheduled']);

export class TsParticlesAdapter {
  constructor({
    engine,
    stage,
    hostId,
    preload = [],
    burstMode = 'scheduled',
    sharedFrameBudgetMs = 6,
    sharedChunkSize = 8,
    sharedImmediateCount = 8
  }) {
    if (!engine) throw new Error('TsParticlesAdapter requires the tsParticles engine.');
    if (!stage) throw new Error('TsParticlesAdapter requires a stage element.');
    if (!hostId) throw new Error('TsParticlesAdapter requires a hostId.');
    if (!BURST_MODES.has(burstMode)) throw new Error(`Unsupported burst mode: ${burstMode}`);

    this.engine = engine;
    this.stage = stage;
    this.hostId = hostId;
    this.preload = preload;
    this.container = null;
    this.coordinates = null;
    this.serial = 0;
    this.handles = new Map();
    this.sharedBursts = new Map();
    this.burstMode = burstMode;

    this.sharedFrameBudgetMs = Math.max(.5, Number(sharedFrameBudgetMs) || 6);
    this.sharedChunkSize = Math.max(1, Math.round(Number(sharedChunkSize) || 8));
    this.sharedImmediateCount = Math.max(0, Math.round(Number(sharedImmediateCount) || 0));
    this.sharedQueue = [];
    this.sharedSchedulerRaf = 0;
  }

  async init() {
    this.container = await this.engine.load({
      id: this.hostId,
      options: {
        fullScreen: { enable: false },
        background: { color: { value: 'transparent' } },
        detectRetina: true,
        fpsLimit: 60,
        pauseOnBlur: true,
        pauseOnOutsideViewport: false,
        preload: this.preload,
        particles: { number: { value: 0 } },
        emitters: []
      }
    });

    if (!this.container?.addEmitter || !this.container?.removeEmitter || !this.container?.getEmitter) {
      throw new Error('TsParticlesAdapter: emitter runtime API is unavailable.');
    }
    if (!this.container?.particles?.push || !this.container?.particles?.filter || !this.container?.particles?.remove) {
      throw new Error('TsParticlesAdapter: direct ParticlesManager runtime API is unavailable.');
    }

    this.coordinates = new CoordinateAdapter({
      stage: this.stage,
      getCanvasSize: () => this.container?.canvas?.size
    });

    return this;
  }

  setBurstMode(mode) {
    if (!BURST_MODES.has(mode)) throw new Error(`Unsupported burst mode: ${mode}`);
    this.burstMode = mode;
    return this.burstMode;
  }

  getBurstMode() {
    return this.burstMode;
  }

  /**
   * Semantic one-shot burst operation.
   * - scheduled: production default; shared persistent container plus one global frame-budgeted queue.
   * - emitter: tsParticles addEmitter(startCount), retained as baseline/reference and for explicit emitter use.
   * - shared: synchronous direct push into the persistent container, retained as a diagnostic reference.
   */
  async burst(options, cssPosition, { mode = this.burstMode } = {}) {
    if (mode === 'emitter') return this.spawn(options, cssPosition);
    if (mode === 'shared') return this.spawnSharedBurst(options, cssPosition);
    if (mode === 'scheduled') return this.spawnScheduledBurst(options, cssPosition);
    throw new Error(`Unsupported burst mode: ${mode}`);
  }

  async spawn(options, cssPosition) {
    this.#assertReady();
    const id = `fxdeck-emitter-${++this.serial}`;
    const position = this.coordinates.toCanvas(cssPosition);
    const instance = await this.container.addEmitter({ ...structuredClone(options), name: id }, position);

    const handle = {
      id,
      mode: 'emitter',
      instance,
      ready: Promise.resolve(),
      move: (nextCssPosition) => this.move(id, nextCssPosition),
      stop: () => this.stop(id),
      isAlive: () => this.isAlive(id)
    };

    handle.ready = Promise.resolve(handle);
    this.handles.set(id, handle);
    return handle;
  }

  async spawnSharedBurst(options, cssPosition) {
    this.#assertReady();

    const count = this.#burstCount(options);
    const id = `fxdeck-burst-${++this.serial}`;
    const position = this.coordinates.toCanvas(cssPosition);
    const particleOptions = structuredClone(options.particles);

    this.container.particles.push(count, position, particleOptions, id);

    const handle = {
      id,
      mode: 'shared',
      count,
      remaining: 0,
      pending: false,
      ready: null,
      move: () => false,
      stop: () => this.stopSharedBurst(id),
      isAlive: () => this.isSharedBurstAlive(id)
    };

    handle.ready = Promise.resolve(handle);
    this.sharedBursts.set(id, handle);
    return handle;
  }

  async spawnScheduledBurst(options, cssPosition) {
    this.#assertReady();

    const count = this.#burstCount(options);
    const id = `fxdeck-scheduled-${++this.serial}`;
    const position = this.coordinates.toCanvas(cssPosition);
    const particleOptions = structuredClone(options.particles);

    let resolveReady;
    const ready = new Promise((resolve) => { resolveReady = resolve; });
    const immediateCount = Math.min(count, this.sharedImmediateCount);
    const remaining = count - immediateCount;

    const handle = {
      id,
      mode: 'scheduled',
      count,
      remaining,
      pending: remaining > 0,
      ready,
      _resolveReady: resolveReady,
      move: () => false,
      stop: () => this.stopSharedBurst(id),
      isAlive: () => this.isSharedBurstAlive(id)
    };

    this.sharedBursts.set(id, handle);

    // Seed a few particles immediately so a gameplay hit still responds in the
    // triggering frame, then place the rest into the global fair scheduler.
    if (immediateCount > 0) {
      this.container.particles.push(immediateCount, position, particleOptions, id);
    }

    if (remaining > 0) {
      this.sharedQueue.push({ id, position, particleOptions, remaining, cancelled: false });
      this.#scheduleSharedDrain();
    } else {
      handle.pending = false;
      resolveReady(handle);
    }

    return handle;
  }

  move(id, cssPosition) {
    this.#assertReady();
    const emitter = this.container.getEmitter(id);
    if (!emitter?.position) return false;
    const point = this.coordinates.toCanvas(cssPosition);
    emitter.position.x = point.x;
    emitter.position.y = point.y;
    return true;
  }

  stop(id) {
    this.#assertReady();
    try { this.container.removeEmitter(id); } catch (error) { console.warn(error); }
    this.handles.delete(id);
  }

  isAlive(id) {
    this.#assertReady();
    return Boolean(this.container.getEmitter(id));
  }

  stopSharedBurst(id) {
    this.#assertReady();

    const handle = this.sharedBursts.get(id);
    if (handle) {
      handle.pending = false;
      handle.remaining = 0;
      handle._resolveReady?.(handle);
      handle._resolveReady = null;
    }

    for (const job of this.sharedQueue) {
      if (job.id === id) job.cancelled = true;
    }
    this.sharedQueue = this.sharedQueue.filter((job) => job.id !== id);

    const manager = this.container.particles;
    const groupParticles = manager.filter((particle) => particle.group === id);
    for (const particle of groupParticles) {
      try { manager.remove(particle, id, true); } catch (error) { console.warn(error); }
    }
    this.sharedBursts.delete(id);
  }

  isSharedBurstAlive(id) {
    this.#assertReady();
    const handle = this.sharedBursts.get(id);
    if (handle?.pending) return true;
    return Boolean(this.container.particles.find((particle) => particle.group === id));
  }

  sweep() {
    this.#assertReady();
    for (const id of [...this.handles.keys()]) {
      if (!this.container.getEmitter(id)) this.handles.delete(id);
    }
    for (const [id, handle] of [...this.sharedBursts.entries()]) {
      if (handle.pending) continue;
      if (!this.container.particles.find((particle) => particle.group === id)) this.sharedBursts.delete(id);
    }
  }

  clear() {
    if (!this.container) return;

    if (this.sharedSchedulerRaf) cancelAnimationFrame(this.sharedSchedulerRaf);
    this.sharedSchedulerRaf = 0;
    this.sharedQueue = [];

    for (const id of [...this.handles.keys()]) this.stop(id);
    for (const id of [...this.sharedBursts.keys()]) this.stopSharedBurst(id);
    this.container.particles?.clear?.();
  }

  resize() {
    this.container?.canvas?.resize?.();
  }

  getStats() {
    if (!this.container) {
      return {
        particles: 0,
        emitters: 0,
        burstGroups: 0,
        queuedBursts: 0,
        queuedParticles: 0,
        burstMode: this.burstMode,
        schedulerBudgetMs: this.sharedFrameBudgetMs,
        scale: { x: 1, y: 1 }
      };
    }

    this.sweep();
    return {
      particles: Number(this.container.particles?.count ?? this.container.particles?.array?.length ?? 0),
      emitters: this.handles.size,
      burstGroups: this.sharedBursts.size,
      queuedBursts: this.sharedQueue.length,
      queuedParticles: this.sharedQueue.reduce((sum, job) => sum + Math.max(0, job.remaining), 0),
      burstMode: this.burstMode,
      schedulerBudgetMs: this.sharedFrameBudgetMs,
      schedulerChunkSize: this.sharedChunkSize,
      schedulerImmediateCount: this.sharedImmediateCount,
      scale: this.coordinates.getScale()
    };
  }

  #burstCount(options) {
    const count = Math.max(0, Math.round(Number(options?.startCount ?? 0)));
    if (!count) throw new Error('TsParticlesAdapter shared burst requires a positive startCount.');
    if (!options?.particles) throw new Error('TsParticlesAdapter shared burst requires particle options.');
    return count;
  }

  #scheduleSharedDrain() {
    if (this.sharedSchedulerRaf || !this.sharedQueue.length) return;
    this.sharedSchedulerRaf = requestAnimationFrame(() => {
      this.sharedSchedulerRaf = 0;
      this.#drainSharedQueue();
    });
  }

  #drainSharedQueue() {
    if (!this.container || !this.sharedQueue.length) return;

    const frameStartedAt = performance.now();
    let operations = 0;

    while (this.sharedQueue.length) {
      if (operations > 0 && performance.now() - frameStartedAt >= this.sharedFrameBudgetMs) break;

      // Round-robin: each active burst receives one chunk before another chunk
      // from the same burst, so one large request cannot starve newer impacts.
      const job = this.sharedQueue.shift();
      if (!job || job.cancelled || !this.sharedBursts.has(job.id)) continue;

      const chunk = Math.min(job.remaining, this.sharedChunkSize);
      if (chunk > 0) {
        this.container.particles.push(chunk, job.position, job.particleOptions, job.id);
        job.remaining -= chunk;
      }

      const handle = this.sharedBursts.get(job.id);
      if (!handle) continue;

      handle.remaining = Math.max(0, job.remaining);
      if (job.remaining > 0) {
        this.sharedQueue.push(job);
      } else {
        handle.pending = false;
        handle._resolveReady?.(handle);
        handle._resolveReady = null;
      }

      operations += 1;
    }

    if (this.sharedQueue.length) this.#scheduleSharedDrain();
  }

  #assertReady() {
    if (!this.container || !this.coordinates) throw new Error('TsParticlesAdapter is not initialized.');
  }
}
