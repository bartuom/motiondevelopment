import { normalizeDirection } from '../fxdeck/core/fxdeck.js?v=p3.6.0';
import { registerExplosionV2 } from '../fxdeck/effects/explosion-v2.js?v=p3.13.1';
import { registerMagicBurstV2 } from '../fxdeck/effects/magic-burst-v2.js?v=p3.13.1';

const BUILD = 'P3.13.1';
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
let ready = false;
let position = {
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
      if (globalThis.FXDeck?.play && globalThis.FXDeckLab?.screenKickController && globalThis.tsParticles) {
        resolve(globalThis.FXDeck);
        return;
      }
      if (performance.now() - startedAt > timeoutMs) {
        reject(new Error('FXDeck runtime was not ready for P3.13 V2 bridge.'));
        return;
      }
      window.setTimeout(poll, 20);
    };
    poll();
  });
}

function loadScript(src, marker) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-fxdeck-plugin="${marker}"]`);
    if (existing?.dataset.loaded === 'true') return resolve();
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.fxdeckPlugin = marker;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function ensureRibbonRuntime() {
  await Promise.all([
    loadScript('https://cdn.jsdelivr.net/npm/@tsparticles/plugin-motion@4.3.2/tsparticles.plugin.motion.min.js', 'motion-4.3.2'),
    loadScript('https://cdn.jsdelivr.net/npm/@tsparticles/shape-ribbon@4.3.2/tsparticles.shape.ribbon.min.js', 'ribbon-4.3.2')
  ]);

  if (typeof globalThis.loadMotionPlugin !== 'function') throw new Error('loadMotionPlugin() unavailable after CDN load.');
  if (typeof globalThis.loadRibbonShape !== 'function') throw new Error('loadRibbonShape() unavailable after CDN load.');

  await globalThis.loadMotionPlugin(globalThis.tsParticles);
  await globalThis.loadRibbonShape(globalThis.tsParticles);
  appendLog(`PASS ${BUILD}: tsParticles motion + real ribbon shape registered on existing FXDeck engine`);
}

function isV2Selected() {
  return effectInput?.value === 'explosion' || effectInput?.value === 'magicBurst';
}

function selectedId() {
  return effectInput?.value === 'magicBurst' ? 'magicBurst' : 'explosion';
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function moveTarget(point) {
  if (!target) return;
  target.style.left = `${point.x}px`;
  target.style.top = `${point.y}px`;
}

function createTransient(className, point) {
  const element = document.createElement('div');
  element.className = className;
  element.style.left = `${point.x}px`;
  element.style.top = `${point.y}px`;
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

function hooks() {
  return {
    explosionFlash({ position: point, intensity }) {
      const flash = createTransient('impact-flash', point);
      flash.style.width = '132px';
      flash.style.height = '132px';
      flash.style.borderRadius = '50%';
      flash.style.background = 'radial-gradient(circle, rgba(255,255,255,.98) 0%, rgba(255,239,164,.82) 20%, rgba(255,132,45,.36) 50%, transparent 76%)';
      flash.style.mixBlendMode = 'screen';
      const end = 1.05 + Math.min(1.4, intensity) * .28;
      return animateTransient(flash, [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.18)' },
        { opacity: .95, transform: 'translate(-50%, -50%) scale(.58)', offset: .12 },
        { opacity: .38, transform: `translate(-50%, -50%) scale(${end * .82})`, offset: .42 },
        { opacity: 0, transform: `translate(-50%, -50%) scale(${end})` }
      ], { duration: 190, easing: 'cubic-bezier(.08,.74,.14,1)', fill: 'forwards' });
    },

    magicCore({ position: point, directionDegrees, intensity }) {
      const core = createTransient('magic-burst-core', point);
      core.innerHTML = '<i></i>';
      const scale = Math.min(1.48, .82 + intensity * .22);
      return animateTransient(core, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees - 8}deg) scaleX(.14) scaleY(.55)` },
        { opacity: .92, transform: `translate(-50%, -50%) rotate(${directionDegrees + 2}deg) scaleX(${scale}) scaleY(.96)`, offset: .16 },
        { opacity: .42, transform: `translate(-50%, -50%) rotate(${directionDegrees + 12}deg) scaleX(${scale * 1.12}) scaleY(.74)`, offset: .52 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees + 20}deg) scaleX(${scale * 1.24}) scaleY(.48)` }
      ], { duration: 240, easing: 'cubic-bezier(.08,.78,.18,1)', fill: 'forwards' });
    },

    magicEcho({ position: point, directionDegrees, intensity }) {
      const echo = createTransient('magic-burst-echo', point);
      const scale = Math.min(1.38, .78 + intensity * .2);
      return animateTransient(echo, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees - 14}deg) scale(.18)` },
        { opacity: .74, transform: `translate(-50%, -50%) rotate(${directionDegrees}deg) scale(${scale})`, offset: .2 },
        { opacity: .32, transform: `translate(-50%, -50%) rotate(${directionDegrees + 16}deg) scale(${scale * 1.08})`, offset: .58 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees + 26}deg) scale(${scale * 1.16})` }
      ], { duration: 280, easing: 'cubic-bezier(.12,.72,.18,1)', fill: 'forwards' });
    },

    magicPulse({ position: point, directionDegrees, intensity }) {
      const pulse = createTransient('magic-burst-pulse', point);
      const scale = Math.min(1.62, .82 + intensity * .28);
      return animateTransient(pulse, [
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees - 18}deg) scale(.22)` },
        { opacity: .54, transform: `translate(-50%, -50%) rotate(${directionDegrees + 8}deg) scale(${scale * .7})`, offset: .22 },
        { opacity: .2, transform: `translate(-50%, -50%) rotate(${directionDegrees + 42}deg) scale(${scale})`, offset: .6 },
        { opacity: 0, transform: `translate(-50%, -50%) rotate(${directionDegrees + 72}deg) scale(${scale * 1.15})` }
      ], { duration: 310, easing: 'cubic-bezier(.12,.68,.2,1)', fill: 'forwards' });
    },

    screenKick({ direction, distance }) {
      globalThis.FXDeckLab?.screenKickController?.kick(direction, distance);
    }
  };
}

