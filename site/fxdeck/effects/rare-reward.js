import { burstTracked, runHook, scheduleAsync, spawnTracked } from './effect-utils.js?v=p3.6.3';

const RARE_REWARD_SPEC = {
  label: 'Rare Reward',
  revision: 'P3.9.0 card-space reveal proof / v1',
  summary: 'Large UI/card-space reward reveal composed from one owned DOM/SVG card visual, staged browser animation, particle halo/shards/glitter and a subtle screen accent.',
  duration: 2200,
  card: { width: 224, height: 320 },
  timings: {
    cardIn: 0,
    preflash: 20,
    crest: 260,
    shards: 300,
    glitter: 500,
    title: 560,
    crown: 760,
    settle: 1040,
    fade: 1840,
    screenKick: 320
  },
  particles: {
    preflash: 12,
    shards: 18,
    glitter: 26,
    crown: 10
  }
};

const RARE_REWARD_ASSETS = [
  { target: 'particles', src: './assets/fxdeck-reward-shard.svg', width: 28, height: 56 }
];

const CARD_HTML = `
  <div class="fxdeck-reward-aura"></div>
  <div class="fxdeck-reward-rays"></div>
  <div class="fxdeck-reward-card">
    <div class="fxdeck-reward-card__inner"></div>
    <div class="fxdeck-reward-card__sheen"></div>
    <div class="fxdeck-reward-card__crest" aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        <path d="M50 5 61 34 92 38 68 58 75 89 50 72 25 89 32 58 8 38 39 34Z"/>
        <circle cx="50" cy="50" r="19"/>
        <path class="fxdeck-reward-card__rune" d="M50 28 57 44 73 50 57 56 50 72 43 56 27 50 43 44Z"/>
      </svg>
    </div>
    <div class="fxdeck-reward-card__rarity">LEGENDARY DROP</div>
    <div class="fxdeck-reward-card__title">ASTRAL RELIC</div>
    <div class="fxdeck-reward-card__subtitle">RARE REWARD</div>
    <div class="fxdeck-reward-card__pip"><i></i><i></i><i></i></div>
  </div>
  <div class="fxdeck-reward-flare"></div>
`;

function scaledCount(base, intensity, floorScale = .65) {
  return Math.max(1, Math.round(base * Math.max(floorScale, intensity)));
}

function burstBase(count, particles) {
  return {
    autoPlay: true,
    startCount: count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: .06, wait: false },
    particles
  };
}

function preflashOptions(spec, intensity) {
  return burstBase(scaledCount(spec.particles.preflash, intensity, .75), {
    color: { value: ['#fff8ce', '#ffe06b', '#e7b7ff'] },
    shape: { type: 'circle' },
    opacity: { value: { min: .45, max: .95 }, animation: { enable: true, speed: 3.4, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: { min: 4, max: 11 * Math.min(1.3, intensity) }, animation: { enable: true, speed: 5, sync: false, startValue: 'max', destroy: 'min' } },
    move: { enable: true, direction: 'right', angle: { value: 360, offset: 0 }, random: true, straight: false, speed: { min: 2.2, max: 6.5 }, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: { min: .18, max: .34 }, sync: false } }
  });
}

function shardOptions(spec, intensity, directionDegrees) {
  const speedScale = Math.max(.75, Math.sqrt(intensity));
  return burstBase(scaledCount(spec.particles.shards, intensity), {
    color: { value: '#ffffff' },
    shape: { type: 'image', options: { image: { src: './assets/fxdeck-reward-shard.svg', width: 28, height: 56, replaceColor: false } } },
    opacity: { value: { min: .5, max: .95 }, animation: { enable: true, speed: 2.2, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: { min: 6, max: 15 * Math.min(1.25, intensity) } },
    rotate: { value: { min: 0, max: 360 }, direction: 'random', animation: { enable: true, speed: 55, sync: false } },
    move: { enable: true, direction: 'right', angle: { value: 330, offset: directionDegrees }, random: true, straight: false, speed: { min: 5.5 * speedScale, max: 13.5 * speedScale }, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: { min: .42, max: .76 }, sync: false } }
  });
}

function glitterOptions(spec, intensity) {
  return burstBase(scaledCount(spec.particles.glitter, intensity, .7), {
    color: { value: ['#ffffff', '#ffe99a', '#e2b4ff', '#a993ff'] },
    shape: { type: 'circle' },
    opacity: { value: { min: .35, max: 1 }, animation: { enable: true, speed: 2.6, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: { min: 1.5, max: 5.5 } },
    move: { enable: true, direction: 'right', angle: { value: 360, offset: 0 }, random: true, straight: false, speed: { min: 1.2, max: 4.2 }, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: { min: .55, max: 1.1 }, sync: false } }
  });
}

