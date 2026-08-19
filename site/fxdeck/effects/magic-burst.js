import { burstTracked, runHook, scheduleAsync } from './effect-utils.js?v=p3.6.0';

const MAGIC_BURST_SPEC = {
  label: 'Magic Burst',
  revision: 'P3.12.0 asymmetric stylized motion / v1',
  summary: 'Asymmetric directional magic cue built around curved DOM ribbons, offset color lobes and sparse particle motes rather than a radial ring/explosion pattern.',
  duration: 640,
  timings: {
    core: 0,
    ribbons: 0,
    motes: 18,
    screenKick: 42,
    echo: 72,
    pulse: 118
  },
  motes: {
    baseCount: 18,
    speed: { min: 5.5, max: 12.5 },
    size: { min: 2.2, max: 6.2 },
    life: { min: .28, max: .58 },
    spread: 64
  },
  echo: {
    baseCount: 10,
    speed: { min: 3.5, max: 8.5 },
    size: { min: 1.8, max: 4.8 },
    life: { min: .24, max: .52 },
    spread: 48,
    forwardOffset: 30,
    sideOffset: 22,
    angleOffset: 34
  }
};

function scaledRange(range, scale) {
  return { min: range.min * scale, max: range.max * scale };
}

function magicMoteEmitter(spec, resolved) {
  return {
    autoPlay: true,
    startCount: resolved.count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 0.05, wait: false },
    particles: {
      color: { value: ['#77f4ff', '#a783ff', '#f06cff', '#ffffff'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: .48, max: .94 },
        animation: { enable: true, speed: 2.8, sync: false, startValue: 'max', destroy: 'min' }
      },
      size: {
        value: spec.size,
        animation: { enable: true, speed: 3.8, sync: false, startValue: 'max', destroy: 'min' }
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

function echoEmitter(spec, resolved) {
  return {
    autoPlay: true,
    startCount: resolved.count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 0.05, wait: false },
    particles: {
      color: { value: ['#7af0d8', '#8ca8ff', '#d57aff'] },
      shape: { type: 'triangle' },
      opacity: {
        value: { min: .38, max: .78 },
        animation: { enable: true, speed: 2.5, sync: false, startValue: 'max', destroy: 'min' }
      },
      size: {
        value: spec.size,
        animation: { enable: true, speed: 3.2, sync: false, startValue: 'max', destroy: 'min' }
      },
      rotate: {
        value: { min: 0, max: 360 },
        direction: 'random',
        animation: { enable: true, speed: 42, sync: false }
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

function magicBurstDefinition() {
  const spec = MAGIC_BURST_SPEC;

  return {
    id: 'magicBurst',
    version: 'v1',
    variant: 'default',
    default: true,
    label: spec.label,
    summary: spec.summary,
    spec: structuredClone(spec),
    assets: [],

    async play({ params, particles: particleAdapter, instance }) {
      if (!particleAdapter) throw new Error('magicBurst requires the particles adapter.');

      const intensity = Math.max(.25, params.intensity);
      const countScale = Math.max(.68, Math.min(1.65, intensity));
      const speedScale = Math.max(.78, Math.sqrt(intensity));
      const direction = params.direction;
      const perpendicular = { x: -direction.y, y: direction.x };
      const payload = {
        position: { ...params.position },
        direction: { ...direction },
        directionDegrees: params.directionDegrees,
        intensity
      };

      const motes = {
        count: Math.max(8, Math.round(spec.motes.baseCount * countScale)),
        speed: scaledRange(spec.motes.speed, speedScale),
        directionDegrees: params.directionDegrees
      };

      const echoDirectionDegrees = (params.directionDegrees + spec.echo.angleOffset + 360) % 360;
      const echoPosition = {
        x: params.position.x + direction.x * spec.echo.forwardOffset + perpendicular.x * spec.echo.sideOffset,
        y: params.position.y + direction.y * spec.echo.forwardOffset + perpendicular.y * spec.echo.sideOffset
      };
      const echo = {
        count: Math.max(4, Math.round(spec.echo.baseCount * Math.max(.72, Math.min(1.5, intensity)))),
        speed: scaledRange(spec.echo.speed, speedScale),
        directionDegrees: echoDirectionDegrees,
        position: echoPosition
      };

      instance.resolved = {
        intensity,
        direction: { ...direction },
        directionDegrees: params.directionDegrees,
        motes,
        echo,
        timings: { ...spec.timings },
        duration: spec.duration,
        screenKickPx: 2.6 * Math.min(1.55, intensity)
      };

      runHook(instance, params.hooks, 'magicCore', payload);
      runHook(instance, params.hooks, 'magicRibbons', payload);

      scheduleAsync(instance, spec.timings.motes, () => burstTracked(
        instance,
        particleAdapter,
        magicMoteEmitter(spec.motes, motes),
        params.position,
        { priority: 'hero' }
      ));

      instance.timeout(() => runHook(instance, params.hooks, 'screenKick', {
        ...payload,
        distance: instance.resolved.screenKickPx
      }), spec.timings.screenKick);

      scheduleAsync(instance, spec.timings.echo, () => {
        runHook(instance, params.hooks, 'magicEcho', {
          ...payload,
          position: { ...echoPosition },
          directionDegrees: echoDirectionDegrees
        });
        return burstTracked(
          instance,
          particleAdapter,
          echoEmitter(spec.echo, echo),
          echoPosition,
          { priority: 'medium' }
        );
      });

      instance.timeout(() => runHook(instance, params.hooks, 'magicPulse', {
        ...payload,
        position: { ...echoPosition },
        directionDegrees: echoDirectionDegrees
      }), spec.timings.pulse);

      instance.timeout(() => instance.stop('completed'), spec.duration);
    }
  };
}

export function registerMagicBurst(fx) {
  fx.register(magicBurstDefinition());
}