function params(point = position) {
  return {
    version: 'v2',
    variant: 'default',
    position: { ...point },
    direction: Number(directionInput?.value ?? 18),
    intensity: Number(intensityInput?.value ?? 1),
    hooks: hooks()
  };
}

function pathLabel() {
  const path = globalThis.FXDeckLab?.particleAdapter?.getBurstMode?.() ?? particlePathInput?.value ?? 'scheduled';
  if (path === 'scheduled') return 'shared-scheduled';
  if (path === 'shared') return 'shared-direct';
  return 'per-play-emitter';
}

function explosionResolved(intensity) {
  const countScale = Math.max(.62, Math.min(1.65, intensity));
  const smokeScale = Math.max(.72, Math.min(1.45, intensity));
  return {
    fireball: Math.max(8, Math.round(24 * countScale)),
    sparks: Math.max(4, Math.round(12 * Math.max(.7, Math.min(1.55, intensity)))),
    smoke: [7, 8, 7].map((count) => Math.max(3, Math.round(count * smokeScale)))
  };
}

function magicResolved(intensity, direction) {
  const countScale = Math.max(.72, Math.min(1.55, intensity));
  const perpendicular = { x: -direction.vector.y, y: direction.vector.x };
  return {
    heroRibbons: Math.max(2, Math.round(3 * Math.min(1.35, .8 + intensity * .2))),
    echoRibbons: Math.max(1, Math.round(2 * Math.min(1.35, .82 + intensity * .18))),
    motes: Math.max(7, Math.round(14 * countScale)),
    echoPosition: {
      x: position.x + direction.vector.x * 42 + perpendicular.x * 24,
      y: position.y + direction.vector.y * 42 + perpendicular.y * 24
    }
  };
}

