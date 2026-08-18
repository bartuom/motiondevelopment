function directionName(degrees) {
  const angle = ((degrees % 360) + 360) % 360;
  if (angle >= 315 || angle < 45) return 'right';
  if (angle < 135) return 'bottom';
  if (angle < 225) return 'left';
  return 'top';
}

function particles({ count, speed, direction, size = { min: 3, max: 7 }, life = { min: .55, max: .95 } }) {
  return {
    autoPlay: true,
    startCount: count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 0.1, wait: false },
    particles: {
      color: { value: ['#ffffff', '#c9f2ff', '#61d2ff', '#4e8cff'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: .75, max: 1 },
        animation: { enable: true, speed: 1.25, sync: false, startValue: 'max', destroy: 'min' }
      },
      size: {
        value: size,
        animation: { enable: true, speed: 2.2, sync: false, startValue: 'max', destroy: 'min' }
      },
      move: {
        enable: true,
        direction,
        random: true,
        straight: false,
        speed,
        outModes: { default: 'destroy' }
      },
      life: { count: 1, duration: { value: life, sync: false } }
    }
  };
}

function burstDefinition({ version, variant = 'default', baseCount, speed, defaultEffect = false }) {
  return {
    id: 'testBurst',
    version,
    variant,
    default: defaultEffect,

    async play({ params, particles: particleAdapter, instance }) {
      if (!particleAdapter) throw new Error('testBurst requires the particles adapter.');

      const intensity = Math.max(.1, params.intensity);
      const handle = await particleAdapter.spawn(
        particles({
          count: Math.max(1, Math.round(baseCount * intensity)),
          speed: {
            min: speed.min * Math.max(.65, intensity),
            max: speed.max * Math.max(.65, intensity)
          },
          direction: directionName(params.direction),
          size: variant === 'heavy' ? { min: 4, max: 9 } : { min: 3, max: 7 },
          life: variant === 'heavy' ? { min: .7, max: 1.1 } : { min: .55, max: .95 }
        }),
        params.position
      );

      instance.addCleanup(() => handle.stop());
      instance.timeout(() => instance.stop('completed'), variant === 'heavy' ? 1450 : 1250);
    }
  };
}

export function registerTestBurst(fx) {
  fx.register(burstDefinition({ version: 'v1', baseCount: 30, speed: { min: 5, max: 12 } }));
  fx.register(burstDefinition({ version: 'v2', baseCount: 42, speed: { min: 7, max: 16 }, defaultEffect: true }));
  fx.register(burstDefinition({ version: 'v2', variant: 'heavy', baseCount: 68, speed: { min: 9, max: 20 } }));
}
