const sprite = document.querySelector('#explosion-sprite');
const flash = document.querySelector('#explosion-flash');
const particleRoot = document.querySelector('#particles');
const playButton = document.querySelector('#play-button');
const variantButtons = [...document.querySelectorAll('[data-variant]')];

const variants = {
  compact: {
    spriteScale: 0.72,
    spriteDuration: 430,
    particleCount: 8,
    particleDistance: 54,
    particleDuration: 360,
  },
  standard: {
    spriteScale: 1,
    spriteDuration: 520,
    particleCount: 12,
    particleDistance: 76,
    particleDuration: 430,
  },
  heavy: {
    spriteScale: 1.32,
    spriteDuration: 610,
    particleCount: 16,
    particleDistance: 104,
    particleDuration: 520,
  },
};

let activeVariant = 'standard';
let replayTimer = 0;
const particlePool = [];

for (let i = 0; i < 16; i += 1) {
  const particle = document.createElement('span');
  particle.className = 'particle';
  particleRoot.appendChild(particle);
  particlePool.push(particle);
}

function setVariant(name) {
  activeVariant = name;
  variantButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.variant === name);
  });
}

function resetEffect() {
  clearTimeout(replayTimer);
  sprite.classList.remove('is-playing');
  flash.classList.remove('is-playing');
  particlePool.forEach((particle) => particle.classList.remove('is-playing'));
}

function configureParticles(settings) {
  const colors = ['#ffd36a', '#ffac3d', '#ff7a2e', '#f05a24'];

  particlePool.forEach((particle, index) => {
    particle.classList.remove('is-playing');

    if (index >= settings.particleCount) {
      particle.hidden = true;
      return;
    }

    particle.hidden = false;
    const angle = (Math.PI * 2 * index) / settings.particleCount + (index % 2 ? 0.12 : -0.08);
    const distance = settings.particleDistance * (0.72 + (index % 4) * 0.11);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    particle.style.setProperty('--x', `${x.toFixed(1)}px`);
    particle.style.setProperty('--y', `${y.toFixed(1)}px`);
    particle.style.setProperty('--size', `${3 + (index % 3)}px`);
    particle.style.setProperty('--duration', `${settings.particleDuration + (index % 3) * 35}ms`);
    particle.style.setProperty('--delay', `${index % 4 * 7}ms`);
    particle.style.setProperty('--particle-color', colors[index % colors.length]);
  });
}

function playExplosion() {
  const settings = variants[activeVariant];
  resetEffect();
  configureParticles(settings);

  sprite.style.setProperty('--sprite-scale', settings.spriteScale);
  sprite.style.setProperty('--sprite-duration', `${settings.spriteDuration}ms`);

  void sprite.offsetWidth;

  sprite.classList.add('is-playing');
  flash.classList.add('is-playing');
  particlePool.forEach((particle, index) => {
    if (index < settings.particleCount) particle.classList.add('is-playing');
  });

  replayTimer = window.setTimeout(() => {
    sprite.classList.remove('is-playing');
    flash.classList.remove('is-playing');
    particlePool.forEach((particle) => particle.classList.remove('is-playing'));
  }, settings.spriteDuration + 120);
}

variantButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setVariant(button.dataset.variant);
    playExplosion();
  });
});

playButton.addEventListener('click', playExplosion);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat) {
    event.preventDefault();
    playExplosion();
  }
});

setVariant('standard');
