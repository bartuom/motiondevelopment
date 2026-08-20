import { assertValidEffectDefinition } from './validator.js?v=p4.5.0';

function splitOptions(options = {}) {
  const { assetManager = null, validationOptions = null, ...legacyValidationOptions } = options ?? {};
  return {
    assetManager,
    validationOptions: validationOptions ?? legacyValidationOptions
  };
}

export async function loadEffectDefinition(url, options = {}) {
  const { assetManager, validationOptions } = splitOptions(options);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`FXD_LOAD_01: ${url} returned HTTP ${response.status}`);

  let effect = await response.json();
  if (assetManager) {
    await assetManager.loadManifest();
    effect = assetManager.hydrateEffect(effect);
  }

  assertValidEffectDefinition(effect, validationOptions);
  return effect;
}

export async function loadEffectDefinitions(urls, options = {}) {
  if (!Array.isArray(urls)) throw new TypeError('FXD_LOAD_00: urls must be an array');
  return Promise.all(urls.map((url) => loadEffectDefinition(url, options)));
}
