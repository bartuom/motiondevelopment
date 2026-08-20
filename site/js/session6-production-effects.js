import { loadEffectDefinitions } from '../fxdeck/schema/effect-loader.js?v=p4.6.0';
import { registerSchemaEffects } from '../fxdeck/web2d/register-schema-effect.js?v=p4.6.0';

const BUILD = 'P4.6.0';
const EFFECT_URLS = [
  './fxdeck/effects/explosion.json?v=p4.6.0',
  './fxdeck/effects/rain.json?v=p4.6.0'
];

const PUBLIC_ORDER = [
  ['dust-puff', 'Dust Puff — accepted / Schema V1'],
  ['fireball', 'Projectile / Fireball — retained visual reference'],
  ['explosion', 'Explosion — usable / polish pending'],
  ['rain', 'Rain / Environment — accepted baseline']
];

const RETIRED_VISUAL_IDS = new Set([
  'heavyImpact',
  'critical-hit',
  'goal-celebration',
  'magic-burst',
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

async function waitForDependencies(timeoutMs = 10000) {
  const started = performance.now();
  while (!globalThis.FXDeckWeb2D?.fx || !globalThis.FXDeckAssets) {
    if (performance.now() - started > timeoutMs) throw new Error('FXD_P4_6_BOOT: runtime or asset manager did not become ready');
    await wait(20);
  }
  return { runtime: globalThis.FXDeckWeb2D, assetManager: globalThis.FXDeckAssets };
}

function rebuildPublicSelector(runtime) {
  const select = document.querySelector('#effect-select');
  if (!select) return;

  const selectedBefore = select.value;
  select.textContent = '';

  for (const [id, label] of PUBLIC_ORDER) {
    try {
      runtime.fx.resolve(id);
    } catch {
      continue;
    }
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    select.appendChild(option);
  }

  const next = [...select.options].some((option) => option.value === selectedBefore)
    ? selectedBefore
    : 'dust-puff';
  select.value = next;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

const { runtime, assetManager } = await waitForDependencies();
const effects = await loadEffectDefinitions(EFFECT_URLS, { assetManager });
const prefetch = [];

for (const effect of effects) prefetch.push(await assetManager.prefetchEffect(effect));

// explosion/v1/default intentionally replaces the old legacy definition.
registerSchemaEffects(runtime.fx, effects);
rebuildPublicSelector(runtime);

const registeredRetired = [...RETIRED_VISUAL_IDS].filter((id) => {
  try {
    runtime.fx.resolve(id);
    return true;
  } catch {
    return false;
  }
});

const state = {
  build: BUILD,
  publicEffects: PUBLIC_ORDER.map(([id]) => id),
  loadedSchemaEffects: effects.map((effect) => effect.id),
  prefetch: structuredClone(prefetch),
  retiredVisualIds: [...RETIRED_VISUAL_IDS],
  registeredRetiredInternalOnly: registeredRetired,
  weakEffectsLoaded: registeredRetired.filter((id) => ['critical-hit', 'goal-celebration', 'magic-burst'].includes(id)),
  fullBundleExpected: false,
  ribbonExpected: false
};

globalThis.FXDeckProductionSet = state;
if (globalThis.FXDeckLab) globalThis.FXDeckLab.productionSet = state;

log(`${BUILD} PUBLIC CURATION: Dust Puff + Projectile/Fireball + Explosion + Rain only`);
log(`${BUILD} RETIRED FROM PLAY: Heavy Impact / Critical Hit / Goal Celebration / Magic Burst; rejected art is not counted as portfolio content`);
log(`${BUILD} PRODUCTION LOAD: only Explosion + Rain coverage JSON loaded here; rejected Session 4/5 hero modules are not boot dependencies`);
