import { burstTracked, runHook, scheduleAsync } from './effect-utils.js?v=p3.6.0';

const EXPLOSION_SPEC = {
  label: 'Explosion',
  revision: 'P3.6 effect-owned assets / v1',
  summary: 'Directional gameplay explosion composed from hero core/fireball, sparks, debris and smoke on the shared runtime path.',
  duration: 760,
  timings: {
    flash: 0,
    core: 0,
    fireball: 0,
    sparks: 8,
    debris: 20,
    smoke: 54,
    screenKick: 26
  },
  core: {
    baseCount: 1,
    size: { min: 58, max: 76 },
    life: { min: .24, max: .34 }
  },
  fireball: {
    baseCount: 18,
    speed: { min: 2.2, max: 7.4 },
    size: { min: 10, max: 24 },
    life: { min: .22, max: .42 }
  },
  sparks: {
    baseCount: 28,
    speed: { min: 11, max: 26 },
    size: { min: 5, max: 11 },
    life: { min: .22, max: .46 },
    spread: 230
  },
  debris: {
    baseCount: 14,
    speed: { min: 5, max: 12 },
    size: { min: 2, max: 5 },
    life: { min: .34, max: .64 },
    spread: 190
  },
  smoke: {
    baseCount: 12,
    speed: { min: .8, max: 2.8 },
    size: { min: 14, max: 30 },
    life: { min: .55, max: .95 },
    spread: 100
  }
};

const EXPLOSION_ASSETS = [
  { target: 'particles', src: './assets/fxdeck-explosion-core.svg', width: 128, height: 128 },
  { target: 'particles', src: './assets/fxdeck-spark.svg', width: 32, height: 10 }
];

function scaledRange(range, scale) {
  return { min: range.min * scale, max: range.max * scale };
}

function baseEmitter(count, particles) {
  return {
    autoPlay: true,
    startCount: count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 0.08, wait: false },
    particles
  };
}

