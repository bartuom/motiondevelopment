import { spawnTracked } from './effect-utils.js?v=p3.6.3';

const ENVIRONMENT_SPEC = {
  label: 'Environment Emitter',
  revision: 'P3.8.0 sustained live-update proof / v1',
  summary: 'Long-running environment source proving start → live position/intensity update → stop without recreating the owning FXDeck EffectInstance.',
  rateDelay: 0.12,
  startCount: 2,
  baseQuantity: 2,
  particleLife: { min: 1.0, max: 1.8 },
  particleSize: { min: 5, max: 15 },
  particleSpeed: { min: 0.7, max: 1.6 },
  spread: 26
};

function rateQuantityForIntensity(intensity) {
  return Math.max(1, Math.min(5, Math.round(1 + Math.max(0, intensity) * 1.5)));
}

function emitterOptions(spec, intensity, directionDegrees) {
  const quantity = rateQuantityForIntensity(intensity);
  const speedScale = Math.max(.7, Math.min(1.45, .8 + intensity * .18));
  const sizeScale = Math.max(.75, Math.min(1.5, .82 + intensity * .22));

  return {
    autoPlay: true,
    startCount: spec.startCount,
    rate: {
      quantity,
      delay: spec.rateDelay
    },
    life: {
      count: 0,
      wait: false
    },
    size: {
      width: 0,
      height: 0,
      mode: 'percent'
    },
    particles: {
      color: {
        value: ['#d9e3e7', '#aebbc1', '#7c8a91']
      },
      shape: {
        type: 'circle'
      },
      opacity: {
        value: { min: .12, max: .34 },
        animation: {
          enable: true,
          speed: .65,
          sync: false,
          startValue: 'max',
          destroy: 'min'
        }
      },
      size: {
        value: {
          min: spec.particleSize.min * sizeScale,
          max: spec.particleSize.max * sizeScale
        },
        animation: {
          enable: true,
          speed: 1.15,
          sync: false,
          startValue: 'min',
          destroy: 'none'
        }
      },
      move: {
        enable: true,
        direction: 'right',
        angle: {
          value: spec.spread,
          offset: directionDegrees
        },
        random: true,
        straight: false,
        speed: {
          min: spec.particleSpeed.min * speedScale,
          max: spec.particleSpeed.max * speedScale
        },
        outModes: {
          default: 'destroy'
        }
      },
      life: {
        count: 1,
        duration: {
          value: spec.particleLife,
          sync: false
        }
      }
    }
  };
}

function environmentDefinition() {
  const spec = ENVIRONMENT_SPEC;

  return {
    id: 'environmentEmitter',
    version: 'v1',
    variant: 'default',
    default: true,
    label: spec.label,
    summary: spec.summary,
    lifecycle: 'sustained',
    spec: structuredClone(spec),
    assets: [],

    async play({ params, particles: particleAdapter, instance }) {
      if (!particleAdapter?.spawn) throw new Error('environmentEmitter requires the particles adapter.');
      if (!particleAdapter?.updateEmitter) throw new Error('environmentEmitter requires sustained emitter update support.');
      if (typeof instance.setUpdateHandler !== 'function') throw new Error('environmentEmitter requires FXDeck live-update support.');

      const intensity = Math.max(.1, params.intensity);
      const source = await spawnTracked(
        instance,
        particleAdapter,
        emitterOptions(spec, intensity, params.directionDegrees),
        params.position
      );
      if (!source || instance.state !== 'playing') return;

      instance.resolved = {
        topology: 'explicit-sustained-emitter',
        position: { ...params.position },
        intensity,
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        rateQuantity: rateQuantityForIntensity(intensity),
        rateDelay: spec.rateDelay,
        livePosition: true,
        liveIntensity: true,
        liveDirection: false,
        emitterId: source.id,
        updates: 0
      };

      instance.setUpdateHandler((nextParams, patch) => {
        if (instance.state !== 'playing') return false;

        const update = {};

        if (patch.position) {
          update.position = nextParams.position;
          instance.resolved.position = { ...nextParams.position };
        }

        if ('intensity' in patch) {
          const nextIntensity = Math.max(.1, nextParams.intensity);
          const rateQuantity = rateQuantityForIntensity(nextIntensity);
          update.rateQuantity = rateQuantity;
          instance.resolved.intensity = nextIntensity;
          instance.resolved.rateQuantity = rateQuantity;
        }

        if ('direction' in patch) {
          instance.resolved.direction = { ...nextParams.direction };
          instance.resolved.directionDegrees = nextParams.directionDegrees;
          instance.resolved.directionRestartRequired = true;
        }

        if (Object.keys(update).length) {
          particleAdapter.updateEmitter(source, update);
        }

        instance.resolved.updates += 1;
        return instance.resolved;
      });
    }
  };
}

export function registerEnvironmentEmitter(fx) {
  fx.register(environmentDefinition());
}
