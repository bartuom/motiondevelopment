const BUILD = 'P4.6.0';

function updateBuildUi() {
  const eyebrow = document.querySelector('.eyebrow');
  const hudBuild = document.querySelector('.runtime-hud__build');
  const intro = document.querySelector('.intro');

  if (eyebrow) eyebrow.textContent = `FXDeck / Runtime / Build ${BUILD}`;
  if (hudBuild) hudBuild.textContent = BUILD;
  if (intro) {
    intro.textContent = 'P4.6 Web2D V1: production/performance pass — curated public effects, generic quality tiers and slim tsParticles + emitters under the preserved Runtime Lab UI.';
  }
  document.documentElement.dataset.fxdeckBuild = BUILD;
}

try {
  updateBuildUi();
  await import('./runtime-lab-p4.js?v=p4.6.0');
  updateBuildUi();
  await import('./session2-schema-gate.js?v=p4.6.0');
  await import('./session3-dust-puff.js?v=p4.6.0');
  await import('./session3-asset-gate.js?v=p4.6.0');

  // Rejected hero art is intentionally not part of the production dependency graph.
  // Session 6 loads only the accepted/usable coverage data needed by the curated Play surface.
  await import('./session6-production-effects.js?v=p4.6.0');
  await import('./session6-production-gate.js?v=p4.6.0');
  updateBuildUi();
} catch (error) {
  const output = document.querySelector('#p2-log');
  if (output) output.textContent += `\nBOOTSTRAP FAIL ${BUILD}: ${error?.message ?? String(error)}`;
  console.error(error);
}
