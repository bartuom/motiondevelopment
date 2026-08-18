const HEAVY_IMPACT_SPEC = {
  label: 'Heavy Impact',
  revision: 'P3 burst abstraction / v1',
  summary: 'Composite directional gameplay hit with a tighter visual hierarchy: short contact flash, aligned hero sparks, smaller debris, directional pressure wave, target kick and screen kick.',
  duration: 560,
  timings: {
    contactFlash: 0,
    sparks: 0,
    debris: 14,
    pressureWave: 26,
    targetKick: 36,
    screenKick: 48
  },
  sparks: {
    baseCount: 22,
    speed: { min: 12, max: 27 },
    size: { min: 6, max: 13 },
    life: { min: .18, max: .38 },
    spread: 28
  },
  debris: {
    baseCount: 10,
    speed: { min: 5.5, max: 11 },
    size: { min: 1.8, max: 4 },
    life: { min: .24, max: .48 },
    spread: 46
  }
};

function scaledRange(range, scale) {
  return { min: range.min * scale, max: range.max * scale };
}

function sparkEmitter(spec, resolved) {
  const halfSpread = spec.spread * .5;

  return {
    autoPlay: true,
    startCount: resolved.count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 0.06, wait: false },
    particles: {
      color: { value: '#ffffff' },
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
        value: { min: .72, max: .98 },
        animation: { enable: true, speed: 3.4, sync: false, startValue: 'max', destroy: 'min' }
      },
      size: {
        value: spec.size,
        animation: { enable: true, speed: 5.8, sync: false, startValue: 'max', destroy: 'min' }
      },
      rotate: {
        value: {
          min: resolved.directionDegrees - halfSpread,
          max: resolved.directionDegrees + halfSpread
        },
        direction: 'random'
      },
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

function debrisEmitter(spec, resolved) {
  return {
    autoPlay: true,
    startCount: resolved.count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 0.06, wait: false },
    particles: {
      color: { value: ['#d8d0c8', '#8e8177', '#514b46'] },
      shape: { type: 'square' },
      opacity: {
        value: { min: .55, max: .86 },
        animation: { enable: true, speed: 2.4, sync: false, startValue: 'max', destroy: 'min' }
      },
      size: {
        value: spec.size,
        animation: { enable: true, speed: 3, sync: false, startValue: 'max', destroy: 'min' }
      },
      rotate: {
        value: { min: 0, max: 360 },
        direction: 'random',
        animation: { enable: true, speed: 32, sync: false }
      },
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

function runHook(instance, hooks, name, payload) {
  const hook = hooks?.[name];
  if (typeof hook !== 'function') return;
  const cleanup = hook(payload);
  if (typeof cleanup === 'function') instance.addCleanup(cleanup);
}

async function burstTracked(instance, particleAdapter, options, position) {
  const burst = typeof particleAdapter.burst === 'function'
    ? particleAdapter.burst(options, position)
    : particleAdapter.spawn(options, position);
  const handle = await burst;

  if (instance.state !== 'playing') {
    handle.stop();
    return null;
  }
  instance.addCleanup(() => handle.stop());
  return handle;
}

function scheduleAsync(instance, delayMs, task) {
  instance.timeout(() => {
    Promise.resolve()
      .then(task)
      .catch((error) => {
        instance.error = error;
        instance.stop('error');
        console.error(error);
      });
  }, delayMs);
}

function heavyImpactDefinition() {
  const spec = HEAVY_IMPACT_SPEC;

  return {
    id: 'heavyImpact',
    version: 'v1',
    variant: 'default',
    default: true,
    label: spec.label,
    summary: spec.summary,
    spec: structuredClone(spec),

    async play({ params, particles: particleAdapter, instance }) {
      if (!particleAdapter) throw new Error('heavyImpact requires the particles adapter.');

      const intensity = Math.max(.25, params.intensity);
      const speedScale = Math.max(.72, Math.sqrt(intensity));
      const payload = {
        position: { ...params.position },
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        intensity
      };

      const sparks = {
        count: Math.max(1, Math.round(spec.sparks.baseCount * intensity)),
        speed: scaledRange(spec.sparks.speed, speedScale),
        directionDegrees: params.directionDegrees
      };
      const debris = {
        count: Math.max(1, Math.round(spec.debris.baseCount * Math.max(.7, intensity))),
        speed: scaledRange(spec.debris.speed, speedScale),
        directionDegrees: params.directionDegrees
      };

      instance.resolved = {
        intensity,
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        sparks,
        debris,
        timings: { ...spec.timings },
        duration: spec.duration,
        targetKickPx: 8.5 * intensity,
        screenKickPx: 4.5 * Math.min(1.5, intensity)
      };

      runHook(instance, params.hooks, 'contactFlash', payload);

      const sparkPromise = burstTracked(
        instance,
        particleAdapter,
        sparkEmitter(spec.sparks, sparks),
        params.position
      );

      scheduleAsync(instance, spec.timings.debris, () => burstTracked(
        instance,
        particleAdapter,
        debrisEmitter(spec.debris, debris),
        params.position
      ));

      instance.timeout(() => runHook(instance, params.hooks, 'pressureWave', payload), spec.timings.pressureWave);
      instance.timeout(() => runHook(instance, params.hooks, 'targetKick', {
        ...payload,
        distance: instance.resolved.targetKickPx
      }), spec.timings.targetKick);
      instance.timeout(() => runHook(instance, params.hooks, 'screenKick', {
        ...payload,
        distance: instance.resolved.screenKickPx
      }), spec.timings.screenKick);
      instance.timeout(() => instance.stop('completed'), spec.duration);

      await sparkPromise;
    }
  };
}

export function registerHeavyImpact(fx) {
  fx.register(heavyImpactDefinition());
}
