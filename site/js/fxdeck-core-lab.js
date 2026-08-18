import { FXDeckRuntime } from '../fxdeck/core/fxdeck.js';
import { TsParticlesAdapter } from '../fxdeck/adapters/tsparticles-adapter.js';
import { registerTestBurst } from '../fxdeck/effects/test-burst.js';

const stage = document.querySelector('#fxdeck-stage');
const marker = document.querySelector('#spawn-marker');
const playButton = document.querySelector('#play-effect');
const playTenButton = document.querySelector('#play-ten');
const stopButton = document.querySelector('#stop-all');
const versionSelect = document.querySelector('#version');
const variantSelect = document.querySelector('#variant');
const intensityInput = document.querySelector('#intensity');
const intensityValue = document.querySelector('#intensity-value');
const directionInput = document.querySelector('#direction');
const directionValue = document.querySelector('#direction-value');
const activeMetric = document.querySelector('#metric-instances');
const particleMetric = document.querySelector('#metric-particles');
const emitterMetric = document.querySelector('#metric-emitters');
const scaleMetric = document.querySelector('#metric-scale');
const logOutput = document.querySelector('#core-log');
const apiPreview = document.querySelector('#api-preview');

const state = {
  position: { x: stage.clientWidth * .5, y: stage.clientHeight * .5 }
};

function log(message) {
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setMarker(point) {
  marker.style.left = `${point.x}px`;
  marker.style.top = `${point.y}px`;
}

function currentParams(position = state.position) {
  return {
    version: versionSelect.value,
    variant: variantSelect.value,
    position: { ...position },
    direction: Number(directionInput.value),
    intensity: Number(intensityInput.value)
  };
}

function updateApiPreview() {
  const params = currentParams();
  apiPreview.textContent = `FXDeck.play("testBurst", {\n  version: "${params.version}",\n  variant: "${params.variant}",\n  position: { x: ${Math.round(params.position.x)}, y: ${Math.round(params.position.y)} },\n  direction: ${params.direction},\n  intensity: ${params.intensity.toFixed(1)}\n});`;
}

function syncVariantAvailability() {
  const heavy = variantSelect.querySelector('option[value="heavy"]');
  const v1 = versionSelect.value === 'v1';
  heavy.disabled = v1;
  if (v1 && variantSelect.value === 'heavy') variantSelect.value = 'default';
  updateApiPreview();
}

async function bootstrap() {
  if (!globalThis.tsParticles) throw new Error('tsParticles global is missing.');
  if (typeof globalThis.loadFull !== 'function') throw new Error('loadFull() is unavailable.');

  log('BOOTSTRAP loadFull(tsParticles)');
  await globalThis.loadFull(globalThis.tsParticles);

  const particleAdapter = await new TsParticlesAdapter({
    engine: globalThis.tsParticles,
    stage,
    hostId: 'fxdeck-core-particles',
    preload: [{ src: './assets/fxdeck-spark.svg', width: 32, height: 10 }]
  }).init();

  const fx = new FXDeckRuntime({ adapters: { particles: particleAdapter } });
  registerTestBurst(fx);

  globalThis.FXDeck = fx;
  globalThis.FXDeckP1 = { fx, particleAdapter };

  function playAt(position = state.position) {
    const params = currentParams(position);
    const instance = fx.play('testBurst', params);
    log(`PLAY ${instance.id} testBurst ${instance.version}/${instance.variant} @ ${Math.round(position.x)},${Math.round(position.y)} intensity ${params.intensity.toFixed(1)}`);
    instance.ready.catch((error) => log(`ERROR ${instance.id}: ${error.message}`));
    return instance;
  }

  playButton.addEventListener('click', () => playAt());

  playTenButton.addEventListener('click', () => {
    for (let i = 0; i < 10; i += 1) {
      const x = stage.clientWidth * (.2 + ((i * 23) % 60) / 100);
      const y = stage.clientHeight * (.2 + ((i * 37) % 60) / 100);
      window.setTimeout(() => playAt({ x, y }), i * 55);
    }
  });

  stopButton.addEventListener('click', () => {
    fx.stopAll('manual-stop-all');
    log('STOP ALL — instances and particle adapter cleared');
  });

  stage.addEventListener('pointerdown', (event) => {
    const rect = stage.getBoundingClientRect();
    state.position = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setMarker(state.position);
    updateApiPreview();
    playAt(state.position);
  });

  versionSelect.addEventListener('change', syncVariantAvailability);
  variantSelect.addEventListener('change', updateApiPreview);
  intensityInput.addEventListener('input', () => {
    intensityValue.textContent = Number(intensityInput.value).toFixed(1);
    updateApiPreview();
  });
  directionInput.addEventListener('input', () => {
    directionValue.textContent = `${directionInput.value}°`;
    updateApiPreview();
  });

  window.addEventListener('resize', () => {
    particleAdapter.resize();
    state.position = { x: stage.clientWidth * .5, y: stage.clientHeight * .5 };
    setMarker(state.position);
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

  setMarker(state.position);
  syncVariantAvailability();
  intensityValue.textContent = Number(intensityInput.value).toFixed(1);
  directionValue.textContent = `${directionInput.value}°`;
  requestAnimationFrame(metricsLoop);
  log('PASS P1 bootstrap: FXDeck Core + TsParticlesAdapter ready');
  log('Console API available as window.FXDeck');
}

bootstrap().catch((error) => {
  log(`BOOTSTRAP FAIL: ${error.message}`);
  console.error(error);
});
