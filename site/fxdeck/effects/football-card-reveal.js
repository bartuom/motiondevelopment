import { burstTracked, runHook, scheduleAsync, spawnTracked } from './effect-utils.js?v=p3.6.3';

const SPEC = {
  label: 'Football Card Reveal',
  revision: 'P3.10.0 football pack-opening reveal / v1 elite',
  summary: 'Interactive football collectible-card reveal: premium back-card idle, intermittent shimmer, anticipation, 3D flip, staged information reveal, rarity hit, particle accents and a persistent readable final pose.',
  card: { width: 246, height: 354 },
  timings: {
    anticipation: 110,
    eliteTell: 80,
    flipStart: 110,
    edgeHit: 320,
    front: 340,
    nationality: 430,
    position: 510,
    club: 590,
    rating: 670,
    portrait: 750,
    name: 840,
    rarityHit: 930,
    secondary: 1000,
    settleStart: 1050,
    settleEnd: 1420
  },
  particles: {
    edgeStreaks: 16,
    edgeSparks: 14,
    rarityShards: 18,
    rarityGlitter: 12
  }
};

const CARD_HTML = `
  <div class="fxdeck-football-aura"></div>
  <div class="fxdeck-football-float">
    <div class="fxdeck-football-flipper">
      <section class="fxdeck-football-face fxdeck-football-back">
        <div class="fxdeck-football-back__pattern"></div>
        <div class="fxdeck-football-back__stadium"></div>
        <div class="fxdeck-football-back__badge"><b>FC</b><span>ELITE SERIES</span></div>
        <div class="fxdeck-football-back__micro">COLLECT • BUILD • COMPETE</div>
        <div class="fxdeck-football-shimmer fxdeck-football-shimmer--back"></div>
        <div class="fxdeck-football-corner fxdeck-football-corner--a"></div>
        <div class="fxdeck-football-corner fxdeck-football-corner--b"></div>
      </section>

      <section class="fxdeck-football-face fxdeck-football-front">
        <div class="fxdeck-football-front__energy"></div>
        <div class="fxdeck-football-front__stadium"></div>
        <div class="fxdeck-football-front__header">
          <div class="fxdeck-football-rating"><strong>92</strong><span>ELITE</span></div>
          <div class="fxdeck-football-position">ST</div>
        </div>
        <div class="fxdeck-football-nationality"><i></i><span>NOVARA</span></div>
        <div class="fxdeck-football-club"><b>NX</b><span>NOVA FC</span></div>
        <div class="fxdeck-football-player">
          <div class="fxdeck-football-player__halo"></div>
          <svg viewBox="0 0 180 220" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="fcPlayerBody" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#f3f5f7"/>
                <stop offset=".48" stop-color="#adb7c1"/>
                <stop offset="1" stop-color="#555f69"/>
              </linearGradient>
              <linearGradient id="fcPlayerKit" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#15283b"/>
                <stop offset=".58" stop-color="#224e75"/>
                <stop offset="1" stop-color="#0b1825"/>
              </linearGradient>
            </defs>
            <circle cx="91" cy="47" r="31" fill="url(#fcPlayerBody)"/>
            <path d="M63 39c9-30 52-33 62 0-12-11-46-13-62 0Z" fill="#202b35"/>
            <path d="M74 72c8 9 26 10 35 0l6 21-47 1Z" fill="#9aa4ad"/>
            <path d="M45 101c27-19 70-20 94 0l21 89H20Z" fill="url(#fcPlayerKit)"/>
            <path d="M72 101 91 127l20-26 13 4-12 76H69l-11-76Z" fill="#e8c768" opacity=".82"/>
            <path d="M91 127v54" stroke="#f5e4a7" stroke-width="3" opacity=".55"/>
            <path d="M45 104 20 190M139 104l21 86" stroke="#6289aa" stroke-width="8" opacity=".55"/>
          </svg>
        </div>
        <div class="fxdeck-football-name"><strong>ADRIAN NOVAK</strong><span>ELITE STRIKER</span></div>
        <div class="fxdeck-football-stats">
          <span><b>94</b>PAC</span><span><b>95</b>SHO</span><span><b>89</b>PAS</span>
          <span><b>93</b>DRI</span><span><b>48</b>DEF</span><span><b>86</b>PHY</span>
        </div>
        <div class="fxdeck-football-shimmer fxdeck-football-shimmer--front"></div>
        <div class="fxdeck-football-front__border"></div>
      </section>
    </div>
  </div>
  <div class="fxdeck-football-impact-flash"></div>
  <div class="fxdeck-football-ground-glow"></div>
`;

