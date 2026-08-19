import { compileWeb2D } from '../fxdeck/web2d/compiler.js?v=p4.4.1';

const BUILD = 'P4.4.1';
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

async function playStop(runtime, id, params, holdMs) {
  const instance = runtime.fx.play(id, {
    position: { x: -360, y: -360 },
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

export async function runSession4Gate() {
  const runtime = await waitForReady();
  const heroState = globalThis.FXDeckHeroEffects;

  const critical = runtime.fx.resolve('critical-hit').definition;
  const goal = runtime.fx.resolve('goal-celebration').definition;
  if (!critical.schemaDriven || !goal.schemaDriven) throw new Error('hero effects must both be schema-driven');
  if (critical.source.layers.length !== 5) throw new Error(`Critical Hit expected 5 authored layers, got ${critical.source.layers.length}`);
  if (goal.source.layers.length !== 7) throw new Error(`Goal Celebration expected 7 authored layers, got ${goal.source.layers.length}`);

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
  const slashValue = primarySlash.emitter.particles.rotate?.value;
  if (Number(slashValue) !== 105) throw new Error(`Critical Hit slash orientation expected 105deg, got ${JSON.stringify(slashValue)}`);
  if (criticalStreaks.color.value !== '#ff4d8d') throw new Error(`critical tint did not compile: ${criticalStreaks.color.value}`);
  if (primarySlash.origin.x !== 8 || primarySlash.origin.rotateWithDirection !== true) throw new Error('Critical Hit directional origin was not preserved');

  const goalCompiled = compileWeb2D(goal.source, {
    intensity: 1.15,
    teamColor: '#e31837'
  });
  const leftRibbon = compiledLayer(goalCompiled, 'ribbon-left');
  const rightRibbon = compiledLayer(goalCompiled, 'ribbon-right');
  const leftConfetti = compiledLayer(goalCompiled, 'team-confetti-left');
  const rightConfetti = compiledLayer(goalCompiled, 'team-confetti-right');
  if (leftRibbon.emitter.particles.shape.type !== 'ribbon' || rightRibbon.emitter.particles.shape.type !== 'ribbon') {
    throw new Error('Goal Celebration must compile two real ribbon layers');
  }
  if (leftRibbon.origin.x >= 0 || rightRibbon.origin.x <= 0) throw new Error('Goal Celebration launch origins are not spatially separated');
  if (leftConfetti.emitter.particles.color.value !== '#e31837' || rightConfetti.emitter.particles.color.value !== '#e31837') {
    throw new Error('teamColor binding did not compile into spatial confetti layers');
  }
  if (!heroState.ribbonCapabilityAdded || runtime.capabilities?.ribbon !== true) throw new Error('ribbon capability was not registered during Web2D boot');

  assertRegressionFixturesHidden();

  const assetStats = globalThis.FXDeckAssets.getStats();
  if (assetStats.manifestAssets < 7) throw new Error(`expected at least 7 manifest assets, got ${assetStats.manifestAssets}`);

  runtime.fx.stopAll('session4-gate-reset');
  await nextFrame();
  await nextFrame();
  assertClean(runtime, 'session4 reset');

  const container = runtime.adapters.particles.container;
  await playStop(runtime, 'critical-hit', { direction: 123, intensity: 1.25, tint: '#ff4d8d' }, 90);
  if (runtime.adapters.particles.container !== container) throw new Error('container changed after Critical Hit');

  await playStop(runtime, 'goal-celebration', { intensity: 1.15, teamColor: '#e31837' }, 300);
  if (runtime.adapters.particles.container !== container) throw new Error('container changed after Goal Celebration');

  runtime.assertTopology();
  const canvasCount = runtime.topology().particleCanvasCount;
  if (canvasCount !== 1) throw new Error(`expected 1 persistent canvas, found ${canvasCount}`);

  const result = {
    pass: true,
    build: BUILD,
    effects: ['critical-hit', 'goal-celebration'],
    schemaDriven: 2,
    criticalShapeLanguage: 'dominant-directional-slash',
    spatialOrigins: true,
    motionOrientation: true,
    ribbonAdded: true,
    regressionFixturesHiddenFromPlay: true,
    particleCanvasCount: canvasCount,
    visualAccepted: false
  };

  globalThis.FXDeckSession4Gate = result;
  if (globalThis.FXDeckLab) globalThis.FXDeckLab.runSession4Gate = runSession4Gate;

  log(`PASS ${BUILD} SESSION 4 CORRECTION TECH GATE: directional Critical Hit / spatial Goal Celebration / ribbons / origin offsets / motion orientation / regression fixtures hidden from Play / 0 effect bridges / 1 persistent canvas`);
  log(`${BUILD} SESSION 4 VISUAL GATE: USER REVIEW REQUIRED — Critical Hit and Goal Celebration must now be judged as compositions, not generic point bursts`);
  return result;
}

try {
  await runSession4Gate();
} catch (error) {
  globalThis.FXDeckSession4Gate = { pass: false, build: BUILD, error: error.message, visualAccepted: false };
  log(`FAIL ${BUILD} SESSION 4 CORRECTION TECH GATE: ${error.message}`);
  console.error(error);
}
