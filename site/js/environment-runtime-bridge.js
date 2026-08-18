import { installLiveUpdate } from '../fxdeck/core/live-update.js?v=p3.8.0';
import { installSustainedEmitterUpdates } from '../fxdeck/adapters/sustained-emitter-updates.js?v=p3.8.0';
import { registerProductionEffects } from '../fxdeck/effects/catalog.js?v=p3.8.1';

const BUILD = 'P3.8.1';
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
const markerHost = document.querySelector('#impact-dom-layer');
const logOutput = document.querySelector('#p2-log');
const apiPreview = document.querySelector('#api-preview');
const pathNote = particlePathInput?.closest('.control')?.querySelector('.control-note');
const directionNote = directionInput?.closest('.control')?.querySelector('.control-note');
const intensityLabel = intensityInput?.closest('.control')?.querySelector('.range-row span');
const originalPathNote = pathNote?.textContent ?? '';
const originalDirectionNote = directionNote?.textContent ?? '';
const originalIntensityLabel = intensityLabel?.textContent ?? 'Runtime intensity';

let fx = null;
let particleAdapter = null;
let activeEnvironment = null;
let environmentUiActive = false;
let sourceSerial = 0;
const sources = new Map();
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

function addStylesheet() {
  if (document.querySelector('link[data-environment-source]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './environment-source.css?v=p3.8.1';
  link.dataset.environmentSource = 'true';
  document.head.appendChild(link);
}

function ensureOption() {
  if (!effectInput || effectInput.querySelector('option[value="environmentEmitter"]')) return;
  const option = document.createElement('option');
  option.value = 'environmentEmitter';
  option.textContent = 'Environment Emitter — sustained source';
  effectInput.appendChild(option);
}

function setText(selector, text) {
  const node = document.querySelector(selector);
  if (node) node.textContent = text;
}

function activeRecord() {
  return activeEnvironment ? sources.get(activeEnvironment.id) ?? null : null;
}

function runningRecords() {
  return [...sources.values()].filter((record) => record.instance?.state === 'playing');
}

function positionFor(instance) {
  return instance?.resolved?.position ?? instance?.params?.position ?? sourcePosition;
}

function intensityFor(instance) {
  return Number(instance?.resolved?.intensity ?? instance?.params?.intensity ?? intensityInput?.value ?? 1);
}

function syncMarker(record) {
  if (!record?.marker) return;
  const position = positionFor(record.instance);
  const intensity = intensityFor(record.instance);
  const scale = Math.max(.82, Math.min(1.3, .82 + intensity * .18));
  record.marker.style.transform = `translate3d(${position.x.toFixed(1)}px, ${position.y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
  record.marker.style.opacity = String(Math.max(.55, Math.min(1, .52 + intensity * .24)));
  record.marker.classList.toggle('is-active', activeEnvironment?.id === record.instance.id);
  const label = record.marker.querySelector('b');
  if (label) label.textContent = `${record.label} · ${intensity.toFixed(1)}×`;
}

function syncMarkers() {
  for (const record of sources.values()) syncMarker(record);
}

function unregisterSource(instanceId) {
  const record = sources.get(instanceId);
  if (!record) return;
  record.marker?.remove();
  sources.delete(instanceId);

  if (activeEnvironment?.id === instanceId) {
    const fallback = runningRecords().at(-1)?.instance ?? null;
    activeEnvironment = fallback;
    if (fallback) sourcePosition = { ...positionFor(fallback) };
  }

  syncMarkers();
  updateEnvironmentInspector();
  updateSourceTools();
}

function registerSource(instance, position) {
  const label = `S${++sourceSerial}`;
  let marker = null;

  if (markerHost) {
    marker = document.createElement('div');
    marker.className = 'fxdeck-env-source-marker';
    marker.innerHTML = '<span></span><b></b>';
    markerHost.appendChild(marker);
  }

  const record = { instance, label, marker };
  sources.set(instance.id, record);
  instance.addCleanup(() => unregisterSource(instance.id));
  sourcePosition = { ...position };
  activeEnvironment = instance;
  syncMarkers();
  updateSourceTools();
  return record;
}

function setActive(instance) {
  if (!instance || !sources.has(instance.id)) return false;
  activeEnvironment = instance;
  sourcePosition = { ...positionFor(instance) };
  if (intensityInput) intensityInput.value = String(intensityFor(instance));
  setText('#intensity-value', intensityFor(instance).toFixed(1));
  syncMarkers();
  updateEnvironmentInspector();
  updateSourceTools();
  return true;
}

function ensureSourceTools() {
  let tools = document.querySelector('#environment-source-tools');
  if (tools) return tools;

  tools = document.createElement('section');
  tools.id = 'environment-source-tools';
  tools.className = 'environment-source-tools';
  tools.hidden = true;
  tools.innerHTML = `
    <div class="environment-source-tools__head">
      <strong>Sustained sources</strong>
      <span id="environment-source-count">0 running</span>
    </div>
    <div class="environment-source-tools__actions">
      <button id="environment-add-source" type="button">+ Add source</button>
      <button id="environment-remove-source" type="button">Remove active</button>
    </div>
    <div id="environment-source-readout" class="environment-source-tools__readout">No source. Start one, then click Preview to move the active source.</div>
  `;

  playButton?.closest('.actions--primary')?.insertAdjacentElement('afterend', tools);

  tools.querySelector('#environment-add-source')?.addEventListener('click', () => {
    if (!isEnvironmentSelected()) return;
    addEnvironment(sourcePosition);
  });

  tools.querySelector('#environment-remove-source')?.addEventListener('click', () => {
    if (!activeEnvironment) return;
    const record = activeRecord();
    fx?.stop(activeEnvironment, 'environment-remove-active');
    appendLog(`ENV REMOVE ${record?.label ?? activeEnvironment.id}`);
  });

  return tools;
}

function updateSourceTools() {
  const tools = ensureSourceTools();
  if (!tools) return;
  tools.hidden = !isEnvironmentSelected();

  const records = runningRecords();
  const active = activeRecord();
  const count = tools.querySelector('#environment-source-count');
  const readout = tools.querySelector('#environment-source-readout');
  const remove = tools.querySelector('#environment-remove-source');

  if (count) count.textContent = `${records.length} running`;
  if (remove) remove.disabled = !activeEnvironment;
  if (readout) {
    readout.textContent = active
      ? `${records.length} source${records.length === 1 ? '' : 's'} • active ${active.label} • click Preview = move active • intensity slider = active density`
      : 'No source. Start one, then click Preview to move the active source.';
  }

  if (playButton && isEnvironmentSelected()) {
    playButton.textContent = activeEnvironment ? 'Restart active source' : 'Start source';
  }
}

function setEnvironmentControlMode(enabled) {
  if (particlePathInput) particlePathInput.disabled = enabled;
  if (overlapButton) overlapButton.disabled = enabled;
  if (abButton) abButton.disabled = enabled;
  if (intensityLabel) intensityLabel.textContent = enabled ? 'Active source intensity' : originalIntensityLabel;

  if (pathNote) {
    pathNote.textContent = enabled
      ? 'Sustained Environment uses one explicit emitter per source. One-shot burst topology does not apply to this archetype.'
      : originalPathNote;
  }

  if (directionNote) {
    directionNote.textContent = enabled
      ? 'Direction is authored when a source starts. Position and density update live; restart the active source to apply a new flow direction.'
      : originalDirectionNote;
  }

  if (overlapButton) overlapButton.title = enabled ? 'Historical one-shot regression fixture; not applicable to sustained Environment.' : '';
  if (abButton) abButton.title = enabled ? 'One-shot topology A/B is not applicable to sustained Environment.' : '';
}

function setTimeline() {
  const timeline = document.querySelector('#effect-timeline');
  if (!timeline) return;
  const rows = [
    ['PLAY', 'Create one independent sustained source'],
    ['ADD', 'Create another source without stopping existing ones'],
    ['LIVE', 'FXDeck.update(position/intensity) mutates active source'],
    ['UNTIL STOP', 'Each source continues independently'],
    ['STOP', 'FXDeck.stop() / stopAll() owns cleanup']
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
  const records = runningRecords();
  const active = activeRecord();
  const resolved = activeEnvironment?.resolved;
  const intensity = intensityFor(activeEnvironment);
  const position = positionFor(activeEnvironment);
  const direction = resolved?.directionDegrees ?? Number(directionInput?.value ?? 270);
  const rate = resolved?.rateQuantity ?? 1;
  const perSecond = resolved?.emissionPerSecond ?? rate / .12;

  setText('#resolved-effect', 'environmentEmitter/v1/default');
  setText('#resolved-path', 'explicit sustained emitter / source');
  setText('#resolved-intensity', `${intensity.toFixed(1)}× — active source live density`);
  setText('#resolved-direction', `${Math.round(direction)}° — restart to change flow`);

  const layers = [
    ['Sources', `${records.length} running${active ? ` / active ${active.label}` : ''}`],
    ['Emission rate', active ? `${rate} / 120 ms ≈ ${Math.round(perSecond)}/s` : 'start a source'],
    ['Active source', active ? `${active.label} / ${active.instance.id}` : 'none'],
    ['Live update', 'position + intensity'],
    ['Lifecycle', 'independent sustained sources']
  ];
  layers.forEach(([label, value], index) => {
    const key = ['a', 'b', 'c', 'd', 'e'][index];
    setText(`#resolved-layer-${key}-label`, label);
    setText(`#resolved-layer-${key}`, value);
  });

  setText('#resolved-screen-kick', 'off');
  setText('#resolved-position', activeEnvironment ? `${Math.round(position.x)}, ${Math.round(position.y)} CSS px` : '--');
  setText('#metric-burst-path', 'explicit-sustained');

  if (apiPreview) {
    apiPreview.textContent = `const sourceA = FXDeck.play("environmentEmitter", {\n  position: { x: 220, y: 320 },\n  direction: 270,\n  intensity: 1.0\n});\n\nconst sourceB = FXDeck.play("environmentEmitter", { ... });\n\nFXDeck.update(sourceA, {\n  position: nextPosition,\n  intensity: 2.0\n});\n\nFXDeck.stop(sourceA);`;
  }

  syncMarkers();
}

