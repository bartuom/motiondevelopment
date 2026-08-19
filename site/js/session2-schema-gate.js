import { loadEffectDefinitions } from '../fxdeck/schema/effect-loader.js?v=p4.2.0';
import { validateEffectDefinition } from '../fxdeck/schema/validator.js?v=p4.2.0';
import { compileWeb2D } from '../fxdeck/web2d/compiler.js?v=p4.2.0';
import { registerSchemaEffects } from '../fxdeck/web2d/register-schema-effect.js?v=p4.2.0';

const BUILD = 'P4.2.0';
const EFFECT_URLS = [
  './fxdeck/schema/examples/schema-test-burst.json?v=p4.2.0',
  './fxdeck/schema/examples/schema-test-smoke.json?v=p4.2.0',
  './fxdeck/schema/examples/schema-test-rain.json?v=p4.2.0'
];

function log(message) {
  const output = document.querySelector('#fxd-log');
  if (!output) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  output.textContent += `\n[${stamp}] ${message}`;
  output.scrollTop = output.scrollHeight;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRuntime(timeoutMs = 8000) {
  const started = performance.now();
  while (!globalThis.FXDeckWeb2D?.fx) {
    if (performance.now() - started > timeoutMs) throw new Error('FXD_GATE_00: Web2D runtime did not become ready');
    await wait(20);
  }
  return globalThis.FXDeckWeb2D;
}

async function waitForSession1(timeoutMs = 5000) {
  const started = performance.now();
  while (!globalThis.FXDeckSession1Gate?.pass) {
    if (performance.now() - started > timeoutMs) return false;
    await wait(30);
  }
  return true;
}

function assertValidationFailure(effect, expectedCode, label) {
  const result = validateEffectDefinition(effect);
  if (result.ok) throw new Error(`${label}: invalid definition unexpectedly passed validation`);
  if (!result.issues.some((item) => item.code === expectedCode)) {
    throw new Error(`${label}: expected ${expectedCode}, got ${result.issues.map((item) => item.code).join(', ')}`);
  }
}

function resourceState(runtime) {
  const stats = runtime.fx.getStats();
  const particles = stats.particles ?? {};
  return {
    activeInstances: stats.activeInstances ?? 0,
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

async function playAndStop(runtime, effectId, direction = 25) {
  const instance = runtime.fx.play(effectId, {
    position: { x: -320, y: -320 },
    direction,
    intensity: 1
  });
  await instance.ready;
  await nextFrame();
  runtime.fx.stop(instance, 'session2-gate');
  await nextFrame();
  await nextFrame();
  assertClean(runtime, effectId);
}

export async function runSession2Gate() {
  const runtime = await waitForRuntime();
  await waitForSession1();
  runtime.fx.stopAll('session2-gate-reset');
  await nextFrame();
  await nextFrame();
  assertClean(runtime, 'session2 reset');

  const effects = await loadEffectDefinitions(EFFECT_URLS);
  const ids = effects.map((effect) => effect.id);

  for (const effect of effects) {
    try {
      const existing = runtime.fx.resolve(effect.id);
      if (!existing?.definition?.schemaDriven) throw new Error(`existing ${effect.id} is not schema-driven`);
    } catch {
      registerSchemaEffects(runtime.fx, [effect]);
    }
  }

  for (const effect of effects) {
    const resolved = runtime.fx.resolve(effect.id);
    if (!resolved.definition.schemaDriven) throw new Error(`${effect.id}: registry definition is not schema-driven`);
    const compiled = compileWeb2D(effect, { directionDegrees: 25, intensity: 1 });
    if (!compiled.layers.length) throw new Error(`${effect.id}: compiler produced zero layers`);
    for (const layer of compiled.layers) {
      if (!layer.emitter?.particles || !layer.spawnMode) throw new Error(`${effect.id}/${layer.id}: compiler output incomplete`);
    }
  }

  const unknownProperty = structuredClone(effects[0]);
  unknownProperty.tsparticles = { raw: true };
  assertValidationFailure(unknownProperty, 'FXD_SCHEMA_01', 'unknown backend property gate');

  const overBudget = structuredClone(effects[0]);
  overBudget.layers[0].spawn.count = 999;
  assertValidationFailure(overBudget, 'FXD_BUDGET_01', 'particle budget gate');

  const missingAsset = structuredClone(effects[1]);
  missingAsset.layers[0].shape.asset = 'missing-alpha';
  assertValidationFailure(missingAsset, 'FXD_ASSET_06', 'asset reference gate');

  const container = runtime.adapters.particles.container;
  const canvasCountBefore = document.querySelector('#fxd-particles')?.querySelectorAll('canvas').length ?? 0;

  for (let index = 0; index < ids.length; index += 1) {
    await playAndStop(runtime, ids[index], 25 + index * 55);
    if (runtime.adapters.particles.container !== container) throw new Error(`${ids[index]}: persistent container identity changed`);
  }

  const canvasCountAfter = document.querySelector('#fxd-particles')?.querySelectorAll('canvas').length ?? 0;
  if (canvasCountBefore !== 1 || canvasCountAfter !== 1) throw new Error(`particle canvas count changed ${canvasCountBefore} -> ${canvasCountAfter}`);

  const result = {
    pass: true,
    build: BUILD,
    effects: ids,
    schemaDriven: ids.length,
    compiler: 'FXDeck Schema V1 -> Web2D tsParticles emitter options',
    validationGates: ['unknown-property', 'particle-budget', 'missing-asset'],
    particleCanvasCount: canvasCountAfter
  };
  globalThis.FXDeckSession2Gate = result;
  globalThis.FXDeckSchemaV1 = {
    effects: structuredClone(effects),
    validate: validateEffectDefinition,
    compile: compileWeb2D,
    runGate: runSession2Gate
  };
  log(`PASS ${BUILD} SESSION 2 GATE: 3 JSON effects / structural + semantic validation / compiler / 0 effect-specific runtime JS / 1 persistent canvas`);
  return result;
}

try {
  log(`${BUILD}: loading FXDeck Schema V1 synthetic definitions without changing Runtime Lab UI`);
  await runSession2Gate();
} catch (error) {
  globalThis.FXDeckSession2Gate = { pass: false, build: BUILD, error: error.message };
  log(`FAIL ${BUILD} SESSION 2 GATE: ${error.message}`);
  console.error(error);
}
