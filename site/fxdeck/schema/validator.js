const ID_RE = /^[a-z][a-z0-9-]{1,63}$/;
const PRIORITIES = new Set(['hero', 'high', 'medium', 'low']);
const BINDING_PROPERTIES = new Set([
  'spawn.count',
  'spawn.ratePerSecond',
  'motion.speed.min',
  'motion.speed.max',
  'size.start',
  'size.end'
]);
const BINDING_OPERATIONS = new Set(['multiply', 'add', 'replace']);

export const DEFAULT_WEB2D_BUDGET = Object.freeze({
  maxLayers: 8,
  maxBurstPerLayer: 240,
  maxBurstPerEffect: 320,
  maxRatePerSecond: 120,
  maxEstimatedSpawnPerEffect: 400,
  maxEffectDurationMs: 10000,
  maxAssetDimension: 1024,
  maxAssets: 16
});

export const DEFAULT_WEB2D_CAPABILITIES = Object.freeze({
  layerTypes: new Set(['particles']),
  spawnModes: new Set(['burst', 'rate']),
  shapes: new Set(['circle', 'square', 'image']),
  blends: new Set(['normal', 'lighter'])
});

export class FXDeckValidationError extends Error {
  constructor(issues) {
    const list = Array.isArray(issues) ? issues : [];
    const first = list[0] ?? { code: 'FXD_VALIDATION', path: '$', message: 'Effect validation failed.' };
    super(`${first.code}: ${first.path} ${first.message}`);
    this.name = 'FXDeckValidationError';
    this.code = first.code;
    this.issues = list;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function issue(issues, code, path, message) {
  issues.push({ code, path, message });
}

function unknownKeys(value, allowed, path, issues) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issue(issues, 'FXD_SCHEMA_01', `${path}.${key}`, 'unknown property');
  }
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateRange(value, path, issues, { min = -Infinity, max = Infinity } = {}) {
  if (!isObject(value)) {
    issue(issues, 'FXD_SCHEMA_02', path, 'must be { min, max }');
    return;
  }
  unknownKeys(value, new Set(['min', 'max']), path, issues);
  if (!finite(value.min) || !finite(value.max)) {
    issue(issues, 'FXD_SCHEMA_02', path, 'min/max must be finite numbers');
    return;
  }
  if (value.min > value.max) issue(issues, 'FXD_RANGE_01', path, 'min must be <= max');
  if (value.min < min || value.max > max) issue(issues, 'FXD_RANGE_02', path, `range must stay within [${min}, ${max}]`);
}

function validateCurve2(value, path, issues, { min = -Infinity, max = Infinity } = {}) {
  if (!isObject(value)) {
    issue(issues, 'FXD_SCHEMA_03', path, 'must be { start, end }');
    return;
  }
  unknownKeys(value, new Set(['start', 'end']), path, issues);
  if (!finite(value.start) || !finite(value.end)) {
    issue(issues, 'FXD_SCHEMA_03', path, 'start/end must be finite numbers');
    return;
  }
  if (value.start < min || value.start > max || value.end < min || value.end > max) {
    issue(issues, 'FXD_CURVE_01', path, `curve values must stay within [${min}, ${max}]`);
  }
}

function getBindingTarget(layer, property) {
  if (property === 'motion.speed.min') return layer.motion?.speed?.min;
  if (property === 'motion.speed.max') return layer.motion?.speed?.max;
  const [group, key] = property.split('.');
  if (group === 'spawn') return layer.spawn?.[key];
  if (group === 'size') return layer.size?.[key];
  return undefined;
}

export function validateEffectDefinition(effect, {
  budget = DEFAULT_WEB2D_BUDGET,
  capabilities = DEFAULT_WEB2D_CAPABILITIES
} = {}) {
  const issues = [];

  if (!isObject(effect)) {
    issue(issues, 'FXD_SCHEMA_00', '$', 'effect must be an object');
    return { ok: false, issues };
  }

  unknownKeys(effect, new Set(['schemaVersion', 'id', 'label', 'durationMs', 'priority', 'assets', 'bindings', 'layers']), '$', issues);

  if (effect.schemaVersion !== 1) issue(issues, 'FXD_SCHEMA_VERSION', '$.schemaVersion', 'must equal 1');
  if (typeof effect.id !== 'string' || !ID_RE.test(effect.id)) issue(issues, 'FXD_ID_01', '$.id', 'must be a lowercase kebab-case id');
  if (!Number.isInteger(effect.durationMs) || effect.durationMs < 1 || effect.durationMs > budget.maxEffectDurationMs) {
    issue(issues, 'FXD_DURATION_01', '$.durationMs', `must be an integer in [1, ${budget.maxEffectDurationMs}]`);
  }
  if (effect.priority != null && !PRIORITIES.has(effect.priority)) issue(issues, 'FXD_PRIORITY_01', '$.priority', 'unsupported priority');

  const assets = Array.isArray(effect.assets) ? effect.assets : [];
  if (effect.assets != null && !Array.isArray(effect.assets)) issue(issues, 'FXD_SCHEMA_04', '$.assets', 'must be an array');
  if (assets.length > budget.maxAssets) issue(issues, 'FXD_ASSET_00', '$.assets', `max ${budget.maxAssets} assets per effect`);
  const assetIds = new Set();
  assets.forEach((asset, index) => {
    const path = `$.assets[${index}]`;
    if (!isObject(asset)) return issue(issues, 'FXD_SCHEMA_04', path, 'asset must be a hydrated asset object');
    unknownKeys(asset, new Set(['id', 'src', 'width', 'height']), path, issues);
    if (typeof asset.id !== 'string' || !ID_RE.test(asset.id)) issue(issues, 'FXD_ASSET_01', `${path}.id`, 'invalid asset id');
    if (assetIds.has(asset.id)) issue(issues, 'FXD_ASSET_02', `${path}.id`, 'duplicate asset id');
    assetIds.add(asset.id);
    if (typeof asset.src !== 'string' || !asset.src || /^data:/i.test(asset.src)) issue(issues, 'FXD_ASSET_03', `${path}.src`, 'asset src must be a non-data URI path');
    if (!Number.isInteger(asset.width) || !Number.isInteger(asset.height) || asset.width < 1 || asset.height < 1) {
      issue(issues, 'FXD_ASSET_04', path, 'asset dimensions must be positive integers');
    } else if (asset.width > budget.maxAssetDimension || asset.height > budget.maxAssetDimension) {
      issue(issues, 'FXD_ASSET_05', path, `asset dimensions exceed ${budget.maxAssetDimension}px budget`);
    }
  });

  if (!Array.isArray(effect.layers) || effect.layers.length < 1) {
    issue(issues, 'FXD_LAYER_00', '$.layers', 'must contain at least one layer');
    return { ok: false, issues };
  }
  if (effect.layers.length > budget.maxLayers) issue(issues, 'FXD_BUDGET_00', '$.layers', `max ${budget.maxLayers} layers`);

  const layerIds = new Set();
  let burstTotal = 0;
  let estimatedSpawn = 0;

  effect.layers.forEach((layer, index) => {
    const path = `$.layers[${index}]`;
    if (!isObject(layer)) return issue(issues, 'FXD_LAYER_01', path, 'layer must be an object');
    unknownKeys(layer, new Set(['id', 'type', 'delayMs', 'priority', 'z', 'blend', 'spawn', 'shape', 'color', 'lifetimeMs', 'motion', 'size', 'opacity', 'rotationDeg']), path, issues);

    if (typeof layer.id !== 'string' || !ID_RE.test(layer.id)) issue(issues, 'FXD_LAYER_02', `${path}.id`, 'invalid layer id');
    if (layerIds.has(layer.id)) issue(issues, 'FXD_LAYER_03', `${path}.id`, 'duplicate layer id');
    layerIds.add(layer.id);

    if (!capabilities.layerTypes.has(layer.type)) issue(issues, 'FXD_CAPABILITY_01', `${path}.type`, `unsupported layer type "${layer.type}"`);
    if (layer.delayMs != null && (!Number.isInteger(layer.delayMs) || layer.delayMs < 0)) issue(issues, 'FXD_DELAY_01', `${path}.delayMs`, 'must be a non-negative integer');
    if (layer.priority != null && !PRIORITIES.has(layer.priority)) issue(issues, 'FXD_PRIORITY_01', `${path}.priority`, 'unsupported priority');
    if (layer.blend != null && !capabilities.blends.has(layer.blend)) issue(issues, 'FXD_CAPABILITY_02', `${path}.blend`, `unsupported blend "${layer.blend}"`);

    if (!isObject(layer.spawn)) {
      issue(issues, 'FXD_SPAWN_00', `${path}.spawn`, 'spawn must be an object');
    } else if (!capabilities.spawnModes.has(layer.spawn.mode)) {
      issue(issues, 'FXD_CAPABILITY_03', `${path}.spawn.mode`, `unsupported spawn mode "${layer.spawn.mode}"`);
    } else if (layer.spawn.mode === 'burst') {
      unknownKeys(layer.spawn, new Set(['mode', 'count']), `${path}.spawn`, issues);
      if (!Number.isInteger(layer.spawn.count) || layer.spawn.count < 1) issue(issues, 'FXD_SPAWN_01', `${path}.spawn.count`, 'must be a positive integer');
      if (Number.isInteger(layer.spawn.count)) {
        burstTotal += layer.spawn.count;
        estimatedSpawn += layer.spawn.count;
        if (layer.spawn.count > budget.maxBurstPerLayer) issue(issues, 'FXD_BUDGET_01', `${path}.spawn.count`, `burst exceeds ${budget.maxBurstPerLayer} particles per layer`);
      }
    } else if (layer.spawn.mode === 'rate') {
      unknownKeys(layer.spawn, new Set(['mode', 'ratePerSecond', 'durationMs']), `${path}.spawn`, issues);
      if (!finite(layer.spawn.ratePerSecond) || layer.spawn.ratePerSecond <= 0) issue(issues, 'FXD_SPAWN_02', `${path}.spawn.ratePerSecond`, 'must be > 0');
      if (!Number.isInteger(layer.spawn.durationMs) || layer.spawn.durationMs < 1) issue(issues, 'FXD_SPAWN_03', `${path}.spawn.durationMs`, 'must be a positive integer');
      if (finite(layer.spawn.ratePerSecond) && layer.spawn.ratePerSecond > budget.maxRatePerSecond) issue(issues, 'FXD_BUDGET_02', `${path}.spawn.ratePerSecond`, `rate exceeds ${budget.maxRatePerSecond}/s`);
      if (finite(layer.spawn.ratePerSecond) && Number.isInteger(layer.spawn.durationMs)) estimatedSpawn += Math.ceil(layer.spawn.ratePerSecond * layer.spawn.durationMs / 1000);
    }

    if (!isObject(layer.shape)) {
      issue(issues, 'FXD_SHAPE_00', `${path}.shape`, 'shape must be an object');
    } else {
      unknownKeys(layer.shape, new Set(['type', 'asset']), `${path}.shape`, issues);
      if (!capabilities.shapes.has(layer.shape.type)) issue(issues, 'FXD_CAPABILITY_04', `${path}.shape.type`, `unsupported shape "${layer.shape.type}"`);
      if (layer.shape.type === 'image') {
        if (typeof layer.shape.asset !== 'string' || !assetIds.has(layer.shape.asset)) issue(issues, 'FXD_ASSET_06', `${path}.shape.asset`, 'image shape must reference a declared asset');
      } else if (layer.shape.asset != null) {
        issue(issues, 'FXD_SHAPE_01', `${path}.shape.asset`, 'asset is only valid for image shape');
      }
    }

    if (layer.color != null) {
      const validColor = typeof layer.color === 'string' || (Array.isArray(layer.color) && layer.color.length > 0 && layer.color.every((value) => typeof value === 'string'));
      if (!validColor) issue(issues, 'FXD_COLOR_01', `${path}.color`, 'must be a color string or non-empty string array');
    }

    validateRange(layer.lifetimeMs, `${path}.lifetimeMs`, issues, { min: 1, max: 10000 });

    if (!isObject(layer.motion)) {
      issue(issues, 'FXD_MOTION_00', `${path}.motion`, 'motion must be an object');
    } else {
      unknownKeys(layer.motion, new Set(['direction', 'spreadDeg', 'speed', 'gravity', 'drag']), `${path}.motion`, issues);
      if (layer.motion.direction !== 'inherit' && !finite(layer.motion.direction)) issue(issues, 'FXD_MOTION_01', `${path}.motion.direction`, 'must be degrees or "inherit"');
      if (!finite(layer.motion.spreadDeg) || layer.motion.spreadDeg < 0 || layer.motion.spreadDeg > 360) issue(issues, 'FXD_MOTION_02', `${path}.motion.spreadDeg`, 'must be in [0, 360]');
      validateRange(layer.motion.speed, `${path}.motion.speed`, issues, { min: 0, max: 5000 });
      if (layer.motion.gravity != null && (!finite(layer.motion.gravity) || layer.motion.gravity < -100 || layer.motion.gravity > 100)) issue(issues, 'FXD_MOTION_03', `${path}.motion.gravity`, 'must be in [-100, 100]');
      if (layer.motion.drag != null && (!finite(layer.motion.drag) || layer.motion.drag < 0 || layer.motion.drag > 1)) issue(issues, 'FXD_MOTION_04', `${path}.motion.drag`, 'must be in [0, 1]');
    }

    validateCurve2(layer.size, `${path}.size`, issues, { min: 0, max: 2048 });
    validateCurve2(layer.opacity, `${path}.opacity`, issues, { min: 0, max: 1 });
    if (layer.rotationDeg != null) validateRange(layer.rotationDeg, `${path}.rotationDeg`, issues, { min: -3600, max: 3600 });

    const maxLife = finite(layer.lifetimeMs?.max) ? layer.lifetimeMs.max : 0;
    const delay = Number.isInteger(layer.delayMs) ? layer.delayMs : 0;
    const spawnDuration = layer.spawn?.mode === 'rate' && Number.isInteger(layer.spawn.durationMs) ? layer.spawn.durationMs : 0;
    if (Number.isInteger(effect.durationMs) && delay + spawnDuration + maxLife > effect.durationMs) {
      issue(issues, 'FXD_DURATION_02', path, 'effect duration must cover delay + emitter duration + max particle lifetime');
    }
  });

  if (burstTotal > budget.maxBurstPerEffect) issue(issues, 'FXD_BUDGET_03', '$.layers', `combined burst count exceeds ${budget.maxBurstPerEffect}`);
  if (estimatedSpawn > budget.maxEstimatedSpawnPerEffect) issue(issues, 'FXD_BUDGET_04', '$.layers', `estimated spawned particles exceed ${budget.maxEstimatedSpawnPerEffect}`);

  const bindings = Array.isArray(effect.bindings) ? effect.bindings : [];
  if (effect.bindings != null && !Array.isArray(effect.bindings)) issue(issues, 'FXD_BINDING_00', '$.bindings', 'must be an array');
  bindings.forEach((binding, index) => {
    const path = `$.bindings[${index}]`;
    if (!isObject(binding)) return issue(issues, 'FXD_BINDING_01', path, 'binding must be an object');
    unknownKeys(binding, new Set(['param', 'layer', 'property', 'operation', 'min', 'max']), path, issues);
    if (binding.param !== 'intensity') issue(issues, 'FXD_BINDING_02', `${path}.param`, 'only intensity is supported in V1');
    if (!layerIds.has(binding.layer)) issue(issues, 'FXD_BINDING_03', `${path}.layer`, 'binding references an unknown layer');
    if (!BINDING_PROPERTIES.has(binding.property)) issue(issues, 'FXD_BINDING_04', `${path}.property`, 'unsupported binding target');
    if (!BINDING_OPERATIONS.has(binding.operation)) issue(issues, 'FXD_BINDING_05', `${path}.operation`, 'unsupported binding operation');
    if (binding.min != null && !finite(binding.min)) issue(issues, 'FXD_BINDING_06', `${path}.min`, 'must be finite');
    if (binding.max != null && !finite(binding.max)) issue(issues, 'FXD_BINDING_06', `${path}.max`, 'must be finite');
    if (finite(binding.min) && finite(binding.max) && binding.min > binding.max) issue(issues, 'FXD_BINDING_07', path, 'min must be <= max');

    const layer = effect.layers.find((candidate) => candidate?.id === binding.layer);
    if (layer && BINDING_PROPERTIES.has(binding.property) && !finite(getBindingTarget(layer, binding.property))) {
      issue(issues, 'FXD_BINDING_08', `${path}.property`, 'binding target must resolve to a numeric property');
    }
  });

  return { ok: issues.length === 0, issues };
}

export function assertValidEffectDefinition(effect, options) {
  const result = validateEffectDefinition(effect, options);
  if (!result.ok) throw new FXDeckValidationError(result.issues);
  return effect;
}
