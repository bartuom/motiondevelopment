const TAU = Math.PI * 2;

function random(min, max) {
  return min + Math.random() * (max - min);
}

export class ParticleSystem {
  constructor(canvas, stage) {
    this.canvas = canvas;
    this.stage = stage;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.particles = [];
    this.raf = 0;
    this.lastTime = 0;
    this.cssWidth = 1;
    this.cssHeight = 1;
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize, { passive: true });
    this.resize();
  }

  resize() {
    const rect = this.stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssWidth = Math.max(1, rect.width);
    this.cssHeight = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.cssWidth * dpr);
    this.canvas.height = Math.round(this.cssHeight * dpr);
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clear() {
    this.particles.length = 0;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
  }

  emit({ x, y, incomingAngle = 0, strength = 1, amount = 1, reducedMotion = false }) {
    if (amount <= 0.01) return;
    this.resize();
    const count = reducedMotion ? Math.round(5 * amount) : Math.round((12 + 14 * strength) * amount);
    const base = incomingAngle;

    for (let i = 0; i < count; i += 1) {
      const backwardBias = Math.PI + random(-0.8, 0.8);
      const angle = base + backwardBias;
      const speed = random(90, 220) * (0.7 + strength * 0.55);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - random(10, 65),
        life: 0,
        ttl: random(0.18, 0.42),
        size: random(1.2, 3.4) * (0.8 + strength * 0.25),
        rotation: random(0, TAU),
        spin: random(-9, 9),
        kind: Math.random() > 0.35 ? 'spark' : 'chip',
      });
    }

    if (!this.raf) {
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame((time) => this.tick(time));
    }
  }

  tick(time) {
    const dt = Math.min(0.034, Math.max(0.001, (time - this.lastTime) / 1000));
    this.lastTime = time;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    this.particles = this.particles.filter((p) => {
      p.life += dt;
      if (p.life >= p.ttl) return false;
      p.vx *= 0.985;
      p.vy += 190 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
      const alpha = Math.max(0, 1 - p.life / p.ttl);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.kind === 'spark' ? '#dffff0' : '#6affb0';
      if (p.kind === 'spark') {
        ctx.fillRect(-p.size * 2.2, -p.size * 0.45, p.size * 4.4, p.size * 0.9);
      } else {
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
      }
      ctx.restore();
      return true;
    });

    ctx.restore();
    if (this.particles.length) {
      this.raf = requestAnimationFrame((next) => this.tick(next));
    } else {
      this.raf = 0;
      ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    }
  }
}
