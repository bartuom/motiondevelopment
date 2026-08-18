const BUILD = 'P3.2.0';
const ROUNDS = 3;

const stressButton = document.querySelector('#play-stress-ab');
const stressLoadInput = document.querySelector('#stress-load');
const logOutput = document.querySelector('#p2-log');

const STRESS_PRESETS = {
  400: { particles: 400, points: 16 },
  800: { particles: 800, points: 24 },
  1200: { particles: 1200, points: 32 }
};

const PATH_LABELS = {
  emitter: 'emitter',
  shared: 'shared-direct',
  scheduled: 'shared-scheduled'
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
  throw new Error('P3.2 stress benchmark could not find an initialized FXDeckLab.');
}

function summarizeFrames(samples) {
  const valid = samples.filter((dt) => Number.isFinite(dt) && dt > 0 && dt < 500);
  if (!valid.length) return { avgFps: 0, low1: 0, spikes20: 0, worstMs: 0 };

  const avgMs = valid.reduce((sum, dt) => sum + dt, 0) / valid.length;
  const sorted = [...valid].sort((a, b) => a - b);
  const p99Index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * .99) - 1));
  const p99Ms = sorted[p99Index];

  return {
    avgFps: 1000 / avgMs,
    low1: 1000 / p99Ms,
    spikes20: valid.filter((dt) => dt > 20).length,
    worstMs: Math.max(...valid)
  };
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) * .5;
}

function aggregate(results) {
  return {
    submitCpuMs: median(results.map((item) => item.submitCpuMs)),
    populationSpanMs: median(results.map((item) => item.populationSpanMs)),
    worstPopulationFrameMs: median(results.map((item) => item.worstPopulationFrameMs)),
    populationSpikes20: median(results.map((item) => item.populationSpikes20)),
    targetWaitMs: median(results.map((item) => item.targetWaitMs)),
    avgFps: median(results.map((item) => item.avgFps)),
    low1: median(results.map((item) => item.low1)),
    steadySpikes20: median(results.map((item) => item.steadySpikes20)),
    peakParticles: median(results.map((item) => item.peakParticles)),
    peakEmitters: Math.max(...results.map((item) => item.peakEmitters)),
    peakGroups: Math.max(...results.map((item) => item.peakGroups)),
    allTargetsReached: results.every((item) => item.targetReached),
    allCleanupClean: results.every((item) => item.finalParticles === 0 && item.finalEmitters === 0 && item.finalGroups === 0 && item.finalQueuedParticles === 0)
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
      opacity: { value: .42 },
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
    points.push({
      x: width * (.18 + .64 * ((col + .5) / cols)),
      y: height * (.18 + .64 * ((row + .5) / rows))
    });
  }

  return points;
}

function distribute(total, buckets) {
  const base = Math.floor(total / buckets);
  let remainder = total - base * buckets;
  return Array.from({ length: buckets }, () => base + (remainder-- > 0 ? 1 : 0));
}

async function waitForParticleTarget(adapter, target, timeoutMs = 1400) {
  const startedAt = performance.now();
  let peak = 0;

  while (performance.now() - startedAt < timeoutMs) {
    await nextFrame();
    const stats = adapter.getStats();
    const count = stats.particles ?? 0;
    peak = Math.max(peak, count);
    if (count >= target && (stats.queuedParticles ?? 0) === 0) {
      return { reached: true, count, peak, waitMs: performance.now() - startedAt };
    }
  }

  const stats = adapter.getStats();
  const count = stats.particles ?? 0;
  return {
    reached: count >= target && (stats.queuedParticles ?? 0) === 0,
    count,
    peak: Math.max(peak, count),
    waitMs: performance.now() - startedAt
  };
}

