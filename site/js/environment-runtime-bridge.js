import { installLiveUpdate } from '../fxdeck/core/live-update.js?v=p3.8.0';
import { installSustainedEmitterUpdates } from '../fxdeck/adapters/sustained-emitter-updates.js?v=p3.8.0';
import { registerProductionEffects } from '../fxdeck/effects/catalog.js?v=p3.8.0';

const BUILD = 'P3.8.0';
const effectInput = document.querySelector('#effect-select');
const particlePathInput = document.querySelector('#particle-path');
const intensityInput = document.querySelector('#intensity');
const directionInput = document.querySelector('#direction');
const directionValue = document.querySelector('#direction-value');
const playButton = document.querySelector('#play-impact');
const stopButton = document.querySelector('#stop-all');
const overlapButton = document.querySelector('#play-overlap');
const abButton = document.querySelector('#play-ab');
const stage = document.querySelector('#impact-stage');
const logOutput = document.querySelector('#p2-log');
const apiPreview = document.querySelector('#api-preview');
const pathNote = particlePathInput?.closest('.control')?.querySelector('.control-note');
const directionNote = directionInput?.closest('.control')?.querySelector('.control-note');
const originalPathNote = pathNote?.textContent ?? '';
const originalDirectionNote = directionNote?.textContent ?? '';

let fx = null;
let particleAdapter = null;
let activeEnvironment = null;
let sourcePosition = {
  x: Math.max(1, stage?.clientWidth ?? 1) * .5,
  y: Math.max(1, stage?.clientHeight ?? 1) * .62
};

function appendLog(message) {
  if (!logOutput) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function waitForRuntime(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const poll = () => {
      const lab = globalThis.FXDeckLab;
      if (globalThis.FXDeck && lab?.particleAdapter) return resolve({ fx: globalThis.FXDeck, particleAdapter: lab.particleAdapter });
      if (performance.now() - startedAt > timeoutMs) return reject(new Error('FXDeck runtime was not ready for Environment Emitter.'));
      window.setTimeout(poll, 20);
    };
    poll();
  });
}

function isEnvironmentSelected() {
  return effectInput?.value === 'environmentEmitter';
}

function ensureOption() {
  if (!effectInput || effectInput.querySelector('option[value="environmentEmitter"]')) return;
  const option = document.createElement('option');
  option.value = 'environmentEmitter';
  option.textContent = 'Environment Emitter — sustained live-update proof';
  effectInput.appendChild(option);
}

function setText(selector, text) {
  const node = document.querySelector(selector);
  if (node) node.textContent = text;
}

function setEnvironmentControlMode(enabled) {
  if (particlePathInput) particlePathInput.disabled = enabled;
  if (overlapButton) overlapButton.disabled = enabled;
  if (abButton) abButton.disabled = enabled;

  if (pathNote) {
    pathNote.textContent = enabled
      ? 'Sustained Environment uses one explicit emitter per source. One-shot burst topology does not apply to this archetype.'
      : originalPathNote;
  }

  if (directionNote) {
    directionNote.textContent = enabled
      ? 'Environment direction is applied when the source starts. Position and intensity update live; restart to apply a new flow direction.'
      : originalDirectionNote;
  }

  if (overlapButton) overlapButton.title = enabled ? 'Historical one-shot regression fixture; not applicable to sustained Environment.' : '';
  if (abButton) abButton.title = enabled ? 'One-shot topology A/B is not applicable to sustained Environment.' : '';
}

