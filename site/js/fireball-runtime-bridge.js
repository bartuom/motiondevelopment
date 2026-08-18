import { DomSpriteAdapter } from '../fxdeck/adapters/dom-sprite-adapter.js?v=p3.6.3';
import { registerFireball } from '../fxdeck/effects/fireball.js?v=p3.6.3';

const BUILD = 'P3.6.3';
const host = document.querySelector('#impact-dom-layer');
const effectInput = document.querySelector('#effect-select');
const particlePathInput = document.querySelector('#particle-path');
const logOutput = document.querySelector('#p2-log');

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
    ['Projectile head', 'independent visual handle'],
    ['Trail', 'sampled emission-point bursts'],
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
  if (pathNode) pathNode.textContent = `visual handle + ${pathLabel(particlePathInput?.value)} trail/impact`;
}

function appendLog(message) {
  if (!logOutput) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

if (!host) {
  console.error(`${BUILD} Fireball bridge: #impact-dom-layer is missing.`);
} else {
  waitForFx()
    .then((fx) => {
      registerFireball(fx);
      const visualAdapter = new DomSpriteAdapter({ host });
      fx.setAdapter('visuals', visualAdapter);
      if (globalThis.FXDeckLab) globalThis.FXDeckLab.visualAdapter = visualAdapter;
      appendLog(`${BUILD} Fireball concurrency fix active: definition refreshed, independent visual handles attached, trail uses sampled particle bursts`);
      refreshFireballInspector();
    })
    .catch((error) => {
      appendLog(`${BUILD} Fireball bridge FAIL: ${error.message}`);
      console.error(error);
    });
}

for (const element of [effectInput, particlePathInput, document.querySelector('#intensity'), document.querySelector('#direction')]) {
  element?.addEventListener('change', () => window.setTimeout(refreshFireballInspector, 0));
  element?.addEventListener('input', () => window.setTimeout(refreshFireballInspector, 0));
}

window.setInterval(refreshFireballInspector, 300);