async function sampleFrames(adapter, durationMs = 1400) {
  const samples = [];
  let last = 0;
  let peakParticles = 0;
  let peakEmitters = 0;
  let peakGroups = 0;
  const startedAt = performance.now();

  while (performance.now() - startedAt < durationMs) {
    const now = await nextFrame();
    if (last) samples.push(now - last);
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
  lab.fx.stopAll('p3-stress-prep');
  lab.screenKickController?.reset?.();
  lab.particleAdapter.clear();
  await nextFrame();
  await nextFrame();
}

async function probePopulationFrames(task) {
  const samples = [];
  let active = true;
  let raf = 0;
  let last = await nextFrame();

  function tick(now) {
    if (!active) return;
    samples.push(now - last);
    last = now;
    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);
  const startedAt = performance.now();
  const value = await task();
  const populationSpanMs = performance.now() - startedAt;

  await nextFrame();
  await nextFrame();
  active = false;
  if (raf) cancelAnimationFrame(raf);

  const frameSummary = summarizeFrames(samples);
  return {
    value,
    populationSpanMs,
    worstPopulationFrameMs: frameSummary.worstMs,
    populationSpikes20: frameSummary.spikes20
  };
}

async function submitWorkload(adapter, path, points, counts) {
  let submitCpuMs = 0;

  for (let index = 0; index < points.length; index += 1) {
    const startedAt = performance.now();
    await adapter.burst(stressEmitterOptions(counts[index]), points[index], { mode: path });
    submitCpuMs += performance.now() - startedAt;
  }

  return submitCpuMs;
}

async function runLeg(lab, path, preset, round) {
  const adapter = lab.particleAdapter;
  const stage = document.querySelector('#impact-stage');
  const points = makePoints(stage, preset.points);
  const counts = distribute(preset.particles, points.length);
  const label = PATH_LABELS[path];

  await cleanLab(lab);
  adapter.setBurstMode(path);

  const populationProbe = await probePopulationFrames(async () => {
    const submitCpuMs = await submitWorkload(adapter, path, points, counts);
    const target = await waitForParticleTarget(adapter, preset.particles);
    return { submitCpuMs, target };
  });

  const target = populationProbe.value.target;
  const statsAtStart = adapter.getStats();

  log(`STRESS R${round} ${label}: submit CPU ${populationProbe.value.submitCpuMs.toFixed(2)} ms / population span ${populationProbe.populationSpanMs.toFixed(1)} ms / worst population frame ${populationProbe.worstPopulationFrameMs.toFixed(1)} ms / population >20ms ${populationProbe.populationSpikes20} / requested ${preset.particles} / ready ${statsAtStart.particles} / ${statsAtStart.emitters} emitters / ${statsAtStart.burstGroups} groups / queued ${statsAtStart.queuedParticles ?? 0} / target ${target.reached ? 'reached' : 'NOT reached'} in ${target.waitMs.toFixed(1)} ms`);

  const frameResult = await sampleFrames(adapter, 1400);

  adapter.clear();
  await nextFrame();
  await nextFrame();
  const cleanStats = adapter.getStats();

  const result = {
    path,
    requested: preset.particles,
    points: preset.points,
    round,
    submitCpuMs: populationProbe.value.submitCpuMs,
    populationSpanMs: populationProbe.populationSpanMs,
    worstPopulationFrameMs: populationProbe.worstPopulationFrameMs,
    populationSpikes20: populationProbe.populationSpikes20,
    targetWaitMs: target.waitMs,
    readyParticles: statsAtStart.particles,
    targetReached: target.reached,
    avgFps: frameResult.avgFps,
    low1: frameResult.low1,
    steadySpikes20: frameResult.spikes20,
    peakParticles: Math.max(target.peak, frameResult.peakParticles),
    peakEmitters: frameResult.peakEmitters,
    peakGroups: frameResult.peakGroups,
    finalParticles: cleanStats.particles,
    finalEmitters: cleanStats.emitters,
    finalGroups: cleanStats.burstGroups,
    finalQueuedParticles: cleanStats.queuedParticles ?? 0
  };

  log(`STRESS R${round} ${label} RESULT: population worst ${result.worstPopulationFrameMs.toFixed(1)} ms / population spikes ${result.populationSpikes20} / steady ${result.avgFps.toFixed(1)} avg / ${result.low1.toFixed(1)} low / ${result.steadySpikes20} spikes / peak ${result.peakParticles} / cleanup ${result.finalEmitters}/${result.finalGroups}/${result.finalParticles}, queued ${result.finalQueuedParticles}`);
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
    stressButton.textContent = busy ? 'Stress compare running…' : 'Synthetic Stress Compare';
  }
}

