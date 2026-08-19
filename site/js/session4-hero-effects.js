import { loadEffectDefinitions } from '../fxdeck/schema/effect-loader.js?v=p4.4.0';
import { registerSchemaEffects } from '../fxdeck/web2d/register-schema-effect.js?v=p4.4.0';

const BUILD = 'P4.4.0';
const EFFECT_URLS = [
  './fxdeck/effects/critical-hit.json?v=p4.4.0',
  './fxdeck/effects/goal-celebration.json?v=p4.4.0'
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

async function waitForDependencies(timeoutMs = 8000) {
  const started = performance.now();
  while (!globalThis.FXDeckWeb2D?.fx || !globalThis.FXDeckAssets) {
    if (performance.now() - started > timeoutMs) throw new Error('FXD_P4_4_BOOT: runtime or asset manager did not become ready');
    await wait(20);
  }
  return { runtime: globalThis.FXDeckWeb2D, assetManager: globalThis.FXDeckAssets };
}

function installSelectorOptions(effects) {
  const select = document.querySelector('#effect-select');
  if (!select) return;

  const labels = new Map([
    ['critical-hit', 'Critical Hit — hero / Schema V1'],
    ['goal-celebration', 'Goal Celebration — hero / Schema V1']
  ]);

  for (const effect of [...effects].reverse()) {
    if ([...select.options].some((option) => option.value === effect.id)) continue;
    const option = document.createElement('option');
    option.value = effect.id;
    option.textContent = labels.get(effect.id) ?? effect.label ?? effect.id;
    select.prepend(option);
  }

  select.value = 'critical-hit';
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

const { runtime, assetManager } = await waitForDependencies();
const effects = await loadEffectDefinitions(EFFECT_URLS, { assetManager });

const prefetch = [];
for (const effect of effects) prefetch.push(await assetManager.prefetchEffect(effect));

for (const effect of effects) {
  try {
    const existing = runtime.fx.resolve(effect.id);
    if (!existing?.definition?.schemaDriven) throw new Error(`${effect.id} already exists but is not schema-driven`);
  } catch {
    registerSchemaEffects(runtime.fx, [effect]);
  }
}

installSelectorOptions(effects);

const state = {
  build: BUILD,
  effects: structuredClone(effects),
  prefetch: structuredClone(prefetch),
  ribbonCapabilityAdded: false
};

globalThis.FXDeckHeroEffects = state;
if (globalThis.FXDeckLab) globalThis.FXDeckLab.heroEffects = state;

log(`${BUILD} HERO EFFECTS: Critical Hit + Goal Celebration registered from JSON / no effect-specific runtime bridge`);
log(`${BUILD} GOAL CAPABILITY DECISION: ribbon NOT added; current art direction is covered by flare + streak + confetti + sparkle layers`);
