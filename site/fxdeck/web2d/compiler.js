import {
  assertValidEffectDefinition,
  DEFAULT_WEB2D_CAPABILITIES,
  DEFAULT_WEB2D_BUDGET
} from '../schema/validator.js?v=p4.4.0';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clone(value) {
  return structuredClone(value);
}

function findLayer(effect, id) {
  return effect.layers.find((layer) => layer.id === id);
}

function getNumericTarget(layer, property) {
  switch (property) {
    case 'spawn.count': return layer.spawn.count;
    case 'spawn.ratePerSecond': return layer.spawn.ratePerSecond;
    case 'motion.speed.min': return layer.motion.speed.min;
    case 'motion.speed.max': return layer.motion.speed.max;
    case 'size.start': return layer.size.start;
    case 'size.end': return layer.size.end;
    default: throw new Error(`FXD_BINDING_TARGET: unsupported numeric property ${property}`);
  }
}

function setNumericTarget(layer, property, value) {
  switch (property) {
    case 'spawn.count': layer.spawn.count = Math.max(1, Math.round(value)); return;
    case 'spawn.ratePerSecond': layer.spawn.ratePerSecond = value; return;
    case 'motion.speed.min': layer.motion.speed.min = value; return;
    case 'motion.speed.max': layer.motion.speed.max = value; return;
    case 'size.start': layer.size.start = value; return;
    case 'size.end': layer.size.end = value; return;
    default: throw new Error(`FXD_BINDING_TARGET: unsupported numeric property ${property}`);
  }
}

function applyBindings(effect, params) {
  const resolved = clone(effect);

  for (const binding of resolved.bindings ?? []) {
    const layer = findLayer(resolved, binding.layer);
    if (!layer) continue;

    if (binding.property === 'color') {
      const color = params?.[binding.param];
      if (typeof color === 'string' && color.trim()) layer.color = color.trim();
      continue;
    }

    const source = Number(params?.[binding.param]);
    if (!Number.isFinite(source)) continue;

    const current = getNumericTarget(layer, binding.property);
    let next = current;
    if (binding.operation === 'multiply') next = current * source;
    if (binding.operation === 'add') next = current + source;
    if (binding.operation === 'replace') next = source;
    if (Number.isFinite(binding.min)) next = Math.max(binding.min, next);
    if (Number.isFinite(binding.max)) next = Math.min(binding.max, next);
    setNumericTarget(layer, binding.property, next);
  }

  return resolved;
}

function assetMap(effect) {
  return new Map((effect.assets ?? []).map((asset) => [asset.id, asset]));
}

function tsShape(layer, assets) {
  if (layer.shape.type !== 'image') return { type: layer.shape.type };
  const asset = assets.get(layer.shape.asset);
  if (!asset) throw new Error(`FXD_ASSET_06: image layer ${layer.id} references missing asset ${layer.shape.asset}`);

  return {
    type: 'image',
    options: {
      image: {
        src: asset.src,
        width: asset.width,
        height: asset.height,
        replaceColor: true
      }
    }
  };
}

function animationFromCurve(curve, lifetimeMs, kind) {
  const lo = Math.min(curve.start, curve.end);
  const hi = Math.max(curve.start, curve.end);
  if (Math.abs(curve.end - curve.start) < 1e-6) return { value: curve.start };

  const lifetimeSec = Math.max(.001, ((lifetimeMs.min + lifetimeMs.max) * .5) / 1000);
  const delta = Math.abs(curve.end - curve.start);
  return {
    value: { min: lo, max: hi },
    animation: {
      enable: true,
      speed: delta / lifetimeSec,
      sync: false,
      startValue: curve.start > curve.end ? 'max' : 'min',
      destroy: curve.start > curve.end ? 'min' : kind === 'opacity' ? 'max' : 'none'
    }
  };
}

function runtimeDirectionDegrees(params) {
  const value = Number(params?.directionDegrees ?? params?.direction ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function compileParticles(effect, layer, params, assets) {
  const directionDegrees = layer.motion.direction === 'inherit'
    ? runtimeDirectionDegrees(params)
    : Number(layer.motion.direction);
  const gravity = Number(layer.motion.gravity ?? 0);
  const drag = Number(layer.motion.drag ?? 0);

  const particles = {
    color: { value: layer.color ?? '#ffffff' },
    shape: tsShape(layer, assets),
    opacity: animationFromCurve(layer.opacity, layer.lifetimeMs, 'opacity'),
    size: animationFromCurve(layer.size, layer.lifetimeMs, 'size'),
    move: {
      enable: true,
      direction: 'right',
      angle: { value: layer.motion.spreadDeg, offset: directionDegrees },
      random: true,
      straight: false,
      speed: { min: layer.motion.speed.min, max: layer.motion.speed.max },
      outModes: { default: 'destroy' }
    },
    life: {
      count: 1,
      duration: {
        value: {
          min: layer.lifetimeMs.min / 1000,
          max: layer.lifetimeMs.max / 1000
        },
        sync: false
      }
    }
  };

  if (drag > 0) particles.move.decay = drag;

  if (gravity !== 0) {
    particles.move.gravity = {
      enable: true,
      acceleration: Math.abs(gravity),
      inverse: gravity < 0
    };
  }

  if (layer.rotationDeg) {
    particles.rotate = {
      value: { min: layer.rotationDeg.min, max: layer.rotationDeg.max },
      direction: 'random'
    };
  }

  if ((layer.blend ?? 'normal') === 'lighter') {
    particles.blend = { enable: true, mode: 'lighter' };
  }

  if (Number.isFinite(layer.z)) {
    particles.zIndex = { value: clamp(layer.z, 0, 1000), opacityRate: 0, sizeRate: 0, velocityRate: 0 };
  }

  return particles;
}

function compileEmitter(layer, particles) {
  if (layer.spawn.mode === 'burst') {
    return {
      autoPlay: true,
      startCount: layer.spawn.count,
      size: { width: 0, height: 0, mode: 'percent' },
      rate: { quantity: 0, delay: 0 },
      life: { count: 1, duration: .05, wait: false },
      particles
    };
  }

  return {
    autoPlay: true,
    startCount: 0,
    size: { width: 0, height: 0, mode: 'percent' },
    rate: { quantity: 1, delay: 1 / layer.spawn.ratePerSecond },
    life: { count: 1, duration: layer.spawn.durationMs / 1000, wait: false },
    particles
  };
}

export function compileWeb2D(effect, params = {}, {
  capabilities = DEFAULT_WEB2D_CAPABILITIES,
  budget = DEFAULT_WEB2D_BUDGET
} = {}) {
  assertValidEffectDefinition(effect, { capabilities, budget });
  const resolved = applyBindings(effect, params);
  assertValidEffectDefinition(resolved, { capabilities, budget });

  const assets = assetMap(resolved);
  const layers = resolved.layers.map((layer) => {
    const particles = compileParticles(resolved, layer, params, assets);
    return {
      id: layer.id,
      delayMs: layer.delayMs ?? 0,
      priority: layer.priority ?? resolved.priority ?? 'medium',
      spawnMode: layer.spawn.mode,
      emitter: compileEmitter(layer, particles)
    };
  });

  return {
    schemaVersion: resolved.schemaVersion,
    id: resolved.id,
    durationMs: resolved.durationMs,
    assets: clone(resolved.assets ?? []),
    layers
  };
}
