const stage = document.querySelector('#stage');
const root = document.querySelector('#effect-root');
const navButtons = [...document.querySelectorAll('[data-effect]')];
const variantRoot = document.querySelector('#variant-controls');
const playButton = document.querySelector('#play-button');
const title = document.querySelector('#effect-title');
const indexLabel = document.querySelector('#demo-index');
const description = document.querySelector('#demo-description');
const technicalStrip = document.querySelector('#technical-strip');
const appFpsOutput = document.querySelector('#app-fps');
const animationFpsOutput = document.querySelector('#animation-fps');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const effects = {
  explosion: {
    index: '01 / 06',
    title: 'Explosions',
    description: 'Two production-style sprite-sheet bursts with separate art, timing and particle behavior.',
    variants: [['small', 'Small'], ['big', 'Big']],
    technical: ['2 sprite sheets', 'hand-tuned frame timing', 'transform + opacity', 'pooled DOM particles', 'Vanilla JS'],
  },
  flash: {
    index: '02 / 06',
    title: 'Flash',
    description: 'Short gameplay flashes built only from CSS layers, with a fast white core and controlled falloff.',
    variants: [['small', 'Small'], ['big', 'Big']],
    technical: ['CSS only visuals', 'pseudo-style rays', 'transform + opacity', 'no image asset', 'mobile friendly'],
  },
  impact: {
    index: '03 / 06',
    title: 'Impact',
    description: 'Directional contact effects with recoil, asymmetric debris and a very short readable hit frame.',
    variants: [['light', 'Light'], ['heavy', 'Heavy']],
    technical: ['directional motion', 'CSS transforms', 'pooled debris', 'screen kick', 'game-feel timing'],
  },
  spell: {
    index: '04 / 06',
    title: 'Spell Effects',
    description: 'Charge, release, projectile, trail and hit sequencing using the same lightweight runtime.',
    variants: [['arcane', 'Arcane'], ['fire', 'Fire']],
    technical: ['sequenced states', 'CSS motion', 'DOM trail pool', 'single layout read on cast', 'Vanilla JS'],
  },
  draw: {
    index: '05 / 06',
    title: 'Draw Animations',
    description: 'Reward reveal motion with rarity hierarchy: anticipation, flash, flip, burst and settle.',
    variants: [['common', 'Common'], ['rare', 'Rare']],
    technical: ['CSS 3D transform', 'rarity timing', 'pooled particles', 'transform + opacity', 'UI motion'],
  },
  trails: {
    index: '06 / 06',
    title: 'Trails & Particles',
    description: 'Three small studies: pooled energy afterimages, an SVG slash and lightweight particle behaviors.',
    variants: [['energy', 'Energy Trail'], ['slash', 'Slash Trail'], ['particles', 'Particles']],
    technical: ['DOM pooling', 'SVG stroke motion', 'transform + opacity', 'small particle counts', 'mobile friendly'],
  },
};

const explosionVariants = {
  small: {
    asset: './assets/explosion-small.svg', frames: 10, frameSize: 160,
    frameTimes: [0, 18, 42, 72, 110, 158, 220, 296, 386, 486], endTime: 570,
    sparks: 8, embers: 3, debris: 0, sparkDistance: 92, emberDistance: 64, particleDuration: 320, kick: .35, rings: 1,
  },
  big: {
    asset: './assets/explosion-big.svg', frames: 12, frameSize: 192,
    frameTimes: [0, 18, 40, 66, 98, 136, 180, 236, 306, 392, 492, 610], endTime: 760,
    sparks: 12, embers: 6, debris: 4, sparkDistance: 154, emberDistance: 108, particleDuration: 470, kick: 1.1, rings: 2,
  },
};

Object.values(explosionVariants).forEach((settings) => {
  const image = new Image();
  image.src = settings.asset;
});

let activeEffect = 'explosion';
let activeVariant = 'small';
let cleanupFns = [];
let timers = [];
let localRafs = [];

function later(fn, delay) {
  const id = window.setTimeout(fn, delay);
  timers.push(id);
  return id;
}

function raf(fn) {
  const id = requestAnimationFrame(fn);
  localRafs.push(id);
  return id;
}

function clearRun() {
  timers.forEach(clearTimeout);
  localRafs.forEach(cancelAnimationFrame);
  timers = [];
  localRafs = [];
  stage.className = 'stage';
  stage.style.removeProperty('--kick');
  stage.style.removeProperty('--travel');
}

