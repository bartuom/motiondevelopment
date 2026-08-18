const BUILD = 'P3.7.0';
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
  link.href = './effect-grid-lab.css?v=p3.7.0';
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

  // The grid camera keeps a fixed backing canvas while the logical world grows.
  // CoordinateAdapter uses clientWidth/clientHeight, so world-space points are
  // projected into the existing canvas without allocating a huge mobile canvas.
  lab.particleAdapter.coordinates.stage = world;
  lab.particleAdapter.resize = () => {
    if (state.active) return;
    return state.rawResize();
  };

  resetWorldGeometry();
  requestAnimationFrame(() => state.rawResize());
}

function injectControls() {
  if (!debugPanel || document.querySelector('#effect-grid-tool')) return;

  const panel = document.createElement('section');
  panel.id = 'effect-grid-tool';
  panel.className = 'effect-grid-tool';
  panel.innerHTML = `
    <div class="effect-grid-tool__head">
      <div><p class="label">Effect Grid Lab</p><strong>Real-effect scale test</strong></div>
      <span class="effect-grid-tool__badge">P3.7.0</span>
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
    <div class="effect-grid-tool__actions">
      <button id="effect-grid-spawn" type="button">Spawn Grid</button>
      <button id="effect-grid-fit" type="button">Fit Grid</button>
      <button id="effect-grid-loop" type="button">Loop: Off</button>
      <button id="effect-grid-stop" type="button">Stop Grid</button>
    </div>
    <div id="effect-grid-readout" class="effect-grid-tool__readout">24 instances • 640 × 960 world • zoom 100%</div>
    <p class="effect-grid-tool__hint">Mouse wheel zooms the virtual viewport. Drag the preview to pan. Grid spawns the selected effect through normal <code>FXDeck.play()</code>; Lab-only target/screen hooks are intentionally omitted so cells do not fight over one shared target.</p>
  `;

  const firstDebugGroup = debugPanel.querySelector('.debug-group');
  debugPanel.insertBefore(panel, firstDebugGroup ?? debugPanel.firstChild);

  state.controls = {
    preset: panel.querySelector('#effect-grid-preset'),
    cell: panel.querySelector('#effect-grid-cell'),
    cellValue: panel.querySelector('#effect-grid-cell-value'),
    direction: panel.querySelector('#effect-grid-direction'),
    zoom: panel.querySelector('#effect-grid-zoom'),
    zoomValue: panel.querySelector('#effect-grid-zoom-value'),
    autoFit: panel.querySelector('#effect-grid-auto-fit'),
    loopMs: panel.querySelector('#effect-grid-loop-ms'),
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
  });
  state.controls.cell.addEventListener('input', () => {
    state.cellSize = Number(state.controls.cell.value);
    state.controls.cellValue.textContent = `${state.cellSize} px`;
    rebuildGrid({ preserveView: false });
  });
  state.controls.direction.addEventListener('change', () => { state.directionPattern = state.controls.direction.value; });
  state.controls.zoom.addEventListener('input', () => setZoom(Number(state.controls.zoom.value) / 100));
  state.controls.loopMs.addEventListener('change', () => {
    state.loopInterval = clamp(Number(state.controls.loopMs.value) || 1000, 250, 5000);
    state.controls.loopMs.value = String(state.loopInterval);
    if (state.loopEnabled) restartLoop();
  });
  state.controls.spawn.addEventListener('click', () => spawnGrid({ reset: true }));
  state.controls.fit.addEventListener('click', () => { activateGrid(); fitGrid(); });
  state.controls.loop.addEventListener('click', toggleLoop);
  state.controls.stop.addEventListener('click', () => stopGrid({ resetView: false }));
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
  else fitGrid();
  updateReadout();
}

function gridPositions() {
  const points = [];
  for (let row = 0; row < state.rows; row++) {
    for (let col = 0; col < state.cols; col++) {
      points.push({
        index: row * state.cols + col,
        row,
        col,
        x: (col + .5) * state.cellSize,
        y: (row + .5) * state.cellSize
      });
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

function spawnBatch() {
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

  appendLog(`GRID SPAWN ${effectId}: ${points.length} instances / ${state.cols}×${state.rows} / cell ${state.cellSize}px / zoom ${(state.zoom * 100).toFixed(0)}% / ${state.directionPattern}`);
}

function spawnGrid({ reset = true } = {}) {
  activateGrid();
  if (state.controls.autoFit?.checked) fitGrid();
  if (reset) state.fx?.stopAll?.('effect-grid-respawn');
  spawnBatch();
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
  state.controls.loop?.classList.add('is-active');
  if (state.controls.loop) state.controls.loop.textContent = 'Loop: On';
  spawnGrid({ reset: true });
  restartLoop();
}

function restartLoop() {
  if (state.loopTimer) window.clearInterval(state.loopTimer);
  if (!state.loopEnabled) return;
  state.loopTimer = window.setInterval(() => spawnBatch(), state.loopInterval);
}

function stopLoop() {
  if (state.loopTimer) window.clearInterval(state.loopTimer);
  state.loopTimer = 0;
  state.loopEnabled = false;
  state.controls.loop?.classList.remove('is-active');
  if (state.controls.loop) state.controls.loop.textContent = 'Loop: Off';
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
  state.controls.readout.textContent = `${state.cols * state.rows} instances • ${width} × ${height} world • zoom ${Math.round(state.zoom * 100)}%`;
}

function screenCenterWorld() {
  if (!state.active || !state.zoom) return null;
  return {
    x: (stage.clientWidth * .5 - state.panX) / state.zoom,
    y: (stage.clientHeight * .5 - state.panY) / state.zoom
  };
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
        loop: state.loopEnabled
      })
    };

    updateReadout();
    appendLog(`${BUILD} Effect Grid Lab ready: real FXDeck.play() grid, virtual world, wheel zoom, drag pan, Fit Grid and loop`);
  })
  .catch((error) => {
    appendLog(`${BUILD} Effect Grid Lab FAIL: ${error.message}`);
    console.error(error);
  });