function count(base, intensity, minimumScale = .6) {
  return Math.max(1, Math.round(base * Math.max(minimumScale, Math.min(1.5, .5 + intensity * .5))));
}

function burstBase(startCount, particles) {
  return {
    autoPlay: true,
    startCount,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: .06, wait: false },
    particles
  };
}

function edgeStreakOptions(intensity, directionDegrees) {
  const energy = Math.max(.7, Math.sqrt(intensity));
  return burstBase(count(SPEC.particles.edgeStreaks, intensity), {
    color: { value: ['#ffffff', '#fff0ae', '#7ed8ff'] },
    shape: { type: 'square' },
    opacity: { value: { min: .58, max: 1 }, animation: { enable: true, speed: 4.2, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: { min: 2, max: 5.2 * Math.min(1.25, intensity) } },
    rotate: { value: { min: directionDegrees - 24, max: directionDegrees + 24 }, direction: 'random' },
    move: { enable: true, direction: 'right', angle: { value: 115, offset: directionDegrees }, random: true, straight: false, speed: { min: 10 * energy, max: 22 * energy }, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: { min: .18, max: .36 }, sync: false } }
  });
}

function edgeSparkOptions(intensity) {
  return burstBase(count(SPEC.particles.edgeSparks, intensity), {
    color: { value: ['#ffffff', '#ffe69b', '#96ddff'] },
    shape: { type: 'circle' },
    opacity: { value: { min: .45, max: .98 }, animation: { enable: true, speed: 3.6, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: { min: 1.5, max: 5 } },
    move: { enable: true, direction: 'right', angle: { value: 360, offset: 0 }, random: true, straight: false, speed: { min: 3.5, max: 9 }, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: { min: .22, max: .46 }, sync: false } }
  });
}

function rarityShardOptions(intensity, directionDegrees) {
  const energy = Math.max(.78, Math.sqrt(intensity));
  return burstBase(count(SPEC.particles.rarityShards, intensity), {
    color: { value: ['#fff7c4', '#f0cc68', '#91dcff', '#ffffff'] },
    shape: { type: 'square' },
    opacity: { value: { min: .42, max: .94 }, animation: { enable: true, speed: 2.4, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: { min: 3, max: 8.5 * Math.min(1.25, intensity) } },
    rotate: { value: { min: 20, max: 70 }, direction: 'random', animation: { enable: true, speed: 48, sync: false } },
    move: { enable: true, direction: 'right', angle: { value: 300, offset: directionDegrees }, random: true, straight: false, speed: { min: 4.8 * energy, max: 12 * energy }, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: { min: .38, max: .72 }, sync: false } }
  });
}

function rarityGlitterOptions(intensity) {
  return burstBase(count(SPEC.particles.rarityGlitter, intensity, .7), {
    color: { value: ['#ffffff', '#fff1a6', '#78d8ff'] },
    shape: { type: 'circle' },
    opacity: { value: { min: .28, max: .88 }, animation: { enable: true, speed: 1.8, sync: false, startValue: 'max', destroy: 'min' } },
    size: { value: { min: 1, max: 4.5 } },
    move: { enable: true, direction: 'top', angle: { value: 130, offset: 0 }, random: true, straight: false, speed: { min: 1.2, max: 4.5 }, outModes: { default: 'destroy' } },
    life: { count: 1, duration: { value: { min: .55, max: 1.05 }, sync: false } }
  });
}

function ownAnimation(instance, element, keyframes, options) {
  if (!element?.animate) return null;
  const animation = element.animate(keyframes, options);
  instance.addCleanup(() => animation.cancel());
  return animation;
}

function stopAnimations(list) {
  for (const animation of list.splice(0)) animation?.cancel?.();
}

function visualEnergy(root, intensity, directionDegrees) {
  const energy = Math.max(.5, Math.min(2, intensity));
  root.style.setProperty('--fc-energy', energy.toFixed(2));
  root.style.setProperty('--fc-light-angle', `${directionDegrees}deg`);
  root.style.setProperty('--fc-glow-alpha', (Math.min(.62, .18 + energy * .2)).toFixed(3));
  root.style.setProperty('--fc-flash-alpha', (Math.min(1, .62 + energy * .19)).toFixed(3));
  root.style.setProperty('--fc-border-alpha', (Math.min(1, .55 + energy * .2)).toFixed(3));
}

