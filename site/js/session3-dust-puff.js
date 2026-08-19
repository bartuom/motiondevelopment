import { FXDeckAssetManager } from '../fxdeck/core/asset-manager.js?v=p4.3.0';
import { loadEffectDefinition } from '../fxdeck/schema/effect-loader.js?v=p4.3.0';
import { registerSchemaEffects } from '../fxdeck/web2d/register-schema-effect.js?v=p4.3.0';

const BUILD = 'P4.3.0';
const MANIFEST_URL = './fxdeck/assets/manifest.json?v=p4.3.0';
const DUST_URL = './fxdeck/effects/dust-puff.json?v=p4.3.0';

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

async function waitForRuntime(timeoutMs = 8000) {
  const started = performance.now();
  while (!globalThis.FXDeckWeb2D?.fx) {
    if (performance.now() - started > timeoutMs) throw new Error('FXD_P4_3_BOOT: Web2D runtime did not become ready');
    await wait(20);
  }
  return globalThis.FXDeckWeb2D;
}

function installSelectorOption(effectId, label) {
  const select = document.querySelector('#effect-select');
  if (!select) return;

  let option = [...select.options].find((item) => item.value === effectId);
  if (!option) {
    option = document.createElement('option');
    option.value = effectId;
    option.textContent = label;
    select.prepend(option);
  }

  select.value = effectId;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

const runtime = await waitForRuntime();
const assetManager = await new FXDeckAssetManager({ manifestUrl: MANIFEST_URL }).init();
const dustPuff = await loadEffectDefinition(DUST_URL, { assetManager });

const coldWarmup = await assetManager.prefetchEffect(dustPuff);

try {
  const existing = runtime.fx.resolve(dustPuff.id);
  if (!existing?.definition?.schemaDriven) throw new Error(`${dustPuff.id} already exists but is not schema-driven`);
} catch {
  registerSchemaEffects(runtime.fx, [dustPuff]);
}

runtime.assetManager = assetManager;
runtime.assetWarmup = [coldWarmup];
runtime.prefetchEffect = async (id) => {
  const { definition } = runtime.fx.resolve(id);
  return assetManager.prefetchEffect(definition.source ?? definition);
};

globalThis.FXDeckAssets = assetManager;
globalThis.FXDeckDustPuff = {
  build: BUILD,
  effect: structuredClone(dustPuff),
  coldWarmup: structuredClone(coldWarmup)
};

if (globalThis.FXDeckLab) {
  globalThis.FXDeckLab.assetManager = assetManager;
  globalThis.FXDeckLab.prefetchEffect = (id) => runtime.prefetchEffect(id);
}

installSelectorOption('dust-puff', 'Dust Puff — Schema V1 asset-first');
log(`${BUILD} DUST PUFF: registered from JSON / ${coldWarmup.requested} manifest assets / cold decode ${coldWarmup.coldLoads} / cache hits ${coldWarmup.cacheHits}`);
