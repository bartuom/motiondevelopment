import { compileWeb2D } from '../fxdeck/web2d/compiler.js?v=p4.6.0';

const BUILD = 'P4.6.0';
const PUBLIC_EFFECTS = ['dust-puff', 'fireball', 'explosion', 'rain'];
const REJECTED_PUBLIC = ['heavyImpact', 'critical-hit', 'goal-celebration', 'magic-burst'];

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
  while (!globalThis.FXDeckWeb2D?.fx || !globalThis.FXDeckProductionSet || !globalThis.FXDeckAssets) {
    if (performance.now() - started > timeoutMs) throw new Error('FXD_P4_6_GATE: production set did not become ready');
    await wait(20);
  }
  return globalThis.FXDeckWeb2D;
}

function selectorValues() {
  const select = document.querySelector('#effect-select');
  return select ? [...select.options].map((option) => option.value) : [];
}

function assertPublicSelector() {
  const actual = selectorValues();
  if (actual.length !== PUBLIC_EFFECTS.length || actual.some((id, index) => id !== PUBLIC_EFFECTS[index])) {
    throw new Error(`public selector expected ${PUBLIC_EFFECTS.join(', ')}, got ${actual.join(', ')}`);
  }
  for (const rejected of REJECTED_PUBLIC) {
    if (actual.includes(rejected)) throw new Error(`${rejected} leaked back into public Play`);
  }
}

function definition(runtime, id) {
  return runtime.fx.resolve(id).definition;
}

function totalBurst(compiled) {
  return compiled.layers.reduce((sum, layer) => sum + Number(layer.emitter?.startCount ?? 0), 0);
}

function totalRate(compiled) {
  return compiled.layers.reduce((sum, layer) => {
    if (layer.spawnMode !== 'rate') return sum;
    const delay = Number(layer.emitter?.rate?.delay ?? 0);
    return sum + (delay > 0 ? 1 / delay : 0);
  }, 0);
}

function resourceAudit() {
  const entries = performance.getEntriesByType('resource')
    .filter((entry) => /tsparticles/i.test(entry.name));
  const names = entries.map((entry) => entry.name.split('/').pop()?.split('?')[0]).filter(Boolean);
  const transferBytes = entries.reduce((sum, entry) => sum + Number(entry.transferSize ?? 0), 0);
  const encodedBytes = entries.reduce((sum, entry) => sum + Number(entry.encodedBodySize ?? 0), 0);
  return { names, transferBytes, encodedBytes };
}

function assertBackendScripts(runtime) {
  const scriptSources = [...document.scripts].map((script) => script.src).filter(Boolean);
  if (!scriptSources.some((src) => src.includes('tsparticles.slim.bundle.min.js'))) throw new Error('slim bundle script missing');
  if (!scriptSources.some((src) => src.includes('tsparticles.plugin.emitters.min.js'))) throw new Error('emitters plugin script missing');
  if (scriptSources.some((src) => /\/tsparticles@4\.3\.2\/tsparticles\.bundle\.min\.js/.test(src))) throw new Error('full tsParticles bundle is still loaded');
  if (scriptSources.some((src) => src.includes('shape-ribbon') || src.includes('plugin-motion'))) throw new Error('ribbon/motion capability still loaded in production boot');
  if (runtime.backendBundle !== 'slim+emitters') throw new Error(`runtime backend bundle mismatch: ${runtime.backendBundle}`);
  if (runtime.capabilities?.ribbon !== false) throw new Error('ribbon must be disabled in production default');
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

async function playbackSmoke(runtime) {
  runtime.fx.stopAll('session6-smoke-reset');
  await nextFrame();
  await nextFrame();
  assertClean(runtime, 'session6 reset');

  const dust = runtime.fx.play('dust-puff', {
    position: { x: -280, y: -280 },
    direction: 20,
    intensity: 1,
    quality: 'low'
  });
  await dust.ready;
  await wait(90);
  runtime.fx.stopAll('session6-dust-clean');
  await nextFrame();
  await nextFrame();
  await wait(60);
  assertClean(runtime, 'dust low cleanup');

  const rain = runtime.fx.play('rain', {
    position: { x: 10, y: 10 },
    direction: 0,
    intensity: 1,
    quality: 'low'
  });
  await rain.ready;
  await wait(140);
  if ((runtime.adapters.particles.getStats().emitters ?? 0) < 1) throw new Error('low-quality Rain did not create sustained emitter handles');
  runtime.fx.stopAll('session6-rain-clean');
  await nextFrame();
  await nextFrame();
  assertClean(runtime, 'rain low cleanup');
}

async function probeHeadBytes(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store', mode: 'cors' });
    if (!response.ok) return 0;
    return Number(response.headers.get('content-length') ?? 0) || 0;
  } catch {
    return 0;
  }
}

async function bundleHeadAudit() {
  const base = 'https://cdn.jsdelivr.net/npm/';
  const [full, slim, emitters] = await Promise.all([
    probeHeadBytes(`${base}tsparticles@4.3.2/tsparticles.bundle.min.js`),
    probeHeadBytes(`${base}@tsparticles/slim@4.3.2/tsparticles.slim.bundle.min.js`),
    probeHeadBytes(`${base}@tsparticles/plugin-emitters@4.3.2/tsparticles.plugin.emitters.min.js`)
  ]);
  return { full, slim, emitters, modular: slim + emitters };
}

