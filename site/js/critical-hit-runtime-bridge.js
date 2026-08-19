import { normalizeDirection } from '../fxdeck/core/fxdeck.js?v=p3.6.0';
import { registerCriticalHit } from '../fxdeck/effects/critical-hit.js?v=p3.11.0';

const BUILD = 'P3.11.1';
const stage = document.querySelector('#impact-stage');
const domLayer = document.querySelector('#impact-dom-layer');
const target = document.querySelector('#impact-target');
const effectInput = document.querySelector('#effect-select');
const intensityInput = document.querySelector('#intensity');
const directionInput = document.querySelector('#direction');
const particlePathInput = document.querySelector('#particle-path');
const playButton = document.querySelector('#play-impact');
const overlapButton = document.querySelector('#play-overlap');
const abButton = document.querySelector('#play-ab');
const logOutput = document.querySelector('#p2-log');
const apiPreview = document.querySelector('#api-preview');

let fx = null;
let active = false;
let position = {
  x: Math.max(1, stage?.clientWidth ?? 1) * .5,
  y: Math.max(1, stage?.clientHeight ?? 1) * .5
};

function waitForRuntime(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const poll = () => {
      if (globalThis.FXDeck?.play && globalThis.FXDeckLab?.screenKickController) return resolve(globalThis.FXDeck);
      if (performance.now() - startedAt > timeoutMs) return reject(new Error('FXDeck runtime was not ready for Critical Hit.'));
      window.setTimeout(poll, 20);
    };
    poll();
  });
}

