import { compileWeb2D } from '../fxdeck/web2d/compiler.js?v=p4.4.0';

const BUILD = 'P4.4.0';

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

async function waitForReady(timeoutMs = 8000) {
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
  await wait(60);
  assertClean(runtime, id);
}

export async function runSession4Gate() {
  const runtime = await waitForReady();
  const heroState = globalThis.FXDeckHeroEffects;

  const critical = runtime.fx.resolve('critical-hit').definition;
  const goal = runtime.fx.resolve('goal-celebration').definition;
  if (!critical.schemaDriven || !goal.schemaDriven) throw new Error('hero effects must both be schema-driven');
  if (critical.source.layers.length !== 5 || goal.source.layers.length !== 5) throw new Error('hero effects expected 5 authored data layers each');

  const criticalCompiled = compileWeb2D(critical.source, {
    direction: 123,
    intensity: 1.25,
    tint: '#ff4d8d'
  });
  const criticalStreaks = compiledLayer(criticalCompiled, 'streaks').emitter.particles;
  if (criticalStreaks.move.angle.offset !== 123) throw new Error(`semantic direction did not compile: ${criticalStreaks.move.angle.offset}`);
  if (criticalStreaks.color.value !== '#ff4d8d') throw new Error(`critical tint did not compile: ${criticalStreaks.color.value}`);

  const goalCompiled = compileWeb2D(goal.source, {
    intensity: 1.15,
    teamColor: '#e31837'
  });
  const teamConfetti = compiledLayer(goalCompiled, 'team-confetti').emitter.particles;
  const goalFlash = compiledLayer(goalCompiled, 'flash').emitter.particles;
  if (teamConfetti.color.value !== '#e31837' || goalFlash.color.value !== '#e31837') {
    throw new Error('teamColor binding did not compile into Goal Celebration layers');
  }

  const ribbonLayers = [...criticalCompiled.layers, ...goalCompiled.layers]
    .filter((layer) => layer.emitter?.particles?.shape?.type === 'ribbon');
  if (ribbonLayers.length !== 0 || heroState.ribbonCapabilityAdded) throw new Error('ribbon capability was added without a proven visual need');

  const assetStats = globalThis.FXDeckAssets.getStats();
  if (assetStats.manifestAssets < 6) throw new Error(`expected at least 6 manifest assets, got ${assetStats.manifestAssets}`);

  runtime.fx.stopAll('session4-gate-reset');
  await nextFrame();
  await nextFrame();
  assertClean(runtime, 'session4 reset');

  const container = runtime.adapters.particles.container;
  await playStop(runtime, 'critical-hit', { direction: 123, intensity: 1.25, tint: '#ff4d8d' }, 90);
  if (runtime.adapters.particles.container !== container) throw new Error('container changed after Critical Hit');

  await playStop(runtime, 'goal-celebration', { intensity: 1.15, teamColor: '#e31837' }, 260);
  if (runtime.adapters.particles.container !== container) throw new Error('container changed after Goal Celebration');

  runtime.assertTopology();
  const canvasCount = runtime.topology().particleCanvasCount;
  if (canvasCount !== 1) throw new Error(`expected 1 persistent canvas, found ${canvasCount}`);

  const result = {
    pass: true,
    build: BUILD,
    effects: ['critical-hit', 'goal-celebration'],
    schemaDriven: 2,
    semanticDirection: true,
    tintBinding: true,
    teamColorBinding: true,
    ribbonAdded: false,
    particleCanvasCount: canvasCount,
    visualAccepted: false
  };

  globalThis.FXDeckSession4Gate = result;
  if (globalThis.FXDeckLab) globalThis.FXDeckLab.runSession4Gate = runSession4Gate;

  log(`PASS ${BUILD} SESSION 4 TECH GATE: Critical Hit + Goal Celebration / JSON-driven / direction + intensity + tint/teamColor / 0 effect bridges / ribbon not required / 1 persistent canvas`);
  log(`${BUILD} SESSION 4 VISUAL GATE: USER REVIEW REQUIRED — review Critical Hit and Goal Celebration in Play before Session 4 is fully accepted`);
  return result;
}

try {
  await runSession4Gate();
} catch (error) {
  globalThis.FXDeckSession4Gate = { pass: false, build: BUILD, error: error.message, visualAccepted: false };
  log(`FAIL ${BUILD} SESSION 4 TECH GATE: ${error.message}`);
  console.error(error);
}
