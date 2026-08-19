import { assertValidEffectDefinition } from './validator.js?v=p4.2.0';

export async function loadEffectDefinition(url, validationOptions) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`FXD_LOAD_01: ${url} returned HTTP ${response.status}`);
  const effect = await response.json();
  assertValidEffectDefinition(effect, validationOptions);
  return effect;
}

export async function loadEffectDefinitions(urls, validationOptions) {
  if (!Array.isArray(urls)) throw new TypeError('FXD_LOAD_00: urls must be an array');
  return Promise.all(urls.map((url) => loadEffectDefinition(url, validationOptions)));
}
