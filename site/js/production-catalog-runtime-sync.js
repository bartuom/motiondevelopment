import { registerProductionEffects } from '../fxdeck/effects/catalog.js?v=p3.12.0';

const BUILD = 'P3.12.0';

function waitForRuntime(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const poll = () => {
      if (globalThis.FXDeck?.register) return resolve(globalThis.FXDeck);
      if (performance.now() - startedAt > timeoutMs) return reject(new Error('FXDeck runtime was not ready for production catalog sync.'));
      window.setTimeout(poll, 20);
    };
    poll();
  });
}

waitForRuntime()
  .then((fx) => {
    registerProductionEffects(fx);
    globalThis.FXDeckCatalogBuild = BUILD;
  })
  .catch((error) => console.error(`${BUILD} production catalog sync failed`, error));
