import { compileWeb2D } from '../fxdeck/web2d/compiler.js?v=p4.5.0';

const BUILD = 'P4.5.0';
const PUBLIC_EFFECTS = [
  'dust-puff',
  'critical-hit',
  'goal-celebration',
  'explosion',
  'magic-burst',
  'rain'
];

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
  while (!globalThis.FXDeckWeb2D?.fx || !globalThis.FXDeckCoverageEffects || !globalThis.FXDeckAssets) {
    if (performance.now() - started > timeoutMs) throw new Error('FXD_P4_5_GATE: Session 5 integration did not become ready');
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

function definition(runtime, id) {
  const resolved = runtime.fx.resolve(id).definition;
  if (!resolved?.schemaDriven) throw new Error(`${id} is not schema-driven`);
  return resolved;
}

function sourceLayer(definition, id) {
  const layer = definition.source.layers.find((entry) => entry.id === id);
  if (!layer) throw new Error(`${definition.id}: missing source layer ${id}`);
  return layer;
}

function compiledLayer(compiled, id) {
  const layer = compiled.layers.find((entry) => entry.id === id);
  if (!layer) throw new Error(`${compiled.id}: missing compiled layer ${id}`);
  return layer;
}

async function playStop(runtime, id, params, holdMs = 90) {
  const instance = runtime.fx.play(id, {
    position: { x: 260, y: 220 },
    direction: 28,
    intensity: 1,
    ...params
  });
  await instance.ready;
  await wait(holdMs);
  runtime.fx.stop(instance, 'session5-gate');
  await nextFrame();
  await nextFrame();
  await wait(80);
}

export async function runSession5Gate() {
  const runtime = await waitForReady();
  const container = runtime.adapters.particles.container;

  const publicDefinitions = PUBLIC_EFFECTS.map((id) => definition(runtime, id));
  if (publicDefinitions.length !== 6) throw new Error(`expected 6 public schema effects, got ${publicDefinitions.length}`);

  const explosion = definition(runtime, 'explosion');
  if (explosion.source.layers.length !== 5) throw new Error(`Explosion expected 5 layers, got ${explosion.source.layers.length}`);
  const flash = sourceLayer(explosion, 'flash');
  const fireball = sourceLayer(explosion, 'fireball');
  const smoke = sourceLayer(explosion, 'smoke');
  if (flash.blend !== 'lighter' || fireball.blend !== 'lighter') throw new Error('Explosion flash/fireball must be additive');
  if (smoke.blend !== 'normal' || smoke.delayMs < 50) throw new Error('Explosion smoke must be delayed and normal blend');

  const explosionCompiled = compileWeb2D(explosion.source, { direction: 35, intensity: 1.2 });
  if (compiledLayer(explosionCompiled, 'sparks').emitter.particles.rotate?.path !== true) {
    throw new Error('Explosion spark streaks are not motion-oriented');
  }

  const magic = definition(runtime, 'magic-burst');
  if (magic.source.layers.length !== 5) throw new Error(`Magic Burst expected 5 layers, got ${magic.source.layers.length}`);
  const primaryArc = sourceLayer(magic, 'primary-arc');
  if (primaryArc.shape.type !== 'image' || primaryArc.shape.asset !== 'magic-arc') throw new Error('Magic Burst primary shape is not magic-arc');
  if (primaryArc.orientation?.mode !== 'direction') throw new Error('Magic Burst primary arc is not direction-oriented');
  if (magic.source.layers.some((layer) => layer.shape.type === 'ribbon')) throw new Error('Magic Burst must not regress into ribbon noise');
  const magicCompiled = compileWeb2D(magic.source, { direction: 123, intensity: 1.1, tint: '#5ce6ff' });
  if (Number(compiledLayer(magicCompiled, 'primary-arc').emitter.particles.rotate?.value) !== 115) {
    throw new Error('Magic Burst primary arc direction offset did not compile');
  }

  const rain = definition(runtime, 'rain');
  if (rain.source.layers.length !== 2) throw new Error(`Rain expected 2 rate layers, got ${rain.source.layers.length}`);
  for (const layer of rain.source.layers) {
    if (layer.spawn.mode !== 'rate') throw new Error(`${layer.id}: Rain must use finite rate emitters`);
    if (layer.anchor !== 'stage-top-center') throw new Error(`${layer.id}: Rain must use stage-top-center anchor`);
    if ((layer.spawn.area?.widthPercent ?? 0) < 95) throw new Error(`${layer.id}: Rain spawn area must span the stage`);
    if (layer.orientation?.mode !== 'motion') throw new Error(`${layer.id}: Rain streak must orient to motion`);
  }

  const rainCompiled = compileWeb2D(rain.source, { intensity: 1 });
  for (const id of ['far-rain', 'near-rain']) {
    const layer = compiledLayer(rainCompiled, id);
    if (layer.anchor !== 'stage-top-center') throw new Error(`${id}: compiled anchor lost`);
    if (layer.emitter.size.width !== 100) throw new Error(`${id}: compiled emitter width expected 100%, got ${layer.emitter.size.width}`);
    if (layer.emitter.particles.rotate?.path !== true) throw new Error(`${id}: compiled rain streak is not motion-oriented`);
  }

  runtime.fx.stopAll('session5-gate-reset');
  await nextFrame();
  await nextFrame();
  assertClean(runtime, 'session5 reset');

  await playStop(runtime, 'explosion', { intensity: 1.1 }, 100);
  await wait(100);
  runtime.fx.stopAll('session5-explosion-clean');
  await nextFrame();
  assertClean(runtime, 'explosion cleanup');

  await playStop(runtime, 'magic-burst', { direction: 123, intensity: 1.1, tint: '#5ce6ff' }, 110);
  await wait(100);
  runtime.fx.stopAll('session5-magic-clean');
  await nextFrame();
  assertClean(runtime, 'magic cleanup');

  const rainInstance = runtime.fx.play('rain', {
    position: { x: 20, y: 20 },
    direction: 0,
    intensity: 0.8
  });
  await rainInstance.ready;
  await wait(180);
  if ((runtime.adapters.particles.getStats().emitters ?? 0) < 1) throw new Error('Rain did not create sustained emitter handles');
  runtime.fx.stopAll('session5-rain-clean');
  await nextFrame();
  await nextFrame();
  assertClean(runtime, 'rain cleanup');

  runtime.assertTopology();
  if (runtime.adapters.particles.container !== container) throw new Error('persistent particle container identity changed');
  const canvasCount = runtime.topology().particleCanvasCount;
  if (canvasCount !== 1) throw new Error(`expected 1 persistent canvas, found ${canvasCount}`);

  const result = {
    pass: true,
    build: BUILD,
    publicEffects: PUBLIC_EFFECTS,
    schemaDrivenCount: 6,
    explosionReferenceHierarchy: true,
    magicDirectionalShape: true,
    rainStageAnchor: true,
    rainSpawnArea: true,
    particleCanvasCount: canvasCount,
    visualAccepted: false
  };

  globalThis.FXDeckSession5Gate = result;
  if (globalThis.FXDeckLab) globalThis.FXDeckLab.runSession5Gate = runSession5Gate;

  log(`PASS ${BUILD} SESSION 5 TECH GATE: 6 public schema effects / Explosion asset hierarchy / directional Magic Burst / stage-wide Rain rate emitters / 0 effect bridges / 1 persistent canvas`);
  log(`${BUILD} SESSION 5 VISUAL GATE: USER REVIEW REQUIRED — judge Explosion, Magic Burst and real Rain before Session 5 is accepted`);
  return result;
}

try {
  await runSession5Gate();
} catch (error) {
  globalThis.FXDeckSession5Gate = { pass: false, build: BUILD, error: error.message, visualAccepted: false };
  log(`FAIL ${BUILD} SESSION 5 TECH GATE: ${error.message}`);
  console.error(error);
}
