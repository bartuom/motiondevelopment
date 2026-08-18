import { burstTracked, runHook, scheduleAsync } from './effect-utils.js?v=p3.6.0';

const CRITICAL_HIT_SPEC = {
  label: 'Critical Hit',
  revision: 'P3.11.0 ultra-short readability / v1',
  summary: 'Ultra-short directional critical-strike cue: immediate slash/flash readability, narrow hero streaks, compact shards, a sharp target snap and restrained screen kick.',
  duration: 260,
  timings: {
    slash: 0,
    contactFlash: 0,
    streaks: 0,
    shards: 6,
    targetKick: 18,
    screenKick: 24,
    label: 34
  },
  streaks: {
    baseCount: 14,
    speed: { min: 18, max: 34 },
    size: { min: 7, max: 15 },
    life: { min: .10, max: .22 },
    spread: 18
  },
  shards: {
    baseCount: 7,
    speed: { min: 7, max: 14 },
    size: { min: 1.8, max: 4.2 },
    life: { min: .14, max: .30 },
    spread: 42
  }
};

const CRITICAL_HIT_ASSETS = [
  { target: 'particles', src: './assets/fxdeck-spark.svg', width: 32, height: 10 }
];

function scaledRange(range, scale) {
  return { min: range.min * scale, max: range.max * scale };
}

function streakEmitter(spec, resolved) {
  const halfSpread = spec.spread * .5;
  return {
    autoPlay: true,
    startCount: resolved.count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 0.04, wait: false },
    particles: {
      color: { value: ['#ffffff', '#fff3df', '#ff6b4a'] },
      shape: { type: 'image', options: { image: { src: './assets/fxdeck-spark.svg', width: 32, height: 10, replaceColor: false } } },
      opacity: { value: { min: .78, max: 1 }, animation: { enable: true, speed: 5.2, sync: false, startValue: 'max', destroy: 'min' } },
      size: { value: spec.size, animation: { enable: true, speed: 8, sync: false, startValue: 'max', destroy: 'min' } },
      rotate: { value: { min: resolved.directionDegrees - halfSpread, max: resolved.directionDegrees + halfSpread }, direction: 'random' },
      move: {
        enable: true,
        direction: 'right',
        angle: { value: spec.spread, offset: resolved.directionDegrees },
        random: true,
        straight: false,
        speed: resolved.speed,
        outModes: { default: 'destroy' }
      },
      life: { count: 1, duration: { value: spec.life, sync: false } }
    }
  };
}

function shardEmitter(spec, resolved) {
  return {
    autoPlay: true,
    startCount: resolved.count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 0.04, wait: false },
    particles: {
      color: { value: ['#fff5e7', '#ff9a65', '#8f3028'] },
      shape: { type: 'triangle' },
      opacity: { value: { min: .58, max: .92 }, animation: { enable: true, speed: 4.4, sync: false, startValue: 'max', destroy: 'min' } },
      size: { value: spec.size, animation: { enable: true, speed: 5.4, sync: false, startValue: 'max', destroy: 'min' } },
      rotate: { value: { min: 0, max: 360 }, direction: 'random', animation: { enable: true, speed: 58, sync: false } },
      move: {
        enable: true,
        direction: 'right',
        angle: { value: spec.spread, offset: resolved.directionDegrees },
        random: true,
        straight: false,
        speed: resolved.speed,
        outModes: { default: 'destroy' }
      },
      life: { count: 1, duration: { value: spec.life, sync: false } }
    }
  };
}

function criticalHitDefinition() {
  const spec = CRITICAL_HIT_SPEC;

  return {
    id: 'criticalHit',
    version: 'v1',
    variant: 'default',
    default: true,
    label: spec.label,
    summary: spec.summary,
    spec: structuredClone(spec),
    assets: structuredClone(CRITICAL_HIT_ASSETS),

    async play({ params, particles: particleAdapter, instance }) {
      if (!particleAdapter) throw new Error('criticalHit requires the particles adapter.');

      const intensity = Math.max(.25, params.intensity);
      const countScale = Math.max(.72, Math.min(1.7, intensity));
      const speedScale = Math.max(.78, Math.sqrt(intensity));
      const payload = {
        position: { ...params.position },
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        intensity
      };
      const streaks = {
        count: Math.max(6, Math.round(spec.streaks.baseCount * countScale)),
        speed: scaledRange(spec.streaks.speed, speedScale),
        directionDegrees: params.directionDegrees
      };
      const shards = {
        count: Math.max(3, Math.round(spec.shards.baseCount * Math.max(.78, Math.min(1.45, intensity)))),
        speed: scaledRange(spec.shards.speed, speedScale),
        directionDegrees: params.directionDegrees
      };

      instance.resolved = {
        intensity,
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        streaks,
        shards,
        timings: { ...spec.timings },
        duration: spec.duration,
        targetKickPx: 6.5 * Math.min(1.65, intensity),
        screenKickPx: 3.8 * Math.min(1.55, intensity)
      };

      runHook(instance, params.hooks, 'criticalSlash', payload);
      runHook(instance, params.hooks, 'criticalFlash', payload);

      const streakPromise = burstTracked(
        instance,
        particleAdapter,
        streakEmitter(spec.streaks, streaks),
        params.position,
        { priority: 'hero' }
      );

      scheduleAsync(instance, spec.timings.shards, () => burstTracked(
        instance,
        particleAdapter,
        shardEmitter(spec.shards, shards),
        params.position,
        { priority: 'medium' }
      ));

      instance.timeout(() => runHook(instance, params.hooks, 'targetKick', {
        ...payload,
        distance: instance.resolved.targetKickPx
      }), spec.timings.targetKick);

      instance.timeout(() => runHook(instance, params.hooks, 'screenKick', {
        ...payload,
        distance: instance.resolved.screenKickPx
      }), spec.timings.screenKick);

      instance.timeout(() => runHook(instance, params.hooks, 'criticalLabel', payload), spec.timings.label);
      instance.timeout(() => instance.stop('completed'), spec.duration);

      await streakPromise;
    }
  };
}

export function registerCriticalHit(fx) {
  fx.register(criticalHitDefinition());
}
