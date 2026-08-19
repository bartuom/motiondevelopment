import { FXDeckRuntime, normalizeDirection } from '../fxdeck/core/fxdeck.js?v=p3.13.1';
import { TsParticlesAdapter } from '../fxdeck/adapters/tsparticles-adapter.js?v=p3.13.1';
import { registerExplosionV2 } from '../fxdeck/effects/explosion-v2.js?v=p3.13.1';
import { registerMagicBurstV2 } from '../fxdeck/effects/magic-burst-v2.js?v=p3.13.1';

const BUILD = 'P3.13.1';
const stage = document.querySelector('#stage');
const kickLayer = document.querySelector('#kick');
const domLayer = document.querySelector('#dom-layer');
const target = document.querySelector('#target');
const effectInput = document.querySelector('#effect');
const intensityInput = document.querySelector('#intensity');
const directionInput = document.querySelector('#direction');
const intensityValue = document.querySelector('#intensity-value');
const directionValue = document.querySelector('#direction-value');
const playButton = document.querySelector('#play');
const clearButton = document.querySelector('#clear');
const status = document.querySelector('#status');
const hudEffect = document.querySelector('#hud-effect');
const hudTech = document.querySelector('#hud-tech');
const readParticles = document.querySelector('#read-particles');
const readInstances = document.querySelector('#read-instances');
const readScale = document.querySelector('#read-scale');
const logOutput = document.querySelector('#log');

let fx = null;
let particleAdapter = null;
let point = { x: stage.clientWidth * .5, y: stage.clientHeight * .5 };

