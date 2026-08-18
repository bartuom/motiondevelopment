const BUILD = 'P3.7.1';
const GRID_PRESETS = {
  '2x2': [2, 2],
  '2x5': [2, 5],
  '3x3': [3, 3],
  '3x5': [3, 5],
  '4x4': [4, 4],
  '4x6': [4, 6],
  '5x6': [5, 6],
  '6x6': [6, 6],
  '8x8': [8, 8]
};

const stage = document.querySelector('#impact-stage');
const kickLayer = document.querySelector('#impact-kick-layer');
const debugPanel = document.querySelector('.controls-pane [data-workspace-panel="debug"]');
const effectInput = document.querySelector('#effect-select');
const intensityInput = document.querySelector('#intensity');
const directionInput = document.querySelector('#direction');
const logOutput = document.querySelector('#p2-log');

const state = {
  active: false,
  world: null,
  overlay: null,
  zoomChip: null,
  fx: null,
  lab: null,
  particleAdapter: null,
  rawResize: null,
  cols: 4,
  rows: 6,
  cellSize: 160,
  zoom: 1,
  panX: 0,
  panY: 0,
  directionPattern: 'radial',
  loopTimer: 0,
  loopEnabled: false,
  loopInterval: 1000,
  loopMode: 'replace',
  loopCycles: 0,
  dragging: false,
  dragPointerId: null,
  dragStartX: 0,
  dragStartY: 0,
  dragPanX: 0,
  dragPanY: 0,
  controls: {}
};

