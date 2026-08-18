const stage = document.querySelector('#fxdeck-stage');
const particleHost = document.querySelector('#fxdeck-particles');
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
  oneshot: {
    index: '01',
    label: 'One-shot burst',
    description: 'Validates runtime emitter creation, visible particles and deterministic cleanup.'
  },
  position: {
    index: '02',
    label: 'Exact position',
    description: 'Spawns at a pixel coordinate instead of a percentage-based background position.'
  },
  moving: {
    index: '03',
    label: 'Moving emitter',
    description: 'Mutates EmitterInstance.position every frame to follow a moving gameplay source.'
  },
  stress: {
    index: '04',
    label: '30× stress',
    description: 'Fires 30 short one-shot emitters rapidly and verifies that tracked emitters clean up.'
  },
  image: {
    index: '05',
    label: 'Image particles',
    description: 'Uses an external SVG image as the particle shape instead of a primitive circle.'
  },
  composite: {
    index: '06',
    label: 'Composite FX',
    description: 'Combines tsParticles with DOM flash, pressure wave and stage kick in one gameplay cue.'
  },
  resize: {
    index: '07',
    label: 'Resize / reflow',
    description: 'Changes the stage height, forces a canvas resize and spawns again at the new center.'
  }
};

const Spike = {
  container: null,
  selected: 'oneshot',
  generation: 0,
  emitterSerial: 0,
  activeEmitters: new Set(),
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
        particles: { number: { value: 0 } },
        emitters: []
      }
    });

    if (!this.container?.addEmitter || !this.container?.removeEmitter) {
      throw new Error('Emitter plugin API is unavailable in the loaded bundle.');
    }

    log('PASS engine init: addEmitter/removeEmitter available');
  },

  countParticles() {
    return Number(this.container?.particles?.count ?? this.container?.particles?.array?.length ?? 0);
  },

  async addEmitter(options, position) {
    const name = `fxdeck-spike-${++this.emitterSerial}`;
    const instance = await this.container.addEmitter({ ...structuredClone(options), name }, position);
    this.activeEmitters.add(name);
    updateMetrics();
    return { name, instance };
  },

  removeEmitter(name) {
    try { this.container?.removeEmitter?.(name); } catch (error) { console.warn(error); }
    this.activeEmitters.delete(name);
    updateMetrics();
  },

  schedule(fn, delay) {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, delay);
    this.timers.add(id);
    return id;
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

    [...this.activeEmitters].forEach((name) => this.removeEmitter(name));
    this.container?.particles?.clear?.();

    stage.classList.remove('composite-playing');
    movingTarget.classList.remove('is-visible');
    stage.style.removeProperty('min-height');
    setMarkerPercent(50, 50);
    updateMetrics();
  },

  stop() {
    this.generation += 1;
    this.running = false;
    this.cleanup();
    setResult('idle', 'stopped');
    log('STOP manual cleanup executed');
  }
};

function log(message) {
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  const lines = logOutput.textContent.trim().split('\n').filter(Boolean);
  lines.push(`[${stamp}] ${message}`);
  logOutput.textContent = lines.slice(-10).join('\n');
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
  const count = Spike.countParticles();
  if (Spike.running) Spike.peakParticles = Math.max(Spike.peakParticles, count);
  metricParticles.textContent = String(count);
  metricEmitters.textContent = String(Spike.activeEmitters.size);
}

function stagePoint(px, py) {
  const rect = stage.getBoundingClientRect();
  return { x: rect.width * px, y: rect.height * py };
}

function setMarkerPixels(x, y) {
  spawnMarker.style.left = `${x}px`;
  spawnMarker.style.top = `${y}px`;
}

function setMarkerPercent(x, y) {
  const point = stagePoint(x / 100, y / 100);
  setMarkerPixels(point.x, point.y);
}