function appendLog(message) {
  if (!logOutput) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function ensureStylesheet() {
  if (document.querySelector('link[data-critical-hit]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './critical-hit.css?v=p3.11.0';
  link.dataset.criticalHit = 'true';
  document.head.appendChild(link);
}

function ensureOption() {
  if (!effectInput || effectInput.querySelector('option[value="criticalHit"]')) return;
  const option = document.createElement('option');
  option.value = 'criticalHit';
  option.textContent = 'Critical Hit — ultra-short readability cue';
  const heavy = effectInput.querySelector('option[value="heavyImpact"]');
  if (heavy) heavy.insertAdjacentElement('afterend', option);
  else effectInput.appendChild(option);
}

function ensureGridOption() {
  const select = document.querySelector('#effect-grid-effect');
  if (!select || select.querySelector('option[value="criticalHit"]')) return;
  const source = effectInput?.querySelector('option[value="criticalHit"]');
  const option = document.createElement('option');
  option.value = 'criticalHit';
  option.textContent = source?.textContent ?? 'Critical Hit — ultra-short readability cue';
  const heavy = select.querySelector('option[value="heavyImpact"]');
  if (heavy) heavy.insertAdjacentElement('afterend', option);
  else select.appendChild(option);
}

function isSelected() {
  return effectInput?.value === 'criticalHit';
}

function setText(selector, text) {
  const node = document.querySelector(selector);
  if (node) node.textContent = text;
}

function moveTarget(point) {
  if (!target) return;
  target.style.left = `${point.x}px`;
  target.style.top = `${point.y}px`;
}

function createTransient(className, point, html = '') {
  const element = document.createElement('div');
  element.className = className;
  element.style.left = `${point.x}px`;
  element.style.top = `${point.y}px`;
  if (html) element.innerHTML = html;
  domLayer?.appendChild(element);
  return element;
}

function animateTransient(element, keyframes, options) {
  const animation = element.animate(keyframes, options);
  animation.finished.catch(() => {}).finally(() => element.remove());
  return () => {
    animation.cancel();
    element.remove();
  };
}

function createHooks() {
  return {
    criticalSlash({ position: point, directionDegrees, intensity }) {
      const slash = createTransient('critical-hit-slash', point, '<i></i><b></b>');
      const scale = Math.min(1.42, .82 + intensity * .22);
      return animateTransient(slash, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scaleX(.18) scaleY(.72)` },
        { opacity: 1, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scaleX(${scale}) scaleY(1)`, offset: .16 },
        { opacity: .78, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scaleX(${scale * 1.08}) scaleY(.94)`, offset: .42 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scaleX(${scale * 1.16}) scaleY(.86)` }
      ], { duration: 118, easing: 'cubic-bezier(.08,.82,.16,1)', fill: 'forwards' });
    },

    criticalFlash({ position: point, directionDegrees, intensity }) {
      const flash = createTransient('critical-hit-flash', point);
      const scale = Math.min(1.35, .72 + intensity * .24);
      return animateTransient(flash, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(.2)` },
        { opacity: 1, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale})`, offset: .12 },
        { opacity: .34, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale * 1.08})`, offset: .42 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale * 1.24})` }
      ], { duration: 92, easing: 'cubic-bezier(.08,.76,.14,1)', fill: 'forwards' });
    },

    criticalLabel({ position: point, direction, intensity }) {
      const label = createTransient('critical-hit-label', {
        x: point.x - direction.y * 18,
        y: point.y + direction.x * 18
      });
      label.textContent = 'CRIT';
      const driftX = -direction.y * (10 + intensity * 3);
      const driftY = direction.x * (10 + intensity * 3) - 8;
      return animateTransient(label, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.72)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1.06)', offset: .18 },
        { opacity: .92, transform: 'translate(-50%, -50%) scale(1)', offset: .46 },
        { opacity: 0, transform: `translate(calc(-50% + ${driftX.toFixed(1)}px), calc(-50% + ${driftY.toFixed(1)}px)) scale(.96)` }
      ], { duration: 170, easing: 'cubic-bezier(.14,.72,.2,1)', fill: 'forwards' });
    },

    targetKick({ direction, distance }) {
      if (!target) return;
      const dx = direction.x * distance;
      const dy = direction.y * distance;
      const animation = target.animate([
        { transform: 'translate(-50%, -50%) scale(1)' },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.955)`, offset: .16 },
        { transform: `translate(calc(-50% + ${dx * .18}px), calc(-50% + ${dy * .18}px)) scale(1.018)`, offset: .48 },
        { transform: 'translate(-50%, -50%) scale(1)' }
      ], { duration: 138, easing: 'cubic-bezier(.12,.8,.18,1)' });
      return () => animation.cancel();
    },

    screenKick({ direction, distance }) {
      globalThis.FXDeckLab?.screenKickController?.kick(direction, distance);
    }
  };
}

function currentParams(point = position) {
  return {
    version: 'v1',
    variant: 'default',
    position: { ...point },
    direction: Number(directionInput?.value ?? 18),
    intensity: Number(intensityInput?.value ?? 1),
    hooks: createHooks()
  };
}

function pathLabel() {
  const path = globalThis.FXDeckLab?.particleAdapter?.getBurstMode?.() ?? particlePathInput?.value ?? 'scheduled';
  if (path === 'scheduled') return 'shared-scheduled';
  if (path === 'shared') return 'shared-direct';
  return 'per-play-emitter';
}

function updateApi() {
  if (!apiPreview || !isSelected()) return;
  apiPreview.textContent = `FXDeck.play("criticalHit", {\n  version: "v1",\n  variant: "default",\n  position: { x: ${Math.round(position.x)}, y: ${Math.round(position.y)} },\n  direction: ${Number(directionInput?.value ?? 18)},\n  intensity: ${Number(intensityInput?.value ?? 1).toFixed(1)}\n});`;
}

function setTimeline() {
  const timeline = document.querySelector('#effect-timeline');
  if (!timeline) return;
  const rows = [
    ['0 ms', 'Immediate directional slash + contact flash'],
    ['0 ms', 'Narrow hero streak fan'],
    ['6 ms', 'Compact shard burst'],
    ['18 ms', 'Target snap'],
    ['24 ms', 'Restrained screen kick'],
    ['34 ms', 'CRIT readability accent'],
    ['260 ms', 'Hard lifecycle cleanup']
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

function updateInspector() {
  if (!isSelected()) return;
  const intensity = Math.max(.25, Number(intensityInput?.value ?? 1));
  const direction = normalizeDirection(Number(directionInput?.value ?? 18));
  const streaks = Math.max(6, Math.round(14 * Math.max(.72, Math.min(1.7, intensity))));
  const shards = Math.max(3, Math.round(7 * Math.max(.78, Math.min(1.45, intensity))));

  setText('#resolved-effect', 'criticalHit / v1 / default');
  setText('#resolved-path', pathLabel());
  setText('#resolved-intensity', `${intensity.toFixed(1)}×`);
  setText('#resolved-direction', `${direction.degrees.toFixed(0)}°  { ${direction.vector.x.toFixed(3)}, ${direction.vector.y.toFixed(3)} }`);
  setText('#resolved-layer-a-label', 'Hero streaks');
  setText('#resolved-layer-a', `${streaks} particles / narrow 18° fan`);
  setText('#resolved-layer-b-label', 'Shards');
  setText('#resolved-layer-b', `${shards} particles / compact 42° fan`);
  setText('#resolved-layer-c-label', 'Slash + flash');
  setText('#resolved-layer-c', '0 ms DOM readability layer');
  setText('#resolved-layer-d-label', 'Target snap');
  setText('#resolved-layer-d', `${(6.5 * Math.min(1.65, intensity)).toFixed(1)} px`);
  setText('#resolved-layer-e-label', 'CRIT accent');
  setText('#resolved-layer-e', '34 ms / 170 ms DOM text');
  setText('#resolved-screen-kick', `${(3.8 * Math.min(1.55, intensity)).toFixed(1)} px`);
  setText('#resolved-position', `${Math.round(position.x)}, ${Math.round(position.y)} CSS px`);
}

function updateUi() {
  if (!isSelected()) return;
  active = true;
  setText('#authored-version-label', 'v1 — Critical Hit');
  setText('#preview-title', 'Critical Hit readability probe');
  setText('#preview-note', 'Click to move target + fire an ultra-short directional critical cue');
  setText('#caption-title', 'criticalHit / v1 / default');
  setText('#caption-note', 'instant slash/flash → narrow streaks → hard cleanup');
  setText('#effect-summary', 'Ultra-short directional critical-strike cue. Immediate DOM slash/flash carries gameplay readability; scheduled particles are secondary accents, so the hit still reads under particle pressure.');
  if (playButton) playButton.textContent = 'FXDeck.play("criticalHit")';
  setTimeline();
  updateInspector();
  updateApi();
}

function playCritical(point = position) {
  if (!fx || !isSelected()) return null;
  position = { ...point };
  moveTarget(position);
  const params = currentParams(position);
  const instance = fx.play('criticalHit', params);
  const direction = normalizeDirection(params.direction);
  appendLog(`PLAY ${instance.id} criticalHit/v1/default [${pathLabel()}] @ ${Math.round(position.x)},${Math.round(position.y)} intensity ${params.intensity.toFixed(1)} direction ${direction.degrees.toFixed(0)}°`);
  instance.ready
    .then(() => appendLog(`READY ${instance.id}: streaks ${instance.resolved?.streaks?.count ?? 0}, shards ${instance.resolved?.shards?.count ?? 0}, ${instance.resolved?.duration ?? 260}ms`))
    .catch((error) => appendLog(`ERROR ${instance.id}: ${error.message}`));
  updateInspector();
  updateApi();
  return instance;
}

function installInterceptors() {
  playButton?.addEventListener('click', (event) => {
    if (!isSelected()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    playCritical(position);
  }, true);

  stage?.addEventListener('pointerdown', (event) => {
    if (!isSelected()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = stage.getBoundingClientRect();
    playCritical({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, true);

  for (const button of [overlapButton, abButton]) {
    button?.addEventListener('click', (event) => {
      if (!isSelected()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      appendLog(`${BUILD} Critical Hit: use Effect Grid for scale tests; historical one-shot A/B fixtures remain scoped to the earlier base effects.`);
    }, true);
  }

  effectInput?.addEventListener('change', () => {
    if (isSelected()) {
      window.setTimeout(updateUi, 0);
      return;
    }
    if (active && playButton) playButton.textContent = 'FXDeck.play()';
    active = false;
  });

  for (const input of [intensityInput, directionInput, particlePathInput]) {
    input?.addEventListener('input', () => window.setTimeout(() => {
      updateInspector();
      updateApi();
    }, 0));
    input?.addEventListener('change', () => window.setTimeout(() => {
      updateInspector();
      updateApi();
    }, 0));
  }
}

function normalizeVisibleBuild() {
  const eyebrow = document.querySelector('.eyebrow');
  const hudBuild = document.querySelector('.runtime-hud__build');
  const intro = document.querySelector('.intro');
  if (eyebrow) eyebrow.textContent = `FXDeck / Runtime / Build ${BUILD}`;
  if (hudBuild) hudBuild.textContent = BUILD;
  if (intro) intro.textContent = 'P3.11.1 fixes Critical Hit direction inspector vector formatting; the authored P3.11.0 effect behavior is unchanged.';
}

waitForRuntime()
  .then((runtime) => {
    fx = runtime;
    registerCriticalHit(fx);
    ensureStylesheet();
    ensureOption();
    installInterceptors();
    normalizeVisibleBuild();
    appendLog(`${BUILD} Critical Hit registered: direction inspector fixed; 0 ms slash/flash + hero streaks, 6 ms shards, 260 ms hard cleanup`);
    if (isSelected()) updateUi();

    window.setInterval(() => {
      ensureGridOption();
      if (isSelected()) {
        updateInspector();
        updateApi();
      }
    }, 250);
  })
  .catch((error) => {
    appendLog(`${BUILD} Critical Hit bridge FAIL: ${error.message}`);
    console.error(error);
  });