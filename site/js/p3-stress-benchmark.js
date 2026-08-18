const BUILD = 'P3.3.0';
const ROUNDS = 3;

const stressButton = document.querySelector('#play-stress-ab');
const stressLoadInput = document.querySelector('#stress-load');
const stressProfileInput = document.querySelector('#stress-profile');
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

const PROFILE_LABELS = {
  uniform: 'uniform',
  heterogeneous: 'heterogeneous',
  both: 'both'
};

const HETERO_INTENSITY_WEIGHTS = [.55, .75, .9, 1.1, 1.25, 1.45];
const HETERO_COLORS = ['#ffffff', '#ffbf69', '#4cc9f0', '#b8f2e6', '#f72585', '#ffd166'];

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
  throw new Error(`${BUILD} stress benchmark could not find an initialized FXDeckLab.`);
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

function stressEmitterOptions(count, index = 0, profile = 'uniform') {
  const heterogeneous = profile === 'heterogeneous';
  const direction = (index * 137.5) % 360;
  const speed = .8 + (index % 5) * .45;
  const size = 2 + (index % 5) * .55;
  const opacity = .28 + (index % 4) * .12;

  return {
    autoPlay: true,
    startCount: count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 2.6, wait: false },
    particles: {
      color: { value: heterogeneous ? HETERO_COLORS[index % HETERO_COLORS.length] : '#ffffff' },
      shape: { type: 'circle' },
      opacity: { value: heterogeneous ? opacity : .42 },
      size: { value: heterogeneous ? size : 3 },
      move: heterogeneous
        ? {
            enable: true,
            direction: 'right',
            angle: { value: 16 + (index % 3) * 8, offset: direction },
            random: false,
            straight: false,
            speed,
            outModes: { default: 'bounce' }
          }
        : { enable: false },
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

function weightedDistribute(total, buckets) {
  const weights = Array.from({ length: buckets }, (_, index) => HETERO_INTENSITY_WEIGHTS[index % HETERO_INTENSITY_WEIGHTS.length]);
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const raw = weights.map((weight) => total * weight / weightSum);
  const counts = raw.map(Math.floor);
  let remainder = total - counts.reduce((sum, value) => sum + value, 0);
  const byFraction = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let cursor = 0; remainder > 0; cursor += 1, remainder -= 1) {
    counts[byFraction[cursor % byFraction.length].index] += 1;
  }

  return counts;
}

function makeCounts(total, buckets, profile) {
  return profile === 'heterogeneous'
    ? weightedDistribute(total, buckets)
    : distribute(total, buckets);
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

async function submitWorkload(adapter, path, points, counts, profile) {
  let submitCpuMs = 0;

  for (let index = 0; index < points.length; index += 1) {
    const startedAt = performance.now();
    await adapter.burst(stressEmitterOptions(counts[index], index, profile), points[index], { mode: path });
    submitCpuMs += performance.now() - startedAt;
  }

  return submitCpuMs;
}

async function runLeg(lab, path, preset, round, profile) {
  const adapter = lab.particleAdapter;
  const stage = document.querySelector('#impact-stage');
  const points = makePoints(stage, preset.points);
  const counts = makeCounts(preset.particles, points.length, profile);
  const label = PATH_LABELS[path];
  const countRange = `${Math.min(...counts)}–${Math.max(...counts)}`;

  await cleanLab(lab);
  adapter.setBurstMode(path);

  const populationProbe = await probePopulationFrames(async () => {
    const submitCpuMs = await submitWorkload(adapter, path, points, counts, profile);
    const target = await waitForParticleTarget(adapter, preset.particles);
    return { submitCpuMs, target };
  });

  const target = populationProbe.value.target;
  const statsAtStart = adapter.getStats();

  log(`STRESS R${round} ${label} [${PROFILE_LABELS[profile]}]: submit CPU ${populationProbe.value.submitCpuMs.toFixed(2)} ms / population span ${populationProbe.populationSpanMs.toFixed(1)} ms / worst population frame ${populationProbe.worstPopulationFrameMs.toFixed(1)} ms / population >20ms ${populationProbe.populationSpikes20} / requested ${preset.particles} / per-point count ${countRange} / ready ${statsAtStart.particles} / ${statsAtStart.emitters} emitters / ${statsAtStart.burstGroups} groups / queued ${statsAtStart.queuedParticles ?? 0} / target ${target.reached ? 'reached' : 'NOT reached'} in ${target.waitMs.toFixed(1)} ms`);

  const frameResult = await sampleFrames(adapter, 1400);

  adapter.clear();
  await nextFrame();
  await nextFrame();
  const cleanStats = adapter.getStats();

  const result = {
    path,
    profile,
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
  const ids = ['play-impact', 'play-overlap', 'play-ab', 'run-cancel-gate', 'stop-all', 'particle-path', 'intensity', 'direction', 'stress-load', 'stress-profile'];
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

async function runProfileCompare(lab, preset, profile, scheduler) {
  const results = { emitter: [], shared: [], scheduled: [] };
  const roundOrders = [
    ['emitter', 'shared', 'scheduled'],
    ['shared', 'scheduled', 'emitter'],
    ['scheduled', 'emitter', 'shared']
  ];
  const profileDetail = profile === 'heterogeneous'
    ? 'per-point intensity weights 0.55–1.45 normalized to the same total + varied color/direction/speed/size/opacity'
    : 'identical stationary particle options at every point';

  log(`${BUILD} STRESS COMPARE START: profile ${PROFILE_LABELS[profile]} / ${preset.particles} matched particles / ${preset.points} emission points / ${ROUNDS} rounds / ${profileDetail} / integrated scheduler ${scheduler.schedulerBudgetMs ?? '?'}ms budget, chunk ${scheduler.schedulerChunkSize ?? '?'}, immediate ${scheduler.schedulerImmediateCount ?? '?'}`);

  for (let round = 1; round <= ROUNDS; round += 1) {
    const order = roundOrders[round - 1];
    log(`STRESS ROUND ${round}/${ROUNDS} [${PROFILE_LABELS[profile]}]: ${order.map((path) => PATH_LABELS[path]).join(' → ')}`);

    for (const path of order) {
      const result = await runLeg(lab, path, preset, round, profile);
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

  log(`${BUILD} STRESS COMPARE RESULT (median ${ROUNDS}, ${PROFILE_LABELS[profile]}): ${resultSummary('emitter', emitter)} | ${resultSummary('shared-direct', shared)} | ${resultSummary('shared-scheduled', scheduled)} | workload ${workloadMatched ? 'MATCHED' : 'MISMATCHED'} | cleanup ${cleanupClean ? 'CLEAN' : 'FAIL'}`);

  return { emitter, shared, scheduled, workloadMatched, cleanupClean };
}

async function runStressCompare() {
  if (!stressButton || stressButton.disabled) return;
  const lab = await waitForLab();
  const requested = Number(stressLoadInput?.value ?? 800);
  const preset = STRESS_PRESETS[requested] ?? STRESS_PRESETS[800];
  const requestedProfile = ['uniform', 'heterogeneous', 'both'].includes(stressProfileInput?.value)
    ? stressProfileInput.value
    : 'both';
  const profiles = requestedProfile === 'both' ? ['uniform', 'heterogeneous'] : [requestedProfile];
  const originalPath = lab.particleAdapter.getBurstMode();
  const scheduler = lab.particleAdapter.getStats();
  const profileResults = {};

  setUiBusy(true);

  try {
    for (const profile of profiles) {
      profileResults[profile] = await runProfileCompare(lab, preset, profile, scheduler);
      await sleep(260);
    }

    if (profileResults.uniform && profileResults.heterogeneous) {
      const uniform = profileResults.uniform.scheduled;
      const hetero = profileResults.heterogeneous.scheduled;
      const deltaSubmit = hetero.submitCpuMs - uniform.submitCpuMs;
      const deltaSpan = hetero.populationSpanMs - uniform.populationSpanMs;
      const deltaWorst = hetero.worstPopulationFrameMs - uniform.worstPopulationFrameMs;
      const deltaSpikes = hetero.populationSpikes20 - uniform.populationSpikes20;
      const deltaAvg = hetero.avgFps - uniform.avgFps;
      const deltaLow = hetero.low1 - uniform.low1;
      log(`${BUILD} HETEROGENEITY DELTA (shared-scheduled, heterogeneous - uniform): ${deltaSubmit >= 0 ? '+' : ''}${deltaSubmit.toFixed(1)}ms submit / ${deltaSpan >= 0 ? '+' : ''}${deltaSpan.toFixed(1)}ms span / ${deltaWorst >= 0 ? '+' : ''}${deltaWorst.toFixed(1)}ms worst frame / ${deltaSpikes >= 0 ? '+' : ''}${deltaSpikes.toFixed(0)} population spikes / ${deltaAvg >= 0 ? '+' : ''}${deltaAvg.toFixed(1)} steady avg / ${deltaLow >= 0 ? '+' : ''}${deltaLow.toFixed(1)} steady low | uniform ${profileResults.uniform.workloadMatched && profileResults.uniform.cleanupClean ? 'VALID' : 'INVALID'} | heterogeneous ${profileResults.heterogeneous.workloadMatched && profileResults.heterogeneous.cleanupClean ? 'VALID' : 'INVALID'}`);
    }
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
    log(`${BUILD} ready: uniform + heterogeneous + combined profile stress; production scheduled mode ${stats.schedulerBudgetMs}ms budget, chunk ${stats.schedulerChunkSize}, immediate ${stats.schedulerImmediateCount}`);
  })
  .catch((error) => {
    log(`${BUILD} init warning: ${error.message}`);
    console.error(error);
  });
