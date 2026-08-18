import { registerFootballCardReveal } from '../fxdeck/effects/football-card-reveal.js?v=p3.10.0';

const BUILD = 'P3.10.0';
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
const directionNote = directionInput?.closest('.control')?.querySelector('.control-note');
const variantOption = document.querySelector('.control-row .control:nth-child(2) option');
const originalIntensityLabel = intensityLabel?.textContent ?? 'Runtime intensity';
const originalDirectionLabel = directionLabel?.textContent ?? 'Runtime direction';
const originalDirectionNote = directionNote?.textContent ?? '';
const originalVariant = variantOption?.textContent ?? 'default';

let fx = null;
let uiActive = false;
let activeCard = null;
let cardPosition = {
  x: Math.max(1, stage?.clientWidth ?? 1) * .5,
  y: Math.max(1, stage?.clientHeight ?? 1) * .5
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
      if (globalThis.FXDeck?.play && globalThis.FXDeck?.update && globalThis.FXDeckLab?.screenKickController) return resolve(globalThis.FXDeck);
      if (performance.now() - startedAt > timeoutMs) return reject(new Error('FXDeck runtime/live-update was not ready for Football Card Reveal.'));
      window.setTimeout(poll, 20);
    };
    poll();
  });
}

function addStylesheet() {
  if (document.querySelector('link[data-football-card-reveal]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './football-card-reveal.css?v=p3.10.0';
  link.dataset.footballCardReveal = 'true';
  document.head.appendChild(link);
}

function ensureOption() {
  if (!effectInput || effectInput.querySelector('option[value="footballCardReveal"]')) return;
  const option = document.createElement('option');
  option.value = 'footballCardReveal';
  option.textContent = 'Football Card Reveal — interactive elite pack';
  effectInput.prepend(option);
}

function isSelected() {
  return effectInput?.value === 'footballCardReveal';
}

function pathLabel(path) {
  if (path === 'scheduled') return 'shared-scheduled';
  if (path === 'shared') return 'shared-direct';
  return 'per-play-emitter';
}

function setText(selector, text) {
  const node = document.querySelector(selector);
  if (node) node.textContent = text;
}

function definition() {
  try {
    return fx?.resolve?.('footballCardReveal', { version: 'v1', variant: 'elite' })?.definition ?? null;
  } catch {
    return null;
  }
}

function currentParams(position = cardPosition, extra = {}) {
  return {
    version: 'v1',
    variant: 'elite',
    position: { ...position },
    direction: Number(directionInput?.value ?? 24),
    intensity: Number(intensityInput?.value ?? 1),
    state: 'idle',
    hooks: {
      screenKick({ direction, distance }) {
        globalThis.FXDeckLab?.screenKickController?.kick?.(direction, distance);
      },
      footballCardBeat({ beat }) {
        appendLog(`CARD BEAT ${beat}`);
      }
    },
    ...extra
  };
}

function runningCards() {
  return [...(fx?.instances?.values?.() ?? [])].filter((instance) => instance.effectId === 'footballCardReveal' && instance.state === 'playing');
}

function setActive(instance) {
  if (!instance || instance.effectId !== 'footballCardReveal') return false;
  activeCard = instance;
  cardPosition = { ...(instance.params?.position ?? cardPosition) };
  updateInspector(instance);
  updateInteractionTools();
  return true;
}

function ensureInteractionTools() {
  let tools = document.querySelector('#football-card-tools');
  if (tools) return tools;

  tools = document.createElement('section');
  tools.id = 'football-card-tools';
  tools.className = 'environment-source-tools football-card-tools';
  tools.hidden = true;
  tools.innerHTML = `
    <div class="environment-source-tools__head">
      <strong>Card interaction</strong>
      <span id="football-card-count">0 cards</span>
    </div>
    <div class="environment-source-tools__actions">
      <button id="football-card-reveal-active" type="button">Reveal active</button>
      <button id="football-card-remove-active" type="button">Remove active</button>
    </div>
    <div id="football-card-readout" class="environment-source-tools__readout">Spawn a card. Click the card itself to reveal it.</div>
  `;

  playButton?.closest('.actions--primary')?.insertAdjacentElement('afterend', tools);

  tools.querySelector('#football-card-reveal-active')?.addEventListener('click', () => revealCard(activeCard));
  tools.querySelector('#football-card-remove-active')?.addEventListener('click', () => {
    if (!activeCard) return;
    const id = activeCard.id;
    fx.stop(activeCard, 'football-card-remove-active');
    if (activeCard?.id === id) activeCard = runningCards().at(-1) ?? null;
    updateInteractionTools();
    updateInspector(activeCard);
  });

  return tools;
}

function updateInteractionTools() {
  const tools = ensureInteractionTools();
  if (!tools) return;
  tools.hidden = !isSelected();
  const cards = runningCards();
  const count = tools.querySelector('#football-card-count');
  const reveal = tools.querySelector('#football-card-reveal-active');
  const remove = tools.querySelector('#football-card-remove-active');
  const readout = tools.querySelector('#football-card-readout');
  const resolvedState = activeCard?.resolved?.state ?? 'none';

  if (count) count.textContent = `${cards.length} card${cards.length === 1 ? '' : 's'}`;
  if (reveal) reveal.disabled = !activeCard || resolvedState === 'revealing' || resolvedState === 'revealed';
  if (remove) remove.disabled = !activeCard;
  if (readout) {
    readout.textContent = activeCard
      ? `active ${activeCard.id} • ${resolvedState} • click card = reveal • click empty Preview = spawn another`
      : 'Spawn a card. Click the card itself to reveal it.';
  }
}

function setTimeline(spec) {
  const timeline = document.querySelector('#effect-timeline');
  if (!timeline || !spec) return;
  const rows = [
    ['IDLE', 'Back card pulse + intermittent shimmer'],
    ['CLICK', 'Anticipation / elite tell'],
    [spec.timings.flipStart, '3D flip starts'],
    [spec.timings.edgeHit, 'Hero edge flash + streak hit'],
    [spec.timings.front, 'Front shell visible'],
    [spec.timings.nationality, 'Nationality'],
    [spec.timings.position, 'Position'],
    [spec.timings.club, 'Club'],
    [spec.timings.rating, '92 rating hit'],
    [spec.timings.portrait, 'Player portrait'],
    [spec.timings.name, 'Player name'],
    [spec.timings.rarityHit, 'Elite rarity hit'],
    [spec.timings.settleEnd, 'Readable final idle']
  ];

  timeline.replaceChildren(...rows.map(([time, label]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = typeof time === 'number' ? `${time} ms` : time;
    dd.textContent = label;
    row.append(dt, dd);
    return row;
  }));
}

function updateInspector(instance = activeCard) {
  if (!isSelected()) return;
  const spec = definition()?.spec;
  if (!spec) return;
  const intensity = Number(instance?.params?.intensity ?? intensityInput?.value ?? 1);
  const angle = Number(instance?.params?.directionDegrees ?? directionInput?.value ?? 24);
  const state = instance?.resolved?.state ?? 'idle / no active card';
  const particleScale = Math.max(.6, Math.min(1.5, .5 + intensity * .5));

  setText('#resolved-effect', 'footballCardReveal/v1/elite');
  setText('#resolved-path', `owned 3D DOM/SVG card + ${pathLabel(particlePathInput?.value)} accents`);
  setText('#resolved-intensity', `${intensity.toFixed(1)}× — whole reveal energy`);
  setText('#resolved-direction', `${Math.round(angle)}° — shimmer / reveal-light angle`);

  const layers = [
    ['Card state', state],
    ['Hero visual', `${spec.card.width}×${spec.card.height} double-sided card`],
    ['Edge hit', `~${Math.round((spec.particles.edgeStreaks + spec.particles.edgeSparks) * particleScale)} accents`],
    ['Info cascade', 'flag → ST → club → 92 → portrait → name'],
    ['Final', 'persistent revealed idle until stop']
  ];
  layers.forEach(([label, value], index) => {
    const key = ['a', 'b', 'c', 'd', 'e'][index];
    setText(`#resolved-layer-${key}-label`, label);
    setText(`#resolved-layer-${key}`, value);
  });

  setText('#resolved-screen-kick', `${(.7 + intensity * 1.1).toFixed(1)} px at flip edge`);
  const pos = instance?.params?.position ?? cardPosition;
  setText('#resolved-position', `${Math.round(pos.x)}, ${Math.round(pos.y)} CSS px`);
  setText('#metric-burst-path', pathLabel(particlePathInput?.value));

  if (apiPreview) {
    apiPreview.textContent = `const card = FXDeck.play("footballCardReveal", {\n  version: "v1",\n  variant: "elite",\n  position: { x: ${Math.round(pos.x)}, y: ${Math.round(pos.y)} },\n  direction: ${Math.round(angle)},\n  intensity: ${intensity.toFixed(1)}\n});\n\n// player clicks the card\nFXDeck.update(card, { state: "reveal" });\n\n// front remains readable\nFXDeck.stop(card);`;
  }
}

function setUi() {
  const def = definition();
  const spec = def?.spec;
  uiActive = true;
  document.body.dataset.effectMode = 'football-card';
  setText('#authored-version-label', 'v1 — Football Card Reveal');
  if (variantOption) variantOption.textContent = 'elite';
  setText('#preview-title', 'Football Card Reveal — elite pack opening');
  setText('#preview-note', 'Spawn a back card, then click the card to reveal it');
  setText('#caption-title', 'footballCardReveal / v1 / elite');
  setText('#caption-note', 'idle back → shimmer → click → flip hit → information cascade → final card');
  setText('#effect-summary', def?.summary ?? 'Interactive football collectible-card reveal.');
  if (playButton) playButton.textContent = 'Spawn Football Card';
  if (intensityLabel) intensityLabel.textContent = 'Reveal intensity';
  if (directionLabel) directionLabel.textContent = 'Shimmer / light angle';
  if (directionNote) directionNote.textContent = 'Direction is used as the premium light/shimmer angle and biases reveal streaks; it is not card travel.';
  setTimeline(spec);
  updateInteractionTools();
  updateInspector();
  tuneGridForCard();
}

function restoreUi() {
  if (!uiActive) return;
  uiActive = false;
  if (document.body.dataset.effectMode === 'football-card') delete document.body.dataset.effectMode;
  if (playButton) playButton.textContent = 'FXDeck.play()';
  if (intensityLabel) intensityLabel.textContent = originalIntensityLabel;
  if (directionLabel) directionLabel.textContent = originalDirectionLabel;
  if (directionNote) directionNote.textContent = originalDirectionNote;
  if (variantOption) variantOption.textContent = originalVariant;
  const tools = document.querySelector('#football-card-tools');
  if (tools) tools.hidden = true;
}

function spawnCard(position = cardPosition, extra = {}) {
  if (!fx) return null;
  cardPosition = { ...position };
  const instance = fx.play('footballCardReveal', currentParams(cardPosition, extra));
  setActive(instance);
  appendLog(`CARD SPAWN ${instance.id}: back idle @ ${Math.round(position.x)},${Math.round(position.y)} intensity ${Number(instance.params.intensity).toFixed(1)}`);

  instance.ready
    .then(() => {
      if (instance.state !== 'playing') return;
      updateInspector(instance);
      updateInteractionTools();
      appendLog(`CARD READY ${instance.id}: idle back / shimmer / click-to-reveal`);
    })
    .catch((error) => appendLog(`CARD ERROR ${instance.id}: ${error.message}`));

  instance.addCleanup(() => {
    if (activeCard?.id === instance.id) activeCard = runningCards().at(-1) ?? null;
    window.setTimeout(() => {
      updateInteractionTools();
      updateInspector(activeCard);
    }, 0);
  });

  return instance;
}

function revealCard(instance) {
  if (!instance || instance.state !== 'playing' || instance.effectId !== 'footballCardReveal') return false;
  setActive(instance);
  const state = instance.resolved?.state;
  if (state === 'revealing' || state === 'revealed') return false;
  fx.update(instance, { state: 'reveal' });
  appendLog(`CARD REVEAL ${instance.id}: click → anticipation → flip → staged elite reveal`);
  updateInspector(instance);
  updateInteractionTools();
  window.setTimeout(() => {
    if (instance.state === 'playing') {
      updateInspector(instance);
      updateInteractionTools();
    }
  }, 1500);
  return true;
}

function cardInstanceFromTarget(target) {
  const shell = target?.closest?.('[data-football-card-instance]');
  const id = shell?.getAttribute?.('data-football-card-instance');
  return id ? fx?.instances?.get?.(id) ?? null : null;
}

function tuneGridForCard() {
  const apply = () => {
    if (!isSelected()) return true;
    const cell = document.querySelector('#effect-grid-cell');
    if (!cell) return false;
    if (Number(cell.value) < 380) {
      cell.value = '380';
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

function onEffectChangeCapture(event) {
  if (!isSelected()) {
    restoreUi();
    return;
  }

  event.stopImmediatePropagation();
  fx?.stopAll?.('effect-switch-football-card');
  globalThis.FXDeckLab?.screenKickController?.reset?.();
  activeCard = null;
  cardPosition = { x: Math.max(1, stage?.clientWidth ?? 1) * .5, y: Math.max(1, stage?.clientHeight ?? 1) * .5 };
  setUi();
  appendLog('EFFECT → footballCardReveal/v1/elite');
  effectInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function bindInteractions() {
  effectInput?.addEventListener('change', onEffectChangeCapture, true);

  playButton?.addEventListener('click', (event) => {
    if (!isSelected()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    spawnCard(cardPosition);
  }, true);

  stage?.addEventListener('pointerdown', (event) => {
    if (!isSelected()) return;
    if (document.body.dataset.workspaceMode === 'debug' || globalThis.FXDeckEffectGrid?.isActive?.()) return;

    const card = cardInstanceFromTarget(event.target);
    event.preventDefault();
    event.stopImmediatePropagation();

    if (card) {
      revealCard(card);
      return;
    }

    const rect = stage.getBoundingClientRect();
    spawnCard({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, true);

  intensityInput?.addEventListener('input', () => {
    if (!isSelected()) return;
    if (activeCard?.resolved?.state === 'idle') fx.update(activeCard, { intensity: Number(intensityInput.value) });
    updateInspector(activeCard);
  });

  directionInput?.addEventListener('input', () => {
    if (!isSelected()) return;
    if (activeCard?.resolved?.state === 'idle') fx.update(activeCard, { direction: Number(directionInput.value) });
    updateInspector(activeCard);
  });

  particlePathInput?.addEventListener('change', () => {
    if (isSelected()) updateInspector(activeCard);
  });
}

async function install() {
  fx = await waitForRuntime();
  addStylesheet();
  registerFootballCardReveal(fx);
  ensureOption();
  ensureInteractionTools();
  bindInteractions();

  if (directionInput) directionInput.value = '24';
  setText('#direction-value', '24°');
  effectInput.value = 'footballCardReveal';
  effectInput.dispatchEvent(new Event('change', { bubbles: true }));

  globalThis.FXDeckFootballCardLab = {
    spawn: spawnCard,
    reveal: revealCard,
    revealActive: () => revealCard(activeCard),
    getActive: () => activeCard,
    getCards: () => runningCards()
  };

  appendLog(`${BUILD} Football Card ready: interactive idle-back → click reveal → persistent elite front`);
}

await install().catch((error) => {
  appendLog(`${BUILD} Football Card bridge FAIL: ${error.message}`);
  console.error(error);
});
