export class CoordinateAdapter {
  constructor({ stage, getCanvasSize }) {
    if (!stage) throw new Error('CoordinateAdapter requires a stage element.');
    if (typeof getCanvasSize !== 'function') throw new Error('CoordinateAdapter requires getCanvasSize().');
    this.stage = stage;
    this.getCanvasSize = getCanvasSize;
  }

  getScale() {
    const cssWidth = Math.max(1, this.stage.clientWidth);
    const cssHeight = Math.max(1, this.stage.clientHeight);
    const canvas = this.getCanvasSize() || {};

    return {
      x: (canvas.width || cssWidth) / cssWidth,
      y: (canvas.height || cssHeight) / cssHeight
    };
  }

  toCanvas(point) {
    this.#assertPoint(point);
    const scale = this.getScale();
    return { x: point.x * scale.x, y: point.y * scale.y };
  }

  toCss(point) {
    this.#assertPoint(point);
    const scale = this.getScale();
    return { x: point.x / scale.x, y: point.y / scale.y };
  }

  #assertPoint(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new TypeError('FXDeck position must be { x: number, y: number }.');
    }
  }
}
