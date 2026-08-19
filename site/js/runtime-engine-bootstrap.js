const BUILD = 'P3.13.4';

async function bootstrapEnginePlugins() {
  if (!globalThis.tsParticles) throw new Error('tsParticles global is missing before engine bootstrap.');
  if (typeof globalThis.loadMotionPlugin !== 'function') throw new Error('loadMotionPlugin() is unavailable before engine bootstrap.');
  if (typeof globalThis.loadRibbonShape !== 'function') throw new Error('loadRibbonShape() is unavailable before engine bootstrap.');

  await globalThis.loadMotionPlugin(globalThis.tsParticles);
  await globalThis.loadRibbonShape(globalThis.tsParticles);

  globalThis.FXDeckRibbonRuntimeReady = true;
  globalThis.FXDeckRibbonRuntimeBuild = BUILD;
}

try {
  await bootstrapEnginePlugins();
  await import('./heavy-impact-lab.js?v=p3.13.4');
} catch (error) {
  globalThis.FXDeckRibbonRuntimeReady = false;
  globalThis.FXDeckRibbonRuntimeError = error?.message ?? String(error);
  const output = document.querySelector('#p2-log');
  if (output) output.textContent += `\nENGINE BOOTSTRAP FAIL ${BUILD}: ${globalThis.FXDeckRibbonRuntimeError}`;
  console.error(error);
}