function installIdle(instance, root) {
  const idle = [];
  const float = root.querySelector('.fxdeck-football-float');
  const shimmer = root.querySelector('.fxdeck-football-shimmer--back');
  const aura = root.querySelector('.fxdeck-football-aura');

  idle.push(ownAnimation(instance, float, [
    { transform: 'translate3d(0,0,0) scale(1)' },
    { transform: 'translate3d(0,-2px,0) scale(1.012)', offset: .48 },
    { transform: 'translate3d(0,0,0) scale(1)' }
  ], { duration: 2600, iterations: Infinity, easing: 'ease-in-out' }));

  idle.push(ownAnimation(instance, shimmer, [
    { opacity: 0, transform: 'translate3d(-190%,0,0) rotate(var(--fc-light-angle))' },
    { opacity: .12, offset: .08 },
    { opacity: .52, transform: 'translate3d(-10%,0,0) rotate(var(--fc-light-angle))', offset: .19 },
    { opacity: 0, transform: 'translate3d(180%,0,0) rotate(var(--fc-light-angle))', offset: .34 },
    { opacity: 0, transform: 'translate3d(180%,0,0) rotate(var(--fc-light-angle))' }
  ], { duration: 2350, iterations: Infinity, easing: 'cubic-bezier(.16,.7,.18,1)' }));

  idle.push(ownAnimation(instance, aura, [
    { opacity: .24, transform: 'translate(-50%,-50%) scale(.96)' },
    { opacity: .38, transform: 'translate(-50%,-50%) scale(1.025)', offset: .5 },
    { opacity: .24, transform: 'translate(-50%,-50%) scale(.96)' }
  ], { duration: 3200, iterations: Infinity, easing: 'ease-in-out' }));

  return idle.filter(Boolean);
}

