import { registerRareReward } from '../fxdeck/effects/rare-reward.js?v=p3.9.0';

const BUILD = 'P3.9.0';
const effectInput = document.querySelector('#effect-select');
const particlePathInput = document.querySelector('#particle-path');
const intensityInput = document.querySelector('#intensity');
const directionInput = document.querySelector('#direction');
const playButton = document.querySelector('#play-impact');
const stage = document.querySelector('#impact-stage');
const logOutput = document.querySelector('#p2-log');
const apiPreview = document.querySelector('#api-preview');
const intensityLabel = intensityInput?.closest('.control')?.querySelector('.range-row span');
const directionLabel = directionInput?.closest('.control')?.querySelector('.range-row span');
const originalIntensityLabel = intensityLabel?.textContent ?? 'Runtime intensity';
const originalDirectionLabel = directionLabel?.textContent ?? 'Runtime direction';

let fx = null;
let rewardPosition = {
  x: Math.max(1, stage?.clientWidth ?? 1) * .5,
  y: Math.max(1, stage?.clientHeight ?? 1) * .5
};
let rewardUiActive = false;

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
      if (globalThis.FXDeck?.play && globalThis.FXDeckLab?.screenKickController) return resolve(globalThis.FXDeck);
      if (performance.now() - startedAt > timeoutMs) return reject(new Error('FXDeck runtime was not ready for Rare Reward.'));
      window.setTimeout(poll, 20);
    };
    poll();
  });
}

function ensureOption() {
  if (!effectInput || effectInput.querySelector('option[value="rareReward"]')) return;
  const option = document.createElement('option');
  option.value = 'rareReward';
  option.textContent = 'Rare Reward — premium card reveal';
  effectInput.prepend(option);
}

function isRareSelected() {
  return effectInput?.value === 'rareReward';
}

function setText(selector, text) {
  const node = document.querySelector(selector);
  if (node) node.textContent = text;
}

function pathLabel(path) {
  if (path === 'scheduled') return 'shared-scheduled';
  if (path === 'shared') return 'shared-direct';
  return 'per-play-emitter';
}

function scaledCount(base, intensity, floorScale = .65) {
  return Math.max(1, Math.round(base * Math.max(floorScale, intensity)));
}

function setTimeline(spec) {
  const timeline = document.querySelector('#effect-timeline');
  if (!timeline) return;
  const rows = [
    [spec.timings.cardIn, 'Card materialize / flip-in'],
    [spec.timings.preflash, 'Hero preflash'],
    [spec.timings.crest, 'Crest / rune reveal'],
    [spec.timings.shards, 'Rarity shard halo'],
    [spec.timings.glitter, 'Glitter field'],
    [spec.timings.title, 'Rarity + reward title'],
    [spec.timings.crown, 'Crown motes'],
    [spec.timings.fade, 'Settle → fade'],
    [spec.duration, 'Owned cleanup']
  ];

  timeline.replaceChildren(...rows.map(([time, label]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = `${time} ms`;
    dd.textContent = label;
    row.append(dt, dd);
    return row;
  }));
}

function currentDefinition() {
  try {
    return fx?.resolve?.('rareReward', { version: 'v1', variant: 'default' })?.definition ?? null;
  } catch {
    return null;
  }
}

function currentParams(position = rewardPosition) {
  return {
    version: 'v1',
    variant: 'default',
    position: { ...position },
    direction: Number(directionInput?.value ?? 28),
    intensity: Number(intensityInput?.value ?? 1),
    hooks: {
      screenKick({ direction, distance }) {
        globalThis.FXDeckLab?.screenKickController?.kick?.(direction, distance);
      }
    }
  };
}

function updateInspector() {
  if (!isRareSelected()) return;
  const definition = currentDefinition();
  const spec = definition?.spec;
  if (!spec) return;

  const intensity = Math.max(.5, Math.min(2, Number(intensityInput?.value ?? 1)));
  const direction = Number(directionInput?.value ?? 28);
  const counts = {
    preflash: scaledCount(spec.particles.preflash, intensity, .75),
    shards: scaledCount(spec.particles.shards, intensity),
    glitter: scaledCount(spec.particles.glitter, intensity, .7),
    crown: scaledCount(spec.particles.crown, intensity, .75)
  };

  setText('#resolved-effect', 'rareReward/v1/default');
  setText('#resolved-path', `DOM/SVG card + ${pathLabel(particlePathInput?.value)} particles`);
  setText('#resolved-intensity', `${intensity.toFixed(1)}×`);
  setText('#resolved-direction', `${Math.round(direction)}° reveal-light angle`);

  const layers = [
    ['Hero visual', `${spec.card.width}×${spec.card.height} DOM/SVG card`],
    ['Preflash', `${counts.preflash} hero motes`],
    ['Shards', `${counts.shards} rarity shards`],
    ['Glitter', `${counts.glitter} particles`],
    ['Crown', `${counts.crown} rising motes`]
  ];

  layers.forEach(([label, value], index) => {
    const key = ['a', 'b', 'c', 'd', 'e'][index];
    setText(`#resolved-layer-${key}-label`, label);
    setText(`#resolved-layer-${key}`, value);
  });

  setText('#resolved-screen-kick', `${(1.4 + intensity * .65).toFixed(1)} px subtle accent`);
  setText('#resolved-position', `${Math.round(rewardPosition.x)}, ${Math.round(rewardPosition.y)} CSS px`);
  setText('#metric-burst-path', pathLabel(particlePathInput?.value));

  if (apiPreview) {
    apiPreview.textContent = `FXDeck.play("rareReward", {\n  version: "v1",\n  variant: "default",\n  position: { x: ${Math.round(rewardPosition.x)}, y: ${Math.round(rewardPosition.y)} },\n  direction: ${Math.round(direction)},\n  intensity: ${intensity.toFixed(1)}\n});`;
  }
}

