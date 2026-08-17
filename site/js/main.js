const stage = document.querySelector('#stage');
const sprite = document.querySelector('#explosion-sprite');
const flash = document.querySelector('#explosion-flash');
const bloom = document.querySelector('#blast-bloom');
const shockRingA = document.querySelector('#shock-ring-a');
const shockRingB = document.querySelector('#shock-ring-b');
const particleRoot = document.querySelector('#particles');
const playButton = document.querySelector('#play-button');
const variantButtons = [...document.querySelectorAll('[data-variant]')];
const appFpsOutput = document.querySelector('#app-fps');
const animationFpsOutput = document.querySelector('#animation-fps');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const variants = {
  small: {
    asset: './assets/explosion-small.svg',
    frames: 10,
    frameSize: 160,
    frameTimes: [0, 18, 42, 72, 110, 158, 220, 296, 386, 486],
    endTime: 570,
    spriteScale: 0.96,
    sparkCount: 8,
    emberCount: 3,
    debrisCount: 0,
    sparkDistance: 92,
    emberDistance: 64,
    particleDuration: 320,
    kick: 0.35,
    rings: 1,
  },
  big: {
    asset: './assets/explosion-big.svg',
    frames: 12,
    frameSize: 192,
    frameTimes: [0, 18, 40, 66, 98, 136, 180, 236, 306, 392, 492, 610],
    endTime: 760,
    spriteScale: 1.08,
    sparkCount: 12,
    emberCount: 6,
    debrisCount: 4,
    sparkDistance: 154,
    emberDistance: 108,
    particleDuration: 470,
    kick: 1.1,
    rings: 2,
  },
};

let activeVariant = 'small';
let replayTimer = 0;
let spriteRaf = 0;
const particlePool = [];

Object.values(variants).forEach((settings) => {
  const image = new Image();
  image.src = settings.asset;
});

for (let i = 0; i < 24; i += 1) {
  const particle = document.createElement('span');
  particle.className = 'particle';
  particleRoot.appendChild(particle);
  particlePool.push(particle);
}

function updateAnimationFps() {
  const settings = variants[activeVariant];
  const averageFps = settings.frames / (settings.endTime / 1000);
  animationFpsOutput.textContent = `~${averageFps.toFixed(1)}`;
}

function setVariant(name) {
  activeVariant = name;
  variantButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.variant === name);
  });
  updateAnimationFps();
}

function resetEffect() {
  clearTimeout(replayTimer);
  cancelAnimationFrame(spriteRaf);
  stage.classList.remove('is-kicked');
  sprite.classList.remove('is-playing');
  flash.classList.remove('is-playing');
  bloom.classList.remove('is-playing');
  shockRingA.classList.remove('is-playing');
  shockRingB.classList.remove('is-playing');
  particlePool.forEach((particle) => particle.classList.remove('is-playing'));
}

function prepareSprite(settings) {
  const sheetWidth = settings.frames * settings.frameSize;
  sprite.style.width = `${settings.frameSize}px`;
  sprite.style.height = `${settings.frameSize}px`;
  sprite.style.backgroundImage = `url("${settings.asset}")`;
  sprite.style.backgroundSize = `${sheetWidth}px ${settings.frameSize}px`;
  sprite.style.backgroundPosition = '0 0';
  sprite.style.setProperty('--sprite-scale', settings.spriteScale);
}

function playSprite(settings) {
  const startTime = performance.now();
  let lastFrame = -1;

  sprite.classList.add('is-playing');

  function tick(now) {
    const elapsed = now - startTime;
    let frame = 0;

    while (frame + 1 < settings.frameTimes.length && elapsed >= settings.frameTimes[frame + 1]) {
      frame += 1;
    }

    if (frame !== lastFrame) {
      sprite.style.backgroundPosition = `${-frame * settings.frameSize}px 0`;
      lastFrame = frame;
    }

    if (elapsed < settings.endTime) {
      spriteRaf = requestAnimationFrame(tick);
    } else {
      sprite.classList.remove('is-playing');
    }
  }

  spriteRaf = requestAnimationFrame(tick);
}

