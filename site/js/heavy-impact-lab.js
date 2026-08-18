import { FXDeckRuntime, normalizeDirection } from '../fxdeck/core/fxdeck.js';
import { TsParticlesAdapter } from '../fxdeck/adapters/tsparticles-adapter.js';
import { registerHeavyImpact } from '../fxdeck/effects/heavy-impact.js?v=p2.2.1';

const stage = document.querySelector('#impact-stage');
const kickLayer = document.querySelector('#impact-kick-layer');
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
const fpsMetric = document.querySelector('#metric-fps');
const lowMetric = document.querySelector('#metric-low');
const spikeMetric = document.querySelector('#metric-spikes');

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
  position: { x: stage.clientWidth * .5, y: stage.clientHeight * .5 },
  frameTimes: [],
  lastFrameAt: 0,
  perfCapture: null
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

function summarizeFrames(samples) {
  const valid = samples.filter((dt) => Number.isFinite(dt) && dt > 0 && dt < 250);
  if (!valid.length) return { avgFps: 0, low1: 0, spikes20: 0 };

  const avgMs = valid.reduce((sum, dt) => sum + dt, 0) / valid.length;
  const sorted = [...valid].sort((a, b) => a - b);
  const p99Index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * .99) - 1));
  const p99Ms = sorted[p99Index];

  return {
    avgFps: 1000 / avgMs,
    low1: 1000 / p99Ms,
    spikes20: valid.filter((dt) => dt > 20).length
  };
}

function startPerfCapture(label, durationMs = 1500) {
  state.perfCapture = {
    label,
    durationMs,
    startedAt: performance.now(),
    samples: [],
    peakInstances: 0,
    peakParticles: 0,
    peakEmitters: 0
  };
  log(`PERF ${label}: capture started (${durationMs} ms)`);
}

function recordFrame(now, stats) {
  if (state.lastFrameAt) {
    const dt = now - state.lastFrameAt;
    if (dt > 0 && dt < 250) {
      state.frameTimes.push(dt);
      if (state.frameTimes.length > 240) state.frameTimes.shift();
      state.perfCapture?.samples.push(dt);
    }
  }
  state.lastFrameAt = now;

  const rolling = summarizeFrames(state.frameTimes);
  fpsMetric.textContent = rolling.avgFps ? rolling.avgFps.toFixed(1) : '--';
  lowMetric.textContent = rolling.low1 ? rolling.low1.toFixed(1) : '--';
  spikeMetric.textContent = String(rolling.spikes20);

  const capture = state.perfCapture;
  if (!capture) return;

  capture.peakInstances = Math.max(capture.peakInstances, stats.activeInstances ?? 0);
  capture.peakParticles = Math.max(capture.peakParticles, stats.particles?.particles ?? 0);
  capture.peakEmitters = Math.max(capture.peakEmitters, stats.particles?.emitters ?? 0);

  if (now - capture.startedAt < capture.durationMs) return;

  const result = summarizeFrames(capture.samples);
  const finalStats = state.fx?.getStats?.() ?? stats;
  const finalResources = `${finalStats.activeInstances ?? 0}/${finalStats.particles?.emitters ?? 0}/${finalStats.particles?.particles ?? 0}`;
  log(`PERF ${capture.label}: avg ${result.avgFps.toFixed(1)} FPS / 1% low ${result.low1.toFixed(1)} / >20ms ${result.spikes20} / peaks ${capture.peakInstances} instances, ${capture.peakEmitters} emitters, ${capture.peakParticles} particles / final ${finalResources}`);
  state.perfCapture = null;
}

function createScreenKickController(element) {
  let x = 0;
  let y = 0;
  let raf = 0;
  let last = 0;

  function frame(now) {
    const dt = last ? Math.min(3, (now - last) / 16.667) : 1;
    last = now;
    const decay = Math.pow(.72, dt);
    x *= decay;
    y *= decay;

    element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;

    if (Math.hypot(x, y) < .05) {
      x = 0;
      y = 0;
      raf = 0;
      last = 0;
      element.style.transform = 'translate3d(0,0,0)';
      return;
    }

    raf = requestAnimationFrame(frame);
  }

  function kick(direction, distance) {
    x += -direction.x * distance;
    y += -direction.y * distance;

    const magnitude = Math.hypot(x, y);
    const maxKick = 12;
    if (magnitude > maxKick) {
      x = (x / magnitude) * maxKick;
      y = (y / magnitude) * maxKick;
    }

    if (!raf) raf = requestAnimationFrame(frame);
  }

  function reset() {
    if (raf) cancelAnimationFrame(raf);
    x = 0;
    y = 0;
    raf = 0;
    last = 0;
    element.style.transform = 'translate3d(0,0,0)';
  }

  return { kick, reset };
}

