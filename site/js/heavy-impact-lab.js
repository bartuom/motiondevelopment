import { FXDeckRuntime, normalizeDirection } from '../fxdeck/core/fxdeck.js';
import { TsParticlesAdapter } from '../fxdeck/adapters/tsparticles-adapter.js?v=p3.4.0';
import { registerHeavyImpact } from '../fxdeck/effects/heavy-impact.js?v=p3.4.0';
import { registerExplosion } from '../fxdeck/effects/explosion.js?v=p3.4.0';

const BUILD = 'P3.4.0';

const stage = document.querySelector('#impact-stage');
const kickLayer = document.querySelector('#impact-kick-layer');
const domLayer = document.querySelector('#impact-dom-layer');
const target = document.querySelector('#impact-target');
const effectInput = document.querySelector('#effect-select');
const authoredVersionLabel = document.querySelector('#authored-version-label');
const previewTitle = document.querySelector('#preview-title');
const previewNote = document.querySelector('#preview-note');
const captionTitle = document.querySelector('#caption-title');
const captionNote = document.querySelector('#caption-note');
const effectSummary = document.querySelector('#effect-summary');
const effectTimeline = document.querySelector('#effect-timeline');
const playButton = document.querySelector('#play-impact');
const overlapButton = document.querySelector('#play-overlap');
const abButton = document.querySelector('#play-ab');
const stressButton = document.querySelector('#play-stress-ab');
const cancelGateButton = document.querySelector('#run-cancel-gate');
const stopButton = document.querySelector('#stop-all');
const intensityInput = document.querySelector('#intensity');
const intensityValue = document.querySelector('#intensity-value');
const directionInput = document.querySelector('#direction');
const directionValue = document.querySelector('#direction-value');
const particlePathInput = document.querySelector('#particle-path');
const logOutput = document.querySelector('#p2-log');
const copyLogButton = document.querySelector('#copy-p2-log');
const clearLogButton = document.querySelector('#clear-p2-log');
const logStatus = document.querySelector('#p2-log-status');
const apiPreview = document.querySelector('#api-preview');
const activeMetric = document.querySelector('#metric-instances');
const particleMetric = document.querySelector('#metric-particles');
const emitterMetric = document.querySelector('#metric-emitters');
const burstGroupMetric = document.querySelector('#metric-burst-groups');
const scaleMetric = document.querySelector('#metric-scale');
const fpsMetric = document.querySelector('#metric-fps');
const lowMetric = document.querySelector('#metric-low');
const spikeMetric = document.querySelector('#metric-spikes');

const inspector = {
  effect: document.querySelector('#resolved-effect'),
  direction: document.querySelector('#resolved-direction'),
  intensity: document.querySelector('#resolved-intensity'),
  path: document.querySelector('#resolved-path'),
  screenKick: document.querySelector('#resolved-screen-kick'),
  position: document.querySelector('#resolved-position'),
  layers: ['a', 'b', 'c', 'd', 'e'].map((key) => ({
    label: document.querySelector(`#resolved-layer-${key}-label`),
    value: document.querySelector(`#resolved-layer-${key}`)
  }))
};

const state = {
  fx: null,
  particleAdapter: null,
  definition: null,
  position: { x: stage.clientWidth * .5, y: stage.clientHeight * .5 },
  frameTimes: [],
  lastFrameAt: 0,
  perfCapture: null,
  benchmark: {
    running: false,
    timers: new Set(),
    restorePath: null
  }
};

