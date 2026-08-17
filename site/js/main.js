import { PowerShotDemo, TARGETS } from './demos/power-shot.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  stage: $('#stage'),
  status: $('#stage-status'),
  ball: $('#ball'),
  canvas: $('#particle-canvas'),
  trail: $('#ball-trail'),
  trailGlow: $('#ball-trail-glow'),
  shockwave: $('#shockwave'),
  rays: $('#impact-rays'),
  reticle: $('#target-reticle'),
  flash: $('#impact-flash'),
  impactLabel: $('#impact-label'),
  net: $('#goal-net'),
};

const demo = new PowerShotDemo(elements);

const PRESETS = {
  subtle: { power: 0.82, trail: 0.58, particles: 0.45, shake: 0.34, flash: 0.45 },
  arcade: { power: 1, trail: 1, particles: 1, shake: 1, flash: 1 },
  heavy: { power: 1.25, trail: 1.28, particles: 1.35, shake: 1.34, flash: 1.2 },
};

const playButton = $('#play-button');
const resetButton = $('#reset-button');
const motionPreference = $('#motion-preference');
const presetButtons = $$('#preset-controls button');
const targetButtons = $$('#target-controls button');
const sliders = $$('#sliders input[type="range"]');

function setPressed(buttons, active) {
  buttons.forEach((button) => {
    const isActive = button === active;
    button.classList.toggle('is-active', isActive);
    if (isActive) button.setAttribute('aria-pressed', 'true');
    else button.removeAttribute('aria-pressed');
  });
}

function updateRangeVisual(input) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value);
  const fill = (value - min) / (max - min) * 100;
  input.style.setProperty('--fill', `${fill}%`);

  const output = document.querySelector(`#${input.dataset.control}-output`);
  if (output) output.value = `${value}%`;
}

function applySettings(settings, { syncSliders = false } = {}) {
  demo.setSettings(settings);

  if (syncSliders) {
    sliders.forEach((input) => {
      const key = input.dataset.control;
      input.value = String(Math.round((settings[key] ?? 1) * 100));
      updateRangeVisual(input);
    });
  }
}

presetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setPressed(presetButtons, button);
    applySettings(PRESETS[button.dataset.preset], { syncSliders: true });
  });
});

targetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setPressed(targetButtons, button);
    demo.setTarget(button.dataset.target);
  });
});

sliders.forEach((input) => {
  updateRangeVisual(input);
  input.addEventListener('input', () => {
    updateRangeVisual(input);
    const nextSettings = {};
    sliders.forEach((slider) => {
      nextSettings[slider.dataset.control] = Number(slider.value) / 100;
    });
    applySettings(nextSettings);
    presetButtons.forEach((button) => {
      button.classList.remove('is-active');
      button.removeAttribute('aria-pressed');
    });
  });
});

playButton.addEventListener('click', () => demo.play());
resetButton.addEventListener('click', () => demo.reset());

elements.stage.addEventListener('pointerdown', (event) => {
  const rect = elements.stage.getBoundingClientRect();
  const worldX = (event.clientX - rect.left) / rect.width * 800;
  const worldY = (event.clientY - rect.top) / rect.height * 450;
  const selected = demo.selectNearestTarget(worldX, worldY);

  if (selected && TARGETS[selected]) {
    const matchingButton = targetButtons.find((button) => button.dataset.target === selected);
    if (matchingButton) setPressed(targetButtons, matchingButton);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.code === 'Space' && !['INPUT', 'BUTTON'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    demo.play();
  }
  if (event.key.toLowerCase() === 'r' && !['INPUT', 'BUTTON'].includes(document.activeElement?.tagName)) {
    demo.reset();
  }
});

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
function updateMotionPreference() {
  motionPreference.textContent = `Reduced motion: ${reducedMotionQuery.matches ? 'on' : 'off'}`;
}
reducedMotionQuery.addEventListener('change', updateMotionPreference);
updateMotionPreference();

applySettings(PRESETS.arcade, { syncSliders: true });
demo.setTarget('top-right');
playButton.disabled = false;
resetButton.disabled = false;
