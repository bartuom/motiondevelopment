import { burstTracked, runHook, scheduleAsync } from './effect-utils.js?v=p3.6.0';

const SPEC = {
  label: 'Explosion',
  revision: 'P3.13.1 Particlr-harvested visual pass / v2',
  summary: 'Reference-driven explosion built from the harvested Particlr layering model: hot additive flash, expanding fireball mass and delayed textured smoke, with sparse sparks only as a supporting gameplay accent.',
  duration: 1480,
  timings: {
    flash: 0,
    fireball: 0,
    sparks: 18,
    smokeA: 54,
    smokeB: 138,
    smokeC: 238,
    screenKick: 22
  },
  flash: {
    size: 140,
    life: .15
  },
  fireball: {
    baseCount: 24,
    speed: { min: 5.8, max: 14.8 },
    size: { min: 18, max: 34 },
    life: { min: .4, max: .7 }
  },
  sparks: {
    baseCount: 12,
    speed: { min: 12, max: 26 },
    size: { min: 4, max: 9 },
    life: { min: .18, max: .38 },
    spread: 210
  },
  smoke: {
    waveCounts: [7, 8, 7],
    speed: { min: .9, max: 3.1 },
    size: { min: 30, max: 60 },
    life: { min: .8, max: 1.4 },
    spread: 110
  }
};

const ASSETS = [
  { target: 'particles', src: './assets/particlr-circle-soft.png', width: 64, height: 64 },
  { target: 'particles', src: './assets/particlr-smoke.png', width: 64, height: 64 },
  { target: 'particles', src: './assets/fxdeck-spark.svg', width: 32, height: 10 }
];

function scaleRange(range, scale) {
  return { min: range.min * scale, max: range.max * scale };
}

function baseEmitter(count, particles) {
  return {
    autoPlay: true,
    startCount: count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: .06, wait: false },
    particles
  };
}

function flashEmitter(spec, intensity) {
  const size = spec.size * Math.min(1.55, .78 + intensity * .28);
  return baseEmitter(1, {
    color: { value: ['#ffffff', '#fff2a8'] },
    shape: {
      type: 'image',
      options: {
        image: {
          src: './assets/particlr-circle-soft.png',
          width: 64,
          height: 64,
          replaceColor: true
        }
      }
    },
    opacity: {
      value: 1,
      animation: { enable: true, speed: 9, sync: true, startValue: 'max', destroy: 'min' }
    },
    size: {
      value: size,
      animation: { enable: true, speed: 8.5, sync: true, startValue: 'max', destroy: 'min' }
    },
    move: { enable: false },
    life: { count: 1, duration: { value: spec.life } }
  });
}

function fireballEmitter(spec, resolved) {
  return baseEmitter(resolved.count, {
    color: { value: ['#fff2a8', '#ffb13b', '#ff5a24', '#66120a'] },
    shape: {
      type: 'image',
      options: {
        image: {
          src: './assets/particlr-circle-soft.png',
          width: 64,
          height: 64,
          replaceColor: true
        }
      }
    },
    opacity: {
      value: { min: .72, max: 1 },
      animation: { enable: true, speed: 2.2, sync: false, startValue: 'max', destroy: 'min' }
    },
    size: {
      value: spec.size,
      animation: { enable: true, speed: 2.7, sync: false, startValue: 'max', destroy: 'min' }
    },
    move: {
      enable: true,
      direction: 'right',
      angle: { value: 360, offset: 0 },
      random: true,
      straight: false,
      speed: resolved.speed,
      decay: .035,
      gravity: { enable: true, acceleration: 2.4, maxSpeed: 24 },
      outModes: { default: 'destroy' }
    },
    life: { count: 1, duration: { value: spec.life, sync: false } }
  });
}

function sparkEmitter(spec, resolved) {
  return baseEmitter(resolved.count, {
    color: { value: ['#ffffff', '#ffd36a', '#ff7a35'] },
    shape: {
      type: 'image',
      options: {
        image: {
          src: './assets/fxdeck-spark.svg',
          width: 32,
          height: 10,
          replaceColor: false
        }
      }
    },
    opacity: {
      value: { min: .65, max: 1 },
      animation: { enable: true, speed: 4.2, sync: false, startValue: 'max', destroy: 'min' }
    },
    size: {
      value: spec.size,
      animation: { enable: true, speed: 5, sync: false, startValue: 'max', destroy: 'min' }
    },
    rotate: { value: { min: 0, max: 360 }, direction: 'random' },
    move: {
      enable: true,
      direction: 'right',
      angle: { value: spec.spread, offset: resolved.directionDegrees },
      random: true,
      straight: false,
      speed: resolved.speed,
      decay: .055,
      outModes: { default: 'destroy' }
    },
    life: { count: 1, duration: { value: spec.life, sync: false } }
  });
}

