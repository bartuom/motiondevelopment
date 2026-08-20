import { createWeb2DRuntime } from '../fxdeck/web2d/create-web2d-runtime.js?v=p4.6.1';
import { normalizeDirection } from '../fxdeck/core/fxdeck.js?v=p4.6.1';
import { loadEffectDefinitions } from '../fxdeck/schema/effect-loader.js?v=p4.6.1';
import { registerSchemaEffects } from '../fxdeck/web2d/register-schema-effect.js?v=p4.6.1';

const BUILD = 'P4.6.1';
const FRAME_BUDGET_MS = 1000 / 60;
const BOOT_KEY = '__FXDeckCanonicalRuntimeBootPromise';
const BOOT_COUNT_KEY = '__FXDeckCanonicalRuntimeBootCount';
const SCHEMA_URLS = [
  './fxdeck/schema/examples/schema-test-burst.json?v=p4.6.1',
  './fxdeck/schema/examples/schema-test-smoke.json?v=p4.6.1',
  './fxdeck/schema/examples/schema-test-rain.json?v=p4.6.1'
];
const EFFECT_ORDER = [
  ['heavyImpact', 'Heavy Impact — internal topology baseline'],
  ['fireball', 'Projectile / Fireball — retained visual reference']
];

const stage = document.querySelector('#impact-stage');
const kickLayer = document.querySelector('#impact-kick-layer');
const particleHost = document.querySelector('#heavy-impact-particles');
const visualHost = document.querySelector('#impact-dom-layer');
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

const metrics = {
  active: document.querySelector('#metric-instances'),
  visuals: document.querySelector('#metric-visuals'),
  particles: document.querySelector('#metric-particles'),
  emitters: document.querySelector('#metric-emitters'),
  groups: document.querySelector('#metric-burst-groups'),
  scale: document.querySelector('#metric-scale'),
  fps: document.querySelector('#metric-fps'),
  low: document.querySelector('#metric-low'),
  spikes: document.querySelector('#metric-spikes'),
  p95: document.querySelector('#metric-p95'),
  p99: document.querySelector('#metric-p99'),
  worst: document.querySelector('#metric-worst'),
  debt: document.querySelector('#metric-debt'),
  pressure: document.querySelector('#metric-queue-pressure'),
  shed: document.querySelector('#metric-quality-shed'),
  queued: document.querySelector('#metric-queued'),
  path: document.querySelector('#metric-burst-path')
};

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
  runtime: null,
  definition: null,
  position: null,
  frameTimes: [],
  lastFrameAt: 0,
  busy: false
};

function log(message) {
  if (!logOutput) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function percentile(sorted, q) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * q) - 1));
  return sorted[index];
}

function summarizeFrames(samples) {
  const valid = samples.filter((dt) => Number.isFinite(dt) && dt > 0 && dt < 250);
  if (!valid.length) return { avgFps: 0, low1: 0, p95Ms: 0, p99Ms: 0, worstMs: 0, debtMs: 0, spikes20: 0 };
  const avgMs = valid.reduce((sum, dt) => sum + dt, 0) / valid.length;
  const sorted = [...valid].sort((a, b) => a - b);
  const p95Ms = percentile(sorted, .95);
  const p99Ms = percentile(sorted, .99);
  return {
    avgFps: 1000 / avgMs,
    low1: 1000 / p99Ms,
    p95Ms,
    p99Ms,
    worstMs: sorted[sorted.length - 1],
    debtMs: valid.reduce((sum, dt) => sum + Math.max(0, dt - FRAME_BUDGET_MS), 0),
    spikes20: valid.filter((dt) => dt > 20).length
  };
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

  return {
    kick(direction, distance) {
      x += -direction.x * distance;
      y += -direction.y * distance;
      const magnitude = Math.hypot(x, y);
      if (magnitude > 14) {
        x = (x / magnitude) * 14;
        y = (y / magnitude) * 14;
      }
      if (!raf) raf = requestAnimationFrame(frame);
    },
    reset() {
      if (raf) cancelAnimationFrame(raf);
      x = 0;
      y = 0;
      raf = 0;
      last = 0;
      element.style.transform = 'translate3d(0,0,0)';
    }
  };
}

const screenKickController = createScreenKickController(kickLayer);

