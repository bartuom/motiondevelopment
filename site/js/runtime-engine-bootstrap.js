const BUILD = 'P4.5.0';

function updateBuildUi() {
  const eyebrow = document.querySelector('.eyebrow');
  const hudBuild = document.querySelector('.runtime-hud__build');
  const intro = document.querySelector('.intro');

  if (eyebrow) eyebrow.textContent = `FXDeck / Runtime / Build ${BUILD}`;
  if (hudBuild) hudBuild.textContent = BUILD;
  if (intro) {
    intro.textContent = 'P4.5 Web2D V1: Session 4 accepted for progression; coverage pass adds schema-driven Explosion, directional Magic Burst and real stage-wide Rain without replacing the established Runtime Lab UI.';
  }
  document.documentElement.dataset.fxdeckBuild = BUILD;
}

try {
  updateBuildUi();
  await import('./runtime-lab-p4.js?v=p4.4.3');
  updateBuildUi();
  await import('./session2-schema-gate.js?v=p4.4.3');
  await import('./session3-dust-puff.js?v=p4.4.3');
  await import('./session3-asset-gate.js?v=p4.4.3');
  await import('./session4-hero-effects.js?v=p4.4.3');
  await import('./session4-hero-gate.js?v=p4.4.3');
  await import('./session5-coverage-effects.js?v=p4.5.0');
  await import('./session5-coverage-gate.js?v=p4.5.0');
  updateBuildUi();
} catch (error) {
  const output = document.querySelector('#p2-log');
  if (output) output.textContent += `\nBOOTSTRAP FAIL ${BUILD}: ${error?.message ?? String(error)}`;
  console.error(error);
}
