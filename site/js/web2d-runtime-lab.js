import { createWeb2DRuntime, WEB2D_BUILD } from '../fxdeck/web2d/create-web2d-runtime.js?v=p4.1.0';

const BOOT_KEY = '__FXDeckWeb2DBootPromise';
const BOOT_COUNT_KEY = '__FXDeckWeb2DBootCount';

const stage = document.querySelector('#fxd-stage');
const stageTransform = document.querySelector('#fxd-stage-transform');
const particleHost = document.querySelector('#fxd-particles');
const visualHost = document.querySelector('#fxd-visuals');
const target = document.querySelector('#fxd-target');
const effectInput = document.querySelector('#fxd-effect');
const intensityInput = document.querySelector('#fxd-intensity');
const directionInput = document.querySelector('#fxd-direction');
const intensityValue = document.querySelector('#fxd-intensity-value');
const directionValue = document.querySelector('#fxd-direction-value');
const playButton = document.querySelector('#fxd-play');
const stopButton = document.querySelector('#fxd-stop');
const gateButton = document.querySelector('#fxd-run-gate');
const gateStatus = document.querySelector('#fxd-gate-status');
const logOutput = document.querySelector('#fxd-log');
const apiOutput = document.querySelector('#fxd-api');

const metrics = {
  fps: document.querySelector('#fxd-fps'),
  instances: document.querySelector('#fxd-instances'),
  particles: document.querySelector('#fxd-particle-count'),
  emitters: document.querySelector('#fxd-emitter-count'),
  groups: document.querySelector('#fxd-group-count'),
  queued: document.querySelector('#fxd-queued-count'),
  canvases: document.querySelector('#fxd-canvas-count')
};

let runtime = null;
let position = null;
let gateRunning = false;
let lastFrameAt = 0;
let fpsSamples = [];