function setEnvironmentUi() {
  environmentUiActive = true;
  setEnvironmentControlMode(true);
  setText('#authored-version-label', 'v1 — Environment Emitter');
  setText('#preview-title', 'Environment Emitter sustained-source probe');
  setText('#preview-note', 'Click Preview = move active source. Add Source keeps previous sources alive.');
  setText('#caption-title', 'environmentEmitter / v1 / default');
  setText('#caption-note', 'independent sources → live move/density → owned stop');
  setText('#effect-summary', 'Long-running environment sources such as smoke, steam, flame or dust. Each FXDeck.play() creates one independent source; FXDeck.update() mutates the selected source without recreating it.');
  setTimeline();
  updateSourceTools();
  updateEnvironmentInspector();
}

function restoreOneShotUi() {
  environmentUiActive = false;
  setEnvironmentControlMode(false);
  const tools = document.querySelector('#environment-source-tools');
  if (tools) tools.hidden = true;
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

function addEnvironment(position = sourcePosition) {
  if (!fx) return null;
  sourcePosition = { ...position };
  const instance = fx.play('environmentEmitter', currentParams(sourcePosition));
  const record = registerSource(instance, sourcePosition);

  appendLog(`ENV ADD ${record.label} ${instance.id}: ${Math.round(sourcePosition.x)},${Math.round(sourcePosition.y)} intensity ${Number(intensityInput?.value ?? 1).toFixed(1)}`);

  instance.ready
    .then(() => {
      if (instance.state !== 'playing') return;
      syncMarker(record);
      updateEnvironmentInspector();
      appendLog(`ENV READY ${record.label}: independent sustained source, live position + density`);
    })
    .catch((error) => appendLog(`ENV ERROR ${record.label}: ${error.message}`));

  updateEnvironmentInspector();
  return instance;
}

function restartActiveEnvironment() {
  const previous = activeRecord();
  const position = activeEnvironment ? { ...positionFor(activeEnvironment) } : { ...sourcePosition };
  if (activeEnvironment?.state === 'playing') fx.stop(activeEnvironment, 'environment-restart');
  const next = addEnvironment(position);
  if (previous) appendLog(`ENV RESTART ${previous.label} → ${sources.get(next.id)?.label ?? next.id}`);
  return next;
}

function updateActive(patch, reason) {
  if (!activeEnvironment || activeEnvironment.state !== 'playing') return false;
  fx.update(activeEnvironment, patch);
  if (patch.position) sourcePosition = { ...patch.position };
  syncMarker(activeRecord());
  updateEnvironmentInspector();
  updateSourceTools();
  if (reason) appendLog(`ENV UPDATE ${activeRecord()?.label ?? activeEnvironment.id}: ${reason}`);
  return true;
}

function stopTrackedEnvironment(reason) {
  const running = runningRecords().map((record) => record.instance);
  for (const instance of running) fx?.stop(instance, reason);
  activeEnvironment = null;
  updateSourceTools();
}

function onEffectChangeCapture(event) {
  if (effectInput?.value !== 'environmentEmitter') {
    if (environmentUiActive && sources.size) stopTrackedEnvironment('environment-effect-exit');
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
    restartActiveEnvironment();
  }, true);

  stage?.addEventListener('pointerdown', (event) => {
    if (!isEnvironmentSelected()) return;
    if (document.body.dataset.workspaceMode === 'debug' || globalThis.FXDeckEffectGrid?.isActive?.()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = stage.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };

    if (!updateActive({ position: point }, `move → ${Math.round(point.x)},${Math.round(point.y)}`)) {
      addEnvironment(point);
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
    window.setTimeout(() => {
      activeEnvironment = null;
      updateSourceTools();
      updateEnvironmentInspector();
    }, 0);
  });
}

async function install() {
  const runtime = await waitForRuntime();
  fx = runtime.fx;
  particleAdapter = runtime.particleAdapter;

  addStylesheet();
  installLiveUpdate(fx);
  installSustainedEmitterUpdates(particleAdapter);
  registerProductionEffects(fx);
  ensureOption();
  ensureSourceTools();
  bindInteractions();

  if (directionInput) directionInput.value = '270';
  if (directionValue) directionValue.textContent = '270°';
  effectInput.value = 'environmentEmitter';
  effectInput.dispatchEvent(new Event('change', { bubbles: true }));

  globalThis.FXDeckEnvironmentLab = {
    add: addEnvironment,
    restartActive: restartActiveEnvironment,
    updateActive: (patch) => updateActive(patch),
    removeActive: () => {
      if (activeEnvironment) fx.stop(activeEnvironment, 'environment-lab-remove-active');
    },
    stopAll: () => stopTrackedEnvironment('environment-lab-stop-all'),
    getActive: () => activeEnvironment,
    getSources: () => runningRecords().map((record) => ({ id: record.instance.id, label: record.label, resolved: record.instance.resolved }))
  };

  appendLog(`${BUILD} Environment ready: independent FXDeck.play sources + live move/intensity per active source + owned cleanup`);
}

await install().catch((error) => {
  appendLog(`${BUILD} Environment bridge FAIL: ${error.message}`);
  console.error(error);
});