function tuneGridForCard() {
  const apply = () => {
    if (!isRareSelected()) return true;
    const cell = document.querySelector('#effect-grid-cell');
    if (!cell) return false;
    if (Number(cell.value) < 340) {
      cell.value = '340';
      cell.dispatchEvent(new Event('input', { bubbles: true }));
      cell.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  };

  if (apply()) return;
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (apply() || attempts > 120) window.clearInterval(timer);
  }, 50);
}

function setRareUi() {
  const definition = currentDefinition();
  const spec = definition?.spec;
  rewardUiActive = true;
  document.body.dataset.effectMode = 'rare-reward';

  setText('#authored-version-label', 'v1 — Rare Reward');
  setText('#preview-title', 'Rare Reward premium reveal');
  setText('#preview-note', 'Click Preview to reveal at position; direction rotates the reveal light');
  setText('#caption-title', 'rareReward / v1 / default');
  setText('#caption-note', 'DOM/SVG card → rarity halo → particles → settle');
  setText('#effect-summary', definition?.summary ?? 'Premium UI/card-space reward reveal.');
  if (playButton) playButton.textContent = 'Reveal Rare Reward';
  if (intensityLabel) intensityLabel.textContent = 'Reward intensity';
  if (directionLabel) directionLabel.textContent = 'Reveal light angle';
  if (spec) setTimeline(spec);
  updateInspector();
  tuneGridForCard();
}

function restoreRareUi() {
  if (!rewardUiActive) return;
  rewardUiActive = false;
  if (document.body.dataset.effectMode === 'rare-reward') delete document.body.dataset.effectMode;
  if (intensityLabel) intensityLabel.textContent = originalIntensityLabel;
  if (directionLabel) directionLabel.textContent = originalDirectionLabel;
  if (playButton) playButton.textContent = 'FXDeck.play()';
}

function playReward(position = rewardPosition) {
  if (!fx) return null;
  rewardPosition = { ...position };
  const params = currentParams(rewardPosition);
  const instance = fx.play('rareReward', params);
  appendLog(`PLAY ${instance.id} rareReward/v1/default [${pathLabel(particlePathInput?.value)}] @ ${Math.round(position.x)},${Math.round(position.y)} intensity ${Number(params.intensity).toFixed(1)} angle ${Number(params.direction).toFixed(0)}°`);
  instance.ready
    .then(() => {
      const resolved = instance.resolved;
      if (!resolved) return;
      const particles = Object.values(resolved.particleLayers ?? {}).reduce((sum, value) => sum + Number(value || 0), 0);
      appendLog(`READY ${instance.id}: ${resolved.cardSize?.width ?? 224}×${resolved.cardSize?.height ?? 320} DOM/SVG card + ${particles} requested particle accents / ${resolved.duration}ms`);
    })
    .catch((error) => appendLog(`ERROR ${instance.id}: ${error.message}`));
  updateInspector();
  return instance;
}

function onEffectChangeCapture(event) {
  if (!isRareSelected()) {
    restoreRareUi();
    return;
  }

  event.stopImmediatePropagation();
  fx?.stopAll?.('effect-switch-rare-reward');
  globalThis.FXDeckLab?.screenKickController?.reset?.();
  rewardPosition = { x: Math.max(1, stage?.clientWidth ?? 1) * .5, y: Math.max(1, stage?.clientHeight ?? 1) * .5 };
  setRareUi();
  appendLog('EFFECT → rareReward');

  effectInput.dispatchEvent(new Event('input', { bubbles: true }));
  const grid = globalThis.FXDeckEffectGrid;
  if (grid?.isActive?.()) window.setTimeout(() => grid.spawn(), 0);
}

function bindInteractions() {
  effectInput?.addEventListener('change', onEffectChangeCapture, true);

  playButton?.addEventListener('click', (event) => {
    if (!isRareSelected()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    playReward(rewardPosition);
  }, true);

  stage?.addEventListener('pointerdown', (event) => {
    if (!isRareSelected()) return;
    if (document.body.dataset.workspaceMode === 'debug' || globalThis.FXDeckEffectGrid?.isActive?.()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = stage.getBoundingClientRect();
    playReward({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, true);

  intensityInput?.addEventListener('input', () => {
    if (isRareSelected()) updateInspector();
  });
  directionInput?.addEventListener('input', () => {
    if (isRareSelected()) updateInspector();
  });
  particlePathInput?.addEventListener('change', () => {
    if (isRareSelected()) updateInspector();
  });
}

async function install() {
  fx = await waitForRuntime();
  registerRareReward(fx);
  ensureOption();
  bindInteractions();

  effectInput.value = 'rareReward';
  effectInput.dispatchEvent(new Event('change', { bubbles: true }));

  globalThis.FXDeckRareRewardLab = {
    play: playReward,
    getPosition: () => ({ ...rewardPosition })
  };

  appendLog(`${BUILD} Rare Reward ready: owned DOM/SVG card reveal + particle accents + Grid-compatible large-card probe`);
}

await install().catch((error) => {
  appendLog(`${BUILD} Rare Reward bridge FAIL: ${error.message}`);
  console.error(error);
});