function log(message) {
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function selectedEffectId() {
  return effectInput?.value === 'heavyImpact' ? 'heavyImpact' : 'explosion';
}

function pathLabel(path) {
  if (path === 'scheduled') return 'shared-scheduled';
  if (path === 'shared') return 'shared-direct';
  return 'per-play-emitter';
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

function resourceState(stats) {
  return {
    instances: stats.activeInstances ?? 0,
    emitters: stats.particles?.emitters ?? 0,
    groups: stats.particles?.burstGroups ?? 0,
    particles: stats.particles?.particles ?? 0,
    queued: stats.particles?.queuedParticles ?? 0
  };
}

function resourceText(stats) {
  const r = resourceState(stats);
  return `${r.instances} instances / ${r.emitters} emitters / ${r.groups} groups / ${r.particles} particles / ${r.queued} queued`;
}

function assertResourcesClean(stats, label) {
  const r = resourceState(stats);
  if (r.instances || r.emitters || r.groups || r.particles || r.queued) {
    throw new Error(`${label}: expected complete cleanup, got ${resourceText(stats)}.`);
  }
}

function setBenchmarkBusy(busy) {
  state.benchmark.running = busy;
  effectInput.disabled = busy;
  overlapButton.disabled = busy;
  abButton.disabled = busy;
  playButton.disabled = busy;
  intensityInput.disabled = busy;
  directionInput.disabled = busy;
  particlePathInput.disabled = busy;
  if (stressButton) stressButton.disabled = busy;
  if (cancelGateButton) cancelGateButton.disabled = busy;
  overlapButton.textContent = busy ? 'Benchmark running…' : 'Overlap ×6 + perf';
  abButton.textContent = busy ? 'A/B running…' : 'Effect A/B';
  if (cancelGateButton) cancelGateButton.textContent = busy ? 'Runtime gate running…' : 'Runtime Cancel Gate';
}

function cancelBenchmarkTimers() {
  for (const timer of state.benchmark.timers) window.clearTimeout(timer);
  state.benchmark.timers.clear();
}

function scheduleBenchmarkTask(task, delayMs) {
  const timer = window.setTimeout(() => {
    state.benchmark.timers.delete(timer);
    task();
  }, delayMs);
  state.benchmark.timers.add(timer);
  return timer;
}

function setParticlePath(path, { writeLog = false } = {}) {
  state.particleAdapter?.setBurstMode(path);
  particlePathInput.value = path;
  if (writeLog) log(`PARTICLE PATH → ${pathLabel(path)}`);
  updateInspector();
}

function finishBenchmark() {
  cancelBenchmarkTimers();
  if (state.benchmark.restorePath) {
    setParticlePath(state.benchmark.restorePath);
    state.benchmark.restorePath = null;
  }
  setBenchmarkBusy(false);
}

function abortBenchmark() {
  const wasRunning = state.benchmark.running || Boolean(state.perfCapture) || state.benchmark.timers.size > 0;
  cancelBenchmarkTimers();
  state.perfCapture = null;
  if (state.benchmark.restorePath) {
    setParticlePath(state.benchmark.restorePath);
    state.benchmark.restorePath = null;
  }
  setBenchmarkBusy(false);
  return wasRunning;
}

function startPerfCapture(label, durationMs = 1500, onComplete = null) {
  state.perfCapture = {
    label,
    path: state.particleAdapter.getBurstMode(),
    durationMs,
    startedAt: performance.now(),
    samples: [],
    peakInstances: 0,
    peakParticles: 0,
    peakEmitters: 0,
    peakBurstGroups: 0,
    peakQueuedParticles: 0,
    onComplete
  };
  log(`PERF ${label}: capture started (${durationMs} ms, ${pathLabel(state.perfCapture.path)})`);
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
  capture.peakBurstGroups = Math.max(capture.peakBurstGroups, stats.particles?.burstGroups ?? 0);
  capture.peakQueuedParticles = Math.max(capture.peakQueuedParticles, stats.particles?.queuedParticles ?? 0);

  if (now - capture.startedAt < capture.durationMs) return;

  const frameResult = summarizeFrames(capture.samples);
  const finalStats = state.fx?.getStats?.() ?? stats;
  const result = {
    label: capture.label,
    path: capture.path,
    avgFps: frameResult.avgFps,
    low1: frameResult.low1,
    spikes20: frameResult.spikes20,
    peakInstances: capture.peakInstances,
    peakEmitters: capture.peakEmitters,
    peakBurstGroups: capture.peakBurstGroups,
    peakQueuedParticles: capture.peakQueuedParticles,
    peakParticles: capture.peakParticles,
    finalInstances: finalStats.activeInstances ?? 0,
    finalEmitters: finalStats.particles?.emitters ?? 0,
    finalBurstGroups: finalStats.particles?.burstGroups ?? 0,
    finalQueuedParticles: finalStats.particles?.queuedParticles ?? 0,
    finalParticles: finalStats.particles?.particles ?? 0
  };

  const finalResources = `${result.finalInstances}/${result.finalEmitters}/${result.finalParticles}`;
  log(`PERF ${capture.label}: avg ${result.avgFps.toFixed(1)} FPS / 1% low ${result.low1.toFixed(1)} / >20ms ${result.spikes20} / peaks ${result.peakInstances} instances, ${result.peakEmitters} emitters, ${result.peakBurstGroups} shared groups, ${result.peakParticles} particles, ${result.peakQueuedParticles} queued / final ${finalResources}, groups ${result.finalBurstGroups}, queued ${result.finalQueuedParticles}`);

  const onComplete = capture.onComplete;
  state.perfCapture = null;
  onComplete?.(result);
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
    const maxKick = 14;
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

function cancellationParams(direction = Number(directionInput.value)) {
  return {
    version: 'v1',
    variant: 'default',
    position: { ...state.position },
    direction,
    intensity: 2,
    hooks: {}
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

    explosionFlash({ position, intensity }) {
      const flash = createTransient('impact-flash', position);
      flash.style.width = '118px';
      flash.style.height = '118px';
      flash.style.borderRadius = '50%';
      flash.style.background = 'radial-gradient(circle, rgba(255,255,255,.98) 0%, rgba(255,238,162,.95) 15%, rgba(255,145,56,.72) 38%, rgba(255,70,35,.28) 62%, transparent 78%)';
      flash.style.boxShadow = '0 0 34px rgba(255,125,45,.36)';
      const end = 1.05 + Math.min(1.4, intensity) * .35;
      return animateTransient(flash, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.18)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(.56)', offset: .12 },
        { opacity: .58, transform: `translate(-50%, -50%) scale(${end * .82})`, offset: .42 },
        { opacity: 0, transform: `translate(-50%, -50%) scale(${end})` }
      ], { duration: 240, easing: 'cubic-bezier(.08,.74,.14,1)', fill: 'forwards' });
    },

    screenKick({ direction, distance }) {
      screenKickController.kick(direction, distance);
    }
  };
}

function timelineEntries(effectId, spec) {
  if (effectId === 'heavyImpact') {
    return [
      [spec.timings.contactFlash, 'Contact flash'],
      [spec.timings.sparks, 'Aligned hero sparks'],
      [spec.timings.debris, 'Directional debris'],
      [spec.timings.pressureWave, 'Directional pressure wave'],
      [spec.timings.targetKick, 'Target kick hook'],
      [spec.timings.screenKick, 'Screen kick hook'],
      [spec.duration, 'Lifecycle cleanup']
    ];
  }

  return [
    [spec.timings.flash, 'Explosion flash hook'],
    [spec.timings.core, 'Core sprite + fireball'],
    [spec.timings.sparks, 'Broad directional sparks'],
    [spec.timings.debris, 'Blast debris'],
    [spec.timings.screenKick, 'Screen kick hook'],
    [spec.timings.smoke, 'Smoke tail'],
    [spec.duration, 'Lifecycle cleanup']
  ];
}

function resolvedPreview() {
  const effectId = selectedEffectId();
  const params = currentParams();
  const spec = state.definition?.spec;
  if (!spec) return null;
  const intensity = Math.max(.25, params.intensity);
  const direction = normalizeDirection(params.direction);

  if (effectId === 'heavyImpact') {
    return {
      effectId,
      intensity,
      direction,
      layers: [
        ['Sparks', `${Math.max(1, Math.round(spec.sparks.baseCount * intensity))} particles`],
        ['Debris', `${Math.max(1, Math.round(spec.debris.baseCount * Math.max(.7, intensity)))} particles`],
        ['Pressure wave', `${spec.timings.pressureWave} ms hook`],
        ['Contact flash', `${spec.timings.contactFlash} ms hook`],
        ['Target kick', `${(8.5 * intensity).toFixed(1)} px`]
      ],
      screenKick: 4.5 * Math.min(1.5, intensity)
    };
  }

  const countScale = Math.max(.55, intensity);
  return {
    effectId,
    intensity,
    direction,
    layers: [
      ['Core sprite', '1 image particle'],
      ['Fireball', `${Math.max(1, Math.round(spec.fireball.baseCount * countScale))} particles`],
      ['Sparks', `${Math.max(1, Math.round(spec.sparks.baseCount * countScale))} particles`],
      ['Debris', `${Math.max(1, Math.round(spec.debris.baseCount * Math.max(.7, intensity)))} particles`],
      ['Smoke', `${Math.max(1, Math.round(spec.smoke.baseCount * Math.max(.75, intensity)))} particles`]
    ],
    screenKick: 6.2 * Math.min(1.6, intensity)
  };
}

function updateEffectUi() {
  if (!state.fx) return;
  const effectId = selectedEffectId();
  state.definition = state.fx.resolve(effectId, { version: 'v1', variant: 'default' }).definition;
  const label = state.definition.label;
  const spec = state.definition.spec;

  authoredVersionLabel.textContent = `v1 — ${label}`;
  previewTitle.textContent = `${label} production probe`;
  previewNote.textContent = 'Click to move target + play selected effect';
  captionTitle.textContent = `${effectId} / v1 / default`;
  captionNote.textContent = effectId === 'explosion'
    ? 'second real effect / shared-scheduled production default'
    : 'vertical slice / shared-scheduled production default';
  effectSummary.textContent = state.definition.summary;
  effectTimeline.replaceChildren(...timelineEntries(effectId, spec).map(([ms, text]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = `${ms} ms`;
    dd.textContent = text;
    row.append(dt, dd);
    return row;
  }));
  updateApiPreview();
}

function updateInspector() {
  const resolved = resolvedPreview();
  if (!resolved) return;
  inspector.effect.textContent = `${resolved.effectId}/v1/default`;
  inspector.direction.textContent = `${resolved.direction.degrees.toFixed(0)}° → ${formatVector(resolved.direction.vector)}`;
  inspector.intensity.textContent = `${resolved.intensity.toFixed(1)}×`;
  inspector.path.textContent = pathLabel(state.particleAdapter?.getBurstMode?.() ?? particlePathInput.value);
  resolved.layers.forEach(([label, value], index) => {
    const row = inspector.layers[index];
    if (!row) return;
    row.label.textContent = label;
    row.value.textContent = value;
  });
  inspector.screenKick.textContent = `${resolved.screenKick.toFixed(1)} px`;
  inspector.position.textContent = `${Math.round(state.position.x)}, ${Math.round(state.position.y)} CSS px`;
}

function updateApiPreview() {
  const effectId = selectedEffectId();
  apiPreview.textContent = `FXDeck.play("${effectId}", {\n  version: "v1",\n  variant: "default",\n  position: { x: ${Math.round(state.position.x)}, y: ${Math.round(state.position.y)} },\n  direction: ${Number(directionInput.value)},\n  intensity: ${Number(intensityInput.value).toFixed(1)}\n});`;
  updateInspector();
}

function readySummary(effectId, resolved) {
  if (effectId === 'heavyImpact') {
    return `sparks ${resolved.sparks.count}, debris ${resolved.debris.count}, duration ${resolved.duration}ms`;
  }
  return `core ${resolved.core.count}, fireball ${resolved.fireball.count}, sparks ${resolved.sparks.count}, debris ${resolved.debris.count}, smoke ${resolved.smoke.count}, duration ${resolved.duration}ms`;
}

function playAt(position = state.position, directionOverride = null, effectOverride = null) {
  state.position = { ...position };
  setTargetPosition(state.position);
  const params = currentParams(state.position);
  if (Number.isFinite(directionOverride)) params.direction = directionOverride;
  const effectId = effectOverride ?? selectedEffectId();
  const instance = state.fx.play(effectId, params);
  const normalized = normalizeDirection(params.direction);
  log(`PLAY ${instance.id} ${effectId}/v1/default [${pathLabel(state.particleAdapter.getBurstMode())}] @ ${Math.round(position.x)},${Math.round(position.y)} intensity ${params.intensity.toFixed(1)} direction ${normalized.degrees.toFixed(0)}°`);
  instance.ready
    .then(() => log(`READY ${instance.id}: ${readySummary(effectId, instance.resolved)}`))
    .catch((error) => log(`ERROR ${instance.id}: ${error.message}`));
  updateApiPreview();
  return instance;
}

function runOverlapLeg(path, label, onComplete, effectId = selectedEffectId()) {
  const base = Number(directionInput.value);
  const position = { ...state.position };
  const offsets = [-24, -14, -5, 6, 16, 27];

  cancelBenchmarkTimers();
  state.perfCapture = null;
  state.fx.stopAll('perf-prep');
  screenKickController.reset();
  setParticlePath(path);
  log(`PERF ${label}: preparing clean baseline`);

  scheduleBenchmarkTask(() => {
    const cleanStats = state.fx.getStats();
    const cleanResources = `${cleanStats.activeInstances ?? 0}/${cleanStats.particles?.emitters ?? 0}/${cleanStats.particles?.particles ?? 0}`;
    const cleanGroups = cleanStats.particles?.burstGroups ?? 0;
    const cleanQueued = cleanStats.particles?.queuedParticles ?? 0;
    if (cleanResources !== '0/0/0' || cleanGroups !== 0 || cleanQueued !== 0) {
      log(`PERF ${label}: WARNING pre-test resources ${cleanResources}, groups ${cleanGroups}, queued ${cleanQueued}`);
    }

    startPerfCapture(label, 1500, onComplete);
    log(`OVERLAP ×6 ${effectId} directions: ${offsets.map((offset) => `${(base + offset + 360) % 360}°`).join(', ')}`);
    offsets.forEach((offset, index) => {
      scheduleBenchmarkTask(() => playAt(position, (base + offset + 360) % 360, effectId), index * 36);
    });
  }, 120);
}

function playOverlap() {
  if (state.benchmark.running) return log('PERF Overlap ×6: ignored because a benchmark is already running');
  setBenchmarkBusy(true);
  const path = particlePathInput.value;
  const effectId = selectedEffectId();
  runOverlapLeg(path, `Overlap ×6 ${effectId} [${pathLabel(path)}]`, () => finishBenchmark(), effectId);
}

function runABBenchmark() {
  if (state.benchmark.running) return log('PERF Effect A/B: ignored because a benchmark is already running');
  const originalPath = particlePathInput.value;
  const effectId = selectedEffectId();
  state.benchmark.restorePath = originalPath;
  setBenchmarkBusy(true);
  log(`EFFECT A/B START: ${effectId} intensity ${Number(intensityInput.value).toFixed(1)}; per-play-emitter first, shared-scheduled second`);

  runOverlapLeg('emitter', `${effectId} A/B emitter`, (emitterResult) => {
    scheduleBenchmarkTask(() => {
      runOverlapLeg('scheduled', `${effectId} A/B shared-scheduled`, (scheduledResult) => {
        const avgDelta = scheduledResult.avgFps - emitterResult.avgFps;
        const lowDelta = scheduledResult.low1 - emitterResult.low1;
        const particleDelta = scheduledResult.peakParticles - emitterResult.peakParticles;
        log(`EFFECT A/B RESULT ${effectId}: emitter ${emitterResult.avgFps.toFixed(1)} avg / ${emitterResult.low1.toFixed(1)} low / ${emitterResult.spikes20} spikes / ${emitterResult.peakEmitters} emitters / ${emitterResult.peakParticles} particles | scheduled ${scheduledResult.avgFps.toFixed(1)} avg / ${scheduledResult.low1.toFixed(1)} low / ${scheduledResult.spikes20} spikes / ${scheduledResult.peakBurstGroups} groups / ${scheduledResult.peakParticles} particles / peak queued ${scheduledResult.peakQueuedParticles} | Δ scheduled-emitter ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)} avg FPS, ${lowDelta >= 0 ? '+' : ''}${lowDelta.toFixed(1)} low, ${particleDelta >= 0 ? '+' : ''}${particleDelta} peak particles`);
        finishBenchmark();
      }, effectId);
    }, 320);
  }, effectId);
}

async function runCancellationGate() {
  if (state.benchmark.running) return log(`${BUILD} CANCEL GATE: ignored because a benchmark is already running`);
  const originalPath = particlePathInput.value;
  state.benchmark.restorePath = originalPath;
  setBenchmarkBusy(true);
  cancelBenchmarkTimers();
  state.perfCapture = null;

  try {
    state.fx.stopAll('cancel-gate-reset');
    screenKickController.reset();
    setParticlePath('scheduled');
    await nextFrame();
    await nextFrame();
    assertResourcesClean(state.fx.getStats(), 'Cancel gate reset');
    log(`${BUILD} CANCEL GATE START: production shared-scheduled path / Heavy Impact intensity 2.0`);

    const single = state.fx.play('heavyImpact', cancellationParams());
    await single.ready;
    const singleQueued = state.fx.getStats();
    if ((singleQueued.particles?.queuedParticles ?? 0) <= 0) throw new Error(`single-instance precondition missed active scheduler work: ${resourceText(singleQueued)}`);
    log(`CANCEL GATE phase 1 pre-stop: ${resourceText(singleQueued)}`);
    state.fx.stop(single, 'cancel-gate-instance-stop');
    await nextFrame();
    await nextFrame();
    assertResourcesClean(state.fx.getStats(), 'Single EffectInstance stop');
    await wait(120);
    await nextFrame();
    assertResourcesClean(state.fx.getStats(), 'Single EffectInstance late-respawn check');
    log('PASS CANCEL GATE phase 1: FXDeck.stop(instance) cancelled owned particles + queued work; no late respawn');

    const base = Number(directionInput.value);
    const offsets = [-24, -14, -5, 6, 16, 27];
    const instances = offsets.map((offset) => state.fx.play('heavyImpact', cancellationParams((base + offset + 360) % 360)));
    await Promise.all(instances.map((instance) => instance.ready));
    const overlapQueued = state.fx.getStats();
    if ((overlapQueued.particles?.queuedParticles ?? 0) <= 0) throw new Error(`stopAll precondition missed active scheduler work: ${resourceText(overlapQueued)}`);
    log(`CANCEL GATE phase 2 pre-stopAll: ${resourceText(overlapQueued)}`);
    state.fx.stopAll('cancel-gate-stop-all');
    await nextFrame();
    await nextFrame();
    assertResourcesClean(state.fx.getStats(), 'stopAll immediate cleanup');
    await wait(140);
    await nextFrame();
    assertResourcesClean(state.fx.getStats(), 'stopAll late-respawn check');
    log('PASS CANCEL GATE phase 2: FXDeck.stopAll() cleared instances/groups/particles/queue and delayed Heavy Impact work did not respawn');
    log(`${BUILD} CANCEL GATE: PASS — per-instance ownership, queued-work cancellation and stopAll late-respawn protection are clean`);
  } catch (error) {
    state.fx.stopAll('cancel-gate-failed');
    screenKickController.reset();
    log(`${BUILD} CANCEL GATE: FAIL — ${error.message}`);
    console.error(error);
  } finally {
    finishBenchmark();
  }
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
  logOutput.textContent = 'FXDeck Runtime Lab log cleared.';
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
    preload: [
      { src: './assets/fxdeck-spark.svg', width: 32, height: 10 },
      { src: './assets/fxdeck-explosion-core.svg', width: 128, height: 128 }
    ],
    burstMode: particlePathInput.value,
    sharedFrameBudgetMs: 6,
    sharedChunkSize: 8,
    sharedImmediateCount: 8
  }).init();

  const fx = new FXDeckRuntime({ adapters: { particles: particleAdapter } });
  registerHeavyImpact(fx);
  registerExplosion(fx);
  state.fx = fx;
  state.particleAdapter = particleAdapter;

  globalThis.FXDeck = fx;
  globalThis.FXDeckLab = {
    fx,
    particleAdapter,
    playAt,
    playOverlap,
    runABBenchmark,
    runCancellationGate,
    startPerfCapture,
    setParticlePath,
    screenKickController,
    abortBenchmark
  };
  globalThis.FXDeckP2 = globalThis.FXDeckLab;
  globalThis.FXDeckLog = {
    getText: () => logOutput.textContent.trim(),
    getLines: () => logOutput.textContent.trim().split('\n').filter(Boolean),
    copy: copyLog,
    clear: clearLog
  };

  playButton.addEventListener('click', () => { if (!state.benchmark.running) playAt(); });
  overlapButton.addEventListener('click', playOverlap);
  abButton.addEventListener('click', runABBenchmark);
  cancelGateButton?.addEventListener('click', runCancellationGate);
  stopButton.addEventListener('click', () => {
    const cancelledBenchmark = abortBenchmark();
    fx.stopAll('manual-stop-all');
    screenKickController.reset();
    log(`STOP ALL — instances, particle resources, scheduler queue, screen kick${cancelledBenchmark ? ' and scheduled benchmark tasks' : ''} cleared`);
  });

  stage.addEventListener('pointerdown', (event) => {
    if (state.benchmark.running) return;
    const rect = stage.getBoundingClientRect();
    playAt({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  });

  effectInput.addEventListener('change', () => {
    fx.stopAll('effect-switch');
    screenKickController.reset();
    updateEffectUi();
    log(`EFFECT → ${selectedEffectId()}`);
  });
  intensityInput.addEventListener('input', () => {
    intensityValue.textContent = Number(intensityInput.value).toFixed(1);
    updateApiPreview();
  });
  directionInput.addEventListener('input', () => {
    directionValue.textContent = `${directionInput.value}°`;
    updateApiPreview();
  });
  particlePathInput.addEventListener('change', () => setParticlePath(particlePathInput.value, { writeLog: true }));
  copyLogButton.addEventListener('click', copyLog);
  clearLogButton.addEventListener('click', clearLog);

  window.addEventListener('resize', () => {
    abortBenchmark();
    screenKickController.reset();
    particleAdapter.clear();
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
    burstGroupMetric.textContent = String(stats.particles?.burstGroups ?? 0);
    const scale = stats.particles?.scale ?? { x: 1, y: 1 };
    scaleMetric.textContent = `${scale.x.toFixed(2)}×${scale.y.toFixed(2)}`;
    recordFrame(now, stats);
    requestAnimationFrame(metricsLoop);
  }

  setTargetPosition(state.position);
  intensityValue.textContent = Number(intensityInput.value).toFixed(1);
  directionValue.textContent = `${directionInput.value}°`;
  updateEffectUi();
  requestAnimationFrame(metricsLoop);

  const schedulerStats = particleAdapter.getStats();
  log(`PASS ${BUILD} bootstrap: Heavy Impact + Explosion registered through the same FXDeck runtime`);
  log(`${BUILD} production one-shot default: shared-scheduled (${schedulerStats.schedulerBudgetMs}ms CPU budget/frame, chunk ${schedulerStats.schedulerChunkSize}, immediate seed ${schedulerStats.schedulerImmediateCount})`);
  log('P3.3 cancellation gate was accepted; P3.4 focus is second-effect reuse and custom-code pressure');
  log('Explosion layers: core sprite + fireball + sparks + debris + smoke + screen kick; no new runtime subsystem added');
}

bootstrap().catch((error) => {
  log(`BOOTSTRAP FAIL: ${error.message}`);
  console.error(error);
});
