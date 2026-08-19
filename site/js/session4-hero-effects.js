import { loadEffectDefinitions } from '../fxdeck/schema/effect-loader.js?v=p4.4.1';
import { registerSchemaEffects } from '../fxdeck/web2d/register-schema-effect.js?v=p4.4.1';

const BUILD = 'P4.4.1';
const EFFECT_URLS = [
  './fxdeck/effects/critical-hit.json?v=p4.4.1',
  './fxdeck/effects/goal-celebration.json?v=p4.4.1'
];
const REGRESSION_EFFECT_IDS = new Set([
  'schema-test-burst',
  'schema-test-smoke',
  'schema-test-rain'
]);

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

function removeRegressionFixturesFromPlay() {
  const select = document.querySelector('#effect-select');
  if (!select) return 0;
  let removed = 0;
  for (const option of [...select.options]) {
    if (!REGRESSION_EFFECT_IDS.has(option.value)) continue;
    option.remove();
    removed += 1;
  }
  return removed;
}

function installSelectorOptions(effects) {
  const select = document.querySelector('#effect-select');
  if (!select) return;

  const labels = new Map([
    ['critical-hit', 'Critical Hit — directional slash / Schema V1'],
    ['goal-celebration', 'Goal Celebration — spatial ribbons + confetti / Schema V1']
  ]);

  for (const effect of [...effects].reverse()) {
    const existing = [...select.options].find((option) => option.value === effect.id);
    if (existing) {
      existing.textContent = labels.get(effect.id) ?? effect.label ?? effect.id;
      continue;
    }
    const option = document.createElement('option');
    option.value = effect.id;
    option.textContent = labels.get(effect.id) ?? effect.label ?? effect.id;
    select.prepend(option);
  }

  removeRegressionFixturesFromPlay();
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
  ribbonCapabilityAdded: true,
  regressionFixturesHiddenFromPlay: true
};

globalThis.FXDeckHeroEffects = state;
if (globalThis.FXDeckLab) globalThis.FXDeckLab.heroEffects = state;

log(`${BUILD} HERO CORRECTION: Critical Hit rebuilt around one dominant directional slash; Goal Celebration rebuilt around two spatial ribbon/confetti launch points`);
log(`${BUILD} PLAY SURFACE: synthetic schema-test fixtures remain registered for automated Debug gates but are hidden from the normal Effect selector`);
log(`${BUILD} GOAL CAPABILITY DECISION: ribbon added after visual review proved point-burst composition insufficient`);
