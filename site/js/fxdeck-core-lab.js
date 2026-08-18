import { FXDeckRuntime, normalizeDirection } from '../fxdeck/core/fxdeck.js';
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

const inspector = {
  title: document.querySelector('#definition-title'),
  summary: document.querySelector('#definition-summary'),
  revision: document.querySelector('#definition-revision'),
  shape: document.querySelector('#def-shape'),
  count: document.querySelector('#def-count'),
  speed: document.querySelector('#def-speed'),
  size: document.querySelector('#def-size'),
  life: document.querySelector('#def-life'),
  spread: document.querySelector('#def-spread'),
  stop: document.querySelector('#def-stop'),
  resolvedIntensity: document.querySelector('#resolved-intensity'),
  resolvedCount: document.querySelector('#resolved-count'),
  resolvedSpeed: document.querySelector('#resolved-speed'),
  resolvedDirection: document.querySelector('#resolved-direction'),
  resolvedPosition: document.querySelector('#resolved-position'),
  resolvedId: document.querySelector('#resolved-id')
};

const state = {
  position: { x: stage.clientWidth * .5, y: stage.clientHeight * .5 },
  fx: null
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

function formatRange(range, digits = 1) {
  const format = (value) => Number(value).toFixed(digits).replace(/\.0$/, '');
  return `${format(range.min)}–${format(range.max)}`;
}

function formatVector(vector) {
  const format = (value) => Math.abs(value) < .0005 ? '0.000' : value.toFixed(3);
  return `{ x: ${format(vector.x)}, y: ${format(vector.y)} }`;
}

function getResolvedDefinition(params = currentParams()) {
  if (!state.fx) return null;
  return state.fx.resolve('testBurst', params).definition;
}

function updateInspector() {
  const params = currentParams();
  const definition = getResolvedDefinition(params);
  if (!definition?.spec) return;

  const spec = definition.spec;
  const intensity = Math.max(.1, params.intensity);
  const speedScale = Math.max(.65, intensity);
  const runtimeCount = Math.max(1, Math.round(spec.baseCount * intensity));
  const runtimeSpeed = {
    min: spec.speed.min * speedScale,
    max: spec.speed.max * speedScale
  };
  const normalizedDirection = normalizeDirection(params.direction);

  inspector.title.textContent = `testBurst / ${definition.version} / ${definition.variant} — ${definition.label}`;
  inspector.summary.textContent = definition.summary;
  inspector.revision.textContent = spec.revision;
  inspector.shape.textContent = spec.shape === 'image' ? 'SVG spark image' : 'Primitive circle';
  inspector.count.textContent = String(spec.baseCount);
  inspector.speed.textContent = formatRange(spec.speed);
  inspector.size.textContent = formatRange(spec.size);
  inspector.life.textContent = `${formatRange(spec.life, 2)} s`;
  inspector.spread.textContent = `${spec.spread}° cone`;
  inspector.stop.textContent = `${spec.stopAfter} ms auto-stop`;

  inspector.resolvedIntensity.textContent = `${intensity.toFixed(1)}×`;
  inspector.resolvedCount.textContent = `${runtimeCount} (${spec.baseCount} × ${intensity.toFixed(1)})`;
  inspector.resolvedSpeed.textContent = `${formatRange(runtimeSpeed)} px/frame-scale`;
  inspector.resolvedDirection.textContent = `${normalizedDirection.degrees.toFixed(0)}° → ${formatVector(normalizedDirection.vector)}`;
  inspector.resolvedPosition.textContent = `${Math.round(params.position.x)}, ${Math.round(params.position.y)} CSS px`;
  inspector.resolvedId.textContent = `testBurst/${definition.version}/${definition.variant}`;
}

function updateApiPreview() {
  const params = currentParams();
  apiPreview.textContent = `FXDeck.play("testBurst", {\n  version: "${params.version}",\n  variant: "${params.variant}",\n  position: { x: ${Math.round(params.position.x)}, y: ${Math.round(params.position.y)} },\n  direction: ${params.direction},\n  intensity: ${params.intensity.toFixed(1)}\n});`;
  updateInspector();
}

function syncVariantAvailability() {
  const heavy = variantSelect.querySelector('option[value="heavy"]');
  const v1 = versionSelect.value === 'v1';
  heavy.disabled = v1;
  if (v1 && variantSelect.value === 'heavy') variantSelect.value = 'default';
  updateApiPreview();
}

function validateDirectionContract() {
  const angleProbe = normalizeDirection(25);
  const vectorProbe = normalizeDirection({ x: 3, y: 4 });
  const angleLength = Math.hypot(angleProbe.vector.x, angleProbe.vector.y);

  if (Math.abs(angleLength - 1) > 1e-9) throw new Error('Direction angle normalization did not produce a unit vector.');
  if (Math.abs(vectorProbe.vector.x - .6) > 1e-9 || Math.abs(vectorProbe.vector.y - .8) > 1e-9) {
    throw new Error('Direction vector normalization failed for {x:3,y:4}.');
  }

  log(`PASS direction contract: 25° → ${formatVector(angleProbe.vector)}; {x:3,y:4} → ${formatVector(vectorProbe.vector)}`);
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
  state.fx = fx;
  validateDirectionContract();

  globalThis.FXDeck = fx;
  globalThis.FXDeckP1 = { fx, particleAdapter, normalizeDirection };

  function playAt(position = state.position) {
    const params = currentParams(position);
    const definition = fx.resolve('testBurst', params).definition;
    const normalizedDirection = normalizeDirection(params.direction);
    const instance = fx.play('testBurst', params);
    log(`PLAY ${instance.id} ${instance.version}/${instance.variant} "${definition.label}" @ ${Math.round(position.x)},${Math.round(position.y)} intensity ${params.intensity.toFixed(1)} direction ${normalizedDirection.degrees.toFixed(0)}° ${formatVector(normalizedDirection.vector)}`);
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
  log('EffectDefinition inspector is reading metadata from the runtime registry');
  log('Console API available as window.FXDeck; direction accepts degrees or a non-zero {x,y} vector');
}

bootstrap().catch((error) => {
  log(`BOOTSTRAP FAIL: ${error.message}`);
  console.error(error);
});