function coreEmitter(spec, resolved) {
  return baseEmitter(resolved.count, {
    color: { value: '#ffffff' },
    shape: { type: 'image', options: { image: { src: './assets/fxdeck-explosion-core.svg', width: 128, height: 128, replaceColor: false } } },
    opacity: { value: { min: .82, max: 1 }, animation: { enable: true, speed: 4.8, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: spec.size, animation: { enable: true, speed: 5.2, sync: false, startValue: 'max', destroy: 'min' } },
    move: { enable: false },
    life: { count: 1, duration: { value: spec.life, sync: false } }
  });
}

function fireballEmitter(spec, resolved) {
  return baseEmitter(resolved.count, {
    color: { value: ['#fff6b0', '#ffcf57', '#ff8b3d', '#ff4d2e'] },
    shape: { type: 'circle' },
    opacity: { value: { min: .55, max: .92 }, animation: { enable: true, speed: 3.2, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: spec.size, animation: { enable: true, speed: 4.4, sync: false, startValue: 'max', destroy: 'min' } },
    move: { enable: true, direction: 'right', angle: { value: 360, offset: 0 }, random: true, straight: false, speed: resolved.speed, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: spec.life, sync: false } }
  });
}

function sparkEmitter(spec, resolved) {
  return baseEmitter(resolved.count, {
    color: { value: ['#ffffff', '#ffd166', '#ff9f43'] },
    shape: { type: 'image', options: { image: { src: './assets/fxdeck-spark.svg', width: 32, height: 10, replaceColor: false } } },
    opacity: { value: { min: .66, max: .98 }, animation: { enable: true, speed: 3.1, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: spec.size, animation: { enable: true, speed: 5.2, sync: false, startValue: 'max', destroy: 'min' } },
    rotate: { value: { min: resolved.directionDegrees - 90, max: resolved.directionDegrees + 90 }, direction: 'random' },
    move: { enable: true, direction: 'right', angle: { value: spec.spread, offset: resolved.directionDegrees }, random: true, straight: false, speed: resolved.speed, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: spec.life, sync: false } }
  });
}

function debrisEmitter(spec, resolved) {
  return baseEmitter(resolved.count, {
    color: { value: ['#3c3530', '#6b5547', '#9b7659', '#c49a6c'] },
    shape: { type: 'square' },
    opacity: { value: { min: .5, max: .84 }, animation: { enable: true, speed: 1.8, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: spec.size },
    rotate: { value: { min: 0, max: 360 }, direction: 'random', animation: { enable: true, speed: 38, sync: false } },
    move: { enable: true, direction: 'right', angle: { value: spec.spread, offset: resolved.directionDegrees }, random: true, straight: false, speed: resolved.speed, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: spec.life, sync: false } }
  });
}

function smokeEmitter(spec, resolved) {
  return baseEmitter(resolved.count, {
    color: { value: ['#e7e0da', '#aaa29c', '#6c6967'] },
    shape: { type: 'circle' },
    opacity: { value: { min: .12, max: .32 }, animation: { enable: true, speed: .7, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: spec.size, animation: { enable: true, speed: 1.2, sync: false, startValue: 'min', destroy: 'none' } },
    move: { enable: true, direction: 'right', angle: { value: spec.spread, offset: 270 }, random: true, straight: false, speed: resolved.speed, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: spec.life, sync: false } }
  });
}

function explosionDefinition() {
  const spec = EXPLOSION_SPEC;

  return {
    id: 'explosion',
    version: 'v1',
    variant: 'default',
    default: true,
    label: spec.label,
    summary: spec.summary,
    spec: structuredClone(spec),
    assets: structuredClone(EXPLOSION_ASSETS),

    async play({ params, particles: particleAdapter, instance }) {
      if (!particleAdapter) throw new Error('explosion requires the particles adapter.');

      const intensity = Math.max(.25, params.intensity);
      const speedScale = Math.max(.72, Math.sqrt(intensity));
      const countScale = Math.max(.55, intensity);
      const payload = {
        position: { ...params.position },
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        intensity
      };

      const core = { count: 1 };
      const fireball = {
        count: Math.max(1, Math.round(spec.fireball.baseCount * countScale)),
        speed: scaledRange(spec.fireball.speed, speedScale)
      };
      const sparks = {
        count: Math.max(1, Math.round(spec.sparks.baseCount * countScale)),
        speed: scaledRange(spec.sparks.speed, speedScale),
        directionDegrees: params.directionDegrees
      };
      const debris = {
        count: Math.max(1, Math.round(spec.debris.baseCount * Math.max(.7, intensity))),
        speed: scaledRange(spec.debris.speed, speedScale),
        directionDegrees: params.directionDegrees
      };
      const smoke = {
        count: Math.max(1, Math.round(spec.smoke.baseCount * Math.max(.75, intensity))),
        speed: scaledRange(spec.smoke.speed, Math.max(.8, Math.sqrt(intensity)))
      };

      instance.resolved = {
        intensity,
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        core,
        fireball,
        sparks,
        debris,
        smoke,
        priorities: { core: 'hero', fireball: 'hero', sparks: 'high', debris: 'medium', smoke: 'low' },
        timings: { ...spec.timings },
        duration: spec.duration,
        screenKickPx: 6.2 * Math.min(1.6, intensity)
      };

      runHook(instance, params.hooks, 'explosionFlash', payload);

      const corePromise = burstTracked(instance, particleAdapter, coreEmitter(spec.core, core), params.position, { priority: 'hero' });
      const fireballPromise = burstTracked(instance, particleAdapter, fireballEmitter(spec.fireball, fireball), params.position, { priority: 'hero' });

      scheduleAsync(instance, spec.timings.sparks, () => burstTracked(instance, particleAdapter, sparkEmitter(spec.sparks, sparks), params.position, { priority: 'high' }));
      scheduleAsync(instance, spec.timings.debris, () => burstTracked(instance, particleAdapter, debrisEmitter(spec.debris, debris), params.position, { priority: 'medium' }));
      scheduleAsync(instance, spec.timings.smoke, () => burstTracked(instance, particleAdapter, smokeEmitter(spec.smoke, smoke), params.position, { priority: 'low' }));

      instance.timeout(() => runHook(instance, params.hooks, 'screenKick', {
        ...payload,
        distance: instance.resolved.screenKickPx
      }), spec.timings.screenKick);

      instance.timeout(() => instance.stop('completed'), spec.duration);

      await Promise.all([corePromise, fireballPromise]);
    }
  };
}

export function registerExplosion(fx) {
  fx.register(explosionDefinition());
}
