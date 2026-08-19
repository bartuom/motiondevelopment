import { burstTracked, runHook, scheduleAsync } from './effect-utils.js?v=p3.6.0';

const SPEC = {
  label: 'Magic Burst',
  revision: 'P3.13.1 tsParticles Ribbons harvest / v2',
  summary: 'Reference-driven magic cue using the real tsParticles ribbon shape and its oscillating trail model, supported by sparse image motes and a displaced secondary ribbon lobe.',
  duration: 860,
  timings: {
    core: 0,
    heroRibbons: 0,
    motes: 22,
    screenKick: 44,
    echoRibbons: 86,
    echoMotes: 112,
    pulse: 146
  },
  ribbons: {
    heroCount: 3,
    echoCount: 2,
    size: 8,
    life: { min: .52, max: .74 },
    speed: { min: 8.5, max: 14.5 },
    spread: 34,
    ribbonOptions: {
      angle: 45,
      darken: { enable: true, value: 30 },
      count: 60,
      drag: .02,
      mass: 1,
      oscillationDistance: { min: 72, max: 112 },
      oscillationSpeed: { min: 3, max: 5 },
      particleDist: 8,
      velocityInherit: { min: 4, max: 6 }
    }
  },
  motes: {
    baseCount: 14,
    speed: { min: 4.5, max: 10.5 },
    size: { min: 3.5, max: 8 },
    life: { min: .28, max: .56 },
    spread: 58
  },
  echo: {
    forwardOffset: 42,
    sideOffset: 24,
    angleOffset: 26
  }
};

const ASSETS = [
  { target: 'particles', src: './assets/fxdeck-spark.svg', width: 32, height: 10 }
];

function scaleRange(range, scale) {
  return { min: range.min * scale, max: range.max * scale };
}

function ribbonEmitter(spec, resolved, colors) {
  const size = spec.size * Math.min(1.45, .82 + resolved.intensity * .2);
  return {
    autoPlay: true,
    startCount: resolved.count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: .05, wait: false },
    particles: {
      color: { value: colors },
      paint: {
        fill: {
          enable: true,
          color: { value: colors }
        }
      },
      shape: {
        type: 'ribbon',
        options: {
          ribbon: structuredClone(spec.ribbonOptions)
        }
      },
      opacity: {
        value: { min: .76, max: 1 },
        animation: { enable: true, speed: 1.6, sync: false, startValue: 'max', destroy: 'min' }
      },
      size: { value: size },
      move: {
        enable: true,
        direction: 'right',
        angle: { value: resolved.spread, offset: resolved.directionDegrees },
        random: true,
        straight: false,
        speed: resolved.speed,
        outModes: { default: 'destroy' }
      },
      life: { count: 1, duration: { value: spec.life, sync: false } },
      rotate: { value: 0, move: false, animation: { enable: false } },
      roll: { enable: false },
      tilt: { enable: false },
      wobble: { enable: false }
    }
  };
}

