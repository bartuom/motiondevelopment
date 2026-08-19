const BUILD = 'P4.4.0';

function updateBuildUi() {
  const eyebrow = document.querySelector('.eyebrow');
  const hudBuild = document.querySelector('.runtime-hud__build');
  const intro = document.querySelector('.intro');

  if (eyebrow) eyebrow.textContent = `FXDeck / Runtime / Build ${BUILD}`;
  if (hudBuild) hudBuild.textContent = BUILD;
  if (intro) {
    intro.textContent = 'P4.4 Web2D V1: the established Runtime Lab UI is preserved while FXDeck adds the first two client-facing schema hero effects: Critical Hit and Goal Celebration.';
  }
  document.documentElement.dataset.fxdeckBuild = BUILD;
}

try {
  updateBuildUi();
  await import('./runtime-lab-p4.js?v=p4.4.0');
  updateBuildUi();
  await import('./session2-schema-gate.js?v=p4.4.0');
  await import('./session3-dust-puff.js?v=p4.4.0');
  await import('./session3-asset-gate.js?v=p4.4.0');
  await import('./session4-hero-effects.js?v=p4.4.0');
  await import('./session4-hero-gate.js?v=p4.4.0');
  updateBuildUi();
} catch (error) {
  const output = document.querySelector('#p2-log');
  if (output) output.textContent += `\nBOOTSTRAP FAIL ${BUILD}: ${error?.message ?? String(error)}`;
  console.error(error);
}
