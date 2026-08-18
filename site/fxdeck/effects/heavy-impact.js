const HEAVY_IMPACT_SPEC = {
  label: 'Heavy Impact',
  revision: 'P2 vertical slice / v1',
  summary: 'Composite directional gameplay hit: contact flash, sparks, debris, pressure wave, target kick and screen kick from one FXDeck.play() call.',
  duration: 620,
  timings: {
    contactFlash: 0,
    sparks: 0,
    debris: 18,
    pressureWave: 32,
    targetKick: 40,
    screenKick: 52
  },
  sparks: {
    baseCount: 34,
    speed: { min: 10, max: 24 },
    size: { min: 8, max: 18 },
    life: { min: .24, max: .52 },
    spread: 38
  },
  debris: {
    baseCount: 16,
    speed: { min: 5, max: 13 },
    size: { min: 2.5, max: 6.5 },
    life: { min: .34, max: .72 },
    spread: 62
  }
};

function scaledRange(range, scale) {
  return { min: range.min * scale, max: range.max * scale };
}

function sparkEmitter(spec, resolved) {
  return {
    autoPlay: true,
    startCount: resolved.count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 0.08, wait: false },
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
        value: { min: .78, max: 1 },
        animation: { enable: true, speed: 2.4, sync: false, startValue: 'max', destroy: 'min' }
      },
      size: {
        value: spec.size,
        animation: { enable: true, speed: 4.2, sync: false, startValue: 'max', destroy: 'min' }
      },
      rotate: { value: { min: 0, max: 360 }, direction: 'random' },
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
    life: { count: 1, duration: 0.08, wait: false },
    particles: {
      color: { value: ['#f4efe8', '#b9aca0', '#746b63'] },
      shape: { type: 'square' },
      opacity: {
        value: { min: .65, max: .95 },
        animation: { enable: true, speed: 1.8, sync: false, startValue: 'max', destroy: 'min' }
      },
      size: {
        value: spec.size,
        animation: { enable: true, speed: 2.4, sync: false, startValue: 'max', destroy: 'min' }
      },
      rotate: {
        value: { min: 0, max: 360 },
        direction: 'random',
        animation: { enable: true, speed: 35, sync: false }
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

async function spawnTracked(instance, particleAdapter, options, position) {
  const handle = await particleAdapter.spawn(options, position);
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
        targetKickPx: 10 * intensity,
        screenKickPx: 5 * Math.min(1.5, intensity)
      };

      // P2 intentionally sequences the real effect directly. Repeated patterns
      // discovered here are candidates for extraction in P3, not before.
      runHook(instance, params.hooks, 'contactFlash', payload);

      const sparkPromise = spawnTracked(
        instance,
        particleAdapter,
        sparkEmitter(spec.sparks, sparks),
        params.position
      );

      scheduleAsync(instance, spec.timings.debris, () => spawnTracked(
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