function setTimeline() {
  const timeline = document.querySelector('#effect-timeline');
  if (!timeline) return;
  const rows = [
    ['0 ms', 'Start sustained emitter'],
    ['LIVE', 'FXDeck.update(position) moves the source'],
    ['LIVE', 'FXDeck.update(intensity) changes emission density'],
    ['UNTIL STOP', 'Emitter continues without EffectInstance recreation'],
    ['STOP', 'FXDeck.stop() owns emitter cleanup']
  ];
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

function updateEnvironmentInspector() {
  if (!isEnvironmentSelected()) return;
  const resolved = activeEnvironment?.resolved;
  const intensity = Number(intensityInput?.value ?? 1);
  const position = resolved?.position ?? sourcePosition;
  const direction = resolved?.directionDegrees ?? Number(directionInput?.value ?? 270);
  const rate = resolved?.rateQuantity ?? Math.max(1, Math.min(5, Math.round(1 + intensity * 1.5)));

  setText('#resolved-effect', 'environmentEmitter/v1/default');
  setText('#resolved-path', 'explicit sustained emitter');
  setText('#resolved-intensity', `${(resolved?.intensity ?? intensity).toFixed(1)}× — live`);
  setText('#resolved-direction', `${Math.round(direction)}° — spawn-time flow`);

  const layers = [
    ['Source', activeEnvironment?.state === 'playing' ? 'running' : 'ready to start'],
    ['Emission rate', `${rate} particles / 120 ms`],
    ['Live position', 'FXDeck.update()'],
    ['Live intensity', 'density / quantity'],
    ['Lifecycle', 'sustained until stop']
  ];
  layers.forEach(([label, value], index) => {
    const key = ['a', 'b', 'c', 'd', 'e'][index];
    setText(`#resolved-layer-${key}-label`, label);
    setText(`#resolved-layer-${key}`, value);
  });

  setText('#resolved-screen-kick', 'off');
  setText('#resolved-position', `${Math.round(position.x)}, ${Math.round(position.y)} CSS px`);
  setText('#metric-burst-path', 'explicit-sustained');

  if (apiPreview) {
    apiPreview.textContent = `const source = FXDeck.play("environmentEmitter", {\n  position: { x: ${Math.round(position.x)}, y: ${Math.round(position.y)} },\n  direction: ${Math.round(Number(directionInput?.value ?? 270))},\n  intensity: ${intensity.toFixed(1)}\n});\n\nFXDeck.update(source, {\n  position: nextPosition,\n  intensity: 1.6\n});\n\nFXDeck.stop(source);`;
  }
}

function setEnvironmentUi() {
  setEnvironmentControlMode(true);
  setText('#authored-version-label', 'v1 — Environment Emitter');
  setText('#preview-title', 'Environment Emitter sustained probe');
  setText('#preview-note', 'Click Preview to move the live source; intensity updates while it is running');
  setText('#caption-title', 'environmentEmitter / v1 / default');
  setText('#caption-note', 'start → live position/intensity update → stop');
  setText('#effect-summary', 'Long-running environment source proving sustained lifetime and live parameter mutation without recreating the owning FXDeck EffectInstance.');
  if (playButton) playButton.textContent = 'Start / Restart source';
  setTimeline();
  updateEnvironmentInspector();
}

function restoreOneShotUi() {
  setEnvironmentControlMode(false);
  if (playButton) playButton.textContent = 'FXDeck.play()';
}

function currentParams(position = sourcePosition) {
  return {
    version: 'v1',
    variant: 'default',
    position: { ...position },
    direction: Number(directionInput?.value ?? 270),
    intensity: Number(intensityInput?.value ?? 1),
    hooks: {}
  };
}

function startEnvironment(position = sourcePosition) {
  if (!fx) return null;
  sourcePosition = { ...position };

  if (activeEnvironment?.state === 'playing') {
    fx.stop(activeEnvironment, 'environment-restart');
  }

  const instance = fx.play('environmentEmitter', currentParams(sourcePosition));
  activeEnvironment = instance;
  appendLog(`ENV START ${instance.id}: sustained explicit emitter @ ${Math.round(sourcePosition.x)},${Math.round(sourcePosition.y)} intensity ${Number(intensityInput?.value ?? 1).toFixed(1)}`);

  instance.ready
    .then(() => {
      appendLog(`ENV READY ${instance.id}: live position + intensity updates enabled`);
      updateEnvironmentInspector();
    })
    .catch((error) => appendLog(`ENV ERROR ${instance.id}: ${error.message}`));

  updateEnvironmentInspector();
  return instance;
}

function updateActive(patch, reason) {
  if (!activeEnvironment || activeEnvironment.state !== 'playing') return false;
  fx.update(activeEnvironment, patch);
  if (patch.position) sourcePosition = { ...patch.position };
  updateEnvironmentInspector();
  if (reason) appendLog(`ENV UPDATE ${activeEnvironment.id}: ${reason}`);
  return true;
}

function onEffectChangeCapture(event) {
  if (effectInput?.value !== 'environmentEmitter') {
    restoreOneShotUi();
    return;
  }

  event.stopImmediatePropagation();
  fx?.stopAll?.('effect-switch-environment');
  globalThis.FXDeckLab?.screenKickController?.reset?.();
  activeEnvironment = null;
  setEnvironmentUi();
  appendLog('EFFECT → environmentEmitter');

  effectInput.dispatchEvent(new Event('input', { bubbles: true }));
  const grid = globalThis.FXDeckEffectGrid;
  if (grid?.isActive?.()) window.setTimeout(() => grid.spawn(), 0);
}

function bindInteractions() {
  effectInput?.addEventListener('change', onEffectChangeCapture, true);

  playButton?.addEventListener('click', (event) => {
    if (!isEnvironmentSelected()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    startEnvironment(sourcePosition);
  }, true);

  stage?.addEventListener('pointerdown', (event) => {
    if (!isEnvironmentSelected()) return;
    if (document.body.dataset.workspaceMode === 'debug' || globalThis.FXDeckEffectGrid?.isActive?.()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = stage.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    if (!updateActive({ position: point }, `position → ${Math.round(point.x)},${Math.round(point.y)}`)) {
      startEnvironment(point);
    }
  }, true);

  intensityInput?.addEventListener('input', () => {
    if (!isEnvironmentSelected()) return;
    updateActive({ intensity: Number(intensityInput.value) });
    updateEnvironmentInspector();
  });

  directionInput?.addEventListener('input', () => {
    if (!isEnvironmentSelected()) return;
    updateEnvironmentInspector();
  });

  stopButton?.addEventListener('click', () => {
    if (activeEnvironment?.state !== 'playing') activeEnvironment = null;
    window.setTimeout(updateEnvironmentInspector, 0);
  });
}

async function install() {
  const runtime = await waitForRuntime();
  fx = runtime.fx;
  particleAdapter = runtime.particleAdapter;

  installLiveUpdate(fx);
  installSustainedEmitterUpdates(particleAdapter);
  registerProductionEffects(fx);
  ensureOption();
  bindInteractions();

  if (directionInput) directionInput.value = '270';
  if (directionValue) directionValue.textContent = '270°';
  effectInput.value = 'environmentEmitter';
  effectInput.dispatchEvent(new Event('change', { bubbles: true }));

  globalThis.FXDeckEnvironmentLab = {
    start: startEnvironment,
    update: (patch) => updateActive(patch),
    stop: () => {
      if (activeEnvironment) fx.stop(activeEnvironment, 'environment-lab-stop');
      activeEnvironment = null;
      updateEnvironmentInspector();
    },
    getInstance: () => activeEnvironment
  };

  appendLog(`${BUILD} Environment Emitter ready: FXDeck.play → live FXDeck.update(position/intensity) → FXDeck.stop`);
}

await install().catch((error) => {
  appendLog(`${BUILD} Environment bridge FAIL: ${error.message}`);
  console.error(error);
});
