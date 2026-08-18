const UI_BUILD = 'P3.6.1';

const body = document.body;
const workspaceTabs = [...document.querySelectorAll('[data-workspace-tab]')];
const workspacePanels = [...document.querySelectorAll('[data-workspace-panel]')];
const hud = document.querySelector('#runtime-hud');
const hudMode = document.querySelector('#hud-mode');

const hudMetrics = {
  fps: document.querySelector('#metric-fps'),
  low: document.querySelector('#metric-low'),
  particles: document.querySelector('#metric-particles'),
  instances: document.querySelector('#metric-instances'),
  queued: document.querySelector('#metric-queued'),
  pressure: document.querySelector('#metric-queue-pressure'),
  path: document.querySelector('#metric-burst-path')
};

function setWorkspace(mode) {
  const next = mode === 'debug' ? 'debug' : 'play';
  body.dataset.workspaceMode = next;

  for (const tab of workspaceTabs) {
    const active = tab.dataset.workspaceTab === next;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  }

  for (const panel of workspacePanels) {
    panel.hidden = panel.dataset.workspacePanel !== next;
  }

  try { localStorage.setItem('fxdeck-runtime-workspace', next); } catch {}
}

function setHudMode(mode) {
  const next = ['off', 'basic', 'full'].includes(mode) ? mode : 'basic';
  if (hud) hud.dataset.mode = next;
  if (hudMode) hudMode.value = next;
  try { localStorage.setItem('fxdeck-runtime-hud', next); } catch {}
}

function clearState(element) {
  const row = element?.closest?.('.hud-stat');
  if (!row) return null;
  row.classList.remove('is-good', 'is-warn', 'is-bad', 'is-info');
  return row;
}

function setState(element, state) {
  const row = clearState(element);
  if (!row || !state) return;
  row.classList.add(`is-${state}`);
}

function numericText(element) {
  const value = Number.parseFloat(element?.textContent ?? '');
  return Number.isFinite(value) ? value : null;
}

function fpsState(value) {
  if (value == null) return null;
  if (value >= 58) return 'good';
  if (value >= 45) return 'warn';
  return 'bad';
}

function pressureState(text = '') {
  const value = text.toLowerCase();
  if (value.includes('critical') || value.includes('high')) return 'bad';
  if (value.includes('medium')) return 'warn';
  return 'good';
}

function pathLabel(path) {
  if (path === 'scheduled') return 'shared-scheduled';
  if (path === 'shared') return 'shared-direct';
  if (path === 'emitter') return 'per-play-emitter';
  return path || '--';
}

function refreshHud() {
  const fps = numericText(hudMetrics.fps);
  const low = numericText(hudMetrics.low);
  setState(hudMetrics.fps, fpsState(fps));
  setState(hudMetrics.low, fpsState(low));
  setState(hudMetrics.particles, 'info');
  setState(hudMetrics.instances, 'info');

  const fx = globalThis.FXDeck;
  const stats = fx?.getStats?.();
  const particleStats = stats?.particles;

  if (particleStats) {
    const queued = particleStats.queuedParticles ?? 0;
    if (hudMetrics.queued) hudMetrics.queued.textContent = String(queued);
    if (hudMetrics.path) hudMetrics.path.textContent = pathLabel(particleStats.burstMode);

    const pressure = particleStats.queuePressure ?? 'none';
    if (hudMetrics.queued) {
      setState(hudMetrics.queued, pressure === 'high' || pressure === 'critical' ? 'bad' : queued > 0 ? 'warn' : 'good');
    }
  }

  if (hudMetrics.pressure) setState(hudMetrics.pressure, pressureState(hudMetrics.pressure.textContent));
}

for (const tab of workspaceTabs) {
  tab.addEventListener('click', () => setWorkspace(tab.dataset.workspaceTab));
}

hudMode?.addEventListener('change', () => setHudMode(hudMode.value));

let initialWorkspace = 'play';
let initialHud = 'basic';
try {
  initialWorkspace = localStorage.getItem('fxdeck-runtime-workspace') || initialWorkspace;
  initialHud = localStorage.getItem('fxdeck-runtime-hud') || initialHud;
} catch {}

setWorkspace(initialWorkspace);
setHudMode(initialHud);
refreshHud();
window.setInterval(refreshHud, 250);

console.info(`FXDeck Runtime Lab UI ${UI_BUILD}: clean Play/Debug workspaces + runtime HUD ready.`);
