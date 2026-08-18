const BUILD = 'P3.1.1';
const ROUNDS = 3;

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

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) * 0.5;
}

function aggregate(results) {
  return {
    spawnMs: median(results.map((item) => item.spawnMs)),
    avgFps: median(results.map((item) => item.avgFps)),
    low1: median(results.map((item) => item.low1)),
    spikes20: median(results.map((item) => item.spikes20)),
    peakParticles: median(results.map((item) => item.peakParticles)),
    peakEmitters: Math.max(...results.map((item) => item.peakEmitters)),
    peakGroups: Math.max(...results.map((item) => item.peakGroups)),
    allTargetsReached: results.every((item) => item.targetReached),
    allCleanupClean: results.every((item) => item.finalParticles === 0 && item.finalEmitters === 0 && item.finalGroups === 0)
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

async function runLeg(lab, path, preset, round) {
  const adapter = lab.particleAdapter;
  const stage = document.querySelector('#impact-stage');
  const points = makePoints(stage, preset.points);
  const counts = distribute(preset.particles, points.length);

  await cleanLab(lab);
  adapter.setBurstMode(path);

  const spawnStartedAt = performance.now();
  for (let index = 0; index < points.length; index += 1) {
    await adapter.burst(stressEmitterOptions(counts[index]), points[index], { mode: path });
  }
  const spawnMs = performance.now() - spawnStartedAt;

  const target = await waitForParticleTarget(adapter, preset.particles);
  const statsAtStart = adapter.getStats();
  log(`STRESS R${round} ${path}: spawn ${spawnMs.toFixed(2)} ms / requested ${preset.particles} / ready ${statsAtStart.particles} / ${statsAtStart.emitters} emitters / ${statsAtStart.burstGroups} groups / target ${target.reached ? 'reached' : 'NOT reached'} in ${target.waitMs.toFixed(1)} ms`);

  const frameResult = await sampleFrames(adapter, 1500);

  adapter.clear();
  await nextFrame();
  await nextFrame();
  const cleanStats = adapter.getStats();

  const result = {
    path,
    requested: preset.particles,
    points: preset.points,
    round,
    spawnMs,
    readyParticles: statsAtStart.particles,
    targetReached: target.reached,
    ...frameResult,
    finalParticles: cleanStats.particles,
    finalEmitters: cleanStats.emitters,
    finalGroups: cleanStats.burstGroups
  };

  log(`STRESS R${round} ${path} RESULT: ${result.avgFps.toFixed(1)} avg / ${result.low1.toFixed(1)} low / ${result.spikes20} spikes / peak ${result.peakParticles} / cleanup ${result.finalEmitters}/${result.finalGroups}/${result.finalParticles}`);
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
  const results = { emitter: [], shared: [] };

  setUiBusy(true);
  log(`${BUILD} STRESS A/B START: ${preset.particles} matched particles / ${preset.points} emission points / ${ROUNDS} rounds; order alternates to reduce run-order bias`);

  try {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const order = round % 2 === 1 ? ['emitter', 'shared'] : ['shared', 'emitter'];
      log(`STRESS ROUND ${round}/${ROUNDS}: ${order.join(' → ')}`);

      for (const path of order) {
        const result = await runLeg(lab, path, preset, round);
        results[path].push(result);
        await sleep(180);
      }
    }

    const emitter = aggregate(results.emitter);
    const shared = aggregate(results.shared);
    const tolerance = Math.max(4, Math.round(preset.particles * 0.02));
    const peakDelta = shared.peakParticles - emitter.peakParticles;
    const workloadMatched = emitter.allTargetsReached && shared.allTargetsReached && Math.abs(peakDelta) <= tolerance;
    const cleanupClean = emitter.allCleanupClean && shared.allCleanupClean;
    const spawnDelta = shared.spawnMs - emitter.spawnMs;
    const avgDelta = shared.avgFps - emitter.avgFps;
    const lowDelta = shared.low1 - emitter.low1;

    log(`${BUILD} STRESS A/B RESULT (median ${ROUNDS}): emitter ${emitter.spawnMs.toFixed(2)}ms spawn / ${emitter.avgFps.toFixed(1)} avg / ${emitter.low1.toFixed(1)} low / ${emitter.spikes20.toFixed(0)} spikes / peak ${emitter.peakParticles.toFixed(0)} | shared ${shared.spawnMs.toFixed(2)}ms spawn / ${shared.avgFps.toFixed(1)} avg / ${shared.low1.toFixed(1)} low / ${shared.spikes20.toFixed(0)} spikes / peak ${shared.peakParticles.toFixed(0)} | Δ shared-emitter ${spawnDelta >= 0 ? '+' : ''}${spawnDelta.toFixed(2)}ms spawn, ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)} avg, ${lowDelta >= 0 ? '+' : ''}${lowDelta.toFixed(1)} low, ${peakDelta >= 0 ? '+' : ''}${peakDelta.toFixed(0)} particles | workload ${workloadMatched ? 'MATCHED' : 'MISMATCHED'} | cleanup ${cleanupClean ? 'CLEAN' : 'FAIL'}`);
  } catch (error) {
    log(`${BUILD} STRESS A/B FAIL: ${error.message}`);
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
      log(`${BUILD} STRESS A/B FAIL: ${error.message}`);
      console.error(error);
      setUiBusy(false);
    });
  });
}

waitForLab()
  .then(() => log(`${BUILD} ready: 3-round matched synthetic particle stress presets 400 / 800 / 1200; isolates backend strategy and reports median result`))
  .catch((error) => {
    log(`${BUILD} init warning: ${error.message}`);
    console.error(error);
  });
