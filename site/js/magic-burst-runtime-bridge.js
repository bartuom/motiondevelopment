import { normalizeDirection } from '../fxdeck/core/fxdeck.js?v=p3.6.0';
import { registerMagicBurst } from '../fxdeck/effects/magic-burst.js?v=p3.12.0';

const BUILD = 'P3.12.0';
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
      if (performance.now() - startedAt > timeoutMs) return reject(new Error('FXDeck runtime was not ready for Magic Burst.'));
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
  if (document.querySelector('link[data-magic-burst]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './magic-burst.css?v=p3.12.0';
  link.dataset.magicBurst = 'true';
  document.head.appendChild(link);
}

function ensureOption() {
  if (!effectInput || effectInput.querySelector('option[value="magicBurst"]')) return;
  const option = document.createElement('option');
  option.value = 'magicBurst';
  option.textContent = 'Magic Burst — asymmetric stylized cue';
  const critical = effectInput.querySelector('option[value="criticalHit"]');
  const heavy = effectInput.querySelector('option[value="heavyImpact"]');
  if (critical) critical.insertAdjacentElement('afterend', option);
  else if (heavy) heavy.insertAdjacentElement('afterend', option);
  else effectInput.appendChild(option);
}

function ensureGridOption() {
  const select = document.querySelector('#effect-grid-effect');
  if (!select || select.querySelector('option[value="magicBurst"]')) return;
  const source = effectInput?.querySelector('option[value="magicBurst"]');
  const option = document.createElement('option');
  option.value = 'magicBurst';
  option.textContent = source?.textContent ?? 'Magic Burst — asymmetric stylized cue';
  const critical = select.querySelector('option[value="criticalHit"]');
  const heavy = select.querySelector('option[value="heavyImpact"]');
  if (critical) critical.insertAdjacentElement('afterend', option);
  else if (heavy) heavy.insertAdjacentElement('afterend', option);
  else select.appendChild(option);
}

function isSelected() {
  return effectInput?.value === 'magicBurst';
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

function combineCleanups(cleanups) {
  return () => {
    for (const cleanup of cleanups) cleanup?.();
  };
}

function createHooks() {
  return {
    magicCore({ position: point, directionDegrees, intensity }) {
      const core = createTransient('magic-burst-core', point, '<i></i>');
      const scale = Math.min(1.5, .78 + intensity * .24);
      return animateTransient(core, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees - 10}deg) scaleX(.16) scaleY(.58)` },
        { opacity: .98, transform: `translate(-50%, -50%) rotate(${directionDegrees + 2}deg) scaleX(${scale}) scaleY(1)`, offset: .16 },
        { opacity: .64, transform: `translate(-50%, -50%) rotate(${directionDegrees + 9}deg) scaleX(${scale * 1.08}) scaleY(.88)`, offset: .48 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees + 17}deg) scaleX(${scale * 1.24}) scaleY(.62)` }
      ], { duration: 250, easing: 'cubic-bezier(.08,.78,.18,1)', fill: 'forwards' });
    },

    magicRibbons({ position: point, directionDegrees, intensity }) {
      const configurations = [
        { className: 'magic-burst-ribbon', delay: 0, angle: -26, side: -18, bend: 24, distance: 112 },
        { className: 'magic-burst-ribbon magic-burst-ribbon--b', delay: 18, angle: 14, side: 14, bend: -20, distance: 94 },
        { className: 'magic-burst-ribbon magic-burst-ribbon--c', delay: 42, angle: 38, side: -8, bend: 15, distance: 76 }
      ];
      const energyScale = Math.min(1.38, .82 + intensity * .18);
      const cleanups = configurations.map((config) => {
        const ribbon = createTransient(config.className, point);
        ribbon.style.transformOrigin = '0 50%';
        const angle = directionDegrees + config.angle;
        return animateTransient(ribbon, [
          { opacity: 0, transform: `translate(-8%, -50%) rotate(${angle - 8}deg) translate(0px, ${config.side}px) scaleX(.12) scaleY(.72)` },
          { opacity: .82, transform: `translate(-8%, -50%) rotate(${angle}deg) translate(${config.distance * .24}px, ${config.side + config.bend}px) scaleX(${energyScale * .58}) scaleY(1)`, offset: .22 },
          { opacity: .68, transform: `translate(-8%, -50%) rotate(${angle + 13}deg) translate(${config.distance * .62}px, ${config.side - config.bend * .45}px) scaleX(${energyScale}) scaleY(.86)`, offset: .56 },
          { opacity: 0, transform: `translate(-8%, -50%) rotate(${angle + 22}deg) translate(${config.distance}px, ${config.side + config.bend * .18}px) scaleX(${energyScale * 1.12}) scaleY(.56)` }
        ], { duration: 360, delay: config.delay, easing: 'cubic-bezier(.12,.7,.2,1)', fill: 'forwards' });
      });
      return combineCleanups(cleanups);
    },

    magicEcho({ position: point, directionDegrees, intensity }) {
      const echo = createTransient('magic-burst-echo', point);
      const scale = Math.min(1.42, .78 + intensity * .2);
      return animateTransient(echo, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees - 18}deg) scale(.2)` },
        { opacity: .86, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale})`, offset: .2 },
        { opacity: .48, transform: `translate(-50%, -50%) rotate(${directionDegrees + 16}deg) translateX(18px) scale(${scale * 1.08})`, offset: .58 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees + 28}deg) translateX(34px) scale(${scale * 1.2})` }
      ], { duration: 300, easing: 'cubic-bezier(.12,.72,.18,1)', fill: 'forwards' });
    },

    magicPulse({ position: point, directionDegrees, intensity }) {
      const pulse = createTransient('magic-burst-pulse', point);
      const scale = Math.min(1.7, .8 + intensity * .3);
      return animateTransient(pulse, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees - 22}deg) scale(.28)` },
        { opacity: .72, transform: `translate(-50%, -50%) rotate(${directionDegrees + 14}deg) scale(${scale * .66})`, offset: .22 },
        { opacity: .34, transform: `translate(-50%, -50%) rotate(${directionDegrees + 54}deg) scale(${scale})`, offset: .58 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees + 88}deg) scale(${scale * 1.22})` }
      ], { duration: 320, easing: 'cubic-bezier(.12,.68,.2,1)', fill: 'forwards' });
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
  apiPreview.textContent = `FXDeck.play("magicBurst", {\n  version: "v1",\n  variant: "default",\n  position: { x: ${Math.round(position.x)}, y: ${Math.round(position.y)} },\n  direction: ${Number(directionInput?.value ?? 18)},\n  intensity: ${Number(intensityInput?.value ?? 1).toFixed(1)}\n});`;
}

function setTimeline() {
  const timeline = document.querySelector('#effect-timeline');
  if (!timeline) return;
  const rows = [
    ['0 ms', 'Asymmetric core wedge + three curved ribbons'],
    ['18 ms', 'Primary colored mote fan'],
    ['42 ms', 'Restrained screen response'],
    ['72 ms', 'Offset secondary lobe + particles'],
    ['118 ms', 'Irregular color pulse at echo lobe'],
    ['640 ms', 'Hard lifecycle cleanup']
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

function resolvedValues() {
  const intensity = Math.max(.25, Number(intensityInput?.value ?? 1));
  const direction = normalizeDirection(Number(directionInput?.value ?? 18));
  const countScale = Math.max(.68, Math.min(1.65, intensity));
  const motes = Math.max(8, Math.round(18 * countScale));
  const echo = Math.max(4, Math.round(10 * Math.max(.72, Math.min(1.5, intensity))));
  const perpendicular = { x: -direction.vector.y, y: direction.vector.x };
  const echoPosition = {
    x: position.x + direction.vector.x * 30 + perpendicular.x * 22,
    y: position.y + direction.vector.y * 30 + perpendicular.y * 22
  };
  return { intensity, direction, motes, echo, echoPosition };
}

function updateInspector() {
  if (!isSelected()) return;
  const resolved = resolvedValues();
  setText('#resolved-effect', 'magicBurst / v1 / default');
  setText('#resolved-path', pathLabel());
  setText('#resolved-intensity', `${resolved.intensity.toFixed(1)}×`);
  setText('#resolved-direction', `${resolved.direction.degrees.toFixed(0)}°  { ${resolved.direction.vector.x.toFixed(3)}, ${resolved.direction.vector.y.toFixed(3)} }`);
  setText('#resolved-layer-a-label', 'Curved ribbons');
  setText('#resolved-layer-a', '3 DOM paths / asymmetric trajectories');
  setText('#resolved-layer-b-label', 'Primary motes');
  setText('#resolved-layer-b', `${resolved.motes} colored particles / 64° fan`);
  setText('#resolved-layer-c-label', 'Echo lobe');
  setText('#resolved-layer-c', `${resolved.echo} particles @ ${Math.round(resolved.echoPosition.x)}, ${Math.round(resolved.echoPosition.y)}`);
  setText('#resolved-layer-d-label', 'Color pulse');
  setText('#resolved-layer-d', '118 ms / irregular rotating accent');
  setText('#resolved-layer-e-label', 'Composition');
  setText('#resolved-layer-e', 'directional + offset; no radial ring');
  setText('#resolved-screen-kick', `${(2.6 * Math.min(1.55, resolved.intensity)).toFixed(1)} px`);
  setText('#resolved-position', `${Math.round(position.x)}, ${Math.round(position.y)} CSS px`);
}

function updateUi() {
  if (!isSelected()) return;
  active = true;
  setText('#authored-version-label', 'v1 — Magic Burst');
  setText('#preview-title', 'Magic Burst stylized-motion probe');
  setText('#preview-note', 'Click to move origin; direction rotates the asymmetric composition');
  setText('#caption-title', 'magicBurst / v1 / default');
  setText('#caption-note', 'curved ribbons → colored motes → offset echo lobe');
  setText('#effect-summary', 'Stylized asymmetric magic cue built to test richer motion and color without falling back to a centered ring/explosion. DOM ribbons carry the curved hero motion; particle lobes stay sparse and directional.');
  if (playButton) playButton.textContent = 'FXDeck.play("magicBurst")';
  setTimeline();
  updateInspector();
  updateApi();
}

function playMagicBurst(point = position) {
  if (!fx || !isSelected()) return null;
  position = { ...point };
  moveTarget(position);
  const params = currentParams(position);
  const instance = fx.play('magicBurst', params);
  const direction = normalizeDirection(params.direction);
  appendLog(`PLAY ${instance.id} magicBurst/v1/default [${pathLabel()}] @ ${Math.round(position.x)},${Math.round(position.y)} intensity ${params.intensity.toFixed(1)} direction ${direction.degrees.toFixed(0)}°`);
  instance.ready
    .then(() => appendLog(`READY ${instance.id}: ribbons 3, motes ${instance.resolved?.motes?.count ?? 0}, echo ${instance.resolved?.echo?.count ?? 0}, ${instance.resolved?.duration ?? 640}ms`))
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
    playMagicBurst(position);
  }, true);

  stage?.addEventListener('pointerdown', (event) => {
    if (!isSelected()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = stage.getBoundingClientRect();
    playMagicBurst({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, true);

  for (const button of [overlapButton, abButton]) {
    button?.addEventListener('click', (event) => {
      if (!isSelected()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      appendLog(`${BUILD} Magic Burst: use Effect Grid for scale/overlap testing; historical fixed A/B fixtures remain scoped to the original base effects.`);
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
  if (intro) intro.textContent = 'P3.12.0 adds Magic Burst: an asymmetric stylized cue with curved DOM ribbons, directional color motes and an offset echo lobe. This completes the planned representative effect archetypes before P3 exit review.';
}

waitForRuntime()
  .then((runtime) => {
    fx = runtime;
    registerMagicBurst(fx);
    ensureStylesheet();
    ensureOption();
    installInterceptors();
    normalizeVisibleBuild();
    appendLog(`${BUILD} Magic Burst registered: curved hero ribbons + sparse directional motes + offset echo lobe; no generic Core changes`);
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
    appendLog(`${BUILD} Magic Burst bridge FAIL: ${error.message}`);
    console.error(error);
  });
