import { FXDeckRuntime, normalizeDirection } from '../fxdeck/core/fxdeck.js';
import { TsParticlesAdapter } from '../fxdeck/adapters/tsparticles-adapter.js';
import { registerHeavyImpact } from '../fxdeck/effects/heavy-impact.js';

const stage = document.querySelector('#impact-stage');
const domLayer = document.querySelector('#impact-dom-layer');
const target = document.querySelector('#impact-target');
const playButton = document.querySelector('#play-impact');
const overlapButton = document.querySelector('#play-overlap');
const stopButton = document.querySelector('#stop-all');
const intensityInput = document.querySelector('#intensity');
const intensityValue = document.querySelector('#intensity-value');
const directionInput = document.querySelector('#direction');
const directionValue = document.querySelector('#direction-value');
const logOutput = document.querySelector('#p2-log');
const copyLogButton = document.querySelector('#copy-p2-log');
const clearLogButton = document.querySelector('#clear-p2-log');
const logStatus = document.querySelector('#p2-log-status');
const apiPreview = document.querySelector('#api-preview');
const activeMetric = document.querySelector('#metric-instances');
const particleMetric = document.querySelector('#metric-particles');
const emitterMetric = document.querySelector('#metric-emitters');
const scaleMetric = document.querySelector('#metric-scale');

const inspector = {
  direction: document.querySelector('#resolved-direction'),
  intensity: document.querySelector('#resolved-intensity'),
  sparks: document.querySelector('#resolved-sparks'),
  debris: document.querySelector('#resolved-debris'),
  targetKick: document.querySelector('#resolved-target-kick'),
  screenKick: document.querySelector('#resolved-screen-kick'),
  position: document.querySelector('#resolved-position')
};

const state = {
  fx: null,
  particleAdapter: null,
  definition: null,
  position: { x: stage.clientWidth * .5, y: stage.clientHeight * .5 }
};

