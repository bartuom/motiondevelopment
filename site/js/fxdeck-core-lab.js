import { FXDeckRuntime, normalizeDirection } from '../fxdeck/core/fxdeck.js';
import { TsParticlesAdapter } from '../fxdeck/adapters/tsparticles-adapter.js';
import { registerTestBurst } from '../fxdeck/effects/test-burst.js';

const stage = document.querySelector('#fxdeck-stage');
const marker = document.querySelector('#spawn-marker');
const playButton = document.querySelector('#play-effect');
const playTenButton = document.querySelector('#play-ten');
const stopButton = document.querySelector('#stop-all');
const validationButton = document.querySelector('#run-validation');
const validationStatus = document.querySelector('#validation-status');
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
  fx: null,
  validationRunning: false
};

function log(message) {
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  const probes = [25, 73, 211];
  for (const degrees of probes) {
    const probe = normalizeDirection(degrees);
    const length = Math.hypot(probe.vector.x, probe.vector.y);
    assert(Math.abs(length - 1) <= 1e-9, `Direction ${degrees}° did not normalize to unit length.`);
    assert(Math.abs(probe.degrees - degrees) <= 1e-9, `Direction ${degrees}° did not preserve its normalized angle.`);
  }

  const vectorProbe = normalizeDirection({ x: 3, y: 4 });
  assert(Math.abs(vectorProbe.vector.x - .6) <= 1e-9 && Math.abs(vectorProbe.vector.y - .8) <= 1e-9,
    'Direction vector normalization failed for {x:3,y:4}.');

  log(`PASS direction contract: 25°/73°/211° unit vectors; {x:3,y:4} → ${formatVector(vectorProbe.vector)}`);
}

function resourceSummary(stats) {
  const particles = stats.particles ?? {};
  return `${stats.activeInstances} instances / ${particles.emitters ?? 0} emitters / ${particles.particles ?? 0} particles`;
}

function assertClean(stats, label) {
  const particles = stats.particles ?? {};
  const clean = stats.activeInstances === 0 && (particles.emitters ?? 0) === 0 && (particles.particles ?? 0) === 0;
  assert(clean, `${label}: expected 0/0/0, got ${resourceSummary(stats)}.`);
}

function setValidationUi(status, message) {
  validationStatus.className = `validation-status${status ? ` is-${status}` : ''}`;
  validationStatus.textContent = message;
}

function setInteractionDisabled(disabled) {
  playButton.disabled = disabled;
  playTenButton.disabled = disabled;
  stopButton.disabled = disabled;
  validationButton.disabled = disabled;
  versionSelect.disabled = disabled;
  variantSelect.disabled = disabled;
  intensityInput.disabled = disabled;
  directionInput.disabled = disabled;
  if (!disabled) syncVariantAvailability();
}

async function runP1Validation(fx) {
  if (state.validationRunning) return;
  state.validationRunning = true;
  setInteractionDisabled(true);
  setValidationUi('running', 'P1 VALIDATION: RUNNING…');
  log('P1 VALIDATION starting');

  try {
    fx.stopAll('validation-reset');
    await wait(60);
    assertClean(fx.getStats(), 'Reset');
    log('PASS validation reset: 0 instances / 0 emitters / 0 particles');

    const v1 = fx.resolve('testBurst', { version: 'v1', variant: 'default' }).definition;
    const v2 = fx.resolve('testBurst', { version: 'v2', variant: 'default' }).definition;
    const heavy = fx.resolve('testBurst', { version: 'v2', variant: 'heavy' }).definition;
    assert(v1.spec.shape === 'circle', 'V1 definition is not the primitive-circle revision.');
    assert(v2.spec.shape === 'image', 'V2 definition is not the SVG-spark revision.');
    assert(heavy.spec.baseCount > v2.spec.baseCount && heavy.spec.life.max > v2.spec.life.max,
      'Heavy variant is not denser/longer than V2 default.');
    log('PASS authored definitions: V1 circle / V2 SVG / V2 Heavy denser + longer');

    validateDirectionContract();

    const lifecycleInstances = [];
    for (let i = 0; i < 10; i += 1) {
      lifecycleInstances.push(fx.play('testBurst', {
        version: 'v2',
        variant: 'default',
        position: {
          x: stage.clientWidth * (.18 + ((i * 23) % 64) / 100),
          y: stage.clientHeight * (.18 + ((i * 37) % 64) / 100)
        },
        direction: (25 + i * 31) % 360,
        intensity: 1
      }));
    }
    await Promise.all(lifecycleInstances.map((instance) => instance.ready));
    assert(fx.getStats().activeInstances === 10, 'Play ×10 did not create 10 active EffectInstances.');
    log('PASS Play ×10 spawn: 10 active EffectInstances');

    await wait(1750);
    const lifecycleEnd = fx.getStats();
    assertClean(lifecycleEnd, 'Play ×10 lifecycle cleanup');
    log('PASS Play ×10 lifecycle cleanup: 0 instances / 0 emitters / 0 particles');

    const stopInstances = [];
    for (let i = 0; i < 6; i += 1) {
      stopInstances.push(fx.play('testBurst', {
        version: 'v2',
        variant: 'heavy',
        position: { x: stage.clientWidth * .5, y: stage.clientHeight * .5 },
        direction: 73 + i * 9,
        intensity: 1.4
      }));
    }
    await Promise.all(stopInstances.map((instance) => instance.ready));
    await wait(80);
    const beforeStop = fx.getStats();
    assert(beforeStop.activeInstances > 0, 'stopAll test had no active instances before stop.');
    assert((beforeStop.particles?.particles ?? 0) > 0, 'stopAll test had no active particles before stop.');
    log(`PASS stopAll precondition: ${resourceSummary(beforeStop)}`);

    fx.stopAll('validation-stop-all');
    await wait(60);
    const afterStop = fx.getStats();
    assertClean(afterStop, 'stopAll cleanup');
    log('PASS stopAll cleanup: 0 instances / 0 emitters / 0 particles');

    setValidationUi('pass', 'P1 VALIDATION: PASS');
    log('P1 VALIDATION: PASS — lifecycle and cleanup gates are satisfied');
  } catch (error) {
    fx.stopAll('validation-failed');
    setValidationUi('fail', `P1 VALIDATION: FAIL — ${error.message}`);
    log(`P1 VALIDATION: FAIL — ${error.message}`);
    console.error(error);
  } finally {
    state.validationRunning = false;
    setInteractionDisabled(false);
  }
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
  globalThis.FXDeckP1 = { fx, particleAdapter, normalizeDirection, runValidation: () => runP1Validation(fx) };

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

  validationButton.addEventListener('click', () => runP1Validation(fx));

  stage.addEventListener('pointerdown', (event) => {
    if (state.validationRunning) return;
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
  log('P1 automated lifecycle validator ready');
  log('Console API available as window.FXDeck; validation as window.FXDeckP1.runValidation()');
}

bootstrap().catch((error) => {
  log(`BOOTSTRAP FAIL: ${error.message}`);
  console.error(error);
});