function configureParticles(settings) {
  const sparkColors = ['#fff5bc', '#ffd45b', '#ffac37', '#ff7629'];
  const emberColors = ['#ffad38', '#ff7c2b', '#e45729', '#bc4028'];
  const total = settings.sparkCount + settings.emberCount + settings.debrisCount;

  particlePool.forEach((particle, index) => {
    particle.className = 'particle';
    particle.hidden = index >= total;
    if (particle.hidden) return;

    if (index < settings.sparkCount) {
      const jitter = ((index * 19) % 31) - 15;
      const rotation = (360 / settings.sparkCount) * index + jitter;
      const distance = settings.sparkDistance * (0.72 + (index % 5) * 0.08);

      particle.classList.add('spark');
      particle.style.setProperty('--rotation', `${rotation.toFixed(1)}deg`);
      particle.style.setProperty('--distance', `${distance.toFixed(1)}px`);
      particle.style.setProperty('--length', `${14 + (index % 4) * 5}px`);
      particle.style.setProperty('--thickness', `${1.3 + (index % 2) * 0.7}px`);
      particle.style.setProperty('--duration', `${Math.round(settings.particleDuration * (0.58 + (index % 3) * 0.08))}ms`);
      particle.style.setProperty('--delay', `${28 + (index % 4) * 7}ms`);
      particle.style.setProperty('--particle-color', sparkColors[index % sparkColors.length]);
      return;
    }

    const emberStart = settings.sparkCount;
    const debrisStart = emberStart + settings.emberCount;

    if (index < debrisStart) {
      const emberIndex = index - emberStart;
      const jitter = ((emberIndex * 23) % 35) - 17;
      const angle = ((360 / settings.emberCount) * emberIndex + jitter) * Math.PI / 180;
      const distance = settings.emberDistance * (0.58 + (emberIndex % 4) * 0.13);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance + 18 + (emberIndex % 3) * 7;

      particle.classList.add('ember');
      particle.style.setProperty('--x', `${x.toFixed(1)}px`);
      particle.style.setProperty('--y', `${y.toFixed(1)}px`);
      particle.style.setProperty('--size', `${2.2 + (emberIndex % 3) * 1.1}px`);
      particle.style.setProperty('--duration', `${settings.particleDuration + 60 + (emberIndex % 3) * 45}ms`);
      particle.style.setProperty('--delay', `${72 + (emberIndex % 4) * 13}ms`);
      particle.style.setProperty('--particle-color', emberColors[emberIndex % emberColors.length]);
      return;
    }

    const debrisIndex = index - debrisStart;
    const angle = (220 + debrisIndex * 43) * Math.PI / 180;
    const distance = 74 + debrisIndex * 13;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance + 40;

    particle.classList.add('debris');
    particle.style.setProperty('--x', `${x.toFixed(1)}px`);
    particle.style.setProperty('--y', `${y.toFixed(1)}px`);
    particle.style.setProperty('--w', `${5 + debrisIndex % 2 * 3}px`);
    particle.style.setProperty('--h', `${3 + debrisIndex % 3}px`);
    particle.style.setProperty('--spin', `${180 + debrisIndex * 95}deg`);
    particle.style.setProperty('--duration', `${520 + debrisIndex * 45}ms`);
    particle.style.setProperty('--delay', `${48 + debrisIndex * 11}ms`);
  });
}

function playExplosion() {
  const settings = variants[activeVariant];
  resetEffect();
  prepareSprite(settings);
  configureParticles(settings);

  const motionFactor = reducedMotion.matches ? 0 : 1;
  stage.style.setProperty('--kick', `${settings.kick * motionFactor}px`);
  stage.style.setProperty('--ring-a-scale', settings.rings === 2 ? '4.0' : '2.7');
  stage.style.setProperty('--ring-b-scale', settings.rings === 2 ? '5.6' : '3.4');

  void stage.offsetWidth;

  if (motionFactor) stage.classList.add('is-kicked');
  bloom.classList.add('is-playing');
  flash.classList.add('is-playing');
  if (motionFactor && settings.rings >= 1) shockRingA.classList.add('is-playing');
  if (motionFactor && settings.rings >= 2) shockRingB.classList.add('is-playing');
  playSprite(settings);

  particlePool.forEach((particle) => {
    if (!particle.hidden) particle.classList.add('is-playing');
  });

  replayTimer = window.setTimeout(resetEffect, settings.endTime + 170);
}

let fpsFrames = 0;
let fpsWindowStart = performance.now();
let smoothedFps = 0;

function measureAppFps(now) {
  fpsFrames += 1;
  const elapsed = now - fpsWindowStart;

  if (elapsed >= 500) {
    const currentFps = fpsFrames * 1000 / elapsed;
    smoothedFps = smoothedFps ? smoothedFps * 0.55 + currentFps * 0.45 : currentFps;
    appFpsOutput.textContent = Math.round(smoothedFps);
    fpsFrames = 0;
    fpsWindowStart = now;
  }

  requestAnimationFrame(measureAppFps);
}

variantButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setVariant(button.dataset.variant);
    playExplosion();
  });
});

playButton.addEventListener('click', playExplosion);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat && document.activeElement?.tagName !== 'BUTTON') {
    event.preventDefault();
    playExplosion();
  }
});

setVariant('small');
requestAnimationFrame(measureAppFps);
window.setTimeout(playExplosion, 320);