function createTransient(className, point) {
  const element = document.createElement('div');
  element.className = className;
  element.style.left = `${point.x}px`;
  element.style.top = `${point.y}px`;
  visualHost.appendChild(element);
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
    fireballLaunch({ position, directionDegrees, intensity }) {
      const flash = createTransient('impact-flash', position);
      const scale = .48 + Math.min(1.4, intensity) * .12;
      return animateTransient(flash, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.2)` },
        { opacity: .75, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale})`, offset: .25 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale * 1.35})` }
      ], { duration: 120, easing: 'cubic-bezier(.08,.74,.14,1)', fill: 'forwards' });
    },
    contactFlash({ position, directionDegrees, intensity }) {
      const flash = createTransient('impact-flash', position);
      const scale = Math.min(1.35, .76 + intensity * .2);
      return animateTransient(flash, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.28)` },
        { opacity: .92, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale})`, offset: .14 },
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
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${endScale})` }
      ], { duration: 190, easing: 'cubic-bezier(.08,.74,.14,1)', fill: 'forwards' });
    },
    targetKick({ direction, distance }) {
      const dx = direction.x * distance;
      const dy = direction.y * distance;
      const animation = target.animate([
        { transform: 'translate(-50%, -50%) scale(1)' },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.972)`, offset: .2 },
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
        { opacity: 0, transform: `translate(-50%, -50%) scale(${end})` }
      ], { duration: 240, easing: 'cubic-bezier(.08,.74,.14,1)', fill: 'forwards' });
    },
    screenKick({ direction, distance }) {
      screenKickController.kick(direction, distance);
    }
  };
}

function selectedEffectId() {
  return effectInput.value;
}

function currentParams(position = state.position, effectId = selectedEffectId()) {
  const params = {
    version: 'v1',
    variant: 'default',
    position: { ...position },
    direction: Number(directionInput.value),
    intensity: Number(intensityInput.value),
    quality: 'high',
    hooks: createHooks()
  };
  if (effectId === 'fireball') params.distance = clamp(stage.clientWidth * .32, 120, 340);
  return params;
}

function setTargetPosition(point) {
  state.position = { x: point.x, y: point.y };
  target.style.left = `${point.x}px`;
  target.style.top = `${point.y}px`;
}

function pathLabel(path) {
  if (path === 'scheduled') return 'shared-scheduled';
  if (path === 'shared') return 'shared-direct';
  return path === 'emitter' ? 'per-play-emitter' : path;
}

function setParticlePath(path, { writeLog = false } = {}) {
  state.runtime.adapters.particles.setBurstMode(path);
  if (particlePathInput.value !== path) particlePathInput.value = path;
  if (metrics.path) metrics.path.textContent = pathLabel(path);
  if (writeLog) log(`PARTICLE PATH → ${pathLabel(path)}`);
  updateInspector();
}

function populateEffects() {
  effectInput.textContent = '';
  for (const [id, label] of EFFECT_ORDER) {
    try {
      state.runtime.fx.resolve(id);
    } catch {
      continue;
    }
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    effectInput.appendChild(option);
  }
}

function schemaLayerDescription(layer) {
  const spawn = layer.spawn?.mode === 'rate'
    ? `${layer.spawn.ratePerSecond}/s × ${layer.spawn.durationMs}ms`
    : `${layer.spawn?.count ?? '?'} burst`;
  const shape = layer.shape?.type === 'image' ? `image:${layer.shape.asset}` : layer.shape?.type;
  return `${shape} / ${spawn} / life ${layer.lifetimeMs?.min ?? '?'}–${layer.lifetimeMs?.max ?? '?'}ms`;
}

function legacyLayerDescriptions(id, spec) {
  if (id === 'heavyImpact') return [
    ['Hero sparks', `${spec.sparks.baseCount} base / ${spec.sparks.spread}° spread`],
    ['Debris', `${spec.debris.baseCount} base / ${spec.debris.spread}° spread`],
    ['Contact flash', `${spec.timings.contactFlash}ms hook`],
    ['Pressure wave', `${spec.timings.pressureWave}ms hook`],
    ['Lifecycle', `${spec.duration}ms`]
  ];
  if (id === 'explosion') return [
    ['Core', `${spec.core.baseCount} image core`],
    ['Fireball', `${spec.fireball.baseCount} particles`],
    ['Sparks', `${spec.sparks.baseCount} particles`],
    ['Smoke', `${spec.smoke.baseCount} particles`],
    ['Lifecycle', `${spec.duration}ms`]
  ];
  if (id === 'fireball') return [
    ['Projectile', `${spec.travelDuration}ms travel`],
    ['Distance', `${spec.travelDistance}px authored`],
    ['Trail', `every ${spec.trailIntervalMs}ms`],
    ['Impact', 'reuses Explosion cue'],
    ['Hitch clamp', `${spec.maxFrameAdvanceMs}ms max frame advance`]
  ];
  return [];
}

function timelineEntries(definition) {
  if (definition.schemaDriven) {
    const source = definition.source;
    const entries = source.layers.map((layer) => [layer.delayMs ?? 0, `${layer.id}: ${schemaLayerDescription(layer)}`]);
    entries.push([source.durationMs, 'Lifecycle cleanup']);
    return entries.sort((a, b) => a[0] - b[0]);
  }

  const spec = definition.spec;
  if (!spec) return [];
  if (definition.id === 'heavyImpact') return [
    [spec.timings.contactFlash, 'Contact flash'],
    [spec.timings.sparks, 'Hero sparks'],
    [spec.timings.debris, 'Directional debris'],
    [spec.timings.pressureWave, 'Pressure wave'],
    [spec.timings.targetKick, 'Target kick'],
    [spec.timings.screenKick, 'Screen kick'],
    [spec.duration, 'Lifecycle cleanup']
  ];
  if (definition.id === 'explosion') return [
    [spec.timings.flash, 'Explosion flash'],
    [spec.timings.core, 'Core + fireball'],
    [spec.timings.sparks, 'Sparks'],
    [spec.timings.debris, 'Debris'],
    [spec.timings.smoke, 'Smoke'],
    [spec.duration, 'Lifecycle cleanup']
  ];
  return [
    [0, 'Launch'],
    [spec.trailFirstDelayMs, 'First trail burst'],
    [spec.travelDuration, 'Impact + Explosion handoff'],
    [spec.travelDuration + spec.trailCleanupMs, 'Lifecycle cleanup']
  ];
}

function updateTimeline(definition) {
  effectTimeline.textContent = '';
  for (const [time, label] of timelineEntries(definition)) {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = `${Math.round(time)} ms`;
    dd.textContent = label;
    row.append(dt, dd);
    effectTimeline.appendChild(row);
  }
}

function updateInspector() {
  if (!state.runtime || !state.position) return;
  const id = selectedEffectId();
  const { definition } = state.runtime.fx.resolve(id);
  state.definition = definition;
  const intensity = Number(intensityInput.value);
  const direction = normalizeDirection(Number(directionInput.value));
  const path = state.runtime.adapters.particles.getBurstMode();

  inspector.effect.textContent = `${id} / v1 / default`;
  inspector.path.textContent = pathLabel(path);
  inspector.intensity.textContent = `${intensity.toFixed(1)}×`;
  inspector.direction.textContent = `${Math.round(direction.degrees)}°`;
  inspector.position.textContent = `{ x: ${Math.round(state.position.x)}, y: ${Math.round(state.position.y)} }`;

  let rows = [];
  let screenKick = 0;
  if (definition.schemaDriven) {
    rows = definition.source.layers.slice(0, 5).map((layer) => [layer.id, schemaLayerDescription(layer)]);
  } else {
    rows = legacyLayerDescriptions(id, definition.spec);
    if (id === 'heavyImpact') screenKick = 4.5 * Math.min(1.5, intensity);
    if (id === 'explosion') screenKick = 6.2 * Math.min(1.6, intensity);
  }

  for (let index = 0; index < inspector.layers.length; index += 1) {
    const row = rows[index] ?? ['Layer', '—'];
    inspector.layers[index].label.textContent = row[0];
    inspector.layers[index].value.textContent = row[1];
  }
  inspector.screenKick.textContent = screenKick ? `${screenKick.toFixed(1)} px` : '—';
}

function updateApiPreview() {
  if (!state.position) return;
  const id = selectedEffectId();
  const extra = id === 'fireball' ? `,\n  distance: ${Math.round(clamp(stage.clientWidth * .32, 120, 340))}` : '';
  apiPreview.textContent = `FXDeck.play("${id}", {\n  position: { x: ${Math.round(state.position.x)}, y: ${Math.round(state.position.y)} },\n  direction: ${directionInput.value},\n  intensity: ${Number(intensityInput.value).toFixed(1)},\n  quality: "high"${extra}\n});`;
}

function updateEffectUi() {
  const id = selectedEffectId();
  const { definition } = state.runtime.fx.resolve(id);
  state.definition = definition;
  const mode = definition.schemaDriven ? `Schema V${definition.source.schemaVersion}` : 'legacy baseline';
  authoredVersionLabel.textContent = definition.schemaDriven ? 'v1 — schema-driven' : 'v1 — baseline';
  previewTitle.textContent = `${definition.label ?? id} — ${mode}`;
  previewNote.textContent = 'Click to move target + fire current FXDeck effect';
  captionTitle.textContent = `${id} / v1 / default`;
  captionNote.textContent = mode;
  effectSummary.textContent = definition.schemaDriven
    ? `${definition.summary}. This effect is authored as FXDeck Schema data and compiled generically to the Web2D backend; it has no effect-specific runtime bridge.`
    : `${definition.summary} Kept temporarily as a baseline while portfolio effects migrate to FXDeck Schema V1.`;
  playButton.textContent = `FXDeck.play("${id}")`;
  updateTimeline(definition);
  updateApiPreview();
  updateInspector();
}

function setBusy(busy) {
  state.busy = busy;
  for (const element of [effectInput, playButton, overlapButton, abButton, cancelGateButton, particlePathInput, intensityInput, directionInput]) {
    if (element) element.disabled = busy;
  }
}

function playAt(point = state.position, overrides = {}) {
  if (!state.runtime || state.busy) return null;
  if (point) setTargetPosition(point);
  const id = selectedEffectId();
  const params = { ...currentParams(state.position, id), ...overrides };
  const instance = state.runtime.fx.play(id, params);
  instance.ready.catch((error) => log(`PLAY FAIL ${id}: ${error.message}`));
  log(`PLAY ${id} / ${instance.id}`);
  updateApiPreview();
  updateInspector();
  return instance;
}

function resourceState() {
  const stats = state.runtime.fx.getStats();
  const particleStats = stats.particles ?? {};
  return {
    instances: stats.activeInstances ?? 0,
    particles: particleStats.particles ?? 0,
    emitters: particleStats.emitters ?? 0,
    groups: particleStats.burstGroups ?? 0,
    queued: particleStats.queuedParticles ?? 0
  };
}

function assertClean(label) {
  const resources = resourceState();
  if (Object.values(resources).some((value) => value !== 0)) {
    throw new Error(`${label}: expected clean resources, got ${JSON.stringify(resources)}`);
  }
}

async function capturePerformance(durationMs = 1400) {
  const samples = [];
  let last = await nextFrame();
  let peakParticles = 0;
  let peakInstances = 0;
  const started = performance.now();
  while (performance.now() - started < durationMs) {
    const now = await nextFrame();
    samples.push(now - last);
    last = now;
    const resources = resourceState();
    peakParticles = Math.max(peakParticles, resources.particles);
    peakInstances = Math.max(peakInstances, resources.instances);
  }
  return { ...summarizeFrames(samples), peakParticles, peakInstances };
}

function logPerf(label, result) {
  log(`${label}: ${result.avgFps.toFixed(1)} avg / ${result.low1.toFixed(1)} 1% low / p95 ${result.p95Ms.toFixed(1)}ms / p99 ${result.p99Ms.toFixed(1)}ms / worst ${result.worstMs.toFixed(1)}ms / debt ${result.debtMs.toFixed(1)}ms / peak ${result.peakParticles} particles / ${result.peakInstances} instances`);
}

async function playOverlap() {
  if (state.busy) return;
  setBusy(true);
  try {
    state.runtime.fx.stopAll('overlap-reset');
    screenKickController.reset();
    await nextFrame();
    const base = Number(directionInput.value);
    const capture = capturePerformance(1500);
    for (const offset of [-24, -14, -5, 6, 16, 27]) {
      const id = selectedEffectId();
      const params = currentParams(state.position, id);
      params.direction = (base + offset + 360) % 360;
      state.runtime.fx.play(id, params);
    }
    const result = await capture;
    logPerf(`OVERLAP ×6 ${selectedEffectId()}`, result);
  } catch (error) {
    log(`OVERLAP FAIL: ${error.message}`);
    console.error(error);
  } finally {
    setBusy(false);
  }
}

async function runPathLeg(path) {
  state.runtime.fx.stopAll('ab-reset');
  screenKickController.reset();
  setParticlePath(path);
  await nextFrame();
  await nextFrame();
  const id = selectedEffectId();
  const base = Number(directionInput.value);
  const capture = capturePerformance(1400);
  for (const offset of [-18, -8, 4, 15, 27, 39]) {
    const params = currentParams(state.position, id);
    params.direction = (base + offset + 360) % 360;
    state.runtime.fx.play(id, params);
  }
  const result = await capture;
  state.runtime.fx.stopAll('ab-leg-complete');
  await nextFrame();
  return result;
}

async function runABBenchmark() {
  if (state.busy) return;
  setBusy(true);
  const original = state.runtime.adapters.particles.getBurstMode();
  try {
    log(`A/B START ${selectedEffectId()}: emitter vs shared-scheduled`);
    const emitter = await runPathLeg('emitter');
    await wait(120);
    const scheduled = await runPathLeg('scheduled');
    logPerf('A/B emitter', emitter);
    logPerf('A/B scheduled', scheduled);
    log(`A/B DELTA scheduled-emitter: ${(scheduled.avgFps - emitter.avgFps).toFixed(1)} avg FPS / ${(scheduled.low1 - emitter.low1).toFixed(1)} low / ${(scheduled.worstMs - emitter.worstMs).toFixed(1)}ms worst`);
  } catch (error) {
    log(`A/B FAIL: ${error.message}`);
    console.error(error);
  } finally {
    state.runtime.fx.stopAll('ab-finish');
    setParticlePath(original);
    setBusy(false);
  }
}

async function runCancellationGate() {
  if (state.busy) return;
  setBusy(true);
  try {
    state.runtime.fx.stopAll('cancel-reset');
    await nextFrame();
    await nextFrame();
    assertClean('cancel reset');

    const id = selectedEffectId();
    const one = state.runtime.fx.play(id, currentParams(state.position, id));
    await one.ready;
    state.runtime.fx.stop(one, 'cancel-single');
    await nextFrame();
    await nextFrame();
    assertClean('single stop');

    const instances = [];
    for (let index = 0; index < 6; index += 1) {
      const params = currentParams(state.position, id);
      params.direction = (Number(directionInput.value) + index * 17) % 360;
      instances.push(state.runtime.fx.play(id, params));
    }
    await Promise.all(instances.map((instance) => instance.ready));
    state.runtime.fx.stopAll('cancel-stop-all');
    await nextFrame();
    await nextFrame();
    assertClean('stopAll');
    await wait(120);
    assertClean('late stopAll');
    log(`PASS ${BUILD} CANCEL GATE: single stop + overlap stopAll cleanup clean`);
  } catch (error) {
    state.runtime.fx.stopAll('cancel-fail');
    log(`FAIL ${BUILD} CANCEL GATE: ${error.message}`);
    console.error(error);
  } finally {
    setBusy(false);
  }
}

async function runSession1Gate(iterations = 6) {
  const runtime = state.runtime;
  const originalContainer = runtime.persistentContainer;
  const originalEngine = runtime.engine;
  const originalPath = runtime.adapters.particles.getBurstMode();
  runtime.fx.stopAll('session1-gate-reset');
  setParticlePath('scheduled');
  await nextFrame();
  await nextFrame();
  assertClean('session1 reset');

  for (let index = 0; index < iterations; index += 1) {
    const instance = runtime.fx.play('heavyImpact', {
      version: 'v1',
      variant: 'default',
      position: { x: -240, y: -240 },
      direction: (index * 47) % 360,
      intensity: 1,
      hooks: {}
    });
    await instance.ready;
    runtime.fx.stop(instance, 'session1-gate-cycle');
    await nextFrame();
    await nextFrame();
    assertClean(`session1 cycle ${index + 1}`);
    runtime.assertTopology();
    if (runtime.persistentContainer !== originalContainer || runtime.adapters.particles.container !== originalContainer) throw new Error('persistent container identity changed');
    if (runtime.engine !== originalEngine || globalThis.tsParticles !== originalEngine) throw new Error('tsParticles engine identity changed');
    if (globalThis[BOOT_COUNT_KEY] !== 1) throw new Error(`authoritative boot count ${globalThis[BOOT_COUNT_KEY]}, expected 1`);
  }

  setParticlePath(originalPath);
  const topology = runtime.topology();
  const result = { pass: true, build: BUILD, iterations, topology: { particleCanvasCount: topology.particleCanvasCount, registeredEffects: topology.registeredEffects } };
  globalThis.FXDeckSession1Gate = result;
  log(`PASS ${BUILD} SESSION 1 GATE: ${iterations} play/stop cycles / 1 engine / 1 persistent container / ${topology.particleCanvasCount} canvas / bootCount 1`);
  return result;
}

async function copyLog() {
  try {
    await navigator.clipboard.writeText(logOutput.textContent.trim());
    if (logStatus) logStatus.textContent = `Copied ${logOutput.textContent.trim().split('\n').filter(Boolean).length} lines`;
  } catch (error) {
    if (logStatus) logStatus.textContent = 'Clipboard blocked — select log manually';
    console.error(error);
  }
}

function clearLog() {
  logOutput.textContent = `FXDeck Runtime Lab log cleared. Build ${BUILD}.`;
  if (logStatus) logStatus.textContent = '';
}

function bindUi() {
  playButton.addEventListener('click', () => playAt());
  overlapButton?.addEventListener('click', () => playOverlap());
  abButton?.addEventListener('click', () => runABBenchmark());
  cancelGateButton?.addEventListener('click', () => runCancellationGate());
  stopButton.addEventListener('click', () => {
    state.runtime.fx.stopAll('manual-stop-all');
    screenKickController.reset();
    log('STOP ALL — runtime resources cleared');
  });

  stage.addEventListener('pointerdown', (event) => {
    if (state.busy) return;
    const rect = stage.getBoundingClientRect();
    playAt({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  });

  effectInput.addEventListener('change', () => {
    state.runtime.fx.stopAll('effect-switch');
    screenKickController.reset();
    updateEffectUi();
    log(`EFFECT → ${selectedEffectId()}`);
  });
  intensityInput.addEventListener('input', () => {
    intensityValue.textContent = Number(intensityInput.value).toFixed(1);
    updateApiPreview();
    updateInspector();
  });
  directionInput.addEventListener('input', () => {
    directionValue.textContent = `${directionInput.value}°`;
    updateApiPreview();
    updateInspector();
  });
  particlePathInput.addEventListener('change', () => setParticlePath(particlePathInput.value, { writeLog: true }));
  copyLogButton?.addEventListener('click', copyLog);
  clearLogButton?.addEventListener('click', clearLog);

  window.addEventListener('resize', () => {
    state.runtime.fx.stopAll('resize');
    screenKickController.reset();
    state.runtime.resize();
    setTargetPosition({ x: stage.clientWidth * .5, y: stage.clientHeight * .55 });
    updateApiPreview();
    updateInspector();
  });
}

function metricsLoop(now) {
  if (state.lastFrameAt) {
    const dt = now - state.lastFrameAt;
    if (dt > 0 && dt < 250) {
      state.frameTimes.push(dt);
      if (state.frameTimes.length > 180) state.frameTimes.shift();
    }
  }
  state.lastFrameAt = now;

  if (state.runtime) {
    const summary = summarizeFrames(state.frameTimes);
    const stats = state.runtime.fx.getStats();
    const particles = stats.particles ?? {};
    const visuals = state.runtime.adapters.visuals.getStats?.() ?? {};
    metrics.active.textContent = String(stats.activeInstances ?? 0);
    metrics.visuals.textContent = String(visuals.activeVisuals ?? 0);
    metrics.particles.textContent = String(particles.particles ?? 0);
    metrics.emitters.textContent = String(particles.emitters ?? 0);
    metrics.groups.textContent = String(particles.burstGroups ?? 0);
    if (metrics.queued) metrics.queued.textContent = String(particles.queuedParticles ?? 0);
    metrics.fps.textContent = summary.avgFps ? summary.avgFps.toFixed(1) : '--';
    metrics.low.textContent = summary.low1 ? summary.low1.toFixed(1) : '--';
    metrics.p95.textContent = summary.p95Ms ? `${summary.p95Ms.toFixed(1)} ms` : '--';
    metrics.p99.textContent = summary.p99Ms ? `${summary.p99Ms.toFixed(1)} ms` : '--';
    metrics.worst.textContent = summary.worstMs ? `${summary.worstMs.toFixed(1)} ms` : '--';
    metrics.debt.textContent = `${summary.debtMs.toFixed(1)} ms`;
    metrics.spikes20.textContent = String(summary.spikes20);
    const scale = particles.scale ?? { x: 1, y: 1 };
    metrics.scale.textContent = `${Number(scale.x ?? 1).toFixed(2)}×${Number(scale.y ?? 1).toFixed(2)}`;
    metrics.pressure.textContent = `${particles.queuePressure ?? 'none'} / peak ${particles.qualityPeakPressure ?? 'none'}`;
    metrics.shed.textContent = `${particles.qualityShedParticles ?? 0} / ${particles.qualityRequestedParticles ?? 0}`;
    if (metrics.path) metrics.path.textContent = pathLabel(state.runtime.adapters.particles.getBurstMode());
  }
  requestAnimationFrame(metricsLoop);
}

async function bootstrap() {
  globalThis[BOOT_COUNT_KEY] = (globalThis[BOOT_COUNT_KEY] ?? 0) + 1;
  if (globalThis[BOOT_COUNT_KEY] !== 1) throw new Error(`FXDeck canonical bootstrap executed ${globalThis[BOOT_COUNT_KEY]} times.`);

  log(`BOOT ${BUILD}: preserving Runtime Lab UI and replacing only the runtime underneath it`);
  state.runtime = await createWeb2DRuntime({
    stage,
    particleHost,
    visualHost,
    burstMode: particlePathInput.value
  });

  const schemaEffects = await loadEffectDefinitions(SCHEMA_URLS);
  registerSchemaEffects(state.runtime.fx, schemaEffects);

  globalThis.FXDeck = state.runtime.fx;
  globalThis.FXDeckWeb2D = state.runtime;
  globalThis.FXDeckLab = {
    runtime: state.runtime,
    fx: state.runtime.fx,
    particleAdapter: state.runtime.adapters.particles,
    visualAdapter: state.runtime.adapters.visuals,
    screenKickController,
    playAt,
    playOverlap,
    runABBenchmark,
    runCancellationGate,
    runSession1Gate,
    setParticlePath,
    topology: () => state.runtime.topology()
  };
  globalThis.FXDeckLog = {
    getText: () => logOutput.textContent.trim(),
    getLines: () => logOutput.textContent.trim().split('\n').filter(Boolean),
    copy: copyLog,
    clear: clearLog
  };

  populateEffects();
  setTargetPosition({ x: stage.clientWidth * .5, y: stage.clientHeight * .55 });
  intensityValue.textContent = Number(intensityInput.value).toFixed(1);
  directionValue.textContent = `${directionInput.value}°`;
  bindUi();
  updateEffectUi();
  requestAnimationFrame(metricsLoop);

  const topology = state.runtime.topology();
  log(`PASS ${BUILD} BOOT: preserved Runtime Lab UI / 1 FXDeck runtime / 1 tsParticles engine / 1 persistent container / ${topology.particleCanvasCount} canvas / ${topology.registeredEffects} registered effects / ${topology.backendBundle}`);
  log(`${BUILD}: backend ${topology.backendBundle}; ribbon/motion capability, P3 runtime bridges, build-authority MutationObserver and Particlr/reference iframe are not loaded`);

  await runSession1Gate(6);
  return state.runtime;
}

if (!globalThis[BOOT_KEY]) {
  globalThis[BOOT_KEY] = bootstrap().catch((error) => {
    log(`BOOT FAIL ${BUILD}: ${error.message}`);
    console.error(error);
    throw error;
  });
}

await globalThis[BOOT_KEY];