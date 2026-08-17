export class Trail {
  constructor(line, glowLine, maxPoints = 18) {
    this.line = line;
    this.glowLine = glowLine;
    this.maxPoints = maxPoints;
    this.points = [];
    this.strength = 1;
    this.fadeAnimation = null;
  }

  setStrength(value) {
    this.strength = Math.max(0, value);
    const width = 3.5 + 2.2 * this.strength;
    const glowWidth = 10 + 7 * this.strength;
    this.line.style.strokeWidth = `${width}`;
    this.glowLine.style.strokeWidth = `${glowWidth}`;
  }

  reset() {
    this.fadeAnimation?.cancel();
    this.fadeAnimation = null;
    this.points.length = 0;
    this.line.setAttribute('points', '');
    this.glowLine.setAttribute('points', '');
    this.line.style.opacity = '0';
    this.glowLine.style.opacity = '0';
  }

  begin(point) {
    this.reset();
    this.push(point);
  }

  push(point) {
    if (this.strength <= 0.01) return;
    this.points.push([point.x, point.y]);
    const pointBudget = Math.max(4, Math.round(this.maxPoints * Math.min(1.5, this.strength)));
    if (this.points.length > pointBudget) this.points.splice(0, this.points.length - pointBudget);
    const points = this.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    this.line.setAttribute('points', points);
    this.glowLine.setAttribute('points', points);
    this.line.style.opacity = String(Math.min(1, 0.45 + this.strength * 0.45));
    this.glowLine.style.opacity = String(Math.min(0.7, 0.12 + this.strength * 0.32));
  }

  fade(duration = 180) {
    if (this.strength <= 0.01) return;
    this.fadeAnimation?.cancel();
    this.fadeAnimation = this.line.animate(
      [{ opacity: Number(this.line.style.opacity || 1) }, { opacity: 0 }],
      { duration, easing: 'ease-out', fill: 'forwards' },
    );
    this.glowLine.animate(
      [{ opacity: Number(this.glowLine.style.opacity || 0.4) }, { opacity: 0 }],
      { duration, easing: 'ease-out', fill: 'forwards' },
    );
  }
}