function revealField(instance, element, delay, keyframes = null, duration = 290) {
  instance.timeout(() => {
    ownAnimation(instance, element, keyframes ?? [
      { opacity: 0, transform: 'translateY(10px) scale(.96)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration, easing: 'cubic-bezier(.14,.78,.18,1)', fill: 'forwards' });
  }, delay);
}

function createRevealController({ instance, visual, particleAdapter, hooks }) {
  const root = visual.element;
  const idleAnimations = installIdle(instance, root);
  let revealed = false;
  let revealing = false;

  const updateResolved = (state) => {
    instance.resolved = {
      ...(instance.resolved ?? {}),
      state,
      intensity: instance.params.intensity,
      directionDegrees: instance.params.directionDegrees,
      position: { ...instance.params.position }
    };
  };

  const triggerReveal = () => {
    if (revealing || revealed || instance.state !== 'playing') return false;
    revealing = true;
    stopAnimations(idleAnimations);

    const intensity = Math.max(.5, Math.min(2, instance.params.intensity));
    const directionDegrees = instance.params.directionDegrees;
    visualEnergy(root, intensity, directionDegrees);
    updateResolved('revealing');

    const float = root.querySelector('.fxdeck-football-float');
    const flipper = root.querySelector('.fxdeck-football-flipper');
    const flash = root.querySelector('.fxdeck-football-impact-flash');
    const aura = root.querySelector('.fxdeck-football-aura');
    const ground = root.querySelector('.fxdeck-football-ground-glow');
    const frontEnergy = root.querySelector('.fxdeck-football-front__energy');
    const frontBorder = root.querySelector('.fxdeck-football-front__border');
    const frontShimmer = root.querySelector('.fxdeck-football-shimmer--front');

    const overshoot = 1.02 + Math.min(.055, intensity * .017);

    ownAnimation(instance, float, [
      { transform: 'translate3d(0,0,0) scale(1)' },
      { transform: `translate3d(0,-2px,18px) scale(${overshoot})`, offset: .72 },
      { transform: 'translate3d(0,0,0) scale(1)' }
    ], { duration: SPEC.timings.front, easing: 'cubic-bezier(.16,.72,.18,1)', fill: 'forwards' });

    instance.timeout(() => {
      root.classList.add('is-elite-tell');
      ownAnimation(instance, aura, [
        { opacity: .28, transform: 'translate(-50%,-50%) scale(.96)' },
        { opacity: .86, transform: 'translate(-50%,-50%) scale(1.07)' },
        { opacity: .48, transform: 'translate(-50%,-50%) scale(1)' }
      ], { duration: 260, easing: 'cubic-bezier(.12,.78,.18,1)', fill: 'forwards' });
    }, SPEC.timings.eliteTell);

    instance.timeout(() => {
      ownAnimation(instance, flipper, [
        { transform: 'rotateY(-5deg)' },
        { transform: 'rotateY(82deg)', offset: .48 },
        { transform: 'rotateY(98deg)', offset: .56 },
        { transform: 'rotateY(188deg)', offset: .88 },
        { transform: 'rotateY(180deg)' }
      ], { duration: 430, easing: 'cubic-bezier(.18,.72,.16,1)', fill: 'forwards' });
    }, SPEC.timings.flipStart);

    instance.timeout(() => {
      root.classList.add('is-impacting');
      ownAnimation(instance, flash, [
        { opacity: 0, transform: 'translate(-50%,-50%) scale(.2)' },
        { opacity: Number(root.style.getPropertyValue('--fc-flash-alpha')) || 1, transform: 'translate(-50%,-50%) scale(.78)', offset: .18 },
        { opacity: 0, transform: 'translate(-50%,-50%) scale(2.05)' }
      ], { duration: 230, easing: 'cubic-bezier(.08,.78,.14,1)', fill: 'forwards' });

      burstTracked(instance, particleAdapter, edgeStreakOptions(intensity, directionDegrees), instance.params.position, { priority: 'hero' });
      burstTracked(instance, particleAdapter, edgeSparkOptions(intensity), instance.params.position, { priority: 'high' });

      runHook(instance, hooks, 'screenKick', {
        position: { ...instance.params.position },
        direction: { ...instance.params.direction },
        directionDegrees,
        intensity,
        distance: .7 + intensity * 1.1
      });
      runHook(instance, hooks, 'footballCardBeat', { beat: 'edge-hit', intensity, directionDegrees });
    }, SPEC.timings.edgeHit);

    instance.timeout(() => {
      root.classList.add('is-front');
      ownAnimation(instance, ground, [
        { opacity: .1, transform: 'translate(-50%,-50%) scale(.7)' },
        { opacity: .72, transform: 'translate(-50%,-50%) scale(1.08)', offset: .35 },
        { opacity: .28, transform: 'translate(-50%,-50%) scale(1)' }
      ], { duration: 720, easing: 'cubic-bezier(.1,.72,.18,1)', fill: 'forwards' });
    }, SPEC.timings.front);

    revealField(instance, root.querySelector('.fxdeck-football-nationality'), SPEC.timings.nationality);
    revealField(instance, root.querySelector('.fxdeck-football-position'), SPEC.timings.position);
    revealField(instance, root.querySelector('.fxdeck-football-club'), SPEC.timings.club);
    revealField(instance, root.querySelector('.fxdeck-football-rating'), SPEC.timings.rating, [
      { opacity: 0, transform: 'translateY(8px) scale(.72)' },
      { opacity: 1, transform: 'translateY(-2px) scale(1.08)', offset: .66 },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], 340);
    revealField(instance, root.querySelector('.fxdeck-football-player'), SPEC.timings.portrait, [
      { opacity: 0, transform: 'translateY(18px) scale(1.06)', clipPath: 'inset(100% 0 0 0)' },
      { opacity: 1, transform: 'translateY(0) scale(1)', clipPath: 'inset(0 0 0 0)' }
    ], 420);
    revealField(instance, root.querySelector('.fxdeck-football-name'), SPEC.timings.name, null, 300);
    revealField(instance, root.querySelector('.fxdeck-football-stats'), SPEC.timings.name + 80, null, 320);

    instance.timeout(() => {
      root.classList.add('is-rarity-hit');
      ownAnimation(instance, frontEnergy, [
        { opacity: .18, transform: 'scale(.86)' },
        { opacity: .95, transform: `scale(${1.04 + intensity * .025})`, offset: .3 },
        { opacity: .38, transform: 'scale(1)' }
      ], { duration: 620, easing: 'cubic-bezier(.08,.72,.18,1)', fill: 'forwards' });
      ownAnimation(instance, frontBorder, [
        { opacity: .42 },
        { opacity: 1, offset: .24 },
        { opacity: .58 }
      ], { duration: 680, easing: 'ease-out', fill: 'forwards' });
      burstTracked(instance, particleAdapter, rarityShardOptions(intensity, directionDegrees), instance.params.position, { priority: 'high' });
      runHook(instance, hooks, 'footballCardBeat', { beat: 'rarity-hit', intensity, directionDegrees });
    }, SPEC.timings.rarityHit);

    scheduleAsync(instance, SPEC.timings.secondary, () => burstTracked(instance, particleAdapter, rarityGlitterOptions(intensity), {
      x: instance.params.position.x,
      y: instance.params.position.y - SPEC.card.height * .12
    }, { priority: 'medium' }));

    instance.timeout(() => {
      ownAnimation(instance, float, [
        { transform: 'translate3d(0,0,0) scale(1.045)' },
        { transform: 'translate3d(0,2px,0) scale(.986)', offset: .36 },
        { transform: 'translate3d(0,-1px,0) scale(1.009)', offset: .7 },
        { transform: 'translate3d(0,0,0) scale(1)' }
      ], { duration: SPEC.timings.settleEnd - SPEC.timings.settleStart, easing: 'cubic-bezier(.18,.72,.22,1)', fill: 'forwards' });
    }, SPEC.timings.settleStart);

    instance.timeout(() => {
      revealing = false;
      revealed = true;
      root.classList.add('is-revealed-idle');
      updateResolved('revealed');

      ownAnimation(instance, frontBorder, [
        { opacity: .48 },
        { opacity: .68, offset: .5 },
        { opacity: .48 }
      ], { duration: 3600, iterations: Infinity, easing: 'ease-in-out' });

      ownAnimation(instance, frontShimmer, [
        { opacity: 0, transform: 'translate3d(-190%,0,0) rotate(var(--fc-light-angle))' },
        { opacity: .22, transform: 'translate3d(-12%,0,0) rotate(var(--fc-light-angle))', offset: .12 },
        { opacity: 0, transform: 'translate3d(180%,0,0) rotate(var(--fc-light-angle))', offset: .22 },
        { opacity: 0, transform: 'translate3d(180%,0,0) rotate(var(--fc-light-angle))' }
      ], { duration: 4800, iterations: Infinity, easing: 'cubic-bezier(.16,.7,.18,1)' });

      runHook(instance, hooks, 'footballCardBeat', { beat: 'settled', intensity, directionDegrees });
    }, SPEC.timings.settleEnd);

    return true;
  };

  return {
    triggerReveal,
    update(next, patch) {
      if (patch.position && visual?.move) visual.move(next.position);
      if ('intensity' in patch || 'direction' in patch) visualEnergy(root, next.intensity, next.directionDegrees);
      if (patch.state === 'reveal' || patch.reveal === true) triggerReveal();
      updateResolved(revealed ? 'revealed' : revealing ? 'revealing' : 'idle');
    }
  };
}

function definition() {
  return {
    id: 'footballCardReveal',
    version: 'v1',
    variant: 'elite',
    default: true,
    label: SPEC.label,
    summary: SPEC.summary,
    lifecycle: 'interactive-card',
    spec: structuredClone(SPEC),
    assets: [],

    async play({ params, particles: particleAdapter, adapters, instance }) {
      if (!particleAdapter?.burst) throw new Error('footballCardReveal requires the particles adapter.');
      const visualAdapter = adapters?.visuals;
      if (!visualAdapter?.spawn) throw new Error('footballCardReveal requires the visuals adapter.');

      const visual = await spawnTracked(instance, visualAdapter, {
        className: 'fxdeck-football-shell',
        html: CARD_HTML,
        attributes: { 'data-football-card-instance': instance.id },
        cssVars: { '--fc-light-angle': `${params.directionDegrees}deg` }
      }, params.position);
      if (!visual || instance.state !== 'playing') return;

      visualEnergy(visual.element, params.intensity, params.directionDegrees);
      instance.resolved = {
        state: 'idle',
        cardSize: { ...SPEC.card },
        intensity: params.intensity,
        directionDegrees: params.directionDegrees,
        position: { ...params.position },
        variant: 'elite',
        persistentAfterReveal: true,
        timings: structuredClone(SPEC.timings)
      };

      const controller = createRevealController({
        instance,
        visual,
        particleAdapter,
        hooks: params.hooks
      });

      if (typeof instance.setUpdateHandler === 'function') {
        instance.setUpdateHandler((next, patch) => controller.update(next, patch));
      }

      if (params.state === 'reveal' || params.autoReveal === true) {
        instance.timeout(() => controller.triggerReveal(), Number.isFinite(params.revealDelayMs) ? Math.max(0, params.revealDelayMs) : 120);
      }
    }
  };
}

export function registerFootballCardReveal(fx) {
  fx.register(definition());
}
