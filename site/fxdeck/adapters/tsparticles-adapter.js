import { CoordinateAdapter } from '../core/coordinate-adapter.js';

export class TsParticlesAdapter {
  constructor({ engine, stage, hostId, preload = [] }) {
    if (!engine) throw new Error('TsParticlesAdapter requires the tsParticles engine.');
    if (!stage) throw new Error('TsParticlesAdapter requires a stage element.');
    if (!hostId) throw new Error('TsParticlesAdapter requires a hostId.');

    this.engine = engine;
    this.stage = stage;
    this.hostId = hostId;
    this.preload = preload;
    this.container = null;
    this.coordinates = null;
    this.serial = 0;
    this.handles = new Map();
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

    this.coordinates = new CoordinateAdapter({
      stage: this.stage,
      getCanvasSize: () => this.container?.canvas?.size
    });

    return this;
  }

  async spawn(options, cssPosition) {
    this.#assertReady();
    const id = `fxdeck-emitter-${++this.serial}`;
    const position = this.coordinates.toCanvas(cssPosition);
    const instance = await this.container.addEmitter({ ...structuredClone(options), name: id }, position);

    const handle = {
      id,
      instance,
      move: (nextCssPosition) => this.move(id, nextCssPosition),
      stop: () => this.stop(id),
      isAlive: () => this.isAlive(id)
    };

    this.handles.set(id, handle);
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

  sweep() {
    this.#assertReady();
    for (const id of [...this.handles.keys()]) {
      if (!this.container.getEmitter(id)) this.handles.delete(id);
    }
  }

  clear() {
    if (!this.container) return;
    for (const id of [...this.handles.keys()]) this.stop(id);
    this.container.particles?.clear?.();
  }

  resize() {
    this.container?.canvas?.resize?.();
  }

  getStats() {
    if (!this.container) return { particles: 0, emitters: 0, scale: { x: 1, y: 1 } };
    this.sweep();
    return {
      particles: Number(this.container.particles?.count ?? this.container.particles?.array?.length ?? 0),
      emitters: this.handles.size,
      scale: this.coordinates.getScale()
    };
  }

  #assertReady() {
    if (!this.container || !this.coordinates) throw new Error('TsParticlesAdapter is not initialized.');
  }
}
