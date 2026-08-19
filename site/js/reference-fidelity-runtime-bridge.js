const BUILD = 'P3.15.0';

const effectInput = document.querySelector('#effect-select');
const stage = document.querySelector('#impact-stage');
const playButton = document.querySelector('#play-impact');
const stopButton = document.querySelector('#stop-all');
const particlePathInput = document.querySelector('#particle-path');
const intensityInput = document.querySelector('#intensity');
const directionInput = document.querySelector('#direction');
const logOutput = document.querySelector('#p2-log');
const apiPreview = document.querySelector('#api-preview');

const REF_RIBBONS = 'refRibbonsNative';
const REF_FIREWORKS = 'refFireworksNative';
const REFERENCE_VALUES = new Set([REF_RIBBONS, REF_FIREWORKS]);
const DIRECT_EMITTERS = ['fxdeck-ref-ribbons', 'fxdeck-ref-fireworks'];

let activeReference = null;
let runtimeReady = false;

function appendLog(message) {
  if (!logOutput) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function waitForLab(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const poll = () => {
      const lab = globalThis.FXDeckLab;
      if (lab?.particleAdapter?.container) return resolve(lab);
      if (performance.now() - started > timeoutMs) return reject(new Error('FXDeckLab particle adapter was not ready.'));
      setTimeout(poll, 25);
    };
    poll();
  });
}