function log(message) {
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function formatVector(vector) {
  const fmt = (v) => (Math.abs(v) < .0005 ? '0.000' : v.toFixed(3));
  return `{ x: ${fmt(vector.x)}, y: ${fmt(vector.y)} }`;
}

function currentParams(position = state.position) {
  return {
    version: 'v1',
    variant: 'default',
    position: { ...position },
    direction: Number(directionInput.value),
    intensity: Number(intensityInput.value),
    hooks: createHooks()
  };
}

function setTargetPosition(point) {
  target.style.left = `${point.x}px`;
  target.style.top = `${point.y}px`;
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

function createHooks() {
  return {
    contactFlash({ position, directionDegrees, intensity }) {
      const flash = createTransient('impact-flash', position);
      flash.style.setProperty('--impact-angle', `${directionDegrees}deg`);
      flash.style.setProperty('--impact-scale', String(Math.min(1.65, .8 + intensity * .28)));
      return animateTransient(flash, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.35)` },
        { opacity: 1, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${Math.min(1.65, .8 + intensity * .28)})`, offset: .16 },
        { opacity: .7, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.92)`, offset: .42 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(1.35)` }
      ], { duration: 150, easing: 'cubic-bezier(.18,.78,.18,1)', fill: 'forwards' });
    },

    pressureWave({ position, intensity }) {
      const wave = createTransient('impact-wave', position);
      const scale = 1.1 + Math.min(1.2, intensity) * .5;
      return animateTransient(wave, [
        { opacity: .75, transform: 'translate(-50%, -50%) scale(.16)' },
        { opacity: .28, transform: `translate(-50%, -50%) scale(${scale * .7})`, offset: .58 },
        { opacity: 0, transform: `translate(-50%, -50%) scale(${scale})` }
      ], { duration: 260, easing: 'cubic-bezier(.12,.72,.18,1)', fill: 'forwards' });
    },

    targetKick({ direction, distance }) {
      const dx = direction.x * distance;
      const dy = direction.y * distance;
      const animation = target.animate([
        { transform: 'translate(-50%, -50%) scale(1)' },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.965)`, offset: .22 },
        { transform: `translate(calc(-50% + ${dx * .28}px), calc(-50% + ${dy * .28}px)) scale(1.018)`, offset: .58 },
        { transform: 'translate(-50%, -50%) scale(1)' }
      ], { duration: 250, easing: 'cubic-bezier(.18,.72,.22,1)' });
      return () => animation.cancel();
    },

    screenKick({ direction, distance }) {
      const dx = -direction.x * distance;
      const dy = -direction.y * distance;
      const animation = stage.animate([
        { transform: 'translate(0,0)' },
        { transform: `translate(${dx}px, ${dy}px)`, offset: .18 },
        { transform: `translate(${-dx * .35}px, ${-dy * .35}px)`, offset: .52 },
        { transform: 'translate(0,0)' }
      ], { duration: 180, easing: 'cubic-bezier(.16,.72,.2,1)' });
      return () => animation.cancel();
    }
  };
}

function resolvedPreview() {
  const params = currentParams();
  const spec = state.definition?.spec;
  if (!spec) return null;
  const intensity = Math.max(.25, params.intensity);
  const speedScale = Math.max(.72, Math.sqrt(intensity));
  const direction = normalizeDirection(params.direction);
  return {
    intensity,
    direction,
    sparks: Math.max(1, Math.round(spec.sparks.baseCount * intensity)),
    debris: Math.max(1, Math.round(spec.debris.baseCount * Math.max(.7, intensity))),
    sparkSpeed: {
      min: spec.sparks.speed.min * speedScale,
      max: spec.sparks.speed.max * speedScale
    },
    targetKick: 10 * intensity,
    screenKick: 5 * Math.min(1.5, intensity)
  };
}

function updateInspector() {
  const resolved = resolvedPreview();
  if (!resolved) return;
  inspector.direction.textContent = `${resolved.direction.degrees.toFixed(0)}° → ${formatVector(resolved.direction.vector)}`;
  inspector.intensity.textContent = `${resolved.intensity.toFixed(1)}×`;
  inspector.sparks.textContent = `${resolved.sparks} particles`;
  inspector.debris.textContent = `${resolved.debris} particles`;
  inspector.targetKick.textContent = `${resolved.targetKick.toFixed(1)} px`;
  inspector.screenKick.textContent = `${resolved.screenKick.toFixed(1)} px`;
  inspector.position.textContent = `${Math.round(state.position.x)}, ${Math.round(state.position.y)} CSS px`;
}

function updateApiPreview() {
  apiPreview.textContent = `FXDeck.play("heavyImpact", {\n  version: "v1",\n  variant: "default",\n  position: { x: ${Math.round(state.position.x)}, y: ${Math.round(state.position.y)} },\n  direction: ${Number(directionInput.value)},\n  intensity: ${Number(intensityInput.value).toFixed(1)}\n});`;
  updateInspector();
}

function playAt(position = state.position, directionOverride = null) {
  state.position = { ...position };
  setTargetPosition(state.position);
  const params = currentParams(state.position);
  if (Number.isFinite(directionOverride)) params.direction = directionOverride;
  const instance = state.fx.play('heavyImpact', params);
  const normalized = normalizeDirection(params.direction);
  log(`PLAY ${instance.id} heavyImpact/v1/default @ ${Math.round(position.x)},${Math.round(position.y)} intensity ${params.intensity.toFixed(1)} direction ${normalized.degrees.toFixed(0)}°`);
  instance.ready
    .then(() => {
      const r = instance.resolved;
      log(`READY ${instance.id}: sparks ${r.sparks.count}, debris ${r.debris.count}, duration ${r.duration}ms`);
    })
    .catch((error) => log(`ERROR ${instance.id}: ${error.message}`));
  updateApiPreview();
  return instance;
}

function playOverlap() {
  const base = Number(directionInput.value);
  const offsets = [-24, -14, -5, 6, 16, 27];
  offsets.forEach((offset, index) => {
    window.setTimeout(() => playAt(state.position, (base + offset + 360) % 360), index * 36);
  });
}

async function copyLog() {
  try {
    await navigator.clipboard.writeText(logOutput.textContent.trim());
    logStatus.textContent = `Copied ${logOutput.textContent.trim().split('\n').filter(Boolean).length} lines`;
  } catch (error) {
    logStatus.textContent = 'Clipboard blocked — select log manually';
    console.error(error);
  }
}

function clearLog() {
  logOutput.textContent = 'FXDeck P2 log cleared.';
  logStatus.textContent = '';
}

async function bootstrap() {
  if (!globalThis.tsParticles) throw new Error('tsParticles global is missing.');
  if (typeof globalThis.loadFull !== 'function') throw new Error('loadFull() is unavailable.');

  log('BOOTSTRAP loadFull(tsParticles)');
  await globalThis.loadFull(globalThis.tsParticles);

  const particleAdapter = await new TsParticlesAdapter({
    engine: globalThis.tsParticles,
    stage,
    hostId: 'heavy-impact-particles',
    preload: [{ src: './assets/fxdeck-spark.svg', width: 32, height: 10 }]
  }).init();

  const fx = new FXDeckRuntime({ adapters: { particles: particleAdapter } });
  registerHeavyImpact(fx);
  state.fx = fx;
  state.particleAdapter = particleAdapter;
  state.definition = fx.resolve('heavyImpact', { version: 'v1', variant: 'default' }).definition;

  globalThis.FXDeck = fx;
  globalThis.FXDeckP2 = { fx, particleAdapter, playAt, playOverlap };
  globalThis.FXDeckLog = {
    getText: () => logOutput.textContent.trim(),
    getLines: () => logOutput.textContent.trim().split('\n').filter(Boolean),
    copy: copyLog,
    clear: clearLog
  };

  playButton.addEventListener('click', () => playAt());
  overlapButton.addEventListener('click', playOverlap);
  stopButton.addEventListener('click', () => {
    fx.stopAll('manual-stop-all');
    log('STOP ALL — instances and particle resources cleared');
  });

  stage.addEventListener('pointerdown', (event) => {
    const rect = stage.getBoundingClientRect();
    playAt({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  });

  intensityInput.addEventListener('input', () => {
    intensityValue.textContent = Number(intensityInput.value).toFixed(1);
    updateApiPreview();
  });
  directionInput.addEventListener('input', () => {
    directionValue.textContent = `${directionInput.value}°`;
    updateApiPreview();
  });
  copyLogButton.addEventListener('click', copyLog);
  clearLogButton.addEventListener('click', clearLog);

  window.addEventListener('resize', () => {
    particleAdapter.resize();
    state.position = { x: stage.clientWidth * .5, y: stage.clientHeight * .5 };
    setTargetPosition(state.position);
    updateApiPreview();
  });

  function metricsLoop() {
    const stats = fx.getStats();
    activeMetric.textContent = String(stats.activeInstances);
    particleMetric.textContent = String(stats.particles?.particles ?? 0);
    emitterMetric.textContent = String(stats.particles?.emitters ?? 0);
    const scale = stats.particles?.scale ?? { x: 1, y: 1 };
    scaleMetric.textContent = `${scale.x.toFixed(2)}×${scale.y.toFixed(2)}`;
    requestAnimationFrame(metricsLoop);
  }

  setTargetPosition(state.position);
  intensityValue.textContent = Number(intensityInput.value).toFixed(1);
  directionValue.textContent = `${directionInput.value}°`;
  updateApiPreview();
  requestAnimationFrame(metricsLoop);
  log('PASS P2 bootstrap: heavyImpact/v1/default registered');
  log('Cue timing: flash 0ms / sparks 0ms / debris 18ms / wave 32ms / target 40ms / screen 52ms / cleanup 620ms');
}

bootstrap().catch((error) => {
  log(`BOOTSTRAP FAIL: ${error.message}`);
  console.error(error);
});
