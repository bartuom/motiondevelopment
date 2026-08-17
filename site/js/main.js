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

const SPRITE_FRAMES = 12;
const REDUCED_SPRITE_DURATION = 650;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const variants = {
  compact: {
    spriteScale: 0.76,
    spriteDuration: 350,
    sparkCount: 7,
    emberCount: 3,
    sparkDistance: 76,
    emberDistance: 56,
    particleDuration: 340,
    kick: 1,
  },
  standard: {
    spriteScale: 1,
    spriteDuration: 430,
    sparkCount: 10,
    emberCount: 6,
    sparkDistance: 112,
    emberDistance: 82,
    particleDuration: 450,
    kick: 2,
  },
  heavy: {
    spriteScale: 1.28,
    spriteDuration: 500,
    sparkCount: 14,
    emberCount: 8,
    sparkDistance: 150,
    emberDistance: 110,
    particleDuration: 540,
    kick: 3,
  },
};

let activeVariant = 'standard';
let replayTimer = 0;
const particlePool = [];

for (let i = 0; i < 24; i += 1) {
  const particle = document.createElement('span');
  particle.className = 'particle';
  particleRoot.appendChild(particle);
  particlePool.push(particle);
}

function updateAnimationFps() {
  const settings = variants[activeVariant];
  const duration = reducedMotion.matches ? REDUCED_SPRITE_DURATION : settings.spriteDuration;
  animationFpsOutput.textContent = (SPRITE_FRAMES / (duration / 1000)).toFixed(1);
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
  stage.classList.remove('is-kicked');
  sprite.classList.remove('is-playing');
  flash.classList.remove('is-playing');
  bloom.classList.remove('is-playing');
  shockRingA.classList.remove('is-playing');
  shockRingB.classList.remove('is-playing');
  particlePool.forEach((particle) => particle.classList.remove('is-playing'));
}

function configureParticles(settings) {
  const sparkColors = ['#fff1a8', '#ffd05c', '#ffad35', '#ff7626'];
  const emberColors = ['#ffb03a', '#ff7d28', '#e95622', '#c94620'];
  const total = settings.sparkCount + settings.emberCount;

  particlePool.forEach((particle, index) => {
    particle.className = 'particle';
    particle.hidden = index >= total;
    if (particle.hidden) return;

    if (index < settings.sparkCount) {
      const jitter = ((index * 17) % 25) - 12;
      const rotation = (360 / settings.sparkCount) * index + jitter;
      const distance = settings.sparkDistance * (0.76 + (index % 5) * 0.075);

      particle.classList.add('spark');
      particle.style.setProperty('--rotation', `${rotation.toFixed(1)}deg`);
      particle.style.setProperty('--distance', `${distance.toFixed(1)}px`);
      particle.style.setProperty('--length', `${17 + (index % 4) * 5}px`);
      particle.style.setProperty('--thickness', `${1.5 + (index % 2) * 0.8}px`);
      particle.style.setProperty('--duration', `${Math.round(settings.particleDuration * (0.72 + (index % 3) * 0.08))}ms`);
      particle.style.setProperty('--delay', `${8 + (index % 4) * 7}ms`);
      particle.style.setProperty('--particle-color', sparkColors[index % sparkColors.length]);
      return;
    }

    const emberIndex = index - settings.sparkCount;
    const jitter = ((emberIndex * 23) % 31) - 15;
    const angle = ((360 / settings.emberCount) * emberIndex + jitter) * Math.PI / 180;
    const distance = settings.emberDistance * (0.58 + (emberIndex % 4) * 0.12);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance + 14 + (emberIndex % 3) * 5;

    particle.classList.add('ember');
    particle.style.setProperty('--x', `${x.toFixed(1)}px`);
    particle.style.setProperty('--y', `${y.toFixed(1)}px`);
    particle.style.setProperty('--size', `${2.5 + (emberIndex % 3) * 1.2}px`);
    particle.style.setProperty('--duration', `${settings.particleDuration + 70 + (emberIndex % 3) * 38}ms`);
    particle.style.setProperty('--delay', `${28 + (emberIndex % 4) * 12}ms`);
    particle.style.setProperty('--particle-color', emberColors[emberIndex % emberColors.length]);
  });
}

function playExplosion() {
  const settings = variants[activeVariant];
  resetEffect();
  configureParticles(settings);

  sprite.style.setProperty('--sprite-scale', settings.spriteScale);
  sprite.style.setProperty('--sprite-duration', `${settings.spriteDuration}ms`);
  stage.style.setProperty('--kick', `${settings.kick}px`);

  void stage.offsetWidth;

  stage.classList.add('is-kicked');
  bloom.classList.add('is-playing');
  flash.classList.add('is-playing');
  shockRingA.classList.add('is-playing');
  shockRingB.classList.add('is-playing');
  sprite.classList.add('is-playing');
  particlePool.forEach((particle) => {
    if (!particle.hidden) particle.classList.add('is-playing');
  });

  replayTimer = window.setTimeout(() => {
    resetEffect();
  }, Math.max(settings.spriteDuration + 140, settings.particleDuration + 180));
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

reducedMotion.addEventListener('change', updateAnimationFps);

setVariant('standard');
requestAnimationFrame(measureAppFps);
window.setTimeout(playExplosion, 360);
