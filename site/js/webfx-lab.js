const stage = document.querySelector('#fxdeck-stage');
const testButtons = [...document.querySelectorAll('[data-test]')];
const runButton = document.querySelector('#run-test');
const stopButton = document.querySelector('#stop-all');
const activeName = document.querySelector('#active-name');
const activeDescription = document.querySelector('#active-description');
const metricFps = document.querySelector('#metric-fps');
const metricParticles = document.querySelector('#metric-particles');
const metricEmitters = document.querySelector('#metric-emitters');
const metricResult = document.querySelector('#metric-result');
const logOutput = document.querySelector('#spike-log');
const spawnMarker = document.querySelector('#spawn-marker');
const movingTarget = document.querySelector('#moving-target');
const contactFlash = document.querySelector('.contact-flash');
const pressureWave = document.querySelector('.pressure-wave');

const TESTS = {
  oneshot: { index: '01', label: 'One-shot burst', description: 'Known-good visible burst, particle peak sampling and automatic emitter cleanup.' },
  position: { index: '02', label: 'Exact position', description: 'Validates CSS stage coordinates -> retina canvas coordinates -> visible spawn alignment.' },
  moving: { index: '03', label: 'Moving emitter', description: 'Moves one EmitterInstance through canvas coordinates while a DOM marker follows in CSS coordinates.' },
  stress: { index: '04', label: '30× stress', description: 'Fires 30 visible one-shots rapidly and checks automatic emitter destruction.' },
  image: { index: '05', label: 'Image particles', description: 'Uses a preloaded local SVG image shape with an intentionally large readable size.' },
  composite: { index: '06', label: 'Composite FX', description: 'Particles + DOM contact flash + pressure wave + stage kick at the same gameplay coordinate.' },
  resize: { index: '07', label: 'Resize / reflow', description: 'Resizes the stage/canvas, recalculates coordinate scale and spawns at the new visual center.' }
};

const Spike = {
  container: null,
  selected: 'oneshot',
  generation: 0,
  emitterSerial: 0,
  trackedEmitters: new Set(),
  timers: new Set(),
  rafs: new Set(),
  running: false,
  peakParticles: 0,

  async init() {
    if (!window.tsParticles) throw new Error('tsParticles bundle did not load.');

    this.container = await window.tsParticles.load({
      id: 'fxdeck-particles',
      options: {
        fullScreen: { enable: false },
        background: { color: { value: 'transparent' } },
        detectRetina: true,
        fpsLimit: 60,
        pauseOnBlur: true,
        pauseOnOutsideViewport: false,
        preload: [{ src: './assets/fxdeck-spark.svg', width: 32, height: 10 }],
        particles: { number: { value: 0 } },
        emitters: []
      }
    });

    if (!this.container?.addEmitter || !this.container?.removeEmitter || !this.container?.getEmitter) {
      throw new Error('Emitter runtime API is unavailable in the loaded bundle.');
    }

    const scale = canvasScale();
    log(`PASS engine init; canvas scale ${scale.x.toFixed(2)}x${scale.y.toFixed(2)}`);
  },

  countParticles() {
    return Number(this.container?.particles?.count ?? this.container?.particles?.array?.length ?? 0);
  },

  sweepEmitters() {
    for (const name of [...this.trackedEmitters]) {
      if (!this.container?.getEmitter?.(name)) this.trackedEmitters.delete(name);
    }
  },

  async addEmitter(options, cssPosition) {
    const name = `fxdeck-spike-${++this.emitterSerial}`;
    const canvasPosition = cssToCanvas(cssPosition);
    const instance = await this.container.addEmitter({ ...structuredClone(options), name }, canvasPosition);
    this.trackedEmitters.add(name);
    updateMetrics();
    return { name, instance, canvasPosition };
  },

  removeEmitter(name) {
    try { this.container?.removeEmitter?.(name); } catch (error) { console.warn(error); }
    this.trackedEmitters.delete(name);
    updateMetrics();
  },

  trackRaf(fn) {
    const id = requestAnimationFrame((time) => {
      this.rafs.delete(id);
      fn(time);
    });
    this.rafs.add(id);
    return id;
  },

  cleanup() {
    this.timers.forEach(clearTimeout);
    this.rafs.forEach(cancelAnimationFrame);
    this.timers.clear();
    this.rafs.clear();
    for (const name of [...this.trackedEmitters]) this.removeEmitter(name);
    this.container?.particles?.clear?.();
    stage.classList.remove('composite-playing');
    movingTarget.classList.remove('is-visible');
    stage.style.removeProperty('height');
    stage.style.removeProperty('min-height');
    this.container?.canvas?.resize?.();
    setMarkerPercent(50, 50);
    updateMetrics();
  },

  stop({ logStop = true } = {}) {
    this.generation += 1;
    this.running = false;
    this.cleanup();
    setResult('idle', 'stopped');
    if (logStop) log('STOP cleanup executed');
  }
};

