import { runHook, spawnTracked } from './effect-utils.js?v=p3.6.0';

const FIREBALL_SPEC = {
  label: 'Fireball',
  revision: 'P3.6.2 multi-instance timing fix / v1',
  summary: 'Moving projectile archetype: explicit moving head + trail emitters travel along runtime direction, then hand off to the existing Explosion cue at impact. Travel time advances from rendered frames so spawn hitches cannot fast-forward the projectile out of view.',
  travelDuration: 560,
  travelDistance: 250,
  maxFrameAdvanceMs: 34,
  head: {
    rate: { quantity: 1, delay: .018 },
    size: { min: 24, max: 34 },
    life: { min: .055, max: .085 }
  },
  trail: {
    rate: { quantity: 2, delay: .032 },
    size: { min: 4, max: 10 },
    life: { min: .16, max: .34 },
    speed: { min: .8, max: 2.4 }
  }
};

const FIREBALL_ASSETS = [
  { target: 'particles', src: './assets/fxdeck-explosion-core.svg', width: 128, height: 128 }
];

function movingEmitter(rate, particles, durationSeconds = 2) {
  return {
    autoPlay: true,
    size: { width: 0, height: 0, mode: 'percent' },
    rate,
    life: { count: 1, duration: durationSeconds, wait: false },
    particles
  };
}

function headEmitter(spec, intensity, durationSeconds) {
  const sizeScale = .9 + Math.min(1.5, intensity) * .16;
  return movingEmitter(spec.rate, {
    color: { value: '#ffffff' },
    shape: {
      type: 'image',
      options: {
        image: {
          src: './assets/fxdeck-explosion-core.svg',
          width: 128,
          height: 128,
          replaceColor: false
        }
      }
    },
    opacity: {
      value: { min: .8, max: 1 },
      animation: { enable: true, speed: 8, sync: false, startValue: 'max', destroy: 'min' }
    },
    size: {
      value: { min: spec.size.min * sizeScale, max: spec.size.max * sizeScale },
      animation: { enable: true, speed: 5, sync: false, startValue: 'max', destroy: 'min' }
    },
    move: { enable: false },
    life: { count: 1, duration: { value: spec.life, sync: false } }
  }, durationSeconds);
}

function trailEmitter(spec, intensity, directionDegrees, durationSeconds) {
  const speedScale = Math.max(.75, Math.sqrt(intensity));
  return movingEmitter(spec.rate, {
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
      angle: { value: 54, offset: (directionDegrees + 180) % 360 },
      random: true,
      straight: false,
      speed: { min: spec.speed.min * speedScale, max: spec.speed.max * speedScale },
      outModes: { default: 'destroy' }
    },
    life: { count: 1, duration: { value: spec.life, sync: false } }
  }, durationSeconds);
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
    assets: structuredClone(FIREBALL_ASSETS),

    async play({ fx, params, particles: particleAdapter, instance }) {
      if (!particleAdapter) throw new Error('fireball requires the particles adapter.');

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
      const emitterLifetimeSeconds = Math.max(2, duration / 1000 + 1.5);

      instance.resolved = {
        intensity,
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        start,
        end,
        distance,
        travelDuration: duration,
        maxFrameAdvanceMs: spec.maxFrameAdvanceMs,
        impactEffect: 'explosion',
        currentPosition: { ...start },
        progress: 0,
        hitchClamps: 0,
        maxRawFrameGapMs: 0
      };

      runHook(instance, params.hooks, 'fireballLaunch', {
        position: { ...start },
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        intensity
      });

      const [head, trail] = await Promise.all([
        spawnTracked(instance, particleAdapter, headEmitter(spec.head, intensity, emitterLifetimeSeconds), start),
        spawnTracked(instance, particleAdapter, trailEmitter(spec.trail, intensity, params.directionDegrees, emitterLifetimeSeconds), start)
      ]);

      if (!head || !trail || instance.state !== 'playing') return;

      let raf = 0;
      let impacted = false;
      let lastFrameAt = null;
      let elapsedVisualMs = 0;

      const stopMotion = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      };
      instance.addCleanup(stopMotion);

      const impact = () => {
        if (impacted || instance.state !== 'playing') return;
        impacted = true;
        instance.resolved.progress = 1;
        instance.resolved.currentPosition = { ...end };
        head.stop();
        trail.stop();

        const child = fx.play('explosion', {
          position: { ...end },
          direction: params.directionDegrees,
          intensity: Math.max(.6, intensity),
          hooks: params.hooks
        });
        instance.resolved.impactInstanceId = child.id;
        instance.stop('impact');
      };

      const frame = (now) => {
        if (instance.state !== 'playing') return;

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
        trail.move(point);

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
