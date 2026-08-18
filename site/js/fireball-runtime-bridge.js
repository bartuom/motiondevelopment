import { DomSpriteAdapter } from '../fxdeck/adapters/dom-sprite-adapter.js?v=p3.9.0';
import { registerFireball } from '../fxdeck/effects/fireball.js?v=p3.6.4';

const BUILD = 'P3.9.0';
const host = document.querySelector('#impact-dom-layer');
const effectInput = document.querySelector('#effect-select');
const particlePathInput = document.querySelector('#particle-path');
const logOutput = document.querySelector('#p2-log');
const visualMetric = document.querySelector('#metric-visuals');

let visualAdapter = null;

function waitForFx(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const tick = () => {
      if (globalThis.FXDeck?.setAdapter) return resolve(globalThis.FXDeck);
      if (performance.now() - startedAt >= timeoutMs) return reject(new Error('FXDeck runtime was not ready in time.'));
      window.setTimeout(tick, 20);
    };
    tick();
  });
}

function pathLabel(path) {
  if (path === 'scheduled') return 'shared-scheduled';
  if (path === 'shared') return 'shared-direct';
  return 'per-play-emitter';
}

function refreshFireballInspector() {
  if (effectInput?.value !== 'fireball') return;
  const values = [
    ['Projectile head', 'independent compositor visual'],
    ['Trail', 'built-in tail + sparse embers (96 ms)'],
    ['Travel', '250 px'],
    ['Duration', '560 ms'],
    ['Impact', 'FXDeck.play("explosion")']
  ];

  values.forEach(([label, value], index) => {
    const key = ['a', 'b', 'c', 'd', 'e'][index];
    const labelNode = document.querySelector(`#resolved-layer-${key}-label`);
    const valueNode = document.querySelector(`#resolved-layer-${key}`);
    if (labelNode) labelNode.textContent = label;
    if (valueNode) valueNode.textContent = value;
  });

  const pathNode = document.querySelector('#resolved-path');
  if (pathNode) pathNode.textContent = `compositor visual + ${pathLabel(particlePathInput?.value)} sparse trail/impact`;
}

function refreshVisualMetric() {
  if (!visualMetric) return;
  visualMetric.textContent = String(visualAdapter?.getStats?.().activeVisuals ?? 0);
}

function appendLog(message) {
  if (!logOutput) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function normalizeVisibleBuild() {
  const eyebrow = document.querySelector('.eyebrow');
  const hudBuild = document.querySelector('.runtime-hud__build');
  const intro = document.querySelector('.intro');
  if (eyebrow) eyebrow.textContent = `FXDeck / Runtime / Build ${BUILD}`;
  if (hudBuild) hudBuild.textContent = BUILD;
  if (intro) intro.textContent = 'P3.9.0 adds the portfolio-facing Rare Reward archetype: a large owned DOM/SVG card reveal with staged motion, rarity lighting and particle accents, using the same FXDeck lifecycle and zoomable real-effect Grid.';
  if (logOutput) logOutput.textContent = logOutput.textContent.replace(/P3\.(?:6\.[0-9]+|7\.[0-9]+|8\.[0-9]+)/g, BUILD);
}

async function loadEffectGridLab() {
  try {
    await import('./effect-grid-lab.js?v=p3.7.3');
    await import('./effect-grid-canvas-projection.js?v=p3.7.3');
    await import('./effect-grid-runtime-controls.js?v=p3.9.0');
  } catch (error) {
    appendLog(`${BUILD} Effect Grid import FAIL: ${error.message}`);
    console.error(error);
  }
}

if (!host) {
  console.error(`${BUILD} Fireball bridge: #impact-dom-layer is missing.`);
} else {
  waitForFx()
    .then(async (fx) => {
      registerFireball(fx);
      visualAdapter = new DomSpriteAdapter({ host });
      fx.setAdapter('visuals', visualAdapter);
      if (globalThis.FXDeckLab) globalThis.FXDeckLab.visualAdapter = visualAdapter;

      effectInput?.dispatchEvent(new Event('change'));
      normalizeVisibleBuild();
      appendLog(`${BUILD} Runtime capability pass: Fireball + Environment baselines retained; Rare Reward UI/card reveal loading`);
      refreshFireballInspector();
      refreshVisualMetric();

      await import('./environment-runtime-bridge.js?v=p3.8.1');
      await import('./rare-reward-runtime-bridge.js?v=p3.9.0');
      await loadEffectGridLab();
    })
    .catch((error) => {
      appendLog(`${BUILD} Runtime bridge FAIL: ${error.message}`);
      console.error(error);
    });
}

for (const element of [effectInput, particlePathInput, document.querySelector('#intensity'), document.querySelector('#direction')]) {
  element?.addEventListener('change', () => window.setTimeout(refreshFireballInspector, 0));
  element?.addEventListener('input', () => window.setTimeout(refreshFireballInspector, 0));
}

window.setInterval(() => {
  refreshFireballInspector();
  refreshVisualMetric();
}, 250);
