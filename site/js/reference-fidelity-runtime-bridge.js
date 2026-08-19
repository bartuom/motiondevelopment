const BUILD = 'P3.14.1';

const effectInput = document.querySelector('#effect-select');
const stage = document.querySelector('#impact-stage');
const kickLayer = document.querySelector('#impact-kick-layer');
const runtimeHud = document.querySelector('#runtime-hud');
const playButton = document.querySelector('#play-impact');
const stopButton = document.querySelector('#stop-all');
const particlePathInput = document.querySelector('#particle-path');
const intensityInput = document.querySelector('#intensity');
const directionInput = document.querySelector('#direction');
const logOutput = document.querySelector('#p2-log');
const apiPreview = document.querySelector('#api-preview');

const REFERENCES = {
  refParticlrExplosion: {
    frame: 'particlr-explosion',
    title: 'SOURCE — Particlr Explosion exact',
    note: 'Exact public .prt fixture from the 0.5.2 release, rendered by matching @particlr/runtime 0.5.2 + PixiJS. Click inside preview to replay at that point.',
    caption: 'Particlr Explosion / exact source',
    captionNote: '0.5.2 fixture → matching runtime → zero FXDeck reinterpretation',
    summary: 'Calibration reference. This is the exact public Particlr Explosion .prt fixture from the published 0.5.2 release played through @particlr/runtime 0.5.2, not an FXDeck recreation and not a claim that it is the separate editor preset.',
    playLabel: 'Replay exact Particlr Explosion',
    layers: [
      ['Flash', 'circle-soft / add / 0.15 s / size 140'],
      ['Fireball', '24 / circle-soft / add / 0.4–0.7 s'],
      ['Fireball motion', '60–160 speed / gravity 40 / drag 2.5'],
      ['Smoke', '20/sec after 0.05 s / normal / 0.8–1.4 s'],
      ['Source', 'brac/particlr-runtime 0.5.2 explosion.prt / seed 1337']
    ],
    timeline: [
      ['0 ms', 'Exact fixture flash + 24-particle fireball burst'],
      ['50 ms', 'Exact smoke emission begins'],
      ['400–700 ms', 'Fireball particles complete'],
      ['800–1400 ms', 'Smoke particles complete'],
      ['1200 ms', 'Fixture loop boundary']
    ]
  },
  refRibbonsExact: {
    frame: 'tsparticles-ribbons',
    title: 'SOURCE — tsParticles Ribbons exact',
    note: 'Official @tsparticles/ribbons 4.3.2 recipe. Click or Play to emit another exact ribbon set.',
    caption: 'tsParticles Ribbons / exact source',
    captionNote: 'official bundle recipe — no Magic Burst adaptation',
    summary: 'Calibration reference. Official tsParticles Ribbons bundle behavior with the harvested source defaults, isolated from FXDeck so the source look can be judged before adaptation.',
    playLabel: 'Emit exact Ribbons',
    layers: [
      ['Ribbons', '5 source ribbons'],
      ['Trail', '60 points / particleDist 8'],
      ['Motion', 'drag .02 / velocity inherit 4–6'],
      ['Oscillation', 'distance 100–140 / speed 3–5'],
      ['Source', '@tsparticles/ribbons 4.3.2']
    ],
    timeline: [
      ['0 ms', '5 ribbons emitted from full-width top emitter'],
      ['live', 'Official ribbon drawer updates 60-point trails'],
      ['live', 'Oscillation + drag + inherited velocity drive shape'],
      ['exit', 'Ribbons destroy after leaving canvas']
    ]
  },
  refFireworksExact: {
    frame: 'tsparticles-fireworks',
    title: 'SOURCE — tsParticles Fireworks exact',
    note: 'Official @tsparticles/fireworks 4.3.2 with the harvested Playground settings. Play restarts the source demo.',
    caption: 'tsParticles Fireworks / Playground source',
    captionNote: 'launch → split → additive decay, without FXDeck adaptation',
    summary: 'Calibration reference. Official tsParticles Fireworks bundle using the Playground settings harvested for FXDeck: source launch, split, additive blending and decay are preserved.',
    playLabel: 'Restart exact Fireworks',
    layers: [
      ['Launch', 'bottom emitter → upward rocket'],
      ['Rocket', 'line shape / path rotation / inverse gravity'],
      ['Split', '100 secondary particles'],
      ['Render', 'lighter blend / fading fragments'],
      ['Source', '@tsparticles/fireworks 4.3.2 Playground config']
    ],
    timeline: [
      ['launch', 'Rocket rises from bottom emitter'],
      ['height gate', 'Rocket reaches randomized minimum height'],
      ['split', 'Destroy mode splits into 100 fragments'],
      ['0.5–1.0 s', 'Secondary fragment life + decay']
    ]
  }
};

let frame = null;
let activeReference = null;
let frameReady = false;
let previousHudDisplay = '';
let previousKickOpacity = '';
let previousKickPointerEvents = '';

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

function isReferenceValue(value = effectInput?.value) {
  return Boolean(REFERENCES[value]);
}

function addReferenceOptions() {
  if (!effectInput || effectInput.querySelector('optgroup[data-reference-fidelity]')) return;
  const group = document.createElement('optgroup');
  group.label = 'P3.14 — SOURCE FIDELITY';
  group.dataset.referenceFidelity = 'true';

  const options = [
    ['refParticlrExplosion', 'SOURCE — Particlr Explosion exact'],
    ['refRibbonsExact', 'SOURCE — tsParticles Ribbons exact'],
    ['refFireworksExact', 'SOURCE — tsParticles Fireworks exact']
  ];

  for (const [value, label] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    group.appendChild(option);
  }

  effectInput.appendChild(group);
}

function setTimeline(rows) {
  const timeline = document.querySelector('#effect-timeline');
  if (!timeline) return;
  timeline.replaceChildren(...rows.map(([time, label]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = time;
    dd.textContent = label;
    row.append(dt, dd);
    return row;
  }));
}

function updateReferenceUi(key) {
  const ref = REFERENCES[key];
  if (!ref) return;

  setText('#authored-version-label', 'SOURCE — exact');
  setText('#preview-title', ref.title);
  setText('#preview-note', frameReady ? ref.note : 'Loading exact source runtime…');
  setText('#caption-title', ref.caption);
  setText('#caption-note', ref.captionNote);
  setText('#effect-summary', ref.summary);
  setText('#resolved-effect', `${ref.frame} / SOURCE`);
  setText('#resolved-path', 'isolated source runtime');
  setText('#resolved-intensity', 'source-authored');
  setText('#resolved-direction', 'source-authored');
  setText('#resolved-screen-kick', 'none');
  setText('#resolved-position', key === 'refParticlrExplosion' ? 'center / click-to-reposition' : 'source-authored emitter');

  ref.layers.forEach(([label, value], index) => {
    const suffix = ['a', 'b', 'c', 'd', 'e'][index];
    setText(`#resolved-layer-${suffix}-label`, label);
    setText(`#resolved-layer-${suffix}`, value);
  });
  setTimeline(ref.timeline);

  if (playButton) {
    playButton.disabled = !frameReady;
    playButton.textContent = frameReady ? ref.playLabel : 'Loading source reference…';
  }

  if (apiPreview) {
    apiPreview.textContent = `// P3.14 calibration reference — not an FXDeck production cue\nSOURCE.play("${ref.frame}");`;
  }
}

function createFrame(key) {
  const ref = REFERENCES[key];
  if (!ref || !stage) return;

  frame?.remove();
  frameReady = false;

  frame = document.createElement('iframe');
  frame.id = 'reference-fidelity-frame';
  frame.title = ref.title;
  frame.src = `./reference-fidelity-frame.html?ref=${encodeURIComponent(ref.frame)}&v=p3.14.1`;
  frame.setAttribute('aria-label', ref.title);
  Object.assign(frame.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    border: '0',
    zIndex: '4',
    background: '#0a1026'
  });
  stage.appendChild(frame);
  updateReferenceUi(key);
}

function enterReferenceMode(key) {
  const ref = REFERENCES[key];
  if (!ref) return;

  activeReference = key;
  globalThis.FXDeck?.stopAll?.('p3.14-source-reference');

  if (kickLayer) {
    previousKickOpacity = kickLayer.style.opacity;
    previousKickPointerEvents = kickLayer.style.pointerEvents;
    kickLayer.style.opacity = '0';
    kickLayer.style.pointerEvents = 'none';
  }
  if (runtimeHud) {
    previousHudDisplay = runtimeHud.style.display;
    runtimeHud.style.display = 'none';
  }

  createFrame(key);
  appendLog(`${BUILD} SOURCE FIDELITY → ${ref.title}`);
}

function leaveReferenceMode() {
  if (!activeReference) return;
  frame?.remove();
  frame = null;
  frameReady = false;
  activeReference = null;

  if (kickLayer) {
    kickLayer.style.opacity = previousKickOpacity;
    kickLayer.style.pointerEvents = previousKickPointerEvents;
  }
  if (runtimeHud) runtimeHud.style.display = previousHudDisplay;
  if (playButton) playButton.disabled = false;
}

function postToFrame(type, extra = {}) {
  if (!frame?.contentWindow || !activeReference) return;
  frame.contentWindow.postMessage({ type, ...extra }, location.origin);
}

addReferenceOptions();

effectInput?.addEventListener('change', (event) => {
  const value = effectInput.value;
  if (!isReferenceValue(value)) {
    leaveReferenceMode();
    return;
  }

  event.stopImmediatePropagation();
  enterReferenceMode(value);
}, true);

playButton?.addEventListener('click', (event) => {
  if (!activeReference) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  postToFrame('fxdeck-reference-play');
  appendLog(`${BUILD} SOURCE PLAY → ${REFERENCES[activeReference].frame}`);
}, true);

stopButton?.addEventListener('click', (event) => {
  if (!activeReference) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  postToFrame('fxdeck-reference-stop');
  appendLog(`${BUILD} SOURCE STOP → ${REFERENCES[activeReference].frame}`);
}, true);

window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || !activeReference) return;
  const data = event.data;
  if (!data || data.build !== BUILD) return;

  if (data.type === 'fxdeck-reference-ready') {
    frameReady = true;
    updateReferenceUi(activeReference);
    appendLog(`PASS ${BUILD} SOURCE READY: ${data.label} / ${data.engine} / ${data.fidelity}`);
  } else if (data.type === 'fxdeck-reference-error') {
    frameReady = false;
    updateReferenceUi(activeReference);
    setText('#preview-note', `SOURCE FAIL: ${data.error}`);
    appendLog(`FAIL ${BUILD} SOURCE: ${data.referenceId} — ${data.error}`);
  }
});

globalThis.FXDeckReferenceFidelity = {
  build: BUILD,
  references: Object.keys(REFERENCES),
  select(key) {
    if (!REFERENCES[key] || !effectInput) return false;
    effectInput.value = key;
    effectInput.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
};

appendLog(`${BUILD} Reference Fidelity bridge ready: exact Particlr 0.5.2 Explosion fixture + exact tsParticles Ribbons + exact tsParticles Fireworks`);