function appendLog(message) {
  if (!logOutput) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function addStylesheet() {
  if (document.querySelector('link[data-effect-grid-lab]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './effect-grid-lab.css?v=p3.7.1';
  link.dataset.effectGridLab = 'true';
  document.head.appendChild(link);
}

function waitForRuntime(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const poll = () => {
      const lab = globalThis.FXDeckLab;
      if (lab?.fx && lab?.particleAdapter) return resolve(lab);
      if (performance.now() - startedAt > timeoutMs) return reject(new Error('FXDeckLab runtime was not ready in time.'));
      window.setTimeout(poll, 20);
    };
    poll();
  });
}

function installWorld(lab) {
  let world = document.querySelector('#effect-world');
  if (!world) {
    world = document.createElement('div');
    world.id = 'effect-world';
    world.className = 'effect-world';
    for (const child of [...kickLayer.children]) world.appendChild(child);
    kickLayer.appendChild(world);
  }

  let overlay = world.querySelector('#effect-grid-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'effect-grid-overlay';
    overlay.className = 'effect-grid-overlay';
    overlay.hidden = true;
    world.appendChild(overlay);
  }

  let chip = stage.querySelector('#effect-grid-zoom-chip');
  if (!chip) {
    chip = document.createElement('div');
    chip.id = 'effect-grid-zoom-chip';
    chip.className = 'effect-grid-zoom-chip';
    chip.hidden = true;
    stage.appendChild(chip);
  }

  state.world = world;
  state.overlay = overlay;
  state.zoomChip = chip;
  state.particleAdapter = lab.particleAdapter;
  state.rawResize = lab.particleAdapter.resize.bind(lab.particleAdapter);

  lab.particleAdapter.coordinates.stage = world;
  lab.particleAdapter.resize = () => {
    if (state.active) return;
    return state.rawResize();
  };

  resetWorldGeometry();
  requestAnimationFrame(() => state.rawResize());
}

function createDebugHierarchy() {
  if (!debugPanel || debugPanel.querySelector('.debug-tier--real')) return;

  const stressLoad = debugPanel.querySelector('#stress-load')?.closest('.control');
  const stressProfile = debugPanel.querySelector('#stress-profile')?.closest('.control');
  const regressionGroup = debugPanel.querySelector('#play-ab')?.closest('.debug-group');
  const backendGroup = debugPanel.querySelector('#play-stress-ab')?.closest('.debug-group');
  const overlapButton = debugPanel.querySelector('#play-overlap');

  const realTier = document.createElement('section');
  realTier.className = 'debug-tier debug-tier--real';
  realTier.innerHTML = `
    <div class="debug-tier__head">
      <div><p class="label">Primary workflow</p><strong>Real Effect Scaling</strong></div>
      <span>Use this first</span>
    </div>
    <div id="effect-grid-anchor"></div>
  `;

  const regressionTier = document.createElement('section');
  regressionTier.className = 'debug-tier';
  regressionTier.innerHTML = `
    <div class="debug-tier__head">
      <div><p class="label">Regression</p><strong>Effect lifecycle checks</strong></div>
      <span>When needed</span>
    </div>
  `;

  const advanced = document.createElement('details');
  advanced.className = 'debug-advanced';
  advanced.innerHTML = `
    <summary>
      <span><small>Engine diagnostics</small><strong>Backend Diagnostics — Advanced</strong></span>
      <em>Open</em>
    </summary>
    <div class="debug-advanced__body">
      <p class="debug-advanced__note">Backend-isolation tools are retained for diagnosing tsParticles topology, scheduler or lifecycle regressions. They are not the normal effect-scaling workflow.</p>
      <div id="advanced-stress-controls"></div>
      <div id="advanced-overlap"></div>
      <div id="advanced-backend"></div>
    </div>
  `;

  const callout = debugPanel.querySelector('.debug-callout');
  callout?.insertAdjacentElement('afterend', realTier);
  realTier.insertAdjacentElement('afterend', regressionTier);
  regressionTier.insertAdjacentElement('afterend', advanced);

  if (regressionGroup) {
    const label = regressionGroup.querySelector('.label');
    if (label) label.textContent = 'Effect regression';
    if (overlapButton) overlapButton.remove();
    regressionTier.appendChild(regressionGroup);
  }

  const stressHost = advanced.querySelector('#advanced-stress-controls');
  if (stressLoad) stressHost.appendChild(stressLoad);
  if (stressProfile) stressHost.appendChild(stressProfile);

  const overlapHost = advanced.querySelector('#advanced-overlap');
  if (overlapButton) {
    const group = document.createElement('div');
    group.className = 'debug-group';
    group.innerHTML = '<p class="label">Historical overlap benchmark</p><div class="actions"></div><p class="control-note">Superseded by Effect Grid for scaling; retained as a fixed ×6 regression fixture.</p>';
    group.querySelector('.actions').appendChild(overlapButton);
    overlapHost.appendChild(group);
  }

  if (backendGroup) {
    const label = backendGroup.querySelector('.label');
    if (label) label.textContent = 'Backend isolation';
    advanced.querySelector('#advanced-backend').appendChild(backendGroup);
  }

  for (const empty of [...debugPanel.children]) {
    if (empty.classList?.contains('debug-group') && !empty.children.length) empty.remove();
  }
}

function injectControls() {
  if (!debugPanel || document.querySelector('#effect-grid-tool')) return;

  const panel = document.createElement('section');
  panel.id = 'effect-grid-tool';
  panel.className = 'effect-grid-tool';
  panel.innerHTML = `
    <div class="effect-grid-tool__head">
      <div><p class="label">Effect Grid Lab</p><strong>Real-effect scale test</strong></div>
      <span class="effect-grid-tool__badge">P3.7.1</span>
    </div>
    <div class="control">
      <p class="label">Grid preset</p>
      <select id="effect-grid-preset">
        <option value="2x2">2 × 2 — 4 instances</option>
        <option value="2x5">2 × 5 — 10 instances</option>
        <option value="3x3">3 × 3 — 9 instances</option>
        <option value="3x5">3 × 5 — 15 instances</option>
        <option value="4x4">4 × 4 — 16 instances</option>
        <option value="4x6" selected>4 × 6 — 24 instances</option>
        <option value="5x6">5 × 6 — 30 instances</option>
        <option value="6x6">6 × 6 — 36 instances</option>
        <option value="8x8">8 × 8 — 64 instances</option>
      </select>
    </div>
    <div class="control effect-grid-tool__range">
      <span>Cell size / spacing</span><strong id="effect-grid-cell-value" class="effect-grid-tool__value">160 px</strong>
      <input id="effect-grid-cell" type="range" min="80" max="420" value="160" step="10">
    </div>
    <div class="control">
      <p class="label">Direction pattern</p>
      <select id="effect-grid-direction">
        <option value="same">Same</option>
        <option value="radial" selected>Radial</option>
        <option value="alternating">Alternating</option>
        <option value="seeded">Seeded spread</option>
      </select>
    </div>
    <div class="control effect-grid-tool__range">
      <span>Viewport zoom</span><strong id="effect-grid-zoom-value" class="effect-grid-tool__value">100%</strong>
      <input id="effect-grid-zoom" type="range" min="10" max="200" value="100" step="5">
    </div>
    <div class="effect-grid-tool__inline">
      <label class="effect-grid-tool__check"><input id="effect-grid-auto-fit" type="checkbox" checked> Fit on spawn</label>
      <label><span class="label">Loop ms</span><input id="effect-grid-loop-ms" type="number" min="250" max="5000" step="50" value="1000"></label>
    </div>
    <div class="control effect-grid-tool__loop-mode">
      <p class="label">Loop behavior</p>
      <select id="effect-grid-loop-mode">
        <option value="replace" selected>Replace batch — clean repeat</option>
        <option value="stack">Stack / Soak — intentionally accumulate</option>
      </select>
      <p id="effect-grid-loop-note" class="control-note">Recommended: each cycle clears the previous grid before spawning the next one.</p>
    </div>
    <div class="effect-grid-tool__actions">
      <button id="effect-grid-spawn" type="button">Spawn Grid</button>
      <button id="effect-grid-fit" type="button">Fit Grid</button>
      <button id="effect-grid-loop" type="button">Loop: Off</button>
      <button id="effect-grid-stop" type="button">Stop Grid</button>
    </div>
    <div id="effect-grid-readout" class="effect-grid-tool__readout">24 / batch • replace • 640 × 960 world • zoom 100%</div>
    <p class="effect-grid-tool__hint">Mouse wheel zooms the virtual viewport. Drag the preview to pan. Grid cells call normal <code>FXDeck.play()</code>. Changing preset/direction while active cleanly respawns the selected grid.</p>
  `;

  const anchor = debugPanel.querySelector('#effect-grid-anchor');
  (anchor ?? debugPanel).appendChild(panel);

  state.controls = {
    preset: panel.querySelector('#effect-grid-preset'),
    cell: panel.querySelector('#effect-grid-cell'),
    cellValue: panel.querySelector('#effect-grid-cell-value'),
    direction: panel.querySelector('#effect-grid-direction'),
    zoom: panel.querySelector('#effect-grid-zoom'),
    zoomValue: panel.querySelector('#effect-grid-zoom-value'),
    autoFit: panel.querySelector('#effect-grid-auto-fit'),
    loopMs: panel.querySelector('#effect-grid-loop-ms'),
    loopMode: panel.querySelector('#effect-grid-loop-mode'),
    loopNote: panel.querySelector('#effect-grid-loop-note'),
    spawn: panel.querySelector('#effect-grid-spawn'),
    fit: panel.querySelector('#effect-grid-fit'),
    loop: panel.querySelector('#effect-grid-loop'),
    stop: panel.querySelector('#effect-grid-stop'),
    readout: panel.querySelector('#effect-grid-readout')
  };

  state.controls.preset.addEventListener('change', () => {
    const [cols, rows] = GRID_PRESETS[state.controls.preset.value] ?? GRID_PRESETS['4x6'];
    state.cols = cols;
    state.rows = rows;
    rebuildGrid({ preserveView: false });
    refreshActiveGrid('grid-preset-change');
  });
  state.controls.cell.addEventListener('input', () => {
    state.cellSize = Number(state.controls.cell.value);
    state.controls.cellValue.textContent = `${state.cellSize} px`;
    rebuildGrid({ preserveView: false });
  });
  state.controls.cell.addEventListener('change', () => refreshActiveGrid('grid-cell-change'));
  state.controls.direction.addEventListener('change', () => {
    state.directionPattern = state.controls.direction.value;
    refreshActiveGrid('grid-direction-change');
  });
  state.controls.zoom.addEventListener('input', () => setZoom(Number(state.controls.zoom.value) / 100));
  state.controls.loopMs.addEventListener('change', () => {
    state.loopInterval = clamp(Number(state.controls.loopMs.value) || 1000, 250, 5000);
    state.controls.loopMs.value = String(state.loopInterval);
    if (state.loopEnabled) restartLoop();
    updateReadout();
  });
  state.controls.loopMode.addEventListener('change', () => {
    state.loopMode = state.controls.loopMode.value === 'stack' ? 'stack' : 'replace';
    state.controls.loopNote.textContent = state.loopMode === 'replace'
      ? 'Recommended: each cycle clears the previous grid before spawning the next one.'
      : 'Advanced soak mode: every cycle intentionally adds another batch. Active instances can grow without bound for sustained effects.';
    panel.classList.toggle('is-stack-mode', state.loopMode === 'stack');
    updateReadout();
  });
  state.controls.spawn.addEventListener('click', () => spawnGrid({ reset: true }));
  state.controls.fit.addEventListener('click', () => { activateGrid(); fitGrid(); });
  state.controls.loop.addEventListener('click', toggleLoop);
  state.controls.stop.addEventListener('click', () => stopGrid({ resetView: false }));

  effectInput?.addEventListener('change', () => refreshActiveGrid('grid-effect-change'));
  intensityInput?.addEventListener('change', () => refreshActiveGrid('grid-intensity-change'));
  directionInput?.addEventListener('change', () => refreshActiveGrid('grid-base-direction-change'));
}

function worldSize() {
  return { width: state.cols * state.cellSize, height: state.rows * state.cellSize };
}

function resetWorldGeometry() {
  if (!state.world) return;
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  state.world.style.width = `${width}px`;
  state.world.style.height = `${height}px`;
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  applyView();
}

function activateGrid() {
  if (!state.world) return;
  state.active = true;
  stage.classList.add('is-effect-grid-active');
  state.overlay.hidden = false;
  state.zoomChip.hidden = false;
  const { width, height } = worldSize();
  state.world.style.width = `${width}px`;
  state.world.style.height = `${height}px`;
  renderGridGuides();
  applyView();
}

function deactivateGrid() {
  stopLoop();
  state.active = false;
  stage.classList.remove('is-effect-grid-active', 'is-effect-grid-panning');
  if (state.overlay) state.overlay.hidden = true;
  if (state.zoomChip) state.zoomChip.hidden = true;
  resetWorldGeometry();
  requestAnimationFrame(() => state.rawResize?.());
}

function renderGridGuides() {
  if (!state.overlay) return;
  state.overlay.replaceChildren();
  for (let row = 0; row < state.rows; row++) {
    for (let col = 0; col < state.cols; col++) {
      const index = row * state.cols + col;
      const cell = document.createElement('div');
      cell.className = 'effect-grid-cell';
      cell.dataset.index = String(index + 1);
      cell.style.left = `${col * state.cellSize}px`;
      cell.style.top = `${row * state.cellSize}px`;
      cell.style.width = `${state.cellSize}px`;
      cell.style.height = `${state.cellSize}px`;
      state.overlay.appendChild(cell);
    }
  }
}

function rebuildGrid({ preserveView = true } = {}) {
  if (!state.active) {
    updateReadout();
    return;
  }
  const oldCenter = screenCenterWorld();
  const { width, height } = worldSize();
  state.world.style.width = `${width}px`;
  state.world.style.height = `${height}px`;
  renderGridGuides();
  if (preserveView && oldCenter) centerWorldPoint(oldCenter.x, oldCenter.y);
  else if (state.controls.autoFit?.checked) fitGrid();
  updateReadout();
}

function gridPositions() {
  const points = [];
  for (let row = 0; row < state.rows; row++) {
    for (let col = 0; col < state.cols; col++) {
      points.push({ index: row * state.cols + col, row, col, x: (col + .5) * state.cellSize, y: (row + .5) * state.cellSize });
    }
  }
  return points;
}

function directionFor(point, baseDirection) {
  const { width, height } = worldSize();
  if (state.directionPattern === 'same') return baseDirection;
  if (state.directionPattern === 'alternating') return (baseDirection + (point.index % 2 ? 180 : 0)) % 360;
  if (state.directionPattern === 'seeded') return (baseDirection + point.index * 137.507764) % 360;
  const dx = point.x - width * .5;
  const dy = point.y - height * .5;
  if (Math.hypot(dx, dy) < 1) return baseDirection;
  return (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
}

function spawnBatch({ source = 'manual', logSpawn = true } = {}) {
  if (!state.fx) return;
  const effectId = effectInput?.value ?? 'fireball';
  const intensity = Number(intensityInput?.value ?? 1);
  const baseDirection = Number(directionInput?.value ?? 0);
  const points = gridPositions();

  for (const point of points) {
    state.fx.play(effectId, {
      version: 'v1',
      variant: 'default',
      position: { x: point.x, y: point.y },
      direction: directionFor(point, baseDirection),
      intensity,
      hooks: {}
    });
  }

  if (logSpawn) {
    appendLog(`GRID ${source.toUpperCase()} ${effectId}: ${points.length} instances / ${state.cols}×${state.rows} / cell ${state.cellSize}px / zoom ${(state.zoom * 100).toFixed(0)}% / ${state.directionPattern}`);
  }
  updateReadout();
}

function spawnGrid({ reset = true } = {}) {
  activateGrid();
  if (state.controls.autoFit?.checked) fitGrid();
  if (reset) state.fx?.stopAll?.('effect-grid-respawn');
  spawnBatch({ source: 'spawn', logSpawn: true });
}

function refreshActiveGrid(reason) {
  if (!state.active || !state.fx) return;
  if (state.controls.autoFit?.checked) fitGrid();
  state.fx.stopAll(reason);
  spawnBatch({ source: 'refresh', logSpawn: false });
  appendLog(`GRID REFRESH: ${reason} → ${state.cols * state.rows} clean instances`);
}

function stopGrid({ resetView = false } = {}) {
  state.fx?.stopAll?.('effect-grid-stop');
  stopLoop();
  appendLog('GRID STOP: all FXDeck instances/resources stopped');
  if (resetView) deactivateGrid();
}

function toggleLoop() {
  if (state.loopEnabled) stopLoop();
  else startLoop();
}

function startLoop() {
  activateGrid();
  if (state.controls.autoFit?.checked) fitGrid();
  state.loopEnabled = true;
  state.loopCycles = 0;
  state.controls.loop?.classList.add('is-active');
  if (state.controls.loop) state.controls.loop.textContent = 'Loop: On';

  state.fx?.stopAll?.('effect-grid-loop-start');
  spawnBatch({ source: 'loop', logSpawn: false });
  state.loopCycles = 1;
  appendLog(`GRID LOOP START: ${state.cols * state.rows}/batch / ${state.loopMode} / ${state.loopInterval}ms`);
  restartLoop();
  updateReadout();
}

function runLoopCycle() {
  if (!state.loopEnabled) return;
  if (state.loopMode === 'replace') state.fx?.stopAll?.('effect-grid-loop-replace');
  spawnBatch({ source: 'loop', logSpawn: false });
  state.loopCycles += 1;
  updateReadout();
}

function restartLoop() {
  if (state.loopTimer) window.clearInterval(state.loopTimer);
  if (!state.loopEnabled) return;
  state.loopTimer = window.setInterval(runLoopCycle, state.loopInterval);
}

function stopLoop() {
  if (state.loopTimer) window.clearInterval(state.loopTimer);
  const wasEnabled = state.loopEnabled;
  state.loopTimer = 0;
  state.loopEnabled = false;
  state.controls.loop?.classList.remove('is-active');
  if (state.controls.loop) state.controls.loop.textContent = 'Loop: Off';
  if (wasEnabled) appendLog(`GRID LOOP STOP: ${state.loopCycles} cycles completed`);
  updateReadout();
}

function fitGrid() {
  if (!state.world) return;
  const { width, height } = worldSize();
  const pad = 20;
  const zoom = clamp(Math.min((stage.clientWidth - pad * 2) / width, (stage.clientHeight - pad * 2) / height), .1, 2);
  state.zoom = zoom;
  state.panX = (stage.clientWidth - width * zoom) * .5;
  state.panY = (stage.clientHeight - height * zoom) * .5;
  applyView();
}

function setZoom(nextZoom, anchor = null) {
  if (!state.active) activateGrid();
  const oldZoom = state.zoom;
  const newZoom = clamp(nextZoom, .1, 2);

  if (anchor && oldZoom > 0) {
    const rect = stage.getBoundingClientRect();
    const sx = anchor.x - rect.left;
    const sy = anchor.y - rect.top;
    const wx = (sx - state.panX) / oldZoom;
    const wy = (sy - state.panY) / oldZoom;
    state.panX = sx - wx * newZoom;
    state.panY = sy - wy * newZoom;
  }

  state.zoom = newZoom;
  applyView();
}

function applyView() {
  if (!state.world) return;
  state.world.style.transform = `translate3d(${state.panX.toFixed(2)}px, ${state.panY.toFixed(2)}px, 0) scale(${state.zoom.toFixed(4)})`;
  if (state.controls.zoom) state.controls.zoom.value = String(Math.round(state.zoom * 100));
  if (state.controls.zoomValue) state.controls.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
  if (state.zoomChip) state.zoomChip.textContent = `GRID ${state.cols}×${state.rows} • ${Math.round(state.zoom * 100)}%`;
  updateReadout();
}

function updateReadout() {
  if (!state.controls.readout) return;
  const { width, height } = worldSize();
  const cycles = state.loopEnabled ? ` • cycle ${state.loopCycles}` : '';
  state.controls.readout.textContent = `${state.cols * state.rows} / batch • ${state.loopMode}${cycles} • ${width} × ${height} world • zoom ${Math.round(state.zoom * 100)}%`;
}

function screenCenterWorld() {
  if (!state.active || !state.zoom) return null;
  return { x: (stage.clientWidth * .5 - state.panX) / state.zoom, y: (stage.clientHeight * .5 - state.panY) / state.zoom };
}

function centerWorldPoint(x, y) {
  state.panX = stage.clientWidth * .5 - x * state.zoom;
  state.panY = stage.clientHeight * .5 - y * state.zoom;
  applyView();
}

function bindViewportInput() {
  stage.addEventListener('wheel', (event) => {
    if (!state.active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const factor = event.deltaY > 0 ? .9 : 1.1;
    setZoom(state.zoom * factor, { x: event.clientX, y: event.clientY });
  }, { passive: false, capture: true });

  stage.addEventListener('pointerdown', (event) => {
    if (!state.active) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    state.dragging = true;
    state.dragPointerId = event.pointerId;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.dragPanX = state.panX;
    state.dragPanY = state.panY;
    stage.classList.add('is-effect-grid-panning');
    stage.setPointerCapture?.(event.pointerId);
  }, true);

  stage.addEventListener('pointermove', (event) => {
    if (!state.dragging || event.pointerId !== state.dragPointerId) return;
    state.panX = state.dragPanX + (event.clientX - state.dragStartX);
    state.panY = state.dragPanY + (event.clientY - state.dragStartY);
    applyView();
  });

  const endPan = (event) => {
    if (!state.dragging || (event.pointerId != null && event.pointerId !== state.dragPointerId)) return;
    state.dragging = false;
    state.dragPointerId = null;
    stage.classList.remove('is-effect-grid-panning');
  };
  stage.addEventListener('pointerup', endPan);
  stage.addEventListener('pointercancel', endPan);
}

function watchWorkspace() {
  const observer = new MutationObserver(() => {
    if (document.body.dataset.workspaceMode === 'play' && state.active) {
      state.fx?.stopAll?.('effect-grid-exit');
      deactivateGrid();
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-workspace-mode'] });
}

function handleResize() {
  if (!state.active) {
    resetWorldGeometry();
    requestAnimationFrame(() => state.rawResize?.());
    return;
  }
  if (state.controls.autoFit?.checked) fitGrid();
}

addStylesheet();
waitForRuntime()
  .then((lab) => {
    state.lab = lab;
    state.fx = lab.fx;
    installWorld(lab);
    createDebugHierarchy();
    injectControls();
    bindViewportInput();
    watchWorkspace();
    window.addEventListener('resize', () => window.setTimeout(handleResize, 0));

    globalThis.FXDeckEffectGrid = {
      spawn: () => spawnGrid({ reset: true }),
      stop: () => stopGrid({ resetView: false }),
      fit: fitGrid,
      activate: activateGrid,
      deactivate: deactivateGrid,
      isActive: () => state.active,
      getState: () => ({
        active: state.active,
        cols: state.cols,
        rows: state.rows,
        cellSize: state.cellSize,
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
        directionPattern: state.directionPattern,
        loop: state.loopEnabled,
        loopMode: state.loopMode,
        loopCycles: state.loopCycles
      })
    };

    updateReadout();
    appendLog(`${BUILD} Effect Grid ready: primary real-effect scaling, clean-replace loop default, explicit stack/soak mode, auto-respawn on grid changes`);
  })
  .catch((error) => {
    appendLog(`${BUILD} Effect Grid Lab FAIL: ${error.message}`);
    console.error(error);
  });