function setTimeline(rows) {
  const timeline = document.querySelector('#effect-timeline');
  if (!timeline) return;
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

function updateUi() {
  if (!ready || !isV2Selected()) return;
  const id = selectedId();
  const intensity = Math.max(.25, Number(intensityInput?.value ?? 1));
  const direction = normalizeDirection(Number(directionInput?.value ?? 18));
  const versionLabel = id === 'explosion' ? 'v2 — Explosion / Particlr harvest' : 'v2 — Magic Burst / real ribbons';

  setText('#authored-version-label', versionLabel);
  setText('#resolved-effect', `${id} / v2 / default`);
  setText('#resolved-path', pathLabel());
  setText('#resolved-intensity', `${intensity.toFixed(1)}×`);
  setText('#resolved-direction', `${direction.degrees.toFixed(0)}°  { ${direction.vector.x.toFixed(3)}, ${direction.vector.y.toFixed(3)} }`);
  setText('#resolved-position', `${Math.round(position.x)}, ${Math.round(position.y)} CSS px`);

  if (id === 'explosion') {
    const r = explosionResolved(intensity);
    setText('#preview-title', 'Explosion V2 — Particlr reference pass');
    setText('#preview-note', 'Click to move target + fire texture-driven layered explosion');
    setText('#caption-title', 'explosion / v2 / default');
    setText('#caption-note', 'circle-soft flash → fireball mass → staged smoke texture');
    setText('#effect-summary', 'Reference-driven rebuild from the harvested Particlr Explosion model. The hero read now comes from source-derived soft textures and staged smoke rather than circle/square primitives.');
    setText('#resolved-layer-a-label', 'Flash texture');
    setText('#resolved-layer-a', 'Particlr circle-soft / 0.15 s');
    setText('#resolved-layer-b-label', 'Fireball mass');
    setText('#resolved-layer-b', `${r.fireball} textured particles / 0.4–0.7 s`);
    setText('#resolved-layer-c-label', 'Smoke texture');
    setText('#resolved-layer-c', `${r.smoke.reduce((a, b) => a + b, 0)} particles in 3 delayed waves`);
    setText('#resolved-layer-d-label', 'Sparks');
    setText('#resolved-layer-d', `${r.sparks} supporting image streaks`);
    setText('#resolved-layer-e-label', 'Source model');
    setText('#resolved-layer-e', 'Particlr flash + fireball + smoke layering');
    setText('#resolved-screen-kick', `${(5.8 * Math.min(1.55, intensity)).toFixed(1)} px`);
    setTimeline([
      ['0 ms', 'Particlr-derived soft flash + fireball mass'],
      ['18 ms', 'Sparse gameplay sparks'],
      ['54 ms', 'Smoke texture wave A'],
      ['138 ms', 'Smoke texture wave B'],
      ['238 ms', 'Smoke texture wave C'],
      ['1480 ms', 'Hard lifecycle cleanup']
    ]);
  } else {
    const r = magicResolved(intensity, direction);
    setText('#preview-title', 'Magic Burst V2 — real tsParticles ribbons');
    setText('#preview-note', 'Click to move origin; direction rotates real oscillating ribbon particles');
    setText('#caption-title', 'magicBurst / v2 / default');
    setText('#caption-note', 'shape-ribbon hero → image motes → displaced ribbon echo');
    setText('#effect-summary', 'Reference-driven Magic Burst using the actual tsParticles ribbon shape. CSS ribbons are gone from the hero layer; oscillation, drag and trail structure come from the harvested Ribbons recipe.');
    setText('#resolved-layer-a-label', 'Hero ribbons');
    setText('#resolved-layer-a', `${r.heroRibbons} real shape-ribbon particles / 60 points each`);
    setText('#resolved-layer-b-label', 'Ribbon recipe');
    setText('#resolved-layer-b', 'drag .02 / oscillation 72–112 / speed 3–5 / dist 8');
    setText('#resolved-layer-c-label', 'Image motes');
    setText('#resolved-layer-c', `${r.motes} spark-image particles`);
    setText('#resolved-layer-d-label', 'Echo ribbons');
    setText('#resolved-layer-d', `${r.echoRibbons} @ ${Math.round(r.echoPosition.x)}, ${Math.round(r.echoPosition.y)}`);
    setText('#resolved-layer-e-label', 'Hero tech');
    setText('#resolved-layer-e', 'tsParticles shape-ribbon + motion plugin');
    setText('#resolved-screen-kick', `${(2.4 * Math.min(1.5, intensity)).toFixed(1)} px`);
    setTimeline([
      ['0 ms', 'Core accent + real hero ribbons'],
      ['22 ms', 'Sparse image motes'],
      ['44 ms', 'Restrained screen response'],
      ['86 ms', 'Displaced secondary ribbons'],
      ['112 ms', 'Echo motes'],
      ['146 ms', 'Secondary color pulse'],
      ['860 ms', 'Hard lifecycle cleanup']
    ]);
  }

  if (playButton) playButton.textContent = `FXDeck.play("${id}")`;
  if (apiPreview) {
    apiPreview.textContent = `FXDeck.play("${id}", {\n  version: "v2",\n  variant: "default",\n  position: { x: ${Math.round(position.x)}, y: ${Math.round(position.y)} },\n  direction: ${Number(directionInput?.value ?? 18)},\n  intensity: ${Number(intensityInput?.value ?? 1).toFixed(1)}\n});`;
  }
}

function play(point = position) {
  if (!ready || !fx || !isV2Selected()) return null;
  position = { ...point };
  moveTarget(position);
  const id = selectedId();
  const p = params(position);
  const instance = fx.play(id, p);
  appendLog(`PLAY ${instance.id} ${id}/v2/default [${pathLabel()}] @ ${Math.round(position.x)},${Math.round(position.y)} intensity ${p.intensity.toFixed(1)} direction ${normalizeDirection(p.direction).degrees.toFixed(0)}°`);
  instance.ready
    .then(() => {
      if (id === 'explosion') {
        appendLog(`READY ${instance.id}: Particlr-derived flash + ${instance.resolved?.fireball?.count ?? 0} fireballs + ${(instance.resolved?.smoke?.waveCounts ?? []).reduce((a, b) => a + b, 0)} smoke particles`);
      } else {
        appendLog(`READY ${instance.id}: real ribbons ${instance.resolved?.heroRibbons?.count ?? 0}+${instance.resolved?.echoRibbons?.count ?? 0}; motes ${instance.resolved?.motes?.count ?? 0}`);
      }
    })
    .catch((error) => appendLog(`ERROR ${instance.id}: ${error.message}`));
  updateUi();
  return instance;
}

function installInterceptors() {
  playButton?.addEventListener('click', (event) => {
    if (!isV2Selected()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    play(position);
  }, true);

  stage?.addEventListener('pointerdown', (event) => {
    if (!isV2Selected()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const rect = stage.getBoundingClientRect();
    play({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, true);

  overlapButton?.addEventListener('click', (event) => {
    if (!isV2Selected()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const base = Number(directionInput?.value ?? 18);
    const id = selectedId();
    const offsets = [-22, -10, 0, 12, 24, 36];
    offsets.forEach((offset, index) => {
      window.setTimeout(() => {
        if (!ready || selectedId() !== id) return;
        const p = params(position);
        p.direction = (base + offset + 360) % 360;
        const instance = fx.play(id, p);
        instance.ready.catch((error) => appendLog(`ERROR ${instance.id}: ${error.message}`));
      }, index * 42);
    });
    appendLog(`OVERLAP ×6 ${id}/v2 — reference-driven visual stress`);
  }, true);

  abButton?.addEventListener('click', (event) => {
    if (!isV2Selected()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    appendLog(`${BUILD}: visual pass gate — backend A/B paused for V2 effects until look is accepted`);
  }, true);

  effectInput?.addEventListener('change', () => window.setTimeout(updateUi, 0));
  for (const input of [intensityInput, directionInput, particlePathInput]) {
    input?.addEventListener('input', () => window.setTimeout(updateUi, 0));
    input?.addEventListener('change', () => window.setTimeout(updateUi, 0));
  }
}

function updateBuildUi() {
  setText('.eyebrow', `FXDeck / Runtime / Build ${BUILD}`);
  setText('.runtime-hud__build', BUILD);
  setText('.intro', 'P3.13.1 is the first reference-driven visual pass: Explosion V2 uses source-derived Particlr soft/smoke textures and Magic Burst V2 uses the real tsParticles ribbon shape instead of CSS ribbon approximations.');
}

installInterceptors();

waitForRuntime()
  .then(async (runtime) => {
    fx = runtime;
    await ensureRibbonRuntime();
    registerExplosionV2(fx);
    registerMagicBurstV2(fx);
    ready = true;
    updateBuildUi();
    appendLog(`${BUILD}: Explosion V2 + Magic Burst V2 registered as reference-driven defaults; V1 remains available in registry`);
    updateUi();
  })
  .catch((error) => {
    appendLog(`${BUILD} V2 bridge FAIL: ${error.message}`);
    console.error(error);
  });