function log(message) {
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  const lines = logOutput.textContent.trim().split('\n').filter(Boolean);
  lines.push(`[${stamp}] ${message}`);
  logOutput.textContent = lines.slice(-12).join('\n');
  logOutput.scrollTop = logOutput.scrollHeight;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setResult(state, text) {
  metricResult.className = '';
  if (state === 'pass') metricResult.classList.add('metric-pass');
  if (state === 'fail') metricResult.classList.add('metric-fail');
  if (state === 'running') metricResult.classList.add('metric-running');
  metricResult.textContent = text;
}

function updateMetrics() {
  Spike.sweepEmitters();
  const count = Spike.countParticles();
  if (Spike.running) Spike.peakParticles = Math.max(Spike.peakParticles, count);
  metricParticles.textContent = String(count);
  metricEmitters.textContent = String(Spike.trackedEmitters.size);
}

function stagePoint(px, py) {
  return { x: stage.clientWidth * px, y: stage.clientHeight * py };
}

function canvasScale() {
  const canvasSize = Spike.container?.canvas?.size;
  const cssWidth = Math.max(1, stage.clientWidth);
  const cssHeight = Math.max(1, stage.clientHeight);
  return {
    x: (canvasSize?.width || cssWidth) / cssWidth,
    y: (canvasSize?.height || cssHeight) / cssHeight
  };
}

function cssToCanvas(point) {
  const scale = canvasScale();
  return { x: point.x * scale.x, y: point.y * scale.y };
}

function canvasToCss(point) {
  const scale = canvasScale();
  return { x: point.x / scale.x, y: point.y / scale.y };
}

function setMarkerPixels(x, y) {
  spawnMarker.style.left = `${x}px`;
  spawnMarker.style.top = `${y}px`;
}

function setMarkerPercent(x, y) {
  const point = stagePoint(x / 100, y / 100);
  setMarkerPixels(point.x, point.y);
}

function visibleParticles({ image = false, direction = 'none', speed = { min: 7, max: 16 }, gravity = 0, life = { min: 0.55, max: 0.95 } } = {}) {
  return {
    color: { value: image ? '#ffffff' : ['#ffffff', '#c9f2ff', '#61d2ff', '#4e8cff'] },
    shape: image ? {
      type: 'image',
      options: { image: { src: './assets/fxdeck-spark.svg', width: 32, height: 10, replaceColor: false } }
    } : { type: 'circle' },
    opacity: {
      value: { min: 0.75, max: 1 },
      animation: { enable: true, speed: 1.25, sync: false, startValue: 'max', destroy: 'min' }
    },
    size: {
      value: image ? { min: 9, max: 16 } : { min: 3, max: 7 },
      animation: { enable: true, speed: 2.2, sync: false, startValue: 'max', destroy: 'min' }
    },
    rotate: image ? { value: { min: 0, max: 360 }, direction: 'random' } : undefined,
    move: {
      enable: true,
      direction,
      random: true,
      straight: false,
      speed,
      gravity: { enable: gravity > 0, acceleration: gravity },
      outModes: { default: 'destroy' }
    },
    life: {
      count: 1,
      duration: { value: life, sync: false }
    }
  };
}

function burstEmitter({ count = 36, image = false, direction = 'none', speed, gravity = 0, life } = {}) {
  return {
    autoPlay: true,
    startCount: count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 0, delay: 0 },
    life: { count: 1, duration: 0.1, wait: false },
    particles: visibleParticles({ image, direction, speed, gravity, life })
  };
}

function sustainedEmitter() {
  return {
    autoPlay: true,
    startCount: 4,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 3, delay: 0.04 },
    life: { count: 1, duration: 1.45, wait: false },
    particles: visibleParticles({ speed: { min: 1.5, max: 4.5 }, life: { min: 0.4, max: 0.7 } })
  };
}

async function observe(duration, runId) {
  const started = performance.now();
  let peak = 0;
  await new Promise((resolve) => {
    const tick = (now) => {
      if (runId !== Spike.generation) return resolve();
      const count = Spike.countParticles();
      peak = Math.max(peak, count);
      Spike.peakParticles = Math.max(Spike.peakParticles, count);
      if (now - started < duration) Spike.trackRaf(tick); else resolve();
    };
    Spike.trackRaf(tick);
  });
  return peak;
}

async function testOneShot(runId) {
  const p = stagePoint(.5, .5);
  setMarkerPixels(p.x, p.y);
  const { name } = await Spike.addEmitter(burstEmitter({ count: 42 }), p);
  const peak = await observe(900, runId);
  await sleep(350);
  if (runId !== Spike.generation) return null;
  Spike.sweepEmitters();
  const gone = !Spike.container.getEmitter(name);
  return { pass: peak >= 10 && gone, detail: `peak ${peak}; auto-cleanup ${gone ? 'yes' : 'NO'}` };
}