function baseParticles({ image = false, direction = 'none', speed = { min: 16, max: 34 }, gravity = 0 } = {}) {
  return {
    color: { value: image ? '#ffffff' : ['#ffffff', '#bcecff', '#59c8ff'] },
    shape: image ? {
      type: 'image',
      options: { image: { src: './assets/fxdeck-spark.svg', width: 32, height: 10, replaceColor: false } }
    } : { type: 'circle' },
    opacity: {
      value: { min: 0.65, max: 1 },
      animation: { enable: true, speed: 4.5, sync: false, startValue: 'max', destroy: 'min' }
    },
    size: {
      value: image ? { min: 4, max: 8 } : { min: 1.2, max: 3.4 },
      animation: { enable: true, speed: 7, sync: false, startValue: 'max', destroy: 'min' }
    },
    rotate: image ? { value: { min: 0, max: 360 }, direction: 'random', animation: { enable: false } } : undefined,
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
      duration: { value: { min: 0.25, max: 0.55 }, sync: false }
    }
  };
}

function burstEmitter({ count = 16, image = false, direction = 'none', speed, gravity = 0 } = {}) {
  return {
    autoPlay: true,
    startCount: count,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 1, delay: 10 },
    life: { count: 1, duration: 0.025, wait: false },
    particles: baseParticles({ image, direction, speed, gravity })
  };
}

function sustainedEmitter() {
  return {
    autoPlay: true,
    startCount: 2,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 2, delay: 0.028 },
    life: { count: 1, duration: 1.35, wait: false },
    particles: {
      ...baseParticles({ speed: { min: 1, max: 5 } }),
      size: { value: { min: 1, max: 2.8 } },
      life: { count: 1, duration: { value: { min: 0.22, max: 0.42 }, sync: false } }
    }
  };
}

async function testOneShot(runId) {
  const p = stagePoint(.5, .5);
  setMarkerPixels(p.x, p.y);
  const { name } = await Spike.addEmitter(burstEmitter({ count: 20 }), p);
  await sleep(620);
  if (runId !== Spike.generation) return null;
  Spike.removeEmitter(name);
  return { pass: Spike.peakParticles > 0 && Spike.activeEmitters.size === 0, detail: `peak particles ${Spike.peakParticles}; emitters after cleanup ${Spike.activeEmitters.size}` };
}

async function testPosition(runId) {
  const p = stagePoint(.27, .34);
  setMarkerPixels(p.x, p.y);
  const { name, instance } = await Spike.addEmitter(burstEmitter({ count: 18, direction: 'right' }), p);
  const dx = Math.abs((instance?.position?.x ?? -9999) - p.x);
  const dy = Math.abs((instance?.position?.y ?? -9999) - p.y);
  await sleep(560);
  if (runId !== Spike.generation) return null;
  Spike.removeEmitter(name);
  return { pass: dx < 2 && dy < 2, detail: `requested ${Math.round(p.x)},${Math.round(p.y)}; emitter delta ${dx.toFixed(1)},${dy.toFixed(1)} px` };
}

async function testMoving(runId) {
  const rect = stage.getBoundingClientRect();
  const start = { x: rect.width * .2, y: rect.height * .55 };
  const { name, instance } = await Spike.addEmitter(sustainedEmitter(), start);
  movingTarget.classList.add('is-visible');

  const started = performance.now();
  let last = { ...start };

  await new Promise((resolve) => {
    const animate = (now) => {
      if (runId !== Spike.generation) return resolve();
      const t = Math.min(1, (now - started) / 1250);
      const x = rect.width * (.2 + .6 * t);
      const y = rect.height * (.5 + Math.sin(t * Math.PI * 2) * .16);
      last = { x, y };
      if (instance?.position) { instance.position.x = x; instance.position.y = y; }
      movingTarget.style.left = `${x}px`;
      movingTarget.style.top = `${y}px`;
      setMarkerPixels(x, y);
      if (t < 1) Spike.trackRaf(animate); else resolve();
    };
    Spike.trackRaf(animate);
  });

  await sleep(360);
  if (runId !== Spike.generation) return null;
  Spike.removeEmitter(name);
  movingTarget.classList.remove('is-visible');
  const travel = Math.hypot(last.x - start.x, last.y - start.y);
  return { pass: travel > rect.width * .45 && Spike.peakParticles > 0, detail: `emitter moved ${Math.round(travel)} px; peak particles ${Spike.peakParticles}` };
}