function log(message) {
  if (!logOutput) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setTarget(point) {
  position = { x: point.x, y: point.y };
  target.style.left = `${position.x}px`;
  target.style.top = `${position.y}px`;
  updateApiPreview();
}

function createTransient(className, point) {
  const element = document.createElement('div');
  element.className = className;
  element.style.left = `${point.x}px`;
  element.style.top = `${point.y}px`;
  visualHost.appendChild(element);
  return element;
}

function animateTransient(element, keyframes, options) {
  const animation = element.animate(keyframes, options);
  animation.finished.catch(() => {}).finally(() => element.remove());
  return () => {
    animation.cancel();
    element.remove();
  };
}

function createScreenKickController(element) {
  let x = 0;
  let y = 0;
  let raf = 0;
  let last = 0;

  const frame = (now) => {
    const dt = last ? Math.min(3, (now - last) / 16.667) : 1;
    last = now;
    const decay = Math.pow(.72, dt);
    x *= decay;
    y *= decay;
    element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    if (Math.hypot(x, y) < .05) {
      x = 0;
      y = 0;
      raf = 0;
      last = 0;
      element.style.transform = 'translate3d(0,0,0)';
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  return {
    kick(direction, distance) {
      x += -direction.x * distance;
      y += -direction.y * distance;
      const magnitude = Math.hypot(x, y);
      if (magnitude > 14) {
        x = (x / magnitude) * 14;
        y = (y / magnitude) * 14;
      }
      if (!raf) raf = requestAnimationFrame(frame);
    },
    reset() {
      if (raf) cancelAnimationFrame(raf);
      x = 0;
      y = 0;
      raf = 0;
      last = 0;
      element.style.transform = 'translate3d(0,0,0)';
    }
  };
}

const screenKick = createScreenKickController(stageTransform);

function hooks() {
  return {
    fireballLaunch({ position: point, directionDegrees, intensity }) {
      const flash = createTransient('fxd-flash', point);
      const scale = .46 + Math.min(1.4, intensity) * .15;
      return animateTransient(flash, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.18)` },
        { opacity: .85, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale})`, offset: .2 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale * 1.4})` }
      ], { duration: 130, easing: 'cubic-bezier(.08,.74,.14,1)', fill: 'forwards' });
    },
    contactFlash({ position: point, directionDegrees, intensity }) {
      const flash = createTransient('fxd-flash', point);
      const scale = Math.min(1.35, .72 + intensity * .22);
      return animateTransient(flash, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.2)` },
        { opacity: 1, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale})`, offset: .15 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale * 1.2})` }
      ], { duration: 120, easing: 'cubic-bezier(.08,.74,.14,1)', fill: 'forwards' });
    },
    pressureWave({ position: point, direction, directionDegrees, intensity }) {
      const offset = 10 * Math.min(1.4, intensity);
      const wave = createTransient('fxd-wave', {
        x: point.x + direction.x * offset,
        y: point.y + direction.y * offset
      });
      return animateTransient(wave, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.2)` },
        { opacity: .75, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.48)`, offset: .15 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${1.2 + intensity * .25})` }
      ], { duration: 210, easing: 'cubic-bezier(.08,.74,.14,1)', fill: 'forwards' });
    },
    targetKick({ direction, distance }) {
      const dx = direction.x * distance;
      const dy = direction.y * distance;
      const animation = target.animate([
        { transform: 'translate(-50%, -50%)' },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`, offset: .22 },
        { transform: 'translate(-50%, -50%)' }
      ], { duration: 220, easing: 'cubic-bezier(.18,.72,.22,1)' });
      return () => animation.cancel();
    },
    explosionFlash({ position: point, intensity }) {
      const flash = createTransient('fxd-explosion-flash', point);
      const end = 1 + Math.min(1.4, intensity) * .38;
      return animateTransient(flash, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.15)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(.6)', offset: .12 },
        { opacity: 0, transform: `translate(-50%, -50%) scale(${end})` }
      ], { duration: 250, easing: 'cubic-bezier(.08,.74,.14,1)', fill: 'forwards' });
    },
    screenKick({ direction, distance }) {
      screenKick.kick(direction, distance);
    }
  };
}

function currentParams(point = position, effectId = effectInput.value) {
  const params = {
    version: 'v1',
    variant: 'default',
    position: { ...point },
    direction: Number(directionInput.value),
    intensity: Number(intensityInput.value),
    hooks: hooks()
  };

  if (effectId === 'fireball') {
    const stageWidth = stage.clientWidth;
    params.distance = clamp(stageWidth * .32, 120, 340);
  }

  return params;
}

function updateApiPreview() {
  if (!apiOutput || !position) return;
  const id = effectInput.value;
  const extra = id === 'fireball' ? `,\n  distance: ${Math.round(clamp(stage.clientWidth * .32, 120, 340))}` : '';
  apiOutput.textContent = `FXDeck.play("${id}", {\n  position: { x: ${Math.round(position.x)}, y: ${Math.round(position.y)} },\n  direction: ${directionInput.value},\n  intensity: ${Number(intensityInput.value).toFixed(1)}${extra}\n});`;
}

function playAt(point = position) {
  if (!runtime || gateRunning) return null;
  if (point) setTarget(point);
  const effectId = effectInput.value;
  const instance = runtime.fx.play(effectId, currentParams(position, effectId));
  instance.ready.catch((error) => log(`PLAY FAIL ${effectId}: ${error.message}`));
  log(`PLAY ${effectId} / ${instance.id}`);
  return instance;
}

