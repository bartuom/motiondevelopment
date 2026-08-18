import { burstTracked, runHook, spawnTracked } from './effect-utils.js?v=p3.6.3';

const FIREBALL_SPEC = {
  label: 'Fireball',
  revision: 'P3.6.3 concurrent projectile visual / v1',
  summary: 'Moving projectile archetype with an independently owned visual head per FXDeck instance, sampled particle-trail bursts along the flight path, and an Explosion handoff at impact.',
  travelDuration: 560,
  travelDistance: 250,
  maxFrameAdvanceMs: 34,
  trailIntervalMs: 32,
  trailCleanupMs: 380,
  trail: {
    baseCount: 2,
    size: { min: 4, max: 10 },
    life: { min: .16, max: .34 },
    speed: { min: .8, max: 2.4 },
    spread: 54
  }
};

function trailBurstOptions(spec, intensity, directionDegrees) {
  const speedScale = Math.max(.75, Math.sqrt(intensity));
  const count = Math.max(1, Math.round(spec.baseCount * Math.min(1.6, .7 + intensity * .3)));

  return {
    autoPlay: true,
    startCount: count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: .06, wait: false },
    particles: {
      color: { value: ['#fff1a3', '#ffb347', '#ff6a2e', '#d83a22'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: .25, max: .72 },
        animation: { enable: true, speed: 2.8, sync: false, startValue: 'max', destroy: 'min' }
      },
      size: {
        value: { min: spec.size.min, max: spec.size.max * Math.min(1.35, intensity) },
        animation: { enable: true, speed: 2.6, sync: false, startValue: 'max', destroy: 'min' }
      },
      move: {
        enable: true,
        direction: 'right',
        angle: { value: spec.spread, offset: (directionDegrees + 180) % 360 },
        random: true,
        straight: false,
        speed: { min: spec.speed.min * speedScale, max: spec.speed.max * speedScale },
        outModes: { default: 'destroy' }
      },
      life: { count: 1, duration: { value: spec.life, sync: false } }
    }
  };
}

function projectileVisualOptions(intensity, directionDegrees) {
  const scale = Math.min(1.45, .82 + intensity * .18);
  return {
    className: 'fxdeck-fireball-projectile',
    cssVars: {
      '--fxdeck-fireball-angle': `${directionDegrees}deg`,
      '--fxdeck-fireball-scale': scale.toFixed(3)
    }
  };
}

function fireballDefinition() {
  const spec = FIREBALL_SPEC;

  return {
    id: 'fireball',
    version: 'v1',
    variant: 'default',
    default: true,
    label: spec.label,
    summary: spec.summary,
    spec: structuredClone(spec),
    assets: [],

    async play({ fx, params, particles: particleAdapter, adapters, instance }) {
      if (!particleAdapter) throw new Error('fireball requires the particles adapter.');
      const visualAdapter = adapters?.visuals;
      if (!visualAdapter?.spawn) throw new Error('fireball requires the visuals adapter.');

      const intensity = Math.max(.25, params.intensity);
      const distance = Number.isFinite(params.distance)
        ? Math.max(40, Math.min(800, params.distance))
        : spec.travelDistance;
      const duration = Number.isFinite(params.travelDuration)
        ? Math.max(120, Math.min(3000, params.travelDuration))
        : spec.travelDuration;
      const start = { ...params.position };
      const end = {
        x: start.x + params.direction.x * distance,
        y: start.y + params.direction.y * distance
      };

      instance.resolved = {
        intensity,
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        start,
        end,
        distance,
        travelDuration: duration,
        maxFrameAdvanceMs: spec.maxFrameAdvanceMs,
        trailIntervalMs: spec.trailIntervalMs,
        impactEffect: 'explosion',
        currentPosition: { ...start },
        progress: 0,
        trailBursts: 0,
        hitchClamps: 0,
        maxRawFrameGapMs: 0,
        visualMode: 'independent-dom-head + sampled-particle-trail'
      };

      runHook(instance, params.hooks, 'fireballLaunch', {
        position: { ...start },
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        intensity
      });

      const head = await spawnTracked(
        instance,
        visualAdapter,
        projectileVisualOptions(intensity, params.directionDegrees),
        start
      );
      if (!head || instance.state !== 'playing') return;

      let raf = 0;
      let impacted = false;
      let lastFrameAt = null;
      let elapsedVisualMs = 0;
      let nextTrailAt = 0;

      const stopMotion = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      };
      instance.addCleanup(stopMotion);

      const emitTrail = (position) => {
        instance.resolved.trailBursts += 1;
        void burstTracked(
          instance,
          particleAdapter,
          trailBurstOptions(spec.trail, intensity, params.directionDegrees),
          position,
          { priority: 'low' }
        ).catch((error) => {
          instance.error = error;
          instance.stop('error');
          console.error(error);
        });
      };

      const impact = () => {
        if (impacted || instance.state !== 'playing') return;
        impacted = true;
        stopMotion();
        head.stop();
        instance.resolved.progress = 1;
        instance.resolved.currentPosition = { ...end };

        const child = fx.play('explosion', {
          position: { ...end },
          direction: params.directionDegrees,
          intensity: Math.max(.6, intensity),
          hooks: params.hooks
        });
        instance.resolved.impactInstanceId = child.id;

        instance.timeout(() => {
          if (instance.state === 'playing') instance.stop('trail-complete');
        }, spec.trailCleanupMs);
      };

      const frame = (now) => {
        if (instance.state !== 'playing' || impacted) return;

        if (lastFrameAt == null) {
          lastFrameAt = now;
        } else {
          const rawDelta = Math.max(0, now - lastFrameAt);
          lastFrameAt = now;
          const visualDelta = Math.min(rawDelta, spec.maxFrameAdvanceMs);
          elapsedVisualMs += visualDelta;

          if (rawDelta > spec.maxFrameAdvanceMs) {
            instance.resolved.hitchClamps += 1;
            instance.resolved.maxRawFrameGapMs = Math.max(instance.resolved.maxRawFrameGapMs, rawDelta);
          }
        }

        const t = Math.min(1, Math.max(0, elapsedVisualMs / duration));
        const point = {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t
        };

        instance.resolved.progress = t;
        instance.resolved.currentPosition = point;
        head.move(point);

        if (elapsedVisualMs >= nextTrailAt) {
          emitTrail(point);
          nextTrailAt += spec.trailIntervalMs;
        }

        if (t >= 1) {
          impact();
          return;
        }

        raf = requestAnimationFrame(frame);
      };

      raf = requestAnimationFrame(frame);
    }
  };
}

export function registerFireball(fx) {
  fx.register(fireballDefinition());
}