function cleanupDemo() {
  clearRun();
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
}

function restartClass(element, className = 'is-playing') {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function setAnimMetric(value) {
  animationFpsOutput.textContent = value;
}

function makeVariants(items, selected) {
  variantRoot.innerHTML = '';
  items.forEach(([value, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.variant = value;
    button.textContent = label;
    button.classList.toggle('is-active', value === selected);
    button.addEventListener('click', () => {
      activeVariant = value;
      [...variantRoot.children].forEach((item) => item.classList.toggle('is-active', item === button));
      updateVariantMetric();
      playActive();
    });
    variantRoot.appendChild(button);
  });
}

function setTechnical(items) {
  technicalStrip.innerHTML = items.map((item) => `<span>${item}</span>`).join('');
}

function updateVariantMetric() {
  if (activeEffect === 'explosion') {
    const s = explosionVariants[activeVariant];
    setAnimMetric(`~${(s.frames / (s.endTime / 1000)).toFixed(1)}`);
  } else {
    setAnimMetric('native');
  }
}

function buildExplosion() {
  root.innerHTML = `
    <div class="fx-origin"><span></span></div>
    <div class="blast-bloom" id="blast-bloom"></div>
    <div class="explosion-flash" id="explosion-flash"></div>
    <div class="shock-ring shock-ring--a" id="shock-ring-a"></div>
    <div class="shock-ring shock-ring--b" id="shock-ring-b"></div>
    <div class="explosion-sprite" id="explosion-sprite"></div>
    <div class="particles" id="explosion-particles"></div>`;
  const poolRoot = root.querySelector('#explosion-particles');
  for (let i = 0; i < 24; i += 1) poolRoot.appendChild(Object.assign(document.createElement('span'), { className: 'particle' }));
}

function configureExplosionParticles(settings) {
  const pool = [...root.querySelectorAll('.particle')];
  const sparkColors = ['#fff5bc', '#ffd45b', '#ffac37', '#ff7629'];
  const emberColors = ['#ffad38', '#ff7c2b', '#e45729', '#bc4028'];
  const total = settings.sparks + settings.embers + settings.debris;

  pool.forEach((p, index) => {
    p.className = 'particle';
    p.hidden = index >= total;
    if (p.hidden) return;

    if (index < settings.sparks) {
      const jitter = ((index * 19) % 31) - 15;
      const rotation = (360 / settings.sparks) * index + jitter;
      const distance = settings.sparkDistance * (.72 + (index % 5) * .08);
      p.classList.add('spark');
      p.style.cssText = `--rotation:${rotation}deg;--distance:${distance}px;--length:${14 + index % 4 * 5}px;--thickness:${1.3 + index % 2 * .7}px;--duration:${Math.round(settings.particleDuration * (.58 + index % 3 * .08))}ms;--delay:${28 + index % 4 * 7}ms;--particle-color:${sparkColors[index % sparkColors.length]}`;
      return;
    }

    if (index < settings.sparks + settings.embers) {
      const n = index - settings.sparks;
      const angle = (((360 / settings.embers) * n + (((n * 23) % 35) - 17)) * Math.PI) / 180;
      const distance = settings.emberDistance * (.58 + (n % 4) * .13);
      p.classList.add('ember');
      p.style.cssText = `--x:${Math.cos(angle) * distance}px;--y:${Math.sin(angle) * distance + 18 + n % 3 * 7}px;--size:${2.2 + n % 3 * 1.1}px;--duration:${settings.particleDuration + 60 + n % 3 * 45}ms;--delay:${72 + n % 4 * 13}ms;--particle-color:${emberColors[n % emberColors.length]}`;
      return;
    }

    const n = index - settings.sparks - settings.embers;
    const angle = ((220 + n * 43) * Math.PI) / 180;
    const distance = 74 + n * 13;
    p.classList.add('debris');
    p.style.cssText = `--x:${Math.cos(angle) * distance}px;--y:${Math.sin(angle) * distance + 40}px;--w:${5 + n % 2 * 3}px;--h:${3 + n % 3}px;--spin:${180 + n * 95}deg;--duration:${520 + n * 45}ms;--delay:${48 + n * 11}ms`;
  });
}

function playExplosion() {
  const settings = explosionVariants[activeVariant];
  const sprite = root.querySelector('#explosion-sprite');
  const flash = root.querySelector('#explosion-flash');
  const bloom = root.querySelector('#blast-bloom');
  const ringA = root.querySelector('#shock-ring-a');
  const ringB = root.querySelector('#shock-ring-b');
  const sheetWidth = settings.frames * settings.frameSize;

  root.querySelectorAll('.is-playing').forEach((el) => el.classList.remove('is-playing'));
  stage.classList.remove('is-kicked');
  configureExplosionParticles(settings);

  sprite.style.width = `${settings.frameSize}px`;
  sprite.style.height = `${settings.frameSize}px`;
  sprite.style.backgroundImage = `url("${settings.asset}")`;
  sprite.style.backgroundSize = `${sheetWidth}px ${settings.frameSize}px`;
  sprite.style.backgroundPosition = '0 0';

  stage.style.setProperty('--kick', `${reducedMotion.matches ? 0 : settings.kick}px`);
  stage.style.setProperty('--ring-a-scale', settings.rings === 2 ? '4' : '2.7');
  stage.style.setProperty('--ring-b-scale', settings.rings === 2 ? '5.6' : '3.4');

  void stage.offsetWidth;
  if (!reducedMotion.matches) stage.classList.add('is-kicked');
  [flash, bloom, ringA].forEach((el) => el.classList.add('is-playing'));
  if (settings.rings > 1) ringB.classList.add('is-playing');
  root.querySelectorAll('.particle:not([hidden])').forEach((el) => el.classList.add('is-playing'));
  sprite.classList.add('is-playing');

  const start = performance.now();
  let lastFrame = -1;
  function tick(now) {
    const elapsed = now - start;
    let frame = 0;
    while (frame + 1 < settings.frameTimes.length && elapsed >= settings.frameTimes[frame + 1]) frame += 1;
    if (frame !== lastFrame) {
      sprite.style.backgroundPosition = `${-frame * settings.frameSize}px 0`;
      lastFrame = frame;
    }
    if (elapsed < settings.endTime) raf(tick);
    else sprite.classList.remove('is-playing');
  }
  raf(tick);
  later(() => stage.classList.remove('is-kicked'), 160);
}

function buildFlash() {
  root.innerHTML = `
    <div class="flash-study">
      <div class="flash-bloom"></div>
      <div class="flash-core"></div>
      <div class="flash-ring"></div>
      <div class="flash-rays">${Array.from({length: 10}, (_, i) => `<span style="--i:${i}"></span>`).join('')}</div>
    </div>`;
}

function playFlash() {
  root.className = `effect-root flash-${activeVariant}`;
  restartClass(root, 'flash-playing');
  later(() => root.classList.remove('flash-playing'), activeVariant === 'big' ? 240 : 150);
}

function buildImpact() {
  root.innerHTML = `
    <div class="impact-line"></div>
    <div class="impact-projectile"></div>
    <div class="impact-target"><span></span></div>
    <div class="impact-flash"></div>
    <div class="impact-ring"></div>
    <div class="impact-burst">${Array.from({length: 10}, (_, i) => `<span style="--i:${i}"></span>`).join('')}</div>
    <div class="impact-debris">${Array.from({length: 8}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>`;
}

function playImpact() {
  root.className = `effect-root impact-${activeVariant}`;
  restartClass(root, 'impact-playing');
  if (!reducedMotion.matches && activeVariant === 'heavy') {
    stage.style.setProperty('--kick', '1.15px');
    restartClass(stage, 'is-kicked');
  }
  later(() => {
    root.classList.remove('impact-playing');
    stage.classList.remove('is-kicked');
  }, activeVariant === 'heavy' ? 430 : 310);
}

function buildSpell() {
  root.innerHTML = `
    <div class="cast-point"><span></span></div>
    <div class="spell-charge">${Array.from({length: 5}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
    <div class="spell-projectile"></div>
    <div class="spell-trails">${Array.from({length: 5}, (_, i) => `<span style="--i:${i}"></span>`).join('')}</div>
    <div class="spell-hit"><div class="spell-hit-ring"></div><div class="spell-hit-core"></div>${Array.from({length: 8}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>`;
}

function playSpell() {
  const rect = stage.getBoundingClientRect();
  const travel = rect.width * .52;
  stage.style.setProperty('--travel', `${travel}px`);
  root.className = `effect-root spell-${activeVariant}`;
  restartClass(root, 'spell-playing');
  later(() => root.classList.remove('spell-playing'), activeVariant === 'fire' ? 760 : 820);
}

function buildDraw() {
  root.innerHTML = `
    <div class="draw-glow"></div>
    <div class="draw-rays">${Array.from({length: 12}, (_, i) => `<span style="--i:${i}"></span>`).join('')}</div>
    <div class="draw-card">
      <div class="draw-card-inner">
        <div class="draw-face draw-back"><span>?</span></div>
        <div class="draw-face draw-front"><small>REWARD</small><strong>R</strong><span>UNLOCKED</span></div>
      </div>
    </div>
    <div class="draw-particles">${Array.from({length: 14}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
    <div class="draw-flash"></div>`;
}

function playDraw() {
  root.className = `effect-root draw-${activeVariant}`;
  restartClass(root, 'draw-playing');
  later(() => root.classList.remove('draw-playing'), activeVariant === 'rare' ? 1250 : 920);
}

function buildTrails() {
  root.innerHTML = `
    <div class="energy-demo">
      <div class="energy-track"></div>
      <div class="energy-trails">${Array.from({length: 7}, (_, i) => `<span style="--i:${i}"></span>`).join('')}</div>
      <div class="energy-dot"></div>
    </div>
    <svg class="slash-demo" viewBox="0 0 600 280" aria-hidden="true">
      <path class="slash-glow" d="M105 214 C210 96 338 60 500 82"></path>
      <path class="slash-core" d="M105 214 C210 96 338 60 500 82"></path>
    </svg>
    <div class="particle-demo">
      <div class="particle-column"><small>SPARKS</small><div class="mini-emitter sparks-emitter"></div></div>
      <div class="particle-column"><small>DUST</small><div class="mini-emitter dust-emitter"></div></div>
      <div class="particle-column"><small>MAGIC</small><div class="mini-emitter magic-emitter"></div></div>
    </div>`;

  [['.sparks-emitter', 10], ['.dust-emitter', 8], ['.magic-emitter', 9]].forEach(([selector, count]) => {
    const host = root.querySelector(selector);
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement('i');
      p.style.setProperty('--i', i);
      host.appendChild(p);
    }
  });
}

function playTrails() {
  root.className = `effect-root trails-${activeVariant}`;
  restartClass(root, 'trails-playing');
  later(() => root.classList.remove('trails-playing'), activeVariant === 'particles' ? 950 : 720);
}

const builders = { explosion: buildExplosion, flash: buildFlash, impact: buildImpact, spell: buildSpell, draw: buildDraw, trails: buildTrails };
const players = { explosion: playExplosion, flash: playFlash, impact: playImpact, spell: playSpell, draw: playDraw, trails: playTrails };

function renderEffect(name) {
  cleanupDemo();
  activeEffect = name;
  activeVariant = effects[name].variants[0][0];
  root.className = 'effect-root';

  navButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.effect === name));
  const data = effects[name];
  indexLabel.textContent = data.index;
  title.textContent = data.title;
  description.textContent = data.description;
  makeVariants(data.variants, activeVariant);
  setTechnical(data.technical);
  builders[name]();
  updateVariantMetric();

  later(playActive, 180);
}

function playActive() {
  clearRun();
  players[activeEffect]();
}

navButtons.forEach((button) => button.addEventListener('click', () => renderEffect(button.dataset.effect)));
playButton.addEventListener('click', playActive);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat && document.activeElement?.tagName !== 'BUTTON') {
    event.preventDefault();
    playActive();
  }
});

let fpsFrames = 0;
let fpsWindowStart = performance.now();
let smoothedFps = 0;
function measureAppFps(now) {
  fpsFrames += 1;
  const elapsed = now - fpsWindowStart;
  if (elapsed >= 500) {
    const current = fpsFrames * 1000 / elapsed;
    smoothedFps = smoothedFps ? smoothedFps * .55 + current * .45 : current;
    appFpsOutput.textContent = Math.round(smoothedFps);
    fpsFrames = 0;
    fpsWindowStart = now;
  }
  requestAnimationFrame(measureAppFps);
}

renderEffect('explosion');
requestAnimationFrame(measureAppFps);