function resourceState() {
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

function assertResourcesClean(label) {
  const value = resourceState();
  if (Object.values(value).some((item) => item !== 0)) {
    throw new Error(`${label}: resources not clean ${JSON.stringify(value)}`);
  }
}

async function runSession1Gate({ iterations = 8, automatic = false } = {}) {
  if (!runtime || gateRunning) return null;
  gateRunning = true;
  gateButton.disabled = true;
  playButton.disabled = true;
  gateStatus.textContent = 'RUNNING';
  gateStatus.dataset.state = 'running';

  const originalContainer = runtime.persistentContainer;
  const originalEngine = runtime.engine;
  const originalBootCount = globalThis[BOOT_COUNT_KEY];
  const gatePoint = { x: -240, y: -240 };

  try {
    runtime.fx.stopAll('session1-gate-reset');
    screenKick.reset();
    await nextFrame();
    await nextFrame();
    assertResourcesClean('gate reset');
    runtime.assertTopology();

    for (let index = 0; index < iterations; index += 1) {
      const instance = runtime.fx.play('heavyImpact', {
        version: 'v1',
        variant: 'default',
        position: gatePoint,
        direction: (index * 47) % 360,
        intensity: 1,
        hooks: {}
      });
      await instance.ready;
      runtime.fx.stop(instance, 'session1-gate-cycle');
      await nextFrame();
      await nextFrame();
      assertResourcesClean(`cycle ${index + 1}`);
      runtime.assertTopology();

      if (runtime.adapters.particles.container !== originalContainer) {
        throw new Error(`cycle ${index + 1}: persistent container identity changed`);
      }
      if (runtime.engine !== originalEngine || globalThis.tsParticles !== originalEngine) {
        throw new Error(`cycle ${index + 1}: tsParticles engine identity changed`);
      }
      if (globalThis[BOOT_COUNT_KEY] !== originalBootCount || originalBootCount !== 1) {
        throw new Error(`cycle ${index + 1}: authoritative boot count is ${globalThis[BOOT_COUNT_KEY]}, expected 1`);
      }
    }

    await wait(120);
    await nextFrame();
    assertResourcesClean('late cleanup');
    runtime.assertTopology();

    const topology = runtime.topology();
    gateStatus.textContent = 'PASS';
    gateStatus.dataset.state = 'pass';
    log(`PASS ${WEB2D_BUILD} SESSION 1 GATE: ${iterations} play/stop cycles / 1 engine / 1 persistent container / ${topology.particleCanvasCount} canvas / bootCount ${originalBootCount}`);
    globalThis.FXDeckSession1Gate = { pass: true, iterations, topology: { particleCanvasCount: topology.particleCanvasCount, registeredEffects: topology.registeredEffects } };
    return globalThis.FXDeckSession1Gate;
  } catch (error) {
    runtime.fx.stopAll('session1-gate-failed');
    gateStatus.textContent = 'FAIL';
    gateStatus.dataset.state = 'fail';
    log(`FAIL ${WEB2D_BUILD} SESSION 1 GATE: ${error.message}`);
    console.error(error);
    globalThis.FXDeckSession1Gate = { pass: false, error: error.message };
    if (!automatic) throw error;
    return globalThis.FXDeckSession1Gate;
  } finally {
    gateRunning = false;
    gateButton.disabled = false;
    playButton.disabled = false;
  }
}

function metricsLoop(now) {
  if (lastFrameAt) {
    const dt = now - lastFrameAt;
    if (dt > 0 && dt < 250) {
      fpsSamples.push(dt);
      if (fpsSamples.length > 90) fpsSamples.shift();
    }
  }
  lastFrameAt = now;

  if (runtime) {
    const stats = runtime.fx.getStats();
    const particleStats = stats.particles ?? {};
    const avgMs = fpsSamples.length ? fpsSamples.reduce((sum, dt) => sum + dt, 0) / fpsSamples.length : 0;
    metrics.fps.textContent = avgMs ? (1000 / avgMs).toFixed(1) : '--';
    metrics.instances.textContent = String(stats.activeInstances ?? 0);
    metrics.particles.textContent = String(particleStats.particles ?? 0);
    metrics.emitters.textContent = String(particleStats.emitters ?? 0);
    metrics.groups.textContent = String(particleStats.burstGroups ?? 0);
    metrics.queued.textContent = String(particleStats.queuedParticles ?? 0);
    metrics.canvases.textContent = String(particleHost.querySelectorAll('canvas').length);
  }

  requestAnimationFrame(metricsLoop);
}

function bindUi() {
  playButton.addEventListener('click', () => playAt());
  stopButton.addEventListener('click', () => {
    runtime.fx.stopAll('manual-stop-all');
    screenKick.reset();
    log('STOP ALL');
  });
  gateButton.addEventListener('click', () => runSession1Gate().catch(() => {}));

  stage.addEventListener('pointerdown', (event) => {
    if (gateRunning) return;
    const rect = stage.getBoundingClientRect();
    playAt({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  });

  effectInput.addEventListener('change', () => {
    runtime.fx.stopAll('effect-switch');
    updateApiPreview();
  });
  intensityInput.addEventListener('input', () => {
    intensityValue.textContent = Number(intensityInput.value).toFixed(1);
    updateApiPreview();
  });
  directionInput.addEventListener('input', () => {
    directionValue.textContent = `${directionInput.value}°`;
    updateApiPreview();
  });

  window.addEventListener('resize', () => {
    runtime.fx.stopAll('resize');
    screenKick.reset();
    runtime.resize();
    setTarget({ x: stage.clientWidth * .5, y: stage.clientHeight * .55 });
  });
}

async function bootstrap() {
  globalThis[BOOT_COUNT_KEY] = (globalThis[BOOT_COUNT_KEY] ?? 0) + 1;
  if (globalThis[BOOT_COUNT_KEY] !== 1) {
    throw new Error(`FXDeck Web2D authoritative bootstrap executed ${globalThis[BOOT_COUNT_KEY]} times.`);
  }

  log(`BOOT ${WEB2D_BUILD}: registering tsParticles capabilities before container creation`);
  runtime = await createWeb2DRuntime({
    stage,
    particleHost,
    visualHost,
    burstMode: 'scheduled'
  });

  globalThis.FXDeck = runtime.fx;
  globalThis.FXDeckWeb2D = runtime;
  globalThis.FXDeckLab = {
    runtime,
    fx: runtime.fx,
    particleAdapter: runtime.adapters.particles,
    visualAdapter: runtime.adapters.visuals,
    playAt,
    stopAll: (reason = 'lab-stop-all') => runtime.fx.stopAll(reason),
    runSession1Gate,
    topology: () => runtime.topology()
  };

  setTarget({ x: stage.clientWidth * .5, y: stage.clientHeight * .55 });
  intensityValue.textContent = Number(intensityInput.value).toFixed(1);
  directionValue.textContent = `${directionInput.value}°`;
  updateApiPreview();
  bindUi();
  requestAnimationFrame(metricsLoop);

  const topology = runtime.topology();
  log(`PASS ${WEB2D_BUILD} BOOT: 1 FXDeck runtime / 1 tsParticles engine / 1 persistent container / ${topology.particleCanvasCount} canvas / ${topology.registeredEffects} baseline effects`);
  log(`${WEB2D_BUILD}: legacy effect bridges, build-authority MutationObserver and Particlr/reference iframe are not loaded on this canonical page`);

  // Run the architecture gate automatically once. It uses an off-stage position
  // and empty hooks, so the test verifies ownership/cleanup without becoming a
  // showcase effect or polluting normal authoring state.
  window.setTimeout(() => {
    runSession1Gate({ iterations: 6, automatic: true }).catch(() => {});
  }, 300);

  return runtime;
}

if (!globalThis[BOOT_KEY]) {
  globalThis[BOOT_KEY] = bootstrap().catch((error) => {
    log(`BOOT FAIL ${WEB2D_BUILD}: ${error.message}`);
    gateStatus.textContent = 'BOOT FAIL';
    gateStatus.dataset.state = 'fail';
    console.error(error);
    throw error;
  });
}

await globalThis[BOOT_KEY];