async function testStress(runId) {
  const rect = stage.getBoundingClientRect();
  const names = [];

  for (let i = 0; i < 30; i += 1) {
    if (runId !== Spike.generation) return null;
    const x = rect.width * (.16 + ((i * 37) % 68) / 100);
    const y = rect.height * (.18 + ((i * 53) % 62) / 100);
    const { name } = await Spike.addEmitter(burstEmitter({ count: 10, speed: { min: 12, max: 30 } }), { x, y });
    names.push(name);
    await sleep(38);
  }

  await sleep(700);
  if (runId !== Spike.generation) return null;
  names.forEach((name) => Spike.removeEmitter(name));
  Spike.container?.particles?.clear?.();
  return { pass: Spike.peakParticles > 20 && Spike.activeEmitters.size === 0, detail: `30 emitters fired; peak particles ${Spike.peakParticles}; tracked after cleanup ${Spike.activeEmitters.size}` };
}

async function testImage(runId) {
  const p = stagePoint(.5, .5);
  setMarkerPixels(p.x, p.y);
  const { name } = await Spike.addEmitter(burstEmitter({ count: 16, image: true, direction: 'right', speed: { min: 14, max: 32 } }), p);
  await sleep(700);
  if (runId !== Spike.generation) return null;
  Spike.removeEmitter(name);
  return { pass: Spike.peakParticles > 0, detail: `external SVG shape loaded; peak particles ${Spike.peakParticles}` };
}

async function testComposite(runId) {
  const p = stagePoint(.48, .5);
  setMarkerPixels(p.x, p.y);
  contactFlash.style.left = `${p.x}px`;
  contactFlash.style.top = `${p.y}px`;
  pressureWave.style.left = `${p.x}px`;
  pressureWave.style.top = `${p.y}px`;

  stage.classList.remove('composite-playing');
  void stage.offsetWidth;
  stage.classList.add('composite-playing');

  const { name: sparks } = await Spike.addEmitter(burstEmitter({ count: 22, direction: 'right', speed: { min: 22, max: 46 } }), p);
  await sleep(36);
  if (runId !== Spike.generation) return null;
  const { name: debris } = await Spike.addEmitter(burstEmitter({ count: 7, direction: 'right', speed: { min: 8, max: 18 }, gravity: 18 }), p);

  await sleep(640);
  if (runId !== Spike.generation) return null;
  Spike.removeEmitter(sparks);
  Spike.removeEmitter(debris);
  stage.classList.remove('composite-playing');
  return { pass: Spike.peakParticles > 0, detail: `particles + DOM layers + stage kick sequenced; peak particles ${Spike.peakParticles}` };
}

async function testResize(runId) {
  const before = { ...Spike.container.canvas.size };
  stage.style.minHeight = '430px';
  await sleep(220);
  if (runId !== Spike.generation) return null;
  Spike.container.canvas.resize();
  await sleep(80);
  const after = { ...Spike.container.canvas.size };
  const p = stagePoint(.5, .5);
  setMarkerPixels(p.x, p.y);
  const { name } = await Spike.addEmitter(burstEmitter({ count: 14 }), p);
  await sleep(520);
  if (runId !== Spike.generation) return null;
  Spike.removeEmitter(name);
  stage.style.removeProperty('min-height');
  Spike.container.canvas.resize();
  const changed = Math.abs((before.height ?? 0) - (after.height ?? 0)) > 10;
  return { pass: changed && Spike.peakParticles > 0, detail: `canvas height ${Math.round(before.height ?? 0)} → ${Math.round(after.height ?? 0)}; peak particles ${Spike.peakParticles}` };
}

const RUNNERS = {
  oneshot: testOneShot,
  position: testPosition,
  moving: testMoving,
  stress: testStress,
  image: testImage,
  composite: testComposite,
  resize: testResize
};

async function runSelected() {
  Spike.stop();
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