function addReferenceOptions() {
  if (!effectInput || effectInput.querySelector('optgroup[data-native-reference]')) return;
  const old = effectInput.querySelector('optgroup[data-reference-fidelity]');
  old?.remove();

  const group = document.createElement('optgroup');
  group.label = 'REFERENCE RECIPES — SAME FXDECK CANVAS';
  group.dataset.nativeReference = 'true';

  for (const [value, label] of [
    [REF_RIBBONS, 'REF — tsParticles Ribbons / FXDeck canvas'],
    [REF_FIREWORKS, 'REF — tsParticles Fireworks / FXDeck canvas']
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    group.appendChild(option);
  }

  effectInput.appendChild(group);
}

function clearNativeReference() {
  const lab = globalThis.FXDeckLab;
  const container = lab?.particleAdapter?.container;
  lab?.fx?.stopAll?.('native-reference-reset');
  for (const name of DIRECT_EMITTERS) {
    try { container?.removeEmitter?.(name); } catch {}
  }
  lab?.particleAdapter?.clear?.();
}

function ribbonsEmitter() {
  return {
    name: 'fxdeck-ref-ribbons',
    startCount: 5,
    position: { x: 50, y: 0 },
    shape: { type: 'square' },
    size: { width: 100, height: 0 },
    rate: { delay: 0, quantity: 0 },
    life: { duration: 0.1, count: 1 },
    particles: {
      paint: {
        fill: {
          color: { value: ['#FF0055', '#00D1FF', '#FFD23F', '#61FF7E', '#B284FF'] },
          enable: true
        }
      },
      shape: {
        type: 'ribbon',
        options: {
          ribbon: {
            angle: 45,
            darken: { enable: true, value: 30 },
            count: 60,
            drag: 0.02,
            mass: 1,
            oscillationDistance: { min: 100, max: 140 },
            oscillationSpeed: { min: 3, max: 5 },
            particleDist: 8,
            velocityInherit: { min: 4, max: 6 }
          }
        }
      },
      links: { enable: false },
      life: { count: 1 },
      size: { value: 8 },
      move: {
        direction: 'bottom',
        enable: true,
        outModes: { top: 'none', default: 'destroy' },
        speed: { min: 4, max: 6 }
      },
      roll: { enable: false },
      rotate: { value: 0, move: false, animation: { enable: false } },
      tilt: { enable: false },
      wobble: { enable: false }
    }
  };
}

function fireworksEmitter() {
  return {
    name: 'fxdeck-ref-fireworks',
    direction: 'top',
    life: { count: 0, duration: 0.1, delay: 0.1 },
    rate: { delay: { min: 0.25, max: 0.5 }, quantity: 1 },
    size: { width: 100, height: 0 },
    position: { x: 50, y: 100 },
    particles: {
      blend: { enable: true, mode: 'lighter' },
      number: { value: 0 },
      paint: {
        fill: { enable: false },
        stroke: {
          color: { value: ['#ffffff', '#ffd166', '#72ddf7', '#f15bb5'] },
          width: 2
        }
      },
      destroy: {
        mode: 'split',
        bounds: { top: { min: 10, max: 30 } },
        split: {
          count: 1,
          factor: { value: 0.333333 },
          rate: { value: 100 },
          strokeColorOffset: {
            s: { min: -30, max: 30 },
            l: { min: -30, max: 30 }
          },
          particles: {
            group: 'split',
            blend: { enable: true, mode: 'lighter' },
            number: { value: 0 },
            opacity: {
              value: { min: 0.1, max: 1 },
              animation: {
                enable: true,
                speed: { min: 2, max: 4 },
                sync: true,
                startValue: 'max',
                destroy: 'min',
                count: 1
              }
            },
            size: { value: { min: 5, max: 10 } },
            life: { count: 1, duration: { value: { min: 0.5, max: 1 } } },
            move: {
              decay: 0.05,
              enable: true,
              gravity: { enable: false },
              speed: { min: 10, max: 25 },
              direction: 'outside',
              outModes: 'destroy'
            }
          }
        }
      },
      life: { count: 1 },
      shape: { type: 'line', options: { line: { cap: 'round' } } },
      size: { value: { min: 10, max: 20 } },
      rotate: { path: true },
      move: {
        enable: true,
        gravity: { acceleration: 30, enable: true, inverse: true, maxSpeed: 150 },
        speed: { min: 10, max: 25 },
        outModes: { default: 'destroy', top: 'none' }
      }
    }
  };
}

async function playNativeReference(reference = activeReference) {
  const lab = globalThis.FXDeckLab;
  const container = lab?.particleAdapter?.container;
  if (!container) throw new Error('FXDeck tsParticles container unavailable.');

  clearNativeReference();

  if (reference === REF_RIBBONS) {
    await container.addEmitter(ribbonsEmitter());
    appendLog(`${BUILD} NATIVE REF PLAY: official Ribbons recipe → existing FXDeck tsParticles container`);
    return;
  }

  if (reference === REF_FIREWORKS) {
    await container.addEmitter(fireworksEmitter());
    appendLog(`${BUILD} NATIVE REF PLAY: Fireworks recipe → existing FXDeck tsParticles container / transparent stage`);
  }
}

function updateReferenceUi(reference) {
  const ribbons = reference === REF_RIBBONS;
  const title = ribbons ? 'REF — tsParticles Ribbons / native FXDeck canvas' : 'REF — tsParticles Fireworks / native FXDeck canvas';
  const summary = ribbons
    ? 'Official Ribbons emitter/particle recipe injected directly into FXDeck’s existing persistent tsParticles container. No iframe, no second particle engine, no external runtime boot.'
    : 'Official Fireworks launch/split particle recipe injected directly into FXDeck’s existing persistent tsParticles container. The standalone demo background is intentionally removed; FXDeck keeps its own transparent gameplay stage.';

  setText('#authored-version-label', 'reference recipe / native backend');
  setText('#preview-title', title);
  setText('#preview-note', 'Same FXDeck stage + same tsParticles container; Play restarts the reference recipe');
  setText('#caption-title', ribbons ? 'tsParticles Ribbons / FXDeck backend' : 'tsParticles Fireworks / FXDeck backend');
  setText('#caption-note', ribbons ? 'official emitter recipe → existing container' : 'launch → split → additive decay → existing container');
  setText('#effect-summary', summary);
  setText('#resolved-effect', ribbons ? 'Ribbons reference recipe' : 'Fireworks reference recipe');
  setText('#resolved-path', 'existing TsParticlesAdapter container');
  setText('#resolved-intensity', 'source-authored');
  setText('#resolved-direction', 'source-authored');
  setText('#resolved-screen-kick', 'none');
  setText('#resolved-position', ribbons ? '100% top emitter' : '100% bottom emitter');

  const rows = ribbons ? [
    ['Ribbons', '5'],
    ['Ribbon points', '60'],
    ['Oscillation', '100–140 / speed 3–5'],
    ['Motion', 'drag .02 / velocity 4–6'],
    ['Runtime', 'FXDeck TsParticlesAdapter container']
  ] : [
    ['Rocket', 'line / inverse gravity'],
    ['Spawn', '2–4 rockets/sec'],
    ['Split', '100 fragments'],
    ['Blend', 'lighter / per-particle'],
    ['Runtime', 'FXDeck TsParticlesAdapter container']
  ];

  rows.forEach(([label, value], index) => {
    const suffix = ['a', 'b', 'c', 'd', 'e'][index];
    setText(`#resolved-layer-${suffix}-label`, label);
    setText(`#resolved-layer-${suffix}`, value);
  });

  const timeline = document.querySelector('#effect-timeline');
  if (timeline) {
    const data = ribbons
      ? [['0 ms', '5 ribbons spawn across top edge'], ['live', 'Ribbon drawer builds 60-point strips'], ['exit', 'Destroy outside canvas']]
      : [['launch', 'Rocket rises from bottom'], ['height', '10–30% top bound triggers split'], ['split', '100 additive fragments'], ['0.5–1 s', 'Fragments decay and fade']];
    timeline.replaceChildren(...data.map(([time, label]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = time;
      dd.textContent = label;
      row.append(dt, dd);
      return row;
    }));
  }

  if (playButton) playButton.textContent = ribbons ? 'Play Ribbons reference' : 'Play Fireworks reference';
  if (apiPreview) apiPreview.textContent = `// Reference recipe on the SAME FXDeck particle backend\nFXDeckLab.particleAdapter.container.addEmitter(/* ${ribbons ? 'Ribbons' : 'Fireworks'} recipe */);`;

  particlePathInput && (particlePathInput.disabled = true);
  intensityInput && (intensityInput.disabled = true);
  directionInput && (directionInput.disabled = true);
}

function leaveReferenceMode() {
  if (!activeReference) return;
  clearNativeReference();
  activeReference = null;
  if (particlePathInput) particlePathInput.disabled = false;
  if (intensityInput) intensityInput.disabled = false;
  if (directionInput) directionInput.disabled = false;
}

addReferenceOptions();

waitForLab()
  .then(() => {
    runtimeReady = true;
    appendLog(`${BUILD} Native reference integration READY: Ribbons + Fireworks share the existing FXDeck tsParticles container`);
  })
  .catch((error) => appendLog(`${BUILD} Native reference integration FAIL: ${error.message}`));

effectInput?.addEventListener('change', (event) => {
  const value = effectInput.value;
  if (!REFERENCE_VALUES.has(value)) {
    leaveReferenceMode();
    return;
  }

  event.stopImmediatePropagation();
  activeReference = value;
  updateReferenceUi(value);
  if (runtimeReady) playNativeReference(value).catch((error) => appendLog(`${BUILD} NATIVE REF FAIL: ${error.message}`));
}, true);

playButton?.addEventListener('click', (event) => {
  if (!activeReference) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  playNativeReference().catch((error) => appendLog(`${BUILD} NATIVE REF FAIL: ${error.message}`));
}, true);

stopButton?.addEventListener('click', (event) => {
  if (!activeReference) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  clearNativeReference();
  appendLog(`${BUILD} NATIVE REF STOP`);
}, true);

stage?.addEventListener('pointerdown', (event) => {
  if (!activeReference) return;
  event.stopImmediatePropagation();
}, true);

globalThis.FXDeckReferenceFidelity = {
  build: BUILD,
  references: [REF_RIBBONS, REF_FIREWORKS],
  select(key) {
    if (!REFERENCE_VALUES.has(key) || !effectInput) return false;
    effectInput.value = key;
    effectInput.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  },
  play: playNativeReference
};