function crownOptions(spec, intensity) {
  return burstBase(scaledCount(spec.particles.crown, intensity, .75), {
    color: { value: ['#fff7c2', '#ffd76c', '#ffffff'] },
    shape: { type: 'circle' },
    opacity: { value: { min: .45, max: .9 }, animation: { enable: true, speed: 1.5, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: { min: 3, max: 8 } },
    move: { enable: true, direction: 'top', angle: { value: 58, offset: 0 }, random: true, straight: false, speed: { min: 2.4, max: 5.8 }, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: { min: .7, max: 1.2 }, sync: false } }
  });
}

function ownAnimation(instance, element, keyframes, options) {
  if (!element?.animate) return null;
  const animation = element.animate(keyframes, options);
  instance.addCleanup(() => animation.cancel());
  return animation;
}

function cardVisualOptions(intensity, directionDegrees) {
  const scale = Math.max(.82, Math.min(1.18, .9 + intensity * .1));
  return {
    className: 'fxdeck-reward-shell',
    html: CARD_HTML,
    cssVars: {
      '--fxdeck-reward-scale': scale.toFixed(3),
      '--fxdeck-reward-angle': `${directionDegrees}deg`
    }
  };
}

function animateCard(instance, root, spec, intensity, directionDegrees) {
  const card = root.querySelector('.fxdeck-reward-card');
  const aura = root.querySelector('.fxdeck-reward-aura');
  const rays = root.querySelector('.fxdeck-reward-rays');
  const crest = root.querySelector('.fxdeck-reward-card__crest');
  const rarity = root.querySelector('.fxdeck-reward-card__rarity');
  const title = root.querySelector('.fxdeck-reward-card__title');
  const subtitle = root.querySelector('.fxdeck-reward-card__subtitle');
  const sheen = root.querySelector('.fxdeck-reward-card__sheen');
  const flare = root.querySelector('.fxdeck-reward-flare');
  const pips = root.querySelector('.fxdeck-reward-card__pip');

  ownAnimation(instance, card, [
    { opacity: 0, transform: 'perspective(900px) rotateY(-78deg) rotateZ(-5deg) scale(.38)' },
    { opacity: 1, transform: 'perspective(900px) rotateY(12deg) rotateZ(1.5deg) scale(1.07)', offset: .58 },
    { opacity: 1, transform: 'perspective(900px) rotateY(0deg) rotateZ(0deg) scale(1)' }
  ], { duration: 620, easing: 'cubic-bezier(.12,.82,.18,1)', fill: 'forwards' });

  ownAnimation(instance, aura, [
    { opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' },
    { opacity: .92, transform: `translate(-50%,-50%) scale(${1.05 + intensity * .08})`, offset: .36 },
    { opacity: .38, transform: 'translate(-50%,-50%) scale(1)' }
  ], { duration: 980, easing: 'cubic-bezier(.08,.72,.18,1)', fill: 'forwards' });

  ownAnimation(instance, rays, [
    { opacity: 0, transform: `translate(-50%,-50%) rotate(${directionDegrees - 38}deg) scale(.42)` },
    { opacity: .7, transform: `translate(-50%,-50%) rotate(${directionDegrees + 8}deg) scale(1.08)`, offset: .38 },
    { opacity: .24, transform: `translate(-50%,-50%) rotate(${directionDegrees + 28}deg) scale(1)` }
  ], { duration: 1250, easing: 'cubic-bezier(.1,.72,.18,1)', fill: 'forwards' });

  instance.timeout(() => {
    ownAnimation(instance, crest, [
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.15) rotate(-22deg)' },
      { opacity: 1, transform: 'translate(-50%,-50%) scale(1.16) rotate(4deg)', offset: .55 },
      { opacity: 1, transform: 'translate(-50%,-50%) scale(1) rotate(0)' }
    ], { duration: 520, easing: 'cubic-bezier(.12,.84,.18,1)', fill: 'forwards' });
  }, spec.timings.crest);

  instance.timeout(() => {
    ownAnimation(instance, [rarity, title, subtitle, pips].filter(Boolean)[0], [{ opacity: 0 }, { opacity: 1 }], { duration: 1, fill: 'forwards' });
    [rarity, title, subtitle, pips].forEach((element, index) => {
      ownAnimation(instance, element, [
        { opacity: 0, transform: 'translateY(12px)', filter: 'blur(3px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }
      ], { duration: 360 + index * 55, delay: index * 35, easing: 'cubic-bezier(.16,.72,.18,1)', fill: 'forwards' });
    });
  }, spec.timings.title);

  instance.timeout(() => {
    ownAnimation(instance, sheen, [
      { opacity: 0, transform: 'translate3d(-150%,0,0) rotate(14deg)' },
      { opacity: .8, offset: .35 },
      { opacity: 0, transform: 'translate3d(170%,0,0) rotate(14deg)' }
    ], { duration: 720, easing: 'cubic-bezier(.18,.68,.22,1)', fill: 'forwards' });
  }, 420);

  instance.timeout(() => {
    ownAnimation(instance, flare, [
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.2)' },
      { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .24 },
      { opacity: 0, transform: 'translate(-50%,-50%) scale(1.8)' }
    ], { duration: 480, easing: 'cubic-bezier(.08,.76,.16,1)', fill: 'forwards' });
  }, spec.timings.shards - 50);

  instance.timeout(() => {
    ownAnimation(instance, card, [
      { transform: 'perspective(900px) rotateY(0deg) translateY(0) scale(1)' },
      { transform: 'perspective(900px) rotateY(0deg) translateY(-5px) scale(1.012)', offset: .45 },
      { transform: 'perspective(900px) rotateY(0deg) translateY(0) scale(1)' }
    ], { duration: 520, easing: 'ease-in-out', fill: 'forwards' });
  }, spec.timings.settle);

  instance.timeout(() => {
    ownAnimation(instance, root, [
      { opacity: 1 },
      { opacity: 0, transform: 'translate3d(var(--fxdeck-visual-x), var(--fxdeck-visual-y), 0) translate(-50%,-50%) scale(calc(var(--fxdeck-reward-scale) * .94))' }
    ], { duration: spec.duration - spec.timings.fade, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
  }, spec.timings.fade);
}

function rareRewardDefinition() {
  const spec = RARE_REWARD_SPEC;

  return {
    id: 'rareReward',
    version: 'v1',
    variant: 'default',
    default: true,
    label: spec.label,
    summary: spec.summary,
    lifecycle: 'ui-reveal',
    spec: structuredClone(spec),
    assets: structuredClone(RARE_REWARD_ASSETS),

    async play({ params, particles: particleAdapter, adapters, instance }) {
      if (!particleAdapter?.burst) throw new Error('rareReward requires the particles adapter.');
      const visualAdapter = adapters?.visuals;
      if (!visualAdapter?.spawn) throw new Error('rareReward requires the visuals adapter.');

      const intensity = Math.max(.5, Math.min(2, params.intensity));
      const visual = await spawnTracked(instance, visualAdapter, cardVisualOptions(intensity, params.directionDegrees), params.position);
      if (!visual || instance.state !== 'playing') return;

      instance.resolved = {
        intensity,
        directionDegrees: params.directionDegrees,
        position: { ...params.position },
        cardSize: { ...spec.card },
        duration: spec.duration,
        visualMode: 'owned DOM/SVG composite card',
        particleLayers: {
          preflash: scaledCount(spec.particles.preflash, intensity, .75),
          shards: scaledCount(spec.particles.shards, intensity),
          glitter: scaledCount(spec.particles.glitter, intensity, .7),
          crown: scaledCount(spec.particles.crown, intensity, .75)
        },
        priorities: { preflash: 'hero', shards: 'high', glitter: 'medium', crown: 'high' },
        timings: structuredClone(spec.timings)
      };

      animateCard(instance, visual.element, spec, intensity, params.directionDegrees);

      scheduleAsync(instance, spec.timings.preflash, () => burstTracked(instance, particleAdapter, preflashOptions(spec, intensity), params.position, { priority: 'hero' }));
      scheduleAsync(instance, spec.timings.shards, () => burstTracked(instance, particleAdapter, shardOptions(spec, intensity, params.directionDegrees), params.position, { priority: 'high' }));
      scheduleAsync(instance, spec.timings.glitter, () => burstTracked(instance, particleAdapter, glitterOptions(spec, intensity), params.position, { priority: 'medium' }));
      scheduleAsync(instance, spec.timings.crown, () => burstTracked(instance, particleAdapter, crownOptions(spec, intensity), { x: params.position.x, y: params.position.y - spec.card.height * .28 }, { priority: 'high' }));

      instance.timeout(() => runHook(instance, params.hooks, 'screenKick', {
        position: { ...params.position },
        direction: { ...params.direction },
        directionDegrees: params.directionDegrees,
        intensity,
        distance: 1.4 + intensity * .65
      }), spec.timings.screenKick);

      instance.timeout(() => instance.stop('completed'), spec.duration);
    }
  };
}

export function registerRareReward(fx) {
  fx.register(rareRewardDefinition());
}
