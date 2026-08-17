export class Shockwave {
  constructor(circle) {
    this.circle = circle;
    this.animation = null;
  }

  reset() {
    this.animation?.cancel();
    this.animation = null;
    this.circle.style.opacity = '0';
    this.circle.style.transform = 'scale(1)';
  }

  play({ x, y, strength = 1, reducedMotion = false }) {
    this.reset();
    this.circle.setAttribute('cx', x);
    this.circle.setAttribute('cy', y);
    const endScale = reducedMotion ? 1.35 : 2.8 + strength * 0.75;
    this.animation = this.circle.animate(
      [
        { transform: 'scale(.35)', opacity: 0.92 },
        { transform: `scale(${endScale})`, opacity: 0 },
      ],
      {
        duration: reducedMotion ? 120 : Math.max(180, 290 / Math.max(0.75, strength)),
        easing: 'cubic-bezier(.08,.72,.18,1)',
        fill: 'forwards',
      },
    );
  }
}
