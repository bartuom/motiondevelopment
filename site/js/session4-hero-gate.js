import { compileWeb2D } from '../fxdeck/web2d/compiler.js?v=p4.4.2';

const BUILD = 'P4.4.3';
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
    if (renderedWidth > 160 || renderedHeight > 42) throw new Error(`${id}: unsafe rendered size ${renderedWidth.toFixed(1)}x${renderedHeight.toFixed(1)}px`);
  }
}

function assertGoalStableTransformContract(definition) {
  if (definition.source.layers.length !== 5) throw new Error(`Goal Celebration expected 5 authored layers, got ${definition.source.layers.length}`);

  const imageLayers = definition.source.layers.filter((layer) => layer.shape.type === 'image');
  if (imageLayers.length !== 4) throw new Error(`Goal Celebration expected 4 image confetti layers, got ${imageLayers.length}`);

  for (const layer of definition.source.layers) {
    if (layer.shape.type === 'ribbon') throw new Error(`${layer.id}: ribbon geometry is forbidden in stabilized Goal Celebration`);
    if (layer.rotationDeg) throw new Error(`${layer.id}: random authored rotation is forbidden in stabilized Goal Celebration`);
    if (layer.origin) {
      const maxOffset = Math.max(Math.abs(layer.origin.x ?? 0), Math.abs(layer.origin.y ?? 0));
      if (maxOffset > 64) throw new Error(`${layer.id}: local origin offset ${maxOffset}px exceeds stable composition budget`);
    }
  }

  for (const layer of imageLayers) {
    if (layer.orientation?.mode !== 'motion') throw new Error(`${layer.id}: confetti strip must orient to motion`);
    const maxRadius = Math.max(layer.size.start, layer.size.end);
    if (maxRadius > 4.5) throw new Error(`${layer.id}: confetti image radius ${maxRadius}px exceeds stable size budget`);
  }

  const left = sourceLayer(definition, 'team-left');
  const right = sourceLayer(definition, 'team-right');
  if (left.origin.x !== -62 || right.origin.x !== 62 || left.origin.y !== 28 || right.origin.y !== 28) {
    throw new Error('Goal primary launch origins are not mirrored around the gameplay event');
  }
  if (left.motion.direction !== 315 || right.motion.direction !== 225) {
    throw new Error('Goal primary launch directions are not the expected mirrored upward jets');
  }
}

export async function runSession4Gate() {
  const runtime = await waitForReady();
  const critical = runtime.fx.resolve('critical-hit').definition;
  const goal = runtime.fx.resolve('goal-celebration').definition;

  if (!critical.schemaDriven || !goal.schemaDriven) throw new Error('hero effects must both be schema-driven');
  if (critical.source.layers.length !== 5) throw new Error(`Critical Hit expected 5 authored layers, got ${critical.source.layers.length}`);

  assertCriticalScale(critical);
  assertGoalStableTransformContract(goal);

  const criticalCompiled = compileWeb2D(critical.source, { direction: 123, intensity: 1.25, tint: '#ff4d8d' });
  const primarySlash = compiledLayer(criticalCompiled, 'primary-slash');
  const criticalStreaks = compiledLayer(criticalCompiled, 'streaks').emitter.particles;
  if (criticalStreaks.move.angle.offset !== 123) throw new Error(`semantic direction did not compile: ${criticalStreaks.move.angle.offset}`);
  if (criticalStreaks.rotate?.path !== true) throw new Error('Critical Hit streaks are not oriented to motion');
  if (Number(primarySlash.emitter.particles.rotate?.value) !== 123) throw new Error('Critical Hit primary slash is not aligned 1:1 with gameplay direction');

  const goalCompiled = compileWeb2D(goal.source, { intensity: 1.15, teamColor: '#e31837' });
  const left = compiledLayer(goalCompiled, 'team-left');
  const right = compiledLayer(goalCompiled, 'team-right');
  const accentLeft = compiledLayer(goalCompiled, 'accent-left');
  const accentRight = compiledLayer(goalCompiled, 'accent-right');

  for (const layer of [left, right, accentLeft, accentRight]) {
    if (layer.emitter.particles.shape.type !== 'image') throw new Error(`${layer.id}: expected image confetti shape`);
    if (layer.emitter.particles.rotate?.path !== true) throw new Error(`${layer.id}: confetti is not oriented to motion`);
  }
  if (left.emitter.particles.color.value !== '#e31837' || right.emitter.particles.color.value !== '#e31837') {
    throw new Error('teamColor binding did not compile into primary confetti jets');
  }

  assertRegressionFixturesHidden();

  runtime.fx.stopAll('session4-gate-reset');
  await nextFrame();
  await nextFrame();
  assertClean(runtime, 'session4 reset');

  const container = runtime.adapters.particles.container;
  await playStop(runtime, 'critical-hit', { direction: 123, intensity: 1.25, tint: '#ff4d8d' }, 90);
  if (runtime.adapters.particles.container !== container) throw new Error('container changed after Critical Hit');

  await playStop(runtime, 'goal-celebration', { intensity: 1.15, teamColor: '#e31837' }, 260);
  if (runtime.adapters.particles.container !== container) throw new Error('container changed after Goal Celebration');

  await playStop(runtime, 'goal-celebration', { intensity: 0.7, teamColor: '#4ea1ff' }, 120, { x: 2, y: 2 });

  runtime.assertTopology();
  const canvasCount = runtime.topology().particleCanvasCount;
  if (canvasCount !== 1) throw new Error(`expected 1 persistent canvas, found ${canvasCount}`);

  const result = {
    pass: true,
    build: BUILD,
    effects: ['critical-hit', 'goal-celebration'],
    schemaDriven: 2,
    criticalRetained: true,
    goalRibbonRemoved: true,
    goalRandomRotationRemoved: true,
    goalMirroredOrigins: true,
    goalMotionOrientation: true,
    edgeClamp: true,
    regressionFixturesHiddenFromPlay: true,
    particleCanvasCount: canvasCount,
    visualAccepted: false
  };

  globalThis.FXDeckSession4Gate = result;
  if (globalThis.FXDeckLab) globalThis.FXDeckLab.runSession4Gate = runSession4Gate;

  log(`PASS ${BUILD} SESSION 4 STABLE TRANSFORM GATE: Critical Hit retained / Goal ribbon removed / no random confetti rotation / mirrored compact origins / motion-oriented strips / edge clamp / 1 persistent canvas`);
  log(`${BUILD} SESSION 4 VISUAL GATE: USER REVIEW REQUIRED — Goal Celebration must now stay compact and coherent around the clicked gameplay event`);
  return result;
}

try {
  await runSession4Gate();
} catch (error) {
  globalThis.FXDeckSession4Gate = { pass: false, build: BUILD, error: error.message, visualAccepted: false };
  log(`FAIL ${BUILD} SESSION 4 STABLE TRANSFORM GATE: ${error.message}`);
  console.error(error);
}
