export class DomSpriteAdapter {
  constructor({ host }) {
    if (!host) throw new Error('DomSpriteAdapter requires a host element.');
    this.host = host;
    this.serial = 0;
    this.handles = new Map();
  }

  async spawn(options = {}, cssPosition = { x: 0, y: 0 }) {
    const id = `fxdeck-visual-${++this.serial}`;
    const element = document.createElement(options.tagName || 'div');
    element.dataset.fxdeckVisual = id;
    element.className = options.className || 'fxdeck-visual';
    element.setAttribute('aria-hidden', 'true');

    if (options.attributes) {
      for (const [name, value] of Object.entries(options.attributes)) {
        if (value != null) element.setAttribute(name, String(value));
      }
    }

    if (options.style) Object.assign(element.style, options.style);
    if (options.cssVars) {
      for (const [name, value] of Object.entries(options.cssVars)) {
        element.style.setProperty(name, String(value));
      }
    }

    this.host.appendChild(element);

    const handle = {
      id,
      mode: 'dom-visual',
      element,
      ready: null,
      move: (nextCssPosition) => this.move(id, nextCssPosition),
      stop: () => this.stop(id),
      isAlive: () => this.handles.has(id) && element.isConnected
    };

    this.handles.set(id, handle);
    this.move(id, cssPosition);
    handle.ready = Promise.resolve(handle);
    return handle;
  }

  move(id, cssPosition) {
    const handle = this.handles.get(id);
    if (!handle?.element || !Number.isFinite(cssPosition?.x) || !Number.isFinite(cssPosition?.y)) return false;

    // Moving gameplay visuals must stay on the compositor path. Updating left/top every
    // frame forces layout/paint on mobile; CSS classes consume these variables inside
    // translate3d() instead.
    handle.element.style.setProperty('--fxdeck-visual-x', `${cssPosition.x}px`);
    handle.element.style.setProperty('--fxdeck-visual-y', `${cssPosition.y}px`);
    return true;
  }

  stop(id) {
    const handle = this.handles.get(id);
    if (!handle) return false;
    handle.element?.remove();
    this.handles.delete(id);
    return true;
  }

  clear() {
    for (const id of [...this.handles.keys()]) this.stop(id);
  }

  getStats() {
    return { activeVisuals: this.handles.size };
  }
}