export async function runSession6Gate() {
  const runtime = await waitForReady();
  const container = runtime.adapters.particles.container;

  assertPublicSelector();
  assertBackendScripts(runtime);

  const dust = definition(runtime, 'dust-puff');
  const explosion = definition(runtime, 'explosion');
  const rain = definition(runtime, 'rain');
  const fireball = definition(runtime, 'fireball');
  if (!dust.schemaDriven || !explosion.schemaDriven || !rain.schemaDriven) throw new Error('curated schema effects are not schema-driven');
  if (fireball.schemaDriven) log(`${BUILD} NOTE: Projectile / Fireball has already migrated to schema`);

  for (const rejected of ['critical-hit', 'goal-celebration', 'magic-burst']) {
    try {
      runtime.fx.resolve(rejected);
      throw new Error(`${rejected} is still registered in production boot`);
    } catch (error) {
      if (!String(error.message).includes('is not registered')) throw error;
    }
  }

  const dustHigh = compileWeb2D(dust.source, { intensity: 1, quality: 'high' });
  const dustMedium = compileWeb2D(dust.source, { intensity: 1, quality: 'medium' });
  const dustLow = compileWeb2D(dust.source, { intensity: 1, quality: 'low' });
  const dustCounts = [totalBurst(dustLow), totalBurst(dustMedium), totalBurst(dustHigh)];
  if (!(dustCounts[0] < dustCounts[1] && dustCounts[1] < dustCounts[2])) {
    throw new Error(`Dust quality scaling not monotonic: low/medium/high=${dustCounts.join('/')}`);
  }

  const rainHigh = compileWeb2D(rain.source, { intensity: 1, quality: 'high' });
  const rainMedium = compileWeb2D(rain.source, { intensity: 1, quality: 'medium' });
  const rainLow = compileWeb2D(rain.source, { intensity: 1, quality: 'low' });
  const rainRates = [totalRate(rainLow), totalRate(rainMedium), totalRate(rainHigh)];
  if (!(rainRates[0] < rainRates[1] && rainRates[1] < rainRates[2])) {
    throw new Error(`Rain quality scaling not monotonic: low/medium/high=${rainRates.map((v) => v.toFixed(1)).join('/')}`);
  }

  await playbackSmoke(runtime);
  runtime.assertTopology();
  if (runtime.adapters.particles.container !== container) throw new Error('persistent particle container identity changed');
  const canvasCount = runtime.topology().particleCanvasCount;
  if (canvasCount !== 1) throw new Error(`expected 1 persistent canvas, found ${canvasCount}`);

  const resource = resourceAudit();
  const head = await bundleHeadAudit();
  const result = {
    pass: true,
    build: BUILD,
    publicEffects: PUBLIC_EFFECTS,
    backendBundle: runtime.backendBundle,
    fullBundleLoaded: false,
    ribbonLoaded: false,
    dustBurstLowMediumHigh: dustCounts,
    rainRateLowMediumHigh: rainRates.map((value) => Number(value.toFixed(2))),
    resourceTiming: resource,
    headAudit: head,
    particleCanvasCount: canvasCount
  };

  globalThis.FXDeckSession6Gate = result;
  globalThis.FXDeckSession6 = {
    gate: runSession6Gate,
    compileQuality(effectId, quality, params = {}) {
      const def = definition(runtime, effectId);
      if (!def.schemaDriven) throw new Error(`${effectId} is not schema-driven`);
      return compileWeb2D(def.source, { intensity: 1, ...params, quality });
    }
  };
  if (globalThis.FXDeckLab) globalThis.FXDeckLab.runSession6Gate = runSession6Gate;

  log(`PASS ${BUILD} SESSION 6 PRODUCTION GATE: curated 4-effect Play / slim+emitters / full bundle absent / ribbon absent / quality scaling / 1 persistent canvas`);
  log(`${BUILD} QUALITY: Dust burst low/medium/high ${dustCounts.join('/')} particles; Rain combined rate ${rainRates.map((value) => value.toFixed(1)).join('/')} per sec`);
  if (resource.encodedBytes > 0 || resource.transferBytes > 0) {
    log(`${BUILD} RESOURCE TIMING: tsParticles encoded ${(resource.encodedBytes / 1024).toFixed(1)} KiB / transfer ${(resource.transferBytes / 1024).toFixed(1)} KiB / ${resource.names.join(', ')}`);
  } else {
    log(`${BUILD} RESOURCE TIMING: byte sizes unavailable from browser timing (cached or TAO); loaded ${resource.names.join(', ')}`);
  }
  if (head.full > 0 && head.modular > 0) {
    const saved = head.full - head.modular;
    log(`${BUILD} CDN HEAD AUDIT: full ${(head.full / 1024).toFixed(1)} KiB vs slim+emitters ${(head.modular / 1024).toFixed(1)} KiB; delta ${(saved / 1024).toFixed(1)} KiB`);
  } else {
    log(`${BUILD} CDN HEAD AUDIT: content-length unavailable; do not claim exact bundle savings yet`);
  }
  return result;
}

try {
  await runSession6Gate();
} catch (error) {
  globalThis.FXDeckSession6Gate = { pass: false, build: BUILD, error: error.message };
  log(`FAIL ${BUILD} SESSION 6 PRODUCTION GATE: ${error.message}`);
  console.error(error);
}
