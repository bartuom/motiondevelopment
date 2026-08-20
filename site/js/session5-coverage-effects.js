import { loadEffectDefinitions } from '../fxdeck/schema/effect-loader.js?v=p4.5.0';
import { registerSchemaEffects } from '../fxdeck/web2d/register-schema-effect.js?v=p4.5.0';

const BUILD = 'P4.5.0';
const EFFECT_URLS = [
  './fxdeck/effects/explosion.json?v=p4.5.0',
  './fxdeck/effects/magic-burst.json?v=p4.5.0',
  './fxdeck/effects/rain.json?v=p4.5.0'
];

function log(message) {
  const output = document.querySelector('#p2-log');
  if (!output) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  output.textContent += `\n[${stamp}] ${message}`;
  output.scrollTop = output.scrollHeight;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDependencies(timeoutMs = 10000) {
  const started = performance.now();
  while (!globalThis.FXDeckWeb2D?.fx || !globalThis.FXDeckAssets) {
    if (performance.now() - started > timeoutMs) throw new Error('FXD_P4_5_BOOT: runtime or asset manager did not become ready');
    await wait(20);
  }
  return { runtime: globalThis.FXDeckWeb2D, assetManager: globalThis.FXDeckAssets };
}

function installSelectorOptions(effects) {
  const select = document.querySelector('#effect-select');
  if (!select) return;

  const labels = new Map([
    ['explosion', 'Explosion — asset-first / Schema V1'],
    ['magic-burst', 'Magic Burst — directional arc / Schema V1'],
    ['rain', 'Rain / Environment — stage emitter / Schema V1']
  ]);

  for (const effect of effects) {
    let option = [...select.options].find((item) => item.value === effect.id);
    if (!option) {
      option = document.createElement('option');
      option.value = effect.id;
      select.appendChild(option);
    }
    option.textContent = labels.get(effect.id) ?? effect.label ?? effect.id;
  }

  select.value = 'explosion';
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

const { runtime, assetManager } = await waitForDependencies();
const effects = await loadEffectDefinitions(EFFECT_URLS, { assetManager });
const prefetch = [];

for (const effect of effects) prefetch.push(await assetManager.prefetchEffect(effect));

// Registering explosion/v1/default intentionally replaces the legacy baseline
// definition in the existing FXDeck registry without changing the public API.
registerSchemaEffects(runtime.fx, effects);
installSelectorOptions(effects);

const state = {
  build: BUILD,
  effects: structuredClone(effects),
  prefetch: structuredClone(prefetch),
  replacedLegacyExplosion: runtime.fx.resolve('explosion').definition.schemaDriven === true,
  rainCapabilities: {
    stageAnchor: true,
    spawnAreaPercent: true
  }
};

globalThis.FXDeckCoverageEffects = state;
if (globalThis.FXDeckLab) globalThis.FXDeckLab.coverageEffects = state;

log(`${BUILD} SESSION 5 EFFECTS: Explosion + Magic Burst + Rain registered from Schema V1`);
log(`${BUILD} EXPLOSION: legacy runtime definition replaced in-place by schema data; Particlr reference hierarchy retained as flash → fireball → sparks/debris → delayed smoke`);
log(`${BUILD} RAIN CAPABILITY: stage-top-center anchor + percent spawn area added generically; Rain no longer emits from the clicked point`);
