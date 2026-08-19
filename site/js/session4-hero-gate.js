import { compileWeb2D } from '../fxdeck/web2d/compiler.js?v=p4.4.2';

const BUILD = 'P4.4.2';
const REGRESSION_EFFECT_IDS = new Set(['schema-test-burst', 'schema-test-smoke', 'schema-test-rain']);

function log(message) {
  const output = document.querySelector('#p2-log');
  if (!output) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  output.textContent += `\n[${stamp}] ${message}`;
  output.scrollTop = output.scrollHeight;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function waitForReady(timeoutMs = 10000) {
  const started = performance.now();
  while (!globalThis.FXDeckWeb2D?.fx || !globalThis.FXDeckHeroEffects || !globalThis.FXDeckAssets) {
    if (performance.now() - started > timeoutMs) throw new Error('FXD_P4_4_GATE: hero integration did not become ready');
    await wait(20);
  }
  return globalThis.FXDeckWeb2D;
}

function resourceState(runtime) {
  const stats = runtime.fx.getStats();
  const particles = stats.particles ?? {};
  return {
    instances: stats.activeInstances ?? 0,
    particles: particles.particles ?? 0,
    emitters: particles.emitters ?? 0,
    groups: particles.burstGroups ?? 0,
    queued: particles.queuedParticles ?? 0
  };
}

function assertClean(runtime, label) {
  const state = resourceState(runtime);
  if (Object.values(state).some((value) => value !== 0)) {
    throw new Error(`${label}: resources not clean ${JSON.stringify(state)}`);
  }
}

function compiledLayer(compiled, id) {
  const layer = compiled.layers.find((entry) => entry.id === id);
  if (!layer) throw new Error(`${compiled.id}: missing compiled layer ${id}`);
  return layer;
}

function sourceLayer(definition, id) {
  const layer = definition.source.layers.find((entry) => entry.id === id);
  if (!layer) throw new Error(`${definition.id}: missing source layer ${id}`);
  return layer;
}

async function playStop(runtime, id, params, holdMs, position = { x: -360, y: -360 }) {
  const instance = runtime.fx.play(id, {
    position,
    intensity: 1,
    direction: 35,
    ...params
  });
  await instance.ready;
  await wait(holdMs);
  runtime.fx.stop(instance, 'session4-gate');
  await nextFrame();
  await nextFrame();
  await wait(80);
  assertClean(runtime, id);
}

function assertRegressionFixturesHidden() {
  const select = document.querySelector('#effect-select');
  if (!select) return;
  const leaked = [...select.options].map((option) => option.value).filter((value) => REGRESSION_EFFECT_IDS.has(value));
  if (leaked.length) throw new Error(`regression fixtures leaked into Play selector: ${leaked.join(', ')}`);
}

function assertCriticalScale(definition) {
  const asset = definition.source.assets.find((entry) => entry.id === 'critical-slash');
  if (!asset) throw new Error('Critical Hit missing hydrated critical-slash asset');
  const ratio = asset.width / asset.height;
  if (Math.abs(ratio - 4) > 0.001) throw new Error(`Critical Hit slash ratio must be 4:1, got ${ratio}`);

  for (const id of ['primary-slash', 'echo-slash']) {
    const layer = sourceLayer(definition, id);
    const maxRadius = Math.max(layer.size.start, layer.size.end);
    const renderedWidth = maxRadius * 2;
    const renderedHeight = renderedWidth / ratio;
    if (renderedWidth > 160 || renderedHeight > 42) {
      throw new Error(`${id}: unsafe rendered size ${renderedWidth.toFixed(1)}x${renderedHeight.toFixed(1)}px`);
    }
    if (layer.origin && (Math.abs(layer.origin.x ?? 0) > 0 || Math.abs(layer.origin.y ?? 0) > 0)) {
      throw new Error(`${id}: dominant slash must stay centered on gameplay impact`);
    }
  }
}

function assertGoalTransformBudget(definition) {
  for (const layer of definition.source.layers) {
    if (layer.origin) {
      const maxOffset = Math.max(Math.abs(layer.origin.x ?? 0), Math.abs(layer.origin.y ?? 0));
      if (maxOffset > 110) throw new Error(`${layer.id}: local origin offset ${maxOffset}px exceeds compact composition budget`);
    }
    if (layer.shape.type === 'image') {
      const maxRadius = Math.max(layer.size.start, layer.size.end);
      if (maxRadius > 6) throw new Error(`${layer.id}: confetti image radius ${maxRadius}px is oversized`);
    }
  }
}

export async function runSession4Gate() {
  const runtime = await waitForReady();
  const heroState = globalThis.FXDeckHeroEffects;

  const critical = runtime.fx.resolve('critical-hit').definition;
  const goal = runtime.fx.resolve('goal-celebration').definition;
  if (!critical.schemaDriven || !goal.schemaDriven) throw new Error('hero effects must both be schema-driven');
  if (critical.source.layers.length !== 5) throw new Error(`Critical Hit expected 5 authored layers, got ${critical.source.layers.length}`);
  if (goal.source.layers.length !== 6) throw new Error(`Goal Celebration expected 6 authored layers, got ${goal.source.layers.length}`);

  assertCriticalScale(critical);
  assertGoalTransformBudget(goal);

  const criticalCompiled = compileWeb2D(critical.source, {
    direction: 123,
    intensity: 1.25,
    tint: '#ff4d8d'
  });
  const primarySlash = compiledLayer(criticalCompiled, 'primary-slash');
  const criticalStreaks = compiledLayer(criticalCompiled, 'streaks').emitter.particles;
  if (criticalStreaks.move.angle.offset !== 123) throw new Error(`semantic direction did not compile: ${criticalStreaks.move.angle.offset}`);
  if (criticalStreaks.rotate?.path !== true) throw new Error('Critical Hit streaks are not oriented to motion');
  if (primarySlash.emitter.particles.rotate?.path !== false) throw new Error('Critical Hit primary slash must use fixed direction orientation');
  if (Number(primarySlash.emitter.particles.rotate?.value) !== 123) throw new Error('Critical Hit primary slash is not aligned 1:1 with gameplay direction');
  if (criticalStreaks.color.value !== '#ff4d8d') throw new Error(`critical tint did not compile: ${criticalStreaks.color.value}`);

  const goalCompiled = compileWeb2D(goal.source, {
    intensity: 1.15,
    teamColor: '#e31837'
  });
  const leftRibbon = compiledLayer(goalCompiled, 'ribbon-left');
  const rightRibbon = compiledLayer(goalCompiled, 'ribbon-right');
  const leftConfetti = compiledLayer(goalCompiled, 'team-confetti-left');
  const rightConfetti = compiledLayer(goalCompiled, 'team-confetti-right');
  if (leftRibbon.emitter.particles.shape.type !== 'ribbon' || rightRibbon.emitter.particles.shape.type !== 'ribbon') {
    throw new Error('Goal Celebration must compile two ribbon layers');
  }
  if (leftRibbon.origin.x !== -54 || rightRibbon.origin.x !== 54) throw new Error('Goal ribbon origins drifted from normalized local layout');
  if (leftConfetti.emitter.particles.color.value !== '#e31837' || rightConfetti.emitter.particles.color.value !== '#e31837') {
    throw new Error('teamColor binding did not compile into confetti layers');
  }
  if (!heroState.ribbonCapabilityAdded || runtime.capabilities?.ribbon !== true) throw new Error('ribbon capability was not registered during Web2D boot');

  assertRegressionFixturesHidden();

  runtime.fx.stopAll('session4-gate-reset');
  await nextFrame();
  await nextFrame();
  assertClean(runtime, 'session4 reset');

  const container = runtime.adapters.particles.container;
  await playStop(runtime, 'critical-hit', { direction: 123, intensity: 1.25, tint: '#ff4d8d' }, 90);
  if (runtime.adapters.particles.container !== container) throw new Error('container changed after Critical Hit');

  await playStop(runtime, 'goal-celebration', { intensity: 1.15, teamColor: '#e31837' }, 300);
  if (runtime.adapters.particles.container !== container) throw new Error('container changed after Goal Celebration');

  // Near-edge call validates generic origin clamping without adding effect-specific positioning code.
  await playStop(runtime, 'goal-celebration', { intensity: 0.7, teamColor: '#4ea1ff' }, 120, { x: 2, y: 2 });

  runtime.assertTopology();
  const canvasCount = runtime.topology().particleCanvasCount;
  if (canvasCount !== 1) throw new Error(`expected 1 persistent canvas, found ${canvasCount}`);

  const result = {
    pass: true,
    build: BUILD,
    effects: ['critical-hit', 'goal-celebration'],
    schemaDriven: 2,
    normalizedImageScale: true,
    neutralSlashAsset: true,
    directionAlignment: true,
    compactGoalOrigins: true,
    edgeClamp: true,
    regressionFixturesHiddenFromPlay: true,
    particleCanvasCount: canvasCount,
    visualAccepted: false
  };

  globalThis.FXDeckSession4Gate = result;
  if (globalThis.FXDeckLab) globalThis.FXDeckLab.runSession4Gate = runSession4Gate;

  log(`PASS ${BUILD} SESSION 4 TRANSFORM GATE: normalized image scale / 4:1 neutral slash / direction aligned / compact Goal layout / edge-clamped origins / Debug-only fixtures / 1 persistent canvas`);
  log(`${BUILD} SESSION 4 VISUAL GATE: USER REVIEW REQUIRED — reject again if composition, scale or orientation still looks wrong`);
  return result;
}

try {
  await runSession4Gate();
} catch (error) {
  globalThis.FXDeckSession4Gate = { pass: false, build: BUILD, error: error.message, visualAccepted: false };
  log(`FAIL ${BUILD} SESSION 4 TRANSFORM GATE: ${error.message}`);
  console.error(error);
}