async function testPosition(runId) {
  const p = stagePoint(.72, .34);
  setMarkerPixels(p.x, p.y);
  const { name, instance, canvasPosition } = await Spike.addEmitter(burstEmitter({ count: 34, direction: 'right' }), p);
  const visiblePosition = canvasToCss(instance.position);
  const dx = Math.abs(visiblePosition.x - p.x);
  const dy = Math.abs(visiblePosition.y - p.y);
  const peak = await observe(850, runId);
  await sleep(250);
  if (runId !== Spike.generation) return null;
  Spike.sweepEmitters();
  const scale = canvasScale();
  return {
    pass: dx < 2 && dy < 2 && peak > 0,
    detail: `CSS ${Math.round(p.x)},${Math.round(p.y)} -> canvas ${Math.round(canvasPosition.x)},${Math.round(canvasPosition.y)}; visual delta ${dx.toFixed(1)},${dy.toFixed(1)}px; scale ${scale.x.toFixed(2)}`
  };
}

async function testMoving(runId) {
  const start = stagePoint(.16, .56);
  const { name, instance } = await Spike.addEmitter(sustainedEmitter(), start);
  movingTarget.classList.add('is-visible');
  const started = performance.now();
  let last = { ...start };

  await new Promise((resolve) => {
    const animate = (now) => {
      if (runId !== Spike.generation) return resolve();
      const t = Math.min(1, (now - started) / 1350);
      const x = stage.clientWidth * (.16 + .68 * t);
      const y = stage.clientHeight * (.52 + Math.sin(t * Math.PI * 2) * .17);
      last = { x, y };
      const canvasPoint = cssToCanvas(last);
      instance.position.x = canvasPoint.x;
      instance.position.y = canvasPoint.y;
      movingTarget.style.left = `${x}px`;
      movingTarget.style.top = `${y}px`;
      setMarkerPixels(x, y);
      Spike.peakParticles = Math.max(Spike.peakParticles, Spike.countParticles());
      if (t < 1) Spike.trackRaf(animate); else resolve();
    };
    Spike.trackRaf(animate);
  });

  await sleep(850);
  if (runId !== Spike.generation) return null;
  Spike.sweepEmitters();
  movingTarget.classList.remove('is-visible');
  const travel = Math.hypot(last.x - start.x, last.y - start.y);
  return { pass: travel > stage.clientWidth * .6 && Spike.peakParticles >= 5 && !Spike.container.getEmitter(name), detail: `travel ${Math.round(travel)}px; peak ${Spike.peakParticles}; auto-cleanup ${!Spike.container.getEmitter(name) ? 'yes' : 'NO'}` };
}

async function testStress(runId) {
  const names = [];
  for (let i = 0; i < 30; i += 1) {
    if (runId !== Spike.generation) return null;
    const x = stage.clientWidth * (.14 + ((i * 37) % 72) / 100);
    const y = stage.clientHeight * (.14 + ((i * 53) % 70) / 100);
    const { name } = await Spike.addEmitter(burstEmitter({ count: 18, speed: { min: 6, max: 14 }, life: { min: .45, max: .75 } }), { x, y });
    names.push(name);
    Spike.peakParticles = Math.max(Spike.peakParticles, Spike.countParticles());
    await sleep(42);
  }
  await observe(900, runId);
  await sleep(350);
  if (runId !== Spike.generation) return null;
  Spike.sweepEmitters();
  const alive = names.filter((name) => Spike.container.getEmitter(name)).length;
  const pass = Spike.peakParticles >= 40 && alive === 0;
  Spike.container?.particles?.clear?.();
  return { pass, detail: `30 bursts; peak ${Spike.peakParticles}; emitters still alive ${alive}` };
}

async function testImage(runId) {
  const p = stagePoint(.5, .5);
  setMarkerPixels(p.x, p.y);
  const { name } = await Spike.addEmitter(burstEmitter({ count: 28, image: true, direction: 'right', speed: { min: 6, max: 14 }, life: { min: .7, max: 1.05 } }), p);
  const peak = await observe(1050, runId);
  await sleep(250);
  if (runId !== Spike.generation) return null;
  Spike.sweepEmitters();
  return { pass: peak >= 5 && !Spike.container.getEmitter(name), detail: `preloaded SVG particles; peak ${peak}; auto-cleanup ${!Spike.container.getEmitter(name) ? 'yes' : 'NO'}` };
}

