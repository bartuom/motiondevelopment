const BUILD = 'P3.1.0';

const stressButton = document.querySelector('#play-stress-ab');
const stressLoadInput = document.querySelector('#stress-load');
const logOutput = document.querySelector('#p2-log');

const STRESS_PRESETS = {
  400: { particles: 400, points: 16 },
  800: { particles: 800, points: 24 },
  1200: { particles: 1200, points: 32 }
};

function stamp() {
  return new Date().toLocaleTimeString([], { hour12: false });
}

function log(message) {
  if (!logOutput) return;
  logOutput.textContent += `\n[${stamp()}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function waitForLab(timeoutMs = 8000) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const lab = globalThis.FXDeckLab;
    if (lab?.particleAdapter?.container && lab?.fx) return lab;
    await sleep(40);
  }
  throw new Error('P3.1 stress benchmark could not find an initialized FXDeckLab.');
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

function stressEmitterOptions(count) {
  return {
    autoPlay: true,
    startCount: count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 2.6, wait: false },
    particles: {
      color: { value: '#ffffff' },
      shape: { type: 'circle' },
      opacity: { value: 0.42 },
      size: { value: 3 },
      move: { enable: false },
      life: { count: 1, duration: { value: 2.4, sync: true } }
    }
  };
}

function makePoints(stage, pointCount) {
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  const cols = Math.ceil(Math.sqrt(pointCount * (width / height)));
  const rows = Math.ceil(pointCount / cols);
  const points = [];

  for (let index = 0; index < pointCount; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = width * (0.18 + 0.64 * ((col + 0.5) / cols));
    const y = height * (0.18 + 0.64 * ((row + 0.5) / rows));
    points.push({ x, y });
  }

  return points;
}

function distribute(total, buckets) {
  const base = Math.floor(total / buckets);
  let remainder = total - base * buckets;
  return Array.from({ length: buckets }, () => base + (remainder-- > 0 ? 1 : 0));
}

async function waitForParticleTarget(adapter, target, timeoutMs = 350) {
  const startedAt = performance.now();
  let peak = 0;

  while (performance.now() - startedAt < timeoutMs) {
    await nextFrame();
    const count = adapter.getStats().particles;
    peak = Math.max(peak, count);
    if (count >= target) return { reached: true, count, peak, waitMs: performance.now() - startedAt };
  }

  const count = adapter.getStats().particles;
  return { reached: count >= target, count, peak: Math.max(peak, count), waitMs: performance.now() - startedAt };
}

async function sampleFrames(adapter, durationMs = 1500) {
  const samples = [];
  let last = 0;
  let peakParticles = 0;
  let peakEmitters = 0;
  let peakGroups = 0;
  const startedAt = performance.now();

  while (performance.now() - startedAt < durationMs) {
    const now = await nextFrame();
    if (last) {
      const dt = now - last;
      if (dt > 0 && dt < 250) samples.push(dt);
    }
    last = now;

    const stats = adapter.getStats();
    peakParticles = Math.max(peakParticles, stats.particles ?? 0);
    peakEmitters = Math.max(peakEmitters, stats.emitters ?? 0);
    peakGroups = Math.max(peakGroups, stats.burstGroups ?? 0);
  }

  return {
    ...summarizeFrames(samples),
    peakParticles,
    peakEmitters,
    peakGroups
  };
}

async function cleanLab(lab) {
  lab.abortBenchmark?.();
  lab.fx.stopAll('p3-stress-prep');
  lab.screenKickController?.reset?.();
  lab.particleAdapter.clear();
  await nextFrame();
  await nextFrame();
}

async function runLeg(lab, path, preset) {
  const adapter = lab.particleAdapter;
  const stage = document.querySelector('#impact-stage');
  const points = makePoints(stage, preset.points);
  const counts = distribute(preset.particles, points.length);

  await cleanLab(lab);
  adapter.setBurstMode(path);

  const handles = [];
  const spawnStartedAt = performance.now();
  for (let index = 0; index < points.length; index += 1) {
    handles.push(await adapter.burst(stressEmitterOptions(counts[index]), points[index], { mode: path }));
  }
  const spawnMs = performance.now() - spawnStartedAt;

  const target = await waitForParticleTarget(adapter, preset.particles);
  const statsAtStart = adapter.getStats();
  log(`STRESS ${path}: spawn ${spawnMs.toFixed(2)} ms / requested ${preset.particles} / ready ${statsAtStart.particles} particles / ${statsAtStart.emitters} emitters / ${statsAtStart.burstGroups} groups / target ${target.reached ? 'reached' : 'NOT reached'} in ${target.waitMs.toFixed(1)} ms`);

  const frameResult = await sampleFrames(adapter, 1500);
  const endStats = adapter.getStats();

  adapter.clear();
  await nextFrame();
  await nextFrame();
  const cleanStats = adapter.getStats();

  const result = {
    path,
    requested: preset.particles,
    points: preset.points,
    spawnMs,
    readyParticles: statsAtStart.particles,
    targetReached: target.reached,
    ...frameResult,
    endParticles: endStats.particles,
    finalParticles: cleanStats.particles,
    finalEmitters: cleanStats.emitters,
    finalGroups: cleanStats.burstGroups
  };

  log(`STRESS ${path} RESULT: ${result.avgFps.toFixed(1)} avg / ${result.low1.toFixed(1)} low / ${result.spikes20} spikes / peak ${result.peakParticles} particles / ${result.peakEmitters} emitters / ${result.peakGroups} groups / cleanup ${result.finalEmitters}/${result.finalGroups}/${result.finalParticles}`);
  return result;
}

function setUiBusy(busy) {
  const ids = ['play-impact', 'play-overlap', 'play-ab', 'stop-all', 'particle-path', 'intensity', 'direction', 'stress-load'];
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) element.disabled = busy;
  }
  if (stressButton) {
    stressButton.disabled = busy;
    stressButton.textContent = busy ? 'Stress A/B running…' : 'Synthetic Stress A/B';
  }
}

async function runStressAB() {
  if (!stressButton || stressButton.disabled) return;
  const lab = await waitForLab();
  const requested = Number(stressLoadInput?.value ?? 800);
  const preset = STRESS_PRESETS[requested] ?? STRESS_PRESETS[800];
  const originalPath = lab.particleAdapter.getBurstMode();

  setUiBusy(true);
  log(`P3.1 STRESS A/B START: ${preset.particles} matched particles across ${preset.points} emission points; particle-only workload, emitter first then shared-direct`);

  try {
    const emitter = await runLeg(lab, 'emitter', preset);
    await sleep(220);
    const shared = await runLeg(lab, 'shared', preset);

    const avgDelta = shared.avgFps - emitter.avgFps;
    const lowDelta = shared.low1 - emitter.low1;
    const spawnDelta = shared.spawnMs - emitter.spawnMs;
    const peakDelta = shared.peakParticles - emitter.peakParticles;
    const matched = Math.abs(peakDelta) <= Math.max(4, Math.round(preset.particles * 0.02));

    log(`P3.1 STRESS A/B RESULT: emitter ${emitter.spawnMs.toFixed(2)}ms spawn / ${emitter.avgFps.toFixed(1)} avg / ${emitter.low1.toFixed(1)} low / ${emitter.spikes20} spikes / peak ${emitter.peakParticles} | shared ${shared.spawnMs.toFixed(2)}ms spawn / ${shared.avgFps.toFixed(1)} avg / ${shared.low1.toFixed(1)} low / ${shared.spikes20} spikes / peak ${shared.peakParticles} | Δ shared-emitter ${spawnDelta >= 0 ? '+' : ''}${spawnDelta.toFixed(2)}ms spawn, ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)} avg, ${lowDelta >= 0 ? '+' : ''}${lowDelta.toFixed(1)} low, ${peakDelta >= 0 ? '+' : ''}${peakDelta} particles | workload ${matched ? 'MATCHED' : 'MISMATCHED'}`);
  } catch (error) {
    log(`P3.1 STRESS A/B FAIL: ${error.message}`);
    console.error(error);
  } finally {
    await cleanLab(lab);
    lab.particleAdapter.setBurstMode(originalPath);
    const pathInput = document.querySelector('#particle-path');
    if (pathInput) pathInput.value = originalPath;
    setUiBusy(false);
  }
}

if (stressButton) {
  stressButton.addEventListener('click', () => {
    runStressAB().catch((error) => {
      log(`P3.1 STRESS A/B FAIL: ${error.message}`);
      console.error(error);
      setUiBusy(false);
    });
  });
}

waitForLab()
  .then(() => log(`${BUILD} ready: matched synthetic particle stress presets 400 / 800 / 1200; isolates backend strategy from Heavy Impact DOM/screen hooks`))
  .catch((error) => {
    log(`${BUILD} init warning: ${error.message}`);
    console.error(error);
  });