function moteEmitter(spec, resolved, colors) {
  return {
    autoPlay: true,
    startCount: resolved.count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: .05, wait: false },
    particles: {
      color: { value: colors },
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
        value: { min: .42, max: .9 },
        animation: { enable: true, speed: 2.6, sync: false, startValue: 'max', destroy: 'min' }
      },
      size: {
        value: spec.size,
        animation: { enable: true, speed: 3.4, sync: false, startValue: 'max', destroy: 'min' }
      },
      rotate: { value: { min: resolved.directionDegrees - 38, max: resolved.directionDegrees + 38 }, direction: 'random' },
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

function definition() {
  const spec = SPEC;

  return {
    id: 'magicBurst',
    version: 'v2',
    variant: 'default',
    default: true,
    label: spec.label,
    summary: spec.summary,
    spec: structuredClone(spec),
    assets: structuredClone(ASSETS),

    async play({ params, particles: particleAdapter, instance }) {
      if (!particleAdapter) throw new Error('magicBurst v2 requires the particles adapter.');

      const intensity = Math.max(.25, params.intensity);
      const speedScale = Math.max(.78, Math.sqrt(intensity));
      const countScale = Math.max(.72, Math.min(1.55, intensity));
      const direction = params.direction;
      const perpendicular = { x: -direction.y, y: direction.x };
      const echoDirectionDegrees = (params.directionDegrees + spec.echo.angleOffset + 360) % 360;
      const echoPosition = {
        x: params.position.x + direction.x * spec.echo.forwardOffset + perpendicular.x * spec.echo.sideOffset,
        y: params.position.y + direction.y * spec.echo.forwardOffset + perpendicular.y * spec.echo.sideOffset
      };
      const payload = {
        position: { ...params.position },
        direction: { ...direction },
        directionDegrees: params.directionDegrees,
        intensity
      };
      const heroRibbons = {
        count: Math.max(2, Math.round(spec.ribbons.heroCount * Math.min(1.35, .8 + intensity * .2))),
        intensity,
        speed: scaleRange(spec.ribbons.speed, speedScale),
        spread: spec.ribbons.spread,
        directionDegrees: params.directionDegrees
      };
      const echoRibbons = {
        count: Math.max(1, Math.round(spec.ribbons.echoCount * Math.min(1.35, .82 + intensity * .18))),
        intensity,
        speed: scaleRange(spec.ribbons.speed, speedScale * .86),
        spread: spec.ribbons.spread * .82,
        directionDegrees: echoDirectionDegrees
      };
      const motes = {
        count: Math.max(7, Math.round(spec.motes.baseCount * countScale)),
        speed: scaleRange(spec.motes.speed, speedScale),
        directionDegrees: params.directionDegrees
      };
      const echoMotes = {
        count: Math.max(4, Math.round(spec.motes.baseCount * .55 * countScale)),
        speed: scaleRange(spec.motes.speed, speedScale * .82),
        directionDegrees: echoDirectionDegrees
      };

      instance.resolved = {
        intensity,
        direction: { ...direction },
        directionDegrees: params.directionDegrees,
        heroRibbons,
        echoRibbons,
        motes,
        echoMotes,
        echoPosition,
        timings: { ...spec.timings },
        duration: spec.duration,
        ribbonRecipe: structuredClone(spec.ribbons.ribbonOptions),
        sourceModel: 'tsParticles Ribbons: shape-ribbon + oscillation + inherited velocity',
        screenKickPx: 2.4 * Math.min(1.5, intensity)
      };

      runHook(instance, params.hooks, 'magicCore', payload);

      const hero = burstTracked(
        instance,
        particleAdapter,
        ribbonEmitter(spec.ribbons, heroRibbons, ['#5ce8ff', '#806bff', '#ff57d8']),
        params.position,
        { priority: 'hero', backpressure: false }
      );

      scheduleAsync(instance, spec.timings.motes, () => burstTracked(
        instance,
        particleAdapter,
        moteEmitter(spec.motes, motes, ['#9cf8ff', '#b49cff', '#ff8ce8', '#ffffff']),
        params.position,
        { priority: 'high' }
      ));

      instance.timeout(() => runHook(instance, params.hooks, 'screenKick', {
        ...payload,
        distance: instance.resolved.screenKickPx
      }), spec.timings.screenKick);

      scheduleAsync(instance, spec.timings.echoRibbons, () => {
        runHook(instance, params.hooks, 'magicEcho', {
          ...payload,
          position: { ...echoPosition },
          directionDegrees: echoDirectionDegrees
        });
        return burstTracked(
          instance,
          particleAdapter,
          ribbonEmitter(spec.ribbons, echoRibbons, ['#69ffd4', '#4bbdff', '#9a6cff']),
          echoPosition,
          { priority: 'high' }
        );
      });

      scheduleAsync(instance, spec.timings.echoMotes, () => burstTracked(
        instance,
        particleAdapter,
        moteEmitter(spec.motes, echoMotes, ['#7fffe2', '#72cfff', '#c58cff']),
        echoPosition,
        { priority: 'medium' }
      ));

      instance.timeout(() => runHook(instance, params.hooks, 'magicPulse', {
        ...payload,
        position: { ...echoPosition },
        directionDegrees: echoDirectionDegrees
      }), spec.timings.pulse);

      instance.timeout(() => instance.stop('completed'), spec.duration);
      await hero;
    }
  };
}

export function registerMagicBurstV2(fx) {
  fx.register(definition());
}
