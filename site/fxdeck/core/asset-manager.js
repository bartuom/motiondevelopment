const ID_RE = /^[a-z][a-z0-9-]{1,63}$/;

function clone(value) {
  return structuredClone(value);
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`FXD_ASSET_MANIFEST: ${label} must be a positive integer`);
}

export class FXDeckAssetManager {
  constructor({ manifestUrl, fetchImpl, imageFactory } = {}) {
    if (!manifestUrl) throw new Error('FXDeckAssetManager requires manifestUrl.');
    this.manifestUrl = new URL(manifestUrl, document.baseURI).href;
    this.fetchImpl = fetchImpl ?? globalThis.fetch?.bind(globalThis);
    this.imageFactory = imageFactory ?? (() => new Image());
    if (typeof this.fetchImpl !== 'function') throw new Error('FXDeckAssetManager requires fetch().');

    this.records = new Map();
    this.cache = new Map();
    this.manifestPromise = null;
    this.telemetry = {
      coldLoads: 0,
      cacheHits: 0,
      failures: 0
    };
  }

  async init() {
    await this.loadManifest();
    return this;
  }

  async loadManifest() {
    if (this.manifestPromise) return this.manifestPromise;

    this.manifestPromise = (async () => {
      const response = await this.fetchImpl(this.manifestUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`FXD_ASSET_MANIFEST: ${this.manifestUrl} returned HTTP ${response.status}`);
      const manifest = await response.json();
      if (!manifest || manifest.version !== 1 || !manifest.assets || typeof manifest.assets !== 'object' || Array.isArray(manifest.assets)) {
        throw new Error('FXD_ASSET_MANIFEST: expected { version: 1, assets: { ... } }.');
      }

      this.records.clear();
      for (const [id, entry] of Object.entries(manifest.assets)) {
        if (!ID_RE.test(id)) throw new Error(`FXD_ASSET_MANIFEST: invalid asset id "${id}"`);
        if (!entry || entry.type !== 'image') throw new Error(`FXD_ASSET_MANIFEST: ${id} must be type "image"`);
        if (typeof entry.src !== 'string' || !entry.src || /^data:/i.test(entry.src)) {
          throw new Error(`FXD_ASSET_MANIFEST: ${id} requires a non-data URI src`);
        }
        assertPositiveInteger(entry.width, `${id}.width`);
        assertPositiveInteger(entry.height, `${id}.height`);

        this.records.set(id, Object.freeze({
          id,
          type: 'image',
          src: new URL(entry.src, this.manifestUrl).href,
          width: entry.width,
          height: entry.height,
          license: entry.license ?? null,
          provenance: entry.provenance ?? null
        }));
      }

      return this;
    })();

    return this.manifestPromise;
  }

  resolve(id) {
    const asset = this.records.get(id);
    if (!asset) throw new Error(`FXD_ASSET_UNKNOWN: asset "${id}" is not in the manifest`);
    return asset;
  }

  toRuntimeAsset(id) {
    const asset = this.resolve(id);
    return {
      id: asset.id,
      src: asset.src,
      width: asset.width,
      height: asset.height
    };
  }

  hydrateEffect(effect) {
    if (!effect || typeof effect !== 'object') throw new TypeError('FXDeckAssetManager.hydrateEffect() requires an effect object.');
    const hydrated = clone(effect);
    const declared = Array.isArray(hydrated.assets) ? hydrated.assets : [];
    hydrated.assets = declared.map((asset) => {
      if (typeof asset === 'string') return this.toRuntimeAsset(asset);
      if (asset && typeof asset === 'object') return asset;
      throw new Error('FXD_ASSET_REF: effect assets must contain manifest ids or inline asset objects');
    });
    return hydrated;
  }

  async prefetch(ids) {
    await this.loadManifest();
    const uniqueIds = [...new Set(ids ?? [])];
    const startedAt = performance.now();
    let coldLoads = 0;
    let cacheHits = 0;

    for (const id of uniqueIds) {
      if (this.cache.has(id)) cacheHits += 1;
      else coldLoads += 1;
    }

    await Promise.all(uniqueIds.map((id) => this.#ensureImage(id)));

    return {
      ids: uniqueIds,
      requested: uniqueIds.length,
      coldLoads,
      cacheHits,
      durationMs: performance.now() - startedAt
    };
  }

  async prefetchEffect(effect) {
    const ids = (effect?.assets ?? [])
      .map((asset) => typeof asset === 'string' ? asset : asset?.id)
      .filter(Boolean);
    return {
      effectId: effect?.id ?? null,
      ...(await this.prefetch(ids))
    };
  }

  getStats() {
    return {
      manifestLoaded: this.records.size > 0,
      manifestAssets: this.records.size,
      cachedAssets: this.cache.size,
      coldLoads: this.telemetry.coldLoads,
      cacheHits: this.telemetry.cacheHits,
      failures: this.telemetry.failures
    };
  }

  async #ensureImage(id) {
    const existing = this.cache.get(id);
    if (existing) {
      this.telemetry.cacheHits += 1;
      return existing.promise;
    }

    const asset = this.resolve(id);
    const image = this.imageFactory();
    if (!image) throw new Error(`FXD_ASSET_LOAD: imageFactory returned no image for ${id}`);
    image.decoding = 'async';

    const loadPromise = new Promise((resolve, reject) => {
      image.onload = () => resolve({ id, asset, image });
      image.onerror = () => reject(new Error(`FXD_ASSET_LOAD: failed to load ${id} from ${asset.src}`));
    });

    image.src = asset.src;

    const promise = typeof image.decode === 'function'
      ? image.decode().then(() => ({ id, asset, image })).catch(() => loadPromise)
      : loadPromise;

    this.telemetry.coldLoads += 1;
    this.cache.set(id, { asset, image, promise });

    try {
      return await promise;
    } catch (error) {
      this.telemetry.failures += 1;
      this.cache.delete(id);
      throw error;
    }
  }
}
