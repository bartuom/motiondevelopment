// FXDeck P0.3 performance load extension.
// Loaded after webfx-lab.js so it can extend the spike TESTS/RUNNERS registry
// without contaminating the future FXDeck Core with benchmark-only code.

TESTS.performance = {
  index: '08',
  label: 'Performance load',
  description: 'Measures baseline, Normal (~150), Heavy (~400) and Extreme (~800) particle loads with frame-time sampling and cleanup checks.'
};

const PERF_TIERS = [
  { id: 'NORMAL', count: 150, duration: 2200, gate: true, minAvgFps: 55, minOnePercentLow: 42 },
  { id: 'HEAVY', count: 400, duration: 2400, gate: true, minAvgFps: 50, minOnePercentLow: 30 },
  { id: 'EXTREME', count: 800, duration: 2600, gate: false, minAvgFps: 0, minOnePercentLow: 0 }
];

function effectiveFps(frameMs) {
  if (!Number.isFinite(frameMs) || frameMs <= 0) return 60;
  return Math.min(60, 1000 / frameMs);
}

function percentile(sortedAscending, fraction) {
  if (!sortedAscending.length) return 0;
  const index = Math.min(sortedAscending.length - 1, Math.max(0, Math.ceil(sortedAscending.length * fraction) - 1));
  return sortedAscending[index];
}

async function sampleFrameTimes(durationMs, runId) {
  const deltas = [];
  const started = performance.now();
  let previous = started;

  await new Promise((resolve) => {
    const tick = (now) => {
      if (runId !== Spike.generation) return resolve();

      const delta = now - previous;
      previous = now;
      if (delta > 0 && delta < 1000) deltas.push(delta);

      Spike.peakParticles = Math.max(Spike.peakParticles, Spike.countParticles());
      if (now - started < durationMs) Spike.trackRaf(tick); else resolve();
    };

    Spike.trackRaf(tick);
  });

  // Ignore the first two frames to reduce noise from measurement startup.
  const samples = deltas.slice(2);
  const sorted = [...samples].sort((a, b) => a - b);
  const averageMs = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : Infinity;
  const p99FrameMs = percentile(sorted, .99);
  const maxFrameMs = sorted.length ? sorted[sorted.length - 1] : Infinity;
  const over20 = samples.filter((value) => value > 20).length;
  const over33 = samples.filter((value) => value > 33.34).length;

  return {
    samples: samples.length,
    averageMs,
    averageFps: effectiveFps(averageMs),
    onePercentLow: effectiveFps(p99FrameMs),
    p99FrameMs,
    maxFrameMs,
    over20,
    over33
  };
}

function formatPerf(metrics) {
  return `avg ${metrics.averageFps.toFixed(1)} FPS; 1% low ${metrics.onePercentLow.toFixed(1)} FPS; max frame ${metrics.maxFrameMs.toFixed(1)} ms; >20ms ${metrics.over20}; >33ms ${metrics.over33}; samples ${metrics.samples}`;
}

function performanceBurst(count) {
  return burstEmitter({
    count,
    speed: { min: 1.5, max: 6.5 },
    life: { min: 3.2, max: 3.8 }
  });
}

async function runPerfTier(tier, runId) {
  Spike.container?.particles?.clear?.();
  await sleep(140);
  if (runId !== Spike.generation) return null;

  const p = stagePoint(.5, .5);
  setMarkerPixels(p.x, p.y);
  const { name } = await Spike.addEmitter(performanceBurst(tier.count), p);

  // Let the one-shot populate the particle container before sampling.
  await sleep(180);
  if (runId !== Spike.generation) return null;

  const peakBefore = Spike.countParticles();
  const metrics = await sampleFrameTimes(tier.duration, runId);
  if (runId !== Spike.generation) return null;

  const peak = Math.max(peakBefore, Spike.peakParticles, Spike.countParticles());
  await sleep(100);
  Spike.sweepEmitters();
  const emitterGone = !Spike.container.getEmitter(name);

  // A single worst frame can be caused by GC, browser UI or OS scheduling.
  // Keep max frame time diagnostic, but gate on sustained average + 1% low.
  const thresholdsPass = !tier.gate || (
    metrics.averageFps >= tier.minAvgFps &&
    metrics.onePercentLow >= tier.minOnePercentLow
  );

  log(`PERF ${tier.id} ~${tier.count}: ${formatPerf(metrics)}; peak particles ${peak}; emitter cleanup ${emitterGone ? 'yes' : 'NO'}${tier.gate ? `; gate ${thresholdsPass ? 'PASS' : 'FAIL'}` : '; headroom only'}`);

  Spike.container?.particles?.clear?.();
  await sleep(160);
  Spike.sweepEmitters();

  return { tier, metrics, peak, emitterGone, thresholdsPass };
}

async function testPerformance(runId) {
  Spike.container?.particles?.clear?.();
  await sleep(180);
  if (runId !== Spike.generation) return null;

  log('PERF baseline sampling');
  const baseline = await sampleFrameTimes(1100, runId);
  if (runId !== Spike.generation) return null;
  log(`PERF BASELINE: ${formatPerf(baseline)}`);

  const results = [];
  for (const tier of PERF_TIERS) {
    if (runId !== Spike.generation) return null;
    const result = await runPerfTier(tier, runId);
    if (!result) return null;
    results.push(result);
  }

  Spike.container?.particles?.clear?.();
  await sleep(220);
  Spike.sweepEmitters();

  const gated = results.filter((result) => result.tier.gate);
  const gatesPass = gated.every((result) => result.thresholdsPass && result.emitterGone);
  const cleanupPass = Spike.trackedEmitters.size === 0 && Spike.countParticles() === 0;
  const normal = results.find((result) => result.tier.id === 'NORMAL');
  const heavy = results.find((result) => result.tier.id === 'HEAVY');
  const extreme = results.find((result) => result.tier.id === 'EXTREME');

  return {
    pass: gatesPass && cleanupPass,
    detail: `Normal ${normal.metrics.averageFps.toFixed(1)}/${normal.metrics.onePercentLow.toFixed(1)} FPS; Heavy ${heavy.metrics.averageFps.toFixed(1)}/${heavy.metrics.onePercentLow.toFixed(1)} FPS; Extreme ${extreme.metrics.averageFps.toFixed(1)}/${extreme.metrics.onePercentLow.toFixed(1)} FPS; final cleanup ${cleanupPass ? 'yes' : 'NO'}`
  };
}

RUNNERS.performance = testPerformance;
