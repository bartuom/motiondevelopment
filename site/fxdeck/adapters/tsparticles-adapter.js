import { CoordinateAdapter } from '../core/coordinate-adapter.js';

const BURST_MODES = new Set(['emitter', 'shared']);

export class TsParticlesAdapter {
  constructor({ engine, stage, hostId, preload = [], burstMode = 'emitter' }) {
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
   * One-shot burst abstraction discovered in P2.
   * - emitter: existing tsParticles addEmitter(startCount) path.
   * - shared: pushes particles directly into the persistent container and groups
   *   them by handle id so one FXDeck instance can still clean up only its own burst.
   */
  async burst(options, cssPosition, { mode = this.burstMode } = {}) {
    if (mode === 'emitter') return this.spawn(options, cssPosition);
    if (mode === 'shared') return this.spawnSharedBurst(options, cssPosition);
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
      move: (nextCssPosition) => this.move(id, nextCssPosition),
      stop: () => this.stop(id),
      isAlive: () => this.isAlive(id)
    };

    this.handles.set(id, handle);
    return handle;
  }

  async spawnSharedBurst(options, cssPosition) {
    this.#assertReady();

    const count = Math.max(0, Math.round(Number(options?.startCount ?? 0)));
    if (!count) throw new Error('TsParticlesAdapter shared burst requires a positive startCount.');
    if (!options?.particles) throw new Error('TsParticlesAdapter shared burst requires particle options.');

    const id = `fxdeck-burst-${++this.serial}`;
    const position = this.coordinates.toCanvas(cssPosition);
    const particleOptions = structuredClone(options.particles);

    // ParticlesManager.push is the shared-container equivalent of an emission point:
    // same persistent canvas/container, arbitrary runtime position/options, no emitter object.
    this.container.particles.push(count, position, particleOptions, id);

    const handle = {
      id,
      mode: 'shared',
      count,
      move: () => false,
      stop: () => this.stopSharedBurst(id),
      isAlive: () => this.isSharedBurstAlive(id)
    };

    this.sharedBursts.set(id, handle);
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
    const manager = this.container.particles;
    const groupParticles = manager.filter((particle) => particle.group === id);
    for (const particle of groupParticles) {
      try { manager.remove(particle, id, true); } catch (error) { console.warn(error); }
    }
    this.sharedBursts.delete(id);
  }

  isSharedBurstAlive(id) {
    this.#assertReady();
    return Boolean(this.container.particles.find((particle) => particle.group === id));
  }

  sweep() {
    this.#assertReady();
    for (const id of [...this.handles.keys()]) {
      if (!this.container.getEmitter(id)) this.handles.delete(id);
    }
    for (const id of [...this.sharedBursts.keys()]) {
      if (!this.container.particles.find((particle) => particle.group === id)) this.sharedBursts.delete(id);
    }
  }

  clear() {
    if (!this.container) return;
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
        burstMode: this.burstMode,
        scale: { x: 1, y: 1 }
      };
    }
    this.sweep();
    return {
      particles: Number(this.container.particles?.count ?? this.container.particles?.array?.length ?? 0),
      emitters: this.handles.size,
      burstGroups: this.sharedBursts.size,
      burstMode: this.burstMode,
      scale: this.coordinates.getScale()
    };
  }

  #assertReady() {
    if (!this.container || !this.coordinates) throw new Error('TsParticlesAdapter is not initialized.');
  }
}