async function testComposite(runId) {
  const p = stagePoint(.5, .5);
  setMarkerPixels(p.x, p.y);
  contactFlash.style.left = `${p.x}px`;
  contactFlash.style.top = `${p.y}px`;
  pressureWave.style.left = `${p.x}px`;
  pressureWave.style.top = `${p.y}px`;
  stage.classList.remove('composite-playing');
  void stage.offsetWidth;
  stage.classList.add('composite-playing');

  const { name: sparks } = await Spike.addEmitter(burstEmitter({ count: 34, direction: 'right', speed: { min: 9, max: 20 }, life: { min: .45, max: .75 } }), p);
  await sleep(42);
  if (runId !== Spike.generation) return null;
  const { name: debris } = await Spike.addEmitter(burstEmitter({ count: 10, direction: 'right', speed: { min: 4, max: 9 }, gravity: 14, life: { min: .65, max: 1.0 } }), p);
  const peak = await observe(900, runId);
  await sleep(350);
  if (runId !== Spike.generation) return null;
  Spike.sweepEmitters();
  stage.classList.remove('composite-playing');
  return { pass: peak >= 10 && !Spike.container.getEmitter(sparks) && !Spike.container.getEmitter(debris), detail: `aligned particle + DOM cue; peak ${peak}; both emitters auto-cleaned` };
}

async function testResize(runId) {
  const before = { ...Spike.container.canvas.size };
  stage.style.minHeight = '430px';
  stage.style.height = '430px';
  await sleep(120);
  Spike.container.canvas.resize();
  await sleep(120);
  if (runId !== Spike.generation) return null;
  const after = { ...Spike.container.canvas.size };
  const p = stagePoint(.5, .5);
  setMarkerPixels(p.x, p.y);
  const { name } = await Spike.addEmitter(burstEmitter({ count: 30 }), p);
  const visiblePosition = canvasToCss(Spike.container.getEmitter(name).position);
  const centerDelta = Math.hypot(visiblePosition.x - p.x, visiblePosition.y - p.y);
  const peak = await observe(800, runId);
  await sleep(300);
  if (runId !== Spike.generation) return null;
  Spike.sweepEmitters();
  const changed = Math.abs((before.height ?? 0) - (after.height ?? 0)) > 10;
  stage.style.removeProperty('height');
  stage.style.removeProperty('min-height');
  Spike.container.canvas.resize();
  return { pass: changed && centerDelta < 2 && peak > 0, detail: `canvas ${Math.round(before.height ?? 0)} -> ${Math.round(after.height ?? 0)}; center delta ${centerDelta.toFixed(1)}px; peak ${peak}` };
}

const RUNNERS = { oneshot: testOneShot, position: testPosition, moving: testMoving, stress: testStress, image: testImage, composite: testComposite, resize: testResize };

async function runSelected() {
  Spike.stop({ logStop: false });
  const runId = ++Spike.generation;
  Spike.running = true;
  Spike.peakParticles = 0;
  const test = TESTS[Spike.selected];
  setResult('running', 'running');
  log(`RUN ${test.index} ${test.label}`);

  try {
    const result = await RUNNERS[Spike.selected](runId);
    if (!result || runId !== Spike.generation) return;
    Spike.running = false;
    setResult(result.pass ? 'pass' : 'fail', result.pass ? 'PASS' : 'FAIL');
    log(`${result.pass ? 'PASS' : 'FAIL'} ${test.index}: ${result.detail}`);
  } catch (error) {
    if (runId !== Spike.generation) return;
    Spike.running = false;
    setResult('fail', 'FAIL');
    log(`FAIL ${test.index}: ${error.message}`);
    console.error(error);
  }
}

function selectTest(id) {
  Spike.selected = id;
  const test = TESTS[id];
  testButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.test === id));
  activeName.textContent = `${test.index} / ${test.label}`;
  activeDescription.textContent = test.description;
  setResult('idle', 'idle');
}

testButtons.forEach((button) => button.addEventListener('click', () => selectTest(button.dataset.test)));
runButton.addEventListener('click', runSelected);
stopButton.addEventListener('click', () => Spike.stop());

let fpsFrames = 0;
let fpsStart = performance.now();
let fpsSmooth = 0;
function metricsLoop(now) {
  fpsFrames += 1;
  const elapsed = now - fpsStart;
  if (elapsed >= 500) {
    const current = fpsFrames * 1000 / elapsed;
    fpsSmooth = fpsSmooth ? fpsSmooth * .55 + current * .45 : current;
    metricFps.textContent = String(Math.round(fpsSmooth));
    fpsFrames = 0;
    fpsStart = now;
  }
  updateMetrics();
  requestAnimationFrame(metricsLoop);
}

(async () => {
  try {
    await Spike.init();
    selectTest('oneshot');
    requestAnimationFrame(metricsLoop);
  } catch (error) {
    setResult('fail', 'INIT FAIL');
    log(`FAIL init: ${error.message}`);
    console.error(error);
  }
})();

window.FXDeckSpike = Spike;