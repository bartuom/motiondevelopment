const BUILD = 'P3.7.2';

const primary = {
  effect: document.querySelector('#effect-select'),
  path: document.querySelector('#particle-path'),
  intensity: document.querySelector('#intensity'),
  direction: document.querySelector('#direction')
};

const logOutput = document.querySelector('#p2-log');
let syncing = false;

function appendLog(message) {
  if (!logOutput) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function waitForGrid(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const poll = () => {
      const panel = document.querySelector('#effect-grid-tool');
      const grid = globalThis.FXDeckEffectGrid;
      if (panel && grid) return resolve({ panel, grid });
      if (performance.now() - startedAt > timeoutMs) return reject(new Error('Effect Grid controls were not ready.'));
      window.setTimeout(poll, 20);
    };
    poll();
  });
}

function addStylesheet() {
  if (document.querySelector('link[data-effect-grid-runtime-controls]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './effect-grid-runtime-controls.css?v=p3.7.2';
  link.dataset.effectGridRuntimeControls = 'true';
  document.head.appendChild(link);
}

function cloneOptions(source, target) {
  target.replaceChildren(...[...source.options].map((option) => {
    const clone = document.createElement('option');
    clone.value = option.value;
    clone.textContent = option.textContent;
    return clone;
  }));
}

function dispatch(element, type) {
  element.dispatchEvent(new Event(type, { bubbles: true }));
}

function pathDescription(effectId, path) {
  const topology = path === 'scheduled'
    ? 'Shared scheduled: Emission Points share one particle system and particle creation is frame-budgeted.'
    : path === 'shared'
      ? 'Shared direct: Emission Points share one particle system, but particles are created immediately.'
      : 'Per-play emitter: each semantic burst creates its own tsParticles emitter instance.';

  if (effectId === 'fireball') {
    return `${topology} Fireball hero heads stay independent DOM visuals; topology applies to ember bursts and the Explosion handoff.`;
  }
  return `${topology} The selected topology drives the particle layers of this real effect.`;
}

function install({ panel, grid }) {
  addStylesheet();

  const badge = panel.querySelector('.effect-grid-tool__badge');
  if (badge) badge.textContent = BUILD;

  const oldSetup = panel.querySelector('#effect-grid-runtime-setup');
  oldSetup?.remove();

  const setup = document.createElement('section');
  setup.id = 'effect-grid-runtime-setup';
  setup.className = 'effect-grid-runtime-setup';
  setup.innerHTML = `
    <div class="effect-grid-runtime-setup__head">
      <div><p class="label">Test setup</p><strong>Effect + spawn topology</strong></div>
      <span>synced with Play</span>
    </div>
    <div class="control">
      <p class="label">Effect under test</p>
      <select id="effect-grid-effect"></select>
    </div>
    <div class="control">
      <p class="label">Particle spawn topology</p>
      <select id="effect-grid-path">
        <option value="scheduled">Shared scheduled — Emission Points + scheduler</option>
        <option value="shared">Shared direct — Emission Points immediate</option>
        <option value="emitter">Per-play emitter — emitter per burst</option>
      </select>
      <p id="effect-grid-path-note" class="control-note"></p>
    </div>
    <div class="effect-grid-runtime-setup__ranges">
      <div class="control effect-grid-tool__range">
        <span>Intensity</span><strong id="effect-grid-intensity-value" class="effect-grid-tool__value">1.0</strong>
        <input id="effect-grid-intensity" type="range" min="0.5" max="2" value="1" step="0.1">
      </div>
      <div class="control effect-grid-tool__range">
        <span>Base direction</span><strong id="effect-grid-base-direction-value" class="effect-grid-tool__value">0°</strong>
        <input id="effect-grid-base-direction" type="range" min="0" max="359" value="0" step="1">
      </div>
    </div>
  `;

  const head = panel.querySelector('.effect-grid-tool__head');
  head?.insertAdjacentElement('afterend', setup);

  const controls = {
    effect: setup.querySelector('#effect-grid-effect'),
    path: setup.querySelector('#effect-grid-path'),
    pathNote: setup.querySelector('#effect-grid-path-note'),
    intensity: setup.querySelector('#effect-grid-intensity'),
    intensityValue: setup.querySelector('#effect-grid-intensity-value'),
    direction: setup.querySelector('#effect-grid-base-direction'),
    directionValue: setup.querySelector('#effect-grid-base-direction-value')
  };

  cloneOptions(primary.effect, controls.effect);

  function syncFromPrimary() {
    if (syncing) return;
    syncing = true;
    controls.effect.value = primary.effect.value;
    controls.path.value = primary.path.value;
    controls.intensity.value = primary.intensity.value;
    controls.intensityValue.textContent = Number(primary.intensity.value).toFixed(1);
    controls.direction.value = primary.direction.value;
    controls.directionValue.textContent = `${primary.direction.value}°`;
    controls.pathNote.textContent = pathDescription(primary.effect.value, primary.path.value);
    syncing = false;
  }

  function setPrimary(element, value, eventType = 'change') {
    if (syncing) return;
    syncing = true;
    if (element.value !== value) element.value = value;
    syncing = false;
    dispatch(element, eventType);
  }

  controls.effect.addEventListener('change', () => {
    setPrimary(primary.effect, controls.effect.value, 'change');
    syncFromPrimary();
  });

  controls.path.addEventListener('change', () => {
    const wasActive = grid.isActive();
    setPrimary(primary.path, controls.path.value, 'change');
    syncFromPrimary();
    if (wasActive) window.setTimeout(() => grid.spawn(), 0);
    appendLog(`${BUILD} GRID TOPOLOGY → ${controls.path.options[controls.path.selectedIndex]?.textContent ?? controls.path.value}`);
  });

  controls.intensity.addEventListener('input', () => {
    controls.intensityValue.textContent = Number(controls.intensity.value).toFixed(1);
    setPrimary(primary.intensity, controls.intensity.value, 'input');
  });
  controls.intensity.addEventListener('change', () => {
    setPrimary(primary.intensity, controls.intensity.value, 'change');
    syncFromPrimary();
  });

  controls.direction.addEventListener('input', () => {
    controls.directionValue.textContent = `${controls.direction.value}°`;
    setPrimary(primary.direction, controls.direction.value, 'input');
  });
  controls.direction.addEventListener('change', () => {
    setPrimary(primary.direction, controls.direction.value, 'change');
    syncFromPrimary();
  });

  for (const element of Object.values(primary)) {
    element?.addEventListener('change', syncFromPrimary);
    element?.addEventListener('input', syncFromPrimary);
  }

  const callout = document.querySelector('.controls-pane [data-workspace-panel="debug"] > .debug-callout');
  if (callout) {
    const strong = callout.querySelector('strong');
    const span = callout.querySelector('span');
    if (strong) strong.textContent = 'Debug owns the current test setup';
    if (span) span.textContent = 'Effect, topology, intensity and base direction can be changed here. Controls remain synchronized with Play.';
  }

  const readout = panel.querySelector('#effect-grid-readout');
  const readoutObserver = new MutationObserver(() => {
    if (!readout || readout.dataset.topologyDecorating === '1') return;
    const topology = controls.path.value === 'scheduled' ? 'scheduled EP' : controls.path.value === 'shared' ? 'direct EP' : 'per-burst emitter';
    if (!readout.textContent.includes(`• ${topology} •`)) {
      readout.dataset.topologyDecorating = '1';
      const parts = readout.textContent.split(' • ');
      if (parts.length >= 2) parts.splice(1, 0, topology);
      readout.textContent = parts.join(' • ');
      readout.dataset.topologyDecorating = '0';
    }
  });
  if (readout) readoutObserver.observe(readout, { childList: true, characterData: true, subtree: true });

  syncFromPrimary();
  if (readout) {
    const topology = controls.path.value === 'scheduled' ? 'scheduled EP' : controls.path.value === 'shared' ? 'direct EP' : 'per-burst emitter';
    const parts = readout.textContent.split(' • ');
    if (parts.length >= 2) parts.splice(1, 0, topology);
    readout.textContent = parts.join(' • ');
  }

  appendLog(`${BUILD} Grid test setup ready: effect + shared-scheduled/shared-direct/per-play-emitter topology + intensity + base direction, synced with Play`);
}

waitForGrid()
  .then(install)
  .catch((error) => {
    appendLog(`${BUILD} Grid runtime controls FAIL: ${error.message}`);
    console.error(error);
  });