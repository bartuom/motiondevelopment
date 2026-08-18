const TEST_BURST_PRESETS = {
  v1: {
    default: {
      label: 'Compact Burst',
      revision: 'Baseline implementation',
      summary: 'Small primitive-circle burst. Lower density, lower speed and shorter lifetime.',
      shape: 'circle',
      baseCount: 30,
      speed: { min: 5, max: 12 },
      size: { min: 2.5, max: 5.5 },
      life: { min: .45, max: .75 },
      spread: 72,
      stopAfter: 1100,
      color: ['#ffffff', '#c9f2ff', '#61d2ff']
    }
  },
  v2: {
    default: {
      label: 'Spark Burst',
      revision: 'Second authored revision',
      summary: 'Rebuilt around the preloaded SVG spark shape with more particles, more speed and a tighter directional cone.',
      shape: 'image',
      baseCount: 42,
      speed: { min: 7, max: 16 },
      size: { min: 7, max: 12 },
      life: { min: .55, max: .95 },
      spread: 54,
      stopAfter: 1300,
      color: '#ffffff'
    },
    heavy: {
      label: 'Spark Burst / Heavy',
      revision: 'Variant of v2',
      summary: 'Same v2 spark construction, authored as a denser, larger, longer-lived and more focused heavy variant.',
      shape: 'image',
      baseCount: 68,
      speed: { min: 9, max: 20 },
      size: { min: 10, max: 17 },
      life: { min: .75, max: 1.2 },
      spread: 42,
      stopAfter: 1600,
      color: '#ffffff'
    }
  }
};

function emitterOptions(spec, { count, speed, directionDegrees }) {
  const image = spec.shape === 'image';

  return {
    autoPlay: true,
    startCount: count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 0.1, wait: false },
    particles: {
      color: { value: spec.color },
      shape: image ? {
        type: 'image',
        options: {
          image: {
            src: './assets/fxdeck-spark.svg',
            width: 32,
            height: 10,
            replaceColor: false
          }
        }
      } : { type: 'circle' },
      opacity: {
        value: { min: .75, max: 1 },
        animation: { enable: true, speed: 1.25, sync: false, startValue: 'max', destroy: 'min' }
      },
      size: {
        value: spec.size,
        animation: { enable: true, speed: 2.2, sync: false, startValue: 'max', destroy: 'min' }
      },
      rotate: image ? { value: { min: 0, max: 360 }, direction: 'random' } : undefined,
      move: {
        enable: true,
        direction: 'right',
        angle: { value: spec.spread, offset: directionDegrees },
        random: true,
        straight: false,
        speed,
        outModes: { default: 'destroy' }
      },
      life: { count: 1, duration: { value: spec.life, sync: false } }
    }
  };
}

function burstDefinition({ version, variant = 'default', defaultEffect = false }) {
  const spec = TEST_BURST_PRESETS[version]?.[variant];
  if (!spec) throw new Error(`Missing testBurst preset ${version}/${variant}.`);

  return {
    id: 'testBurst',
    version,
    variant,
    default: defaultEffect,
    label: spec.label,
    summary: spec.summary,
    spec: {
      revision: spec.revision,
      shape: spec.shape,
      baseCount: spec.baseCount,
      speed: { ...spec.speed },
      size: { ...spec.size },
      life: { ...spec.life },
      spread: spec.spread,
      stopAfter: spec.stopAfter
    },

    async play({ params, particles: particleAdapter, instance }) {
      if (!particleAdapter) throw new Error('testBurst requires the particles adapter.');

      const intensity = Math.max(.1, params.intensity);
      const speedScale = Math.max(.65, intensity);
      const resolved = {
        count: Math.max(1, Math.round(spec.baseCount * intensity)),
        speed: {
          min: spec.speed.min * speedScale,
          max: spec.speed.max * speedScale
        },
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees
      };

      const handle = await particleAdapter.spawn(
        emitterOptions(spec, resolved),
        params.position
      );

      instance.resolved = {
        ...resolved,
        shape: spec.shape,
        size: { ...spec.size },
        life: { ...spec.life },
        spread: spec.spread,
        stopAfter: spec.stopAfter
      };

      instance.addCleanup(() => handle.stop());
      instance.timeout(() => instance.stop('completed'), spec.stopAfter);
    }
  };
}

export function registerTestBurst(fx) {
  fx.register(burstDefinition({ version: 'v1' }));
  fx.register(burstDefinition({ version: 'v2', defaultEffect: true }));
  fx.register(burstDefinition({ version: 'v2', variant: 'heavy' }));
}