function smokeEmitter(spec, resolved, waveIndex) {
  const waveScale = 1 + waveIndex * .08;
  return baseEmitter(resolved.waveCounts[waveIndex], {
    color: { value: ['#706d70', '#4d4b50', '#2c2b30'] },
    shape: {
      type: 'image',
      options: {
        image: {
          src: './assets/particlr-smoke.png',
          width: 64,
          height: 64,
          replaceColor: true
        }
      }
    },
    opacity: {
      value: { min: .18, max: .46 },
      animation: { enable: true, speed: .72, sync: false, startValue: 'max', destroy: 'min' }
    },
    size: {
      value: {
        min: spec.size.min * waveScale,
        max: spec.size.max * waveScale
      },
      animation: { enable: true, speed: 1.05, sync: false, startValue: 'min', destroy: 'none' }
    },
    rotate: {
      value: { min: 0, max: 360 },
      direction: 'random',
      animation: { enable: true, speed: { min: 4, max: 12 }, sync: false }
    },
    move: {
      enable: true,
      direction: 'top',
      angle: { value: spec.spread, offset: 270 },
      random: true,
      straight: false,
      speed: resolved.speed,
      decay: .018,
      gravity: { enable: true, acceleration: -1.15, maxSpeed: 8 },
      outModes: { default: 'destroy' }
    },
    life: { count: 1, duration: { value: spec.life, sync: false } }
  });
}

function definition() {
  const spec = SPEC;

  return {
    id: 'explosion',
    version: 'v2',
    variant: 'default',
    default: true,
    label: spec.label,
    summary: spec.summary,
    spec: structuredClone(spec),
    assets: structuredClone(ASSETS),

    async play({ params, particles: particleAdapter, instance }) {
      if (!particleAdapter) throw new Error('explosion v2 requires the particles adapter.');

      const intensity = Math.max(.25, params.intensity);
      const countScale = Math.max(.62, Math.min(1.65, intensity));
      const speedScale = Math.max(.78, Math.sqrt(intensity));
      const fireball = {
        count: Math.max(8, Math.round(spec.fireball.baseCount * countScale)),
        speed: scaleRange(spec.fireball.speed, speedScale)
      };
      const sparks = {
        count: Math.max(4, Math.round(spec.sparks.baseCount * Math.max(.7, Math.min(1.55, intensity)))),
        speed: scaleRange(spec.sparks.speed, speedScale),
        directionDegrees: params.directionDegrees
      };
      const smoke = {
        waveCounts: spec.smoke.waveCounts.map((count) => Math.max(3, Math.round(count * Math.max(.72, Math.min(1.45, intensity))))),
        speed: scaleRange(spec.smoke.speed, Math.max(.85, Math.sqrt(intensity)))
      };
      const payload = {
        position: { ...params.position },
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        intensity
      };

      instance.resolved = {
        intensity,
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        flash: { count: 1, source: 'Particlr circle-soft texture' },
        fireball,
        sparks,
        smoke,
        timings: { ...spec.timings },
        duration: spec.duration,
        sourceModel: 'Particlr Explosion fixture: flash + fireball + delayed smoke',
        screenKickPx: 5.8 * Math.min(1.55, intensity)
      };

      runHook(instance, params.hooks, 'explosionFlash', payload);

      const flash = burstTracked(instance, particleAdapter, flashEmitter(spec.flash, intensity), params.position, { priority: 'hero' });
      const fire = burstTracked(instance, particleAdapter, fireballEmitter(spec.fireball, fireball), params.position, { priority: 'hero' });

      scheduleAsync(instance, spec.timings.sparks, () => burstTracked(
        instance,
        particleAdapter,
        sparkEmitter(spec.sparks, sparks),
        params.position,
        { priority: 'high' }
      ));

      [spec.timings.smokeA, spec.timings.smokeB, spec.timings.smokeC].forEach((delay, waveIndex) => {
        scheduleAsync(instance, delay, () => burstTracked(
          instance,
          particleAdapter,
          smokeEmitter(spec.smoke, smoke, waveIndex),
          params.position,
          { priority: 'medium' }
        ));
      });

      instance.timeout(() => runHook(instance, params.hooks, 'screenKick', {
        ...payload,
        distance: instance.resolved.screenKickPx
      }), spec.timings.screenKick);

      instance.timeout(() => instance.stop('completed'), spec.duration);

      await Promise.all([flash, fire]);
    }
  };
}

export function registerExplosionV2(fx) {
  fx.register(definition());
}