const screenKickController = createScreenKickController(kickLayer);

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
      const scale = Math.min(1.35, .76 + intensity * .2);
      return animateTransient(flash, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.28)` },
        { opacity: .92, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale})`, offset: .14 },
        { opacity: .4, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.94)`, offset: .44 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(1.16)` }
      ], { duration: 110, easing: 'cubic-bezier(.12,.78,.18,1)', fill: 'forwards' });
    },

    pressureWave({ position, direction, directionDegrees, intensity }) {
      const offset = 11 * Math.min(1.4, intensity);
      const wave = createTransient('impact-wave', {
        x: position.x + direction.x * offset,
        y: position.y + direction.y * offset
      });
      const endScale = 1.08 + Math.min(1.25, intensity) * .4;
      return animateTransient(wave, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.18)` },
        { opacity: .9, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.34)`, offset: .12 },
        { opacity: .48, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${endScale * .72})`, offset: .46 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${endScale})` }
      ], { duration: 190, easing: 'cubic-bezier(.08,.74,.14,1)', fill: 'forwards' });
    },

    targetKick({ direction, distance }) {
      const dx = direction.x * distance;
      const dy = direction.y * distance;
      const animation = target.animate([
        { transform: 'translate(-50%, -50%) scale(1)' },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.972)`, offset: .2 },
        { transform: `translate(calc(-50% + ${dx * .24}px), calc(-50% + ${dy * .24}px)) scale(1.012)`, offset: .56 },
        { transform: 'translate(-50%, -50%) scale(1)' }
      ], { duration: 220, easing: 'cubic-bezier(.18,.72,.22,1)' });
      return () => animation.cancel();
    },

    screenKick({ direction, distance }) {
      screenKickController.kick(direction, distance);
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
    targetKick: 8.5 * intensity,
    screenKick: 4.5 * Math.min(1.5, intensity)
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
  startPerfCapture('Overlap ×6', 1500);
  log(`OVERLAP ×6 directions: ${offsets.map((offset) => `${(base + offset + 360) % 360}°`).join(', ')}`);
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
  globalThis.FXDeckP2 = { fx, particleAdapter, playAt, playOverlap, startPerfCapture, screenKickController };
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
    screenKickController.reset();
    state.perfCapture = null;
    log('STOP ALL — instances, particle resources and screen kick cleared');
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
    screenKickController.reset();
    particleAdapter.resize();
    state.position = { x: stage.clientWidth * .5, y: stage.clientHeight * .5 };
    setTargetPosition(state.position);
    updateApiPreview();
  });

  function metricsLoop(now) {
    const stats = fx.getStats();
    activeMetric.textContent = String(stats.activeInstances);
    particleMetric.textContent = String(stats.particles?.particles ?? 0);
    emitterMetric.textContent = String(stats.particles?.emitters ?? 0);
    const scale = stats.particles?.scale ?? { x: 1, y: 1 };
    scaleMetric.textContent = `${scale.x.toFixed(2)}×${scale.y.toFixed(2)}`;
    recordFrame(now, stats);
    requestAnimationFrame(metricsLoop);
  }

  setTargetPosition(state.position);
  intensityValue.textContent = Number(intensityInput.value).toFixed(1);
  directionValue.textContent = `${directionInput.value}°`;
  updateApiPreview();
  requestAnimationFrame(metricsLoop);
  log('PASS P2 bootstrap: heavyImpact/v1/default registered');
  log('P2.2.1 cache-bust: Heavy Impact effect module is loaded from a versioned URL');
  log('P2.3 pressure wave readability: larger directional arc, brighter leading edge, stronger short peak and larger forward offset');
  log('Overlap ×6 records avg FPS / 1% low / >20ms frames / peak resources / final cleanup state');
  log('Cue timing: flash 0ms / sparks 0ms / debris 14ms / wave 26ms / target 36ms / screen 48ms / cleanup 560ms');
}

bootstrap().catch((error) => {
  log(`BOOTSTRAP FAIL: ${error.message}`);
  console.error(error);
});