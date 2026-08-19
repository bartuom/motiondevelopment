import { registerProductionEffects } from '../fxdeck/effects/catalog.js?v=p3.12.0';

const BUILD = 'P3.12.1';
const EXPECTED_EFFECTS = [
  'heavyImpact',
  'explosion',
  'fireball',
  'environmentEmitter',
  'rareReward',
  'footballCardReveal',
  'criticalHit',
  'magicBurst'
];

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

function appendLog(message) {
  const output = document.querySelector('#p2-log');
  if (!output) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  output.textContent += `\n[${stamp}] ${message}`;
  output.scrollTop = output.scrollHeight;
}

function runSmokeGate(fx) {
  const failures = [];

  for (const effectId of EXPECTED_EFFECTS) {
    try {
      const resolved = fx.resolve(effectId, { version: 'v1' });
      if (!resolved?.definition || resolved.definition.id !== effectId) {
        failures.push(`${effectId}: invalid resolved definition`);
      }
    } catch (error) {
      failures.push(`${effectId}: ${error.message}`);
    }
  }

  const result = {
    build: BUILD,
    pass: failures.length === 0,
    expectedEffects: [...EXPECTED_EFFECTS],
    failures
  };

  globalThis.FXDeckCatalogSmoke = result;

  if (result.pass) {
    appendLog(`PASS ${BUILD} CATALOG GATE: ${EXPECTED_EFFECTS.length}/${EXPECTED_EFFECTS.length} production effects resolve through registerProductionEffects()`);
    return result;
  }

  const message = `${BUILD} CATALOG GATE FAIL: ${failures.join(' | ')}`;
  appendLog(`FAIL ${message}`);
  throw new Error(message);
}

waitForRuntime()
  .then((fx) => {
    registerProductionEffects(fx);
    globalThis.FXDeckCatalogBuild = BUILD;
    return runSmokeGate(fx);
  })
  .catch((error) => console.error(`${BUILD} production catalog sync failed`, error));