function resultSummary(label, result) {
  return `${label} submit ${result.submitCpuMs.toFixed(1)}ms / span ${result.populationSpanMs.toFixed(1)}ms / worst ${result.worstPopulationFrameMs.toFixed(1)}ms / population spikes ${result.populationSpikes20.toFixed(0)} / steady ${result.avgFps.toFixed(1)} avg ${result.low1.toFixed(1)} low / peak ${result.peakParticles.toFixed(0)}`;
}

async function runStressCompare() {
  if (!stressButton || stressButton.disabled) return;
  const lab = await waitForLab();
  const requested = Number(stressLoadInput?.value ?? 800);
  const preset = STRESS_PRESETS[requested] ?? STRESS_PRESETS[800];
  const originalPath = lab.particleAdapter.getBurstMode();
  const scheduler = lab.particleAdapter.getStats();
  const results = { emitter: [], shared: [], scheduled: [] };
  const roundOrders = [
    ['emitter', 'shared', 'scheduled'],
    ['shared', 'scheduled', 'emitter'],
    ['scheduled', 'emitter', 'shared']
  ];

  setUiBusy(true);
  log(`${BUILD} STRESS COMPARE START: ${preset.particles} matched particles / ${preset.points} emission points / ${ROUNDS} rounds / integrated scheduler ${scheduler.schedulerBudgetMs ?? '?'}ms budget, chunk ${scheduler.schedulerChunkSize ?? '?'}, immediate ${scheduler.schedulerImmediateCount ?? '?'}`);

  try {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const order = roundOrders[round - 1];
      log(`STRESS ROUND ${round}/${ROUNDS}: ${order.map((path) => PATH_LABELS[path]).join(' → ')}`);

      for (const path of order) {
        const result = await runLeg(lab, path, preset, round);
        results[path].push(result);
        await sleep(180);
      }
    }

    const emitter = aggregate(results.emitter);
    const shared = aggregate(results.shared);
    const scheduled = aggregate(results.scheduled);
    const tolerance = Math.max(4, Math.round(preset.particles * .02));
    const peaks = [emitter.peakParticles, shared.peakParticles, scheduled.peakParticles];
    const workloadMatched = [emitter, shared, scheduled].every((item) => item.allTargetsReached) && Math.max(...peaks) - Math.min(...peaks) <= tolerance;
    const cleanupClean = [emitter, shared, scheduled].every((item) => item.allCleanupClean);

    log(`${BUILD} STRESS COMPARE RESULT (median ${ROUNDS}): ${resultSummary('emitter', emitter)} | ${resultSummary('shared-direct', shared)} | ${resultSummary('shared-scheduled', scheduled)} | workload ${workloadMatched ? 'MATCHED' : 'MISMATCHED'} | cleanup ${cleanupClean ? 'CLEAN' : 'FAIL'}`);
  } catch (error) {
    log(`${BUILD} STRESS COMPARE FAIL: ${error.message}`);
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
    runStressCompare().catch((error) => {
      log(`${BUILD} STRESS COMPARE FAIL: ${error.message}`);
      console.error(error);
      setUiBusy(false);
    });
  });
}

waitForLab()
  .then((lab) => {
    const stats = lab.particleAdapter.getStats();
    log(`${BUILD} ready: stress now tests the integrated TsParticlesAdapter scheduled mode (${stats.schedulerBudgetMs}ms budget, chunk ${stats.schedulerChunkSize}, immediate ${stats.schedulerImmediateCount}) instead of a Lab-only yielding loop`);
  })
  .catch((error) => {
    log(`${BUILD} init warning: ${error.message}`);
    console.error(error);
  });
