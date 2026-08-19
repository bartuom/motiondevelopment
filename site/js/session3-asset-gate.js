const BUILD = 'P4.3.0';

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
  while (!globalThis.FXDeckWeb2D?.fx || !globalThis.FXDeckAssets || !globalThis.FXDeckDustPuff) {
    if (performance.now() - started > timeoutMs) throw new Error('FXD_P4_3_GATE: Dust Puff integration did not become ready');
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

export async function runSession3Gate() {
  const runtime = await waitForReady();
  const assetManager = globalThis.FXDeckAssets;
  const dustState = globalThis.FXDeckDustPuff;

  const { definition } = runtime.fx.resolve('dust-puff');
  if (!definition.schemaDriven) throw new Error('dust-puff is not schema-driven');
  if (definition.source.layers.length !== 4) throw new Error(`dust-puff expected 4 data layers, got ${definition.source.layers.length}`);
  if ((definition.source.assets ?? []).length !== 3) throw new Error('dust-puff expected 3 hydrated manifest assets');

  const cold = dustState.coldWarmup;
  if (cold.requested !== 3 || cold.coldLoads !== 3) {
    throw new Error(`cold asset warmup expected 3 cold loads, got requested=${cold.requested} cold=${cold.coldLoads}`);
  }

  const beforeWarm = assetManager.getStats();
  const warm = await runtime.prefetchEffect('dust-puff');
  const afterWarm = assetManager.getStats();
  if (warm.coldLoads !== 0 || warm.cacheHits !== 3) {
    throw new Error(`warm prefetch expected 0 cold / 3 hits, got ${warm.coldLoads} cold / ${warm.cacheHits} hits`);
  }
  if (afterWarm.coldLoads !== beforeWarm.coldLoads) {
    throw new Error('warm prefetch increased cold asset load count');
  }

  runtime.fx.stopAll('session3-gate-reset');
  await nextFrame();
  await nextFrame();
  assertClean(runtime, 'session3 reset');

  const container = runtime.adapters.particles.container;
  const instance = runtime.fx.play('dust-puff', {
    position: { x: -320, y: -320 },
    direction: 12,
    intensity: 1
  });
  await instance.ready;
  await wait(120);
  runtime.fx.stop(instance, 'session3-gate-stop');
  await nextFrame();
  await nextFrame();
  await wait(80);
  assertClean(runtime, 'dust-puff cleanup');
  runtime.assertTopology();

  if (runtime.adapters.particles.container !== container) throw new Error('persistent particle container identity changed');
  const canvasCount = document.querySelector('#heavy-impact-particles')?.querySelectorAll('canvas').length ?? 0;
  if (canvasCount !== 1) throw new Error(`expected 1 particle canvas, found ${canvasCount}`);

  const result = {
    pass: true,
    build: BUILD,
    effect: 'dust-puff',
    schemaDriven: true,
    layers: 4,
    manifestAssets: 3,
    coldLoads: cold.coldLoads,
    warmCacheHits: warm.cacheHits,
    particleCanvasCount: canvasCount,
    visualAccepted: false
  };

  globalThis.FXDeckSession3Gate = result;
  log(`PASS ${BUILD} SESSION 3 TECH GATE: manifest / 3 reusable alpha assets / cold decode 3 / warm cache hit 3 / dust-puff JSON / 0 effect bridge / 1 persistent canvas`);
  log(`${BUILD} SESSION 3 VISUAL GATE: USER REVIEW REQUIRED — Dust Puff is selected in Play and must be judged portfolio-worthy before Session 3 is fully accepted`);
  return result;
}

try {
  await runSession3Gate();
} catch (error) {
  globalThis.FXDeckSession3Gate = { pass: false, build: BUILD, error: error.message, visualAccepted: false };
  log(`FAIL ${BUILD} SESSION 3 TECH GATE: ${error.message}`);
  console.error(error);
}