function log(message) {
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function createTransient(className, position) {
  const element = document.createElement('div');
  element.className = className;
  element.style.left = `${position.x}px`;
  element.style.top = `${position.y}px`;
  domLayer.appendChild(element);
  return element;
}

function animateTransient(element, keyframes, options) {
  const animation = element.animate(keyframes, options);
  animation.finished.catch(() => {}).finally(() => element.remove());
  return () => {
    animation.cancel();
    element.remove();
  };
}

function createScreenKick() {
  let x = 0;
  let y = 0;
  let raf = 0;
  let last = 0;

  function frame(now) {
    const dt = last ? Math.min(3, (now - last) / 16.667) : 1;
    last = now;
    const decay = Math.pow(.7, dt);
    x *= decay;
    y *= decay;
    kickLayer.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    if (Math.hypot(x, y) < .04) {
      x = 0;
      y = 0;
      raf = 0;
      last = 0;
      kickLayer.style.transform = 'translate3d(0,0,0)';
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  return {
    kick(direction, distance) {
      x += -direction.x * distance;
      y += -direction.y * distance;
      const magnitude = Math.hypot(x, y);
      if (magnitude > 12) {
        x = x / magnitude * 12;
        y = y / magnitude * 12;
      }
      if (!raf) raf = requestAnimationFrame(frame);
    },
    reset() {
      if (raf) cancelAnimationFrame(raf);
      x = 0;
      y = 0;
      raf = 0;
      last = 0;
      kickLayer.style.transform = 'translate3d(0,0,0)';
    }
  };
}

const screenKick = createScreenKick();

function hooks() {
  return {
    explosionFlash({ position, intensity }) {
      const flash = createTransient('fx-v2-flash', position);
      const scale = Math.min(1.7, .72 + intensity * .34);
      return animateTransient(flash, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.16)' },
        { opacity: 1, transform: `translate(-50%, -50%) scale(${scale * .54})`, offset: .11 },
        { opacity: .38, transform: `translate(-50%, -50%) scale(${scale * .88})`, offset: .42 },
        { opacity: 0, transform: `translate(-50%, -50%) scale(${scale})` }
      ], { duration: 185, easing: 'cubic-bezier(.08,.76,.14,1)', fill: 'forwards' });
    },

    magicCore({ position, directionDegrees, intensity }) {
      const core = createTransient('fx-v2-core', position);
      const scale = Math.min(1.55, .8 + intensity * .24);
      return animateTransient(core, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees - 10}deg) scaleX(.16) scaleY(.62)` },
        { opacity: .95, transform: `translate(-50%, -50%) rotate(${directionDegrees + 2}deg) scaleX(${scale}) scaleY(1)`, offset: .16 },
        { opacity: .36, transform: `translate(-50%, -50%) rotate(${directionDegrees + 14}deg) scaleX(${scale * 1.12}) scaleY(.72)`, offset: .54 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees + 22}deg) scaleX(${scale * 1.22}) scaleY(.5)` }
      ], { duration: 235, easing: 'cubic-bezier(.08,.78,.18,1)', fill: 'forwards' });
    },

    magicEcho({ position, directionDegrees, intensity }) {
      const echo = createTransient('fx-v2-echo', position);
      const scale = Math.min(1.5, .78 + intensity * .22);
      return animateTransient(echo, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees - 12}deg) scale(.16)` },
        { opacity: .72, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale})`, offset: .2 },
        { opacity: .28, transform: `translate(-50%, -50%) rotate(${directionDegrees + 18}deg) scale(${scale * 1.08})`, offset: .6 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees + 28}deg) scale(${scale * 1.16})` }
      ], { duration: 275, easing: 'cubic-bezier(.12,.72,.18,1)', fill: 'forwards' });
    },

    magicPulse({ position, directionDegrees, intensity }) {
      const pulse = createTransient('fx-v2-pulse', position);
      const scale = Math.min(1.8, .86 + intensity * .3);
      return animateTransient(pulse, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees - 18}deg) scale(.24)` },
        { opacity: .6, transform: `translate(-50%, -50%) rotate(${directionDegrees + 10}deg) scale(${scale * .68})`, offset: .22 },
        { opacity: .18, transform: `translate(-50%, -50%) rotate(${directionDegrees + 46}deg) scale(${scale})`, offset: .62 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees + 78}deg) scale(${scale * 1.15})` }
      ], { duration: 310, easing: 'cubic-bezier(.12,.68,.2,1)', fill: 'forwards' });
    },

    screenKick({ direction, distance }) {
      screenKick.kick(direction, distance);
    }
  };
}

function updateTarget() {
  target.style.left = `${point.x}px`;
  target.style.top = `${point.y}px`;
}

function selectedEffect() {
  return effectInput.value;
}

function updateUi() {
  intensityValue.textContent = Number(intensityInput.value).toFixed(1);
  directionValue.textContent = `${directionInput.value}°`;

  if (selectedEffect() === 'explosion') {
    hudEffect.textContent = 'Explosion V2';
    hudTech.textContent = 'Particlr-derived circle-soft + smoke textures';
  } else {
    hudEffect.textContent = 'Magic Burst V2';
    hudTech.textContent = 'real tsParticles shape-ribbon + motion plugin';
  }
}

function play(position = point) {
  if (!fx) return;
  point = { ...position };
  updateTarget();
  const id = selectedEffect();
  const direction = Number(directionInput.value);
  const intensity = Number(intensityInput.value);
  const instance = fx.play(id, {
    version: 'v2',
    variant: 'default',
    position: { ...point },
    direction,
    intensity,
    hooks: hooks()
  });

  log(`PLAY ${instance.id} ${id}/v2 @ ${Math.round(point.x)},${Math.round(point.y)} dir ${direction}° intensity ${intensity.toFixed(1)}`);
  instance.ready
    .then(() => {
      if (id === 'explosion') {
        const smoke = instance.resolved?.smoke?.waveCounts?.reduce((sum, value) => sum + value, 0) ?? 0;
        log(`READY ${instance.id}: fireball ${instance.resolved?.fireball?.count ?? 0}, smoke ${smoke}, source ${instance.resolved?.sourceModel ?? 'n/a'}`);
      } else {
        log(`READY ${instance.id}: ribbons ${instance.resolved?.heroRibbons?.count ?? 0}+${instance.resolved?.echoRibbons?.count ?? 0}, recipe drag ${instance.resolved?.ribbonRecipe?.drag ?? 'n/a'}`);
      }
    })
    .catch((error) => log(`ERROR ${instance.id}: ${error.message}`));
}

async function bootstrap() {
  try {
    if (!globalThis.tsParticles) throw new Error('tsParticles engine global missing.');
    if (typeof globalThis.loadFull !== 'function') throw new Error('loadFull() missing.');
    if (typeof globalThis.loadMotionPlugin !== 'function') throw new Error('loadMotionPlugin() missing.');
    if (typeof globalThis.loadRibbonShape !== 'function') throw new Error('loadRibbonShape() missing.');

    await globalThis.loadFull(globalThis.tsParticles);
    await globalThis.loadMotionPlugin(globalThis.tsParticles);
    await globalThis.loadRibbonShape(globalThis.tsParticles);

    fx = new FXDeckRuntime();
    registerExplosionV2(fx);
    registerMagicBurstV2(fx);

    const preload = fx.getAssets({ target: 'particles' }).map(({ target, ...asset }) => asset);
    particleAdapter = await new TsParticlesAdapter({
      engine: globalThis.tsParticles,
      stage,
      hostId: 'visual-pass-particles',
      preload,
      burstMode: 'scheduled',
      sharedFrameBudgetMs: 6,
      sharedChunkSize: 8,
      sharedImmediateCount: 8
    }).init();
    fx.setAdapter('particles', particleAdapter);

    const explosion = fx.resolve('explosion');
    const magic = fx.resolve('magicBurst');
    if (explosion.version !== 'v2' || magic.version !== 'v2') {
      throw new Error(`V2 registry mismatch: explosion ${explosion.version}, magic ${magic.version}`);
    }

    globalThis.FXDeckVisualPass = { fx, particleAdapter, play };
    status.textContent = 'READY / V2';
    status.classList.add('is-ready');
    log(`PASS ${BUILD}: full + motion + ribbon plugins loaded; Explosion V2 + Magic Burst V2 registered`);
    log(`ASSETS: ${preload.map((asset) => asset.src).join(', ')}`);

    updateTarget();
    updateUi();

    requestAnimationFrame(function metrics() {
      const stats = fx.getStats();
      const particles = stats.particles ?? {};
      readParticles.textContent = String(particles.particles ?? 0);
      readInstances.textContent = String(stats.activeInstances ?? 0);
      const scale = particles.scale ?? { x: 1, y: 1 };
      readScale.textContent = `${scale.x.toFixed(2)}×${scale.y.toFixed(2)}`;
      requestAnimationFrame(metrics);
    });
  } catch (error) {
    status.textContent = 'BOOT FAIL';
    status.classList.add('is-error');
    log(`BOOT FAIL: ${error.message}`);
    console.error(error);
  }
}

stage.addEventListener('pointerdown', (event) => {
  const rect = stage.getBoundingClientRect();
  play({ x: event.clientX - rect.left, y: event.clientY - rect.top });
});
playButton.addEventListener('click', () => play(point));
clearButton.addEventListener('click', () => {
  fx?.stopAll('visual-pass-clear');
  screenKick.reset();
  domLayer.replaceChildren();
  log('CLEAR');
});
effectInput.addEventListener('change', updateUi);
intensityInput.addEventListener('input', updateUi);
directionInput.addEventListener('input', updateUi);
window.addEventListener('resize', () => {
  particleAdapter?.clear();
  particleAdapter?.resize();
  point = { x: stage.clientWidth * .5, y: stage.clientHeight * .5 };
  updateTarget();
});

bootstrap();
