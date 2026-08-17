import { Timeline } from '../core/timeline.js';
import { ParticleSystem } from '../fx/particles.js';
import { shake } from '../fx/shake.js';
import { Shockwave } from '../fx/shockwave.js';
import { Trail } from '../fx/trail.js';

export const TARGETS = {
  'top-left': { x: 580, y: 145 },
  'top-right': { x: 686, y: 145 },
  center: { x: 635, y: 210 },
  'bottom-left': { x: 570, y: 272 },
  'bottom-right': { x: 695, y: 272 },
};

const START = { x: 126, y: 346 };
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export class PowerShotDemo {
  constructor(elements) {
    this.el = elements;
    this.settings = { power: 1, trail: 1, particles: 1, shake: 1, flash: 1 };
    this.targetName = 'top-right';
    this.target = TARGETS[this.targetName];
    this.timeline = new Timeline();
    this.trail = new Trail(elements.trail, elements.trailGlow);
    this.shockwave = new Shockwave(elements.shockwave);
    this.particles = new ParticleSystem(elements.canvas, elements.stage);
    this.raf = 0;
    this.playing = false;
    this.rays = [];
    this.buildImpactRays();
    this.reset();
  }

  buildImpactRays() {
    const ns = 'http://www.w3.org/2000/svg';
    this.el.rays.replaceChildren();
    for (let i = 0; i < 12; i += 1) {
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('y1', '0');
      line.setAttribute('x2', '0');
      line.setAttribute('y2', '0');
      this.el.rays.append(line);
      this.rays.push(line);
    }
  }

  setSettings(next) {
    this.settings = { ...this.settings, ...next };
    this.trail.setStrength(this.settings.trail);
  }

  setTarget(name) {
    if (!TARGETS[name]) return;
    this.targetName = name;
    this.target = TARGETS[name];
    this.positionReticle();
    if (!this.playing) this.el.status.textContent = `Target: ${name.replace('-', ' ')}. Ready to fire.`;
  }

  selectNearestTarget(x, y) {
    let winner = null;
    let bestDistance = Infinity;
    for (const [name, target] of Object.entries(TARGETS)) {
      const distance = Math.hypot(target.x - x, target.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        winner = name;
      }
    }
    if (winner) this.setTarget(winner);
    return winner;
  }

  positionReticle() {
    this.el.reticle.setAttribute('transform', `translate(${this.target.x} ${this.target.y})`);
    this.el.shockwave.setAttribute('cx', this.target.x);
    this.el.shockwave.setAttribute('cy', this.target.y);
  }

  worldToScreen(point) {
    const rect = this.el.stage.getBoundingClientRect();
    return {
      x: point.x / 800 * rect.width,
      y: point.y / 450 * rect.height,
    };
  }

  placeBall(point, scale = 1, rotation = 0) {
    const rect = this.el.stage.getBoundingClientRect();
    const size = this.el.ball.getBoundingClientRect().width || 40;
    const x = point.x / 800 * rect.width - size / 2;
    const y = point.y / 450 * rect.height - size / 2;
    this.el.ball.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotate(${rotation}deg)`;
  }

  resetVisuals() {
    this.timeline.clear();
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.playing = false;
    this.el.stage.classList.remove('is-shaking');
    this.el.flash.getAnimations().forEach((animation) => animation.cancel());
    this.el.impactLabel.getAnimations().forEach((animation) => animation.cancel());
    this.el.net.getAnimations().forEach((animation) => animation.cancel());
    this.el.ball.getAnimations().forEach((animation) => animation.cancel());
    this.rays.forEach((line) => line.getAnimations().forEach((animation) => animation.cancel()));
    this.el.flash.style.opacity = '0';
    this.el.impactLabel.style.opacity = '0';
    this.el.net.style.transform = '';
    this.trail.reset();
    this.shockwave.reset();
    this.particles.clear();
    this.rays.forEach((line) => {
      line.style.opacity = '0';
      line.setAttribute('x1', this.target.x);
      line.setAttribute('y1', this.target.y);
      line.setAttribute('x2', this.target.x);
      line.setAttribute('y2', this.target.y);
    });
  }

  reset() {
    this.resetVisuals();
    this.positionReticle();
    this.placeBall(START);
    this.el.ball.style.opacity = '1';
    this.el.reticle.style.opacity = '0.72';
    this.el.status.textContent = 'Ready. Choose a target and fire.';
  }

  play() {
    this.resetVisuals();
    this.playing = true;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const power = Math.max(0.6, this.settings.power);
    const duration = reducedMotion ? 170 : Math.round(285 / Math.sqrt(power));
    const anticipation = reducedMotion ? 0 : 68;
    const startTime = performance.now() + anticipation;
    const target = { ...this.target };
    const incomingAngle = Math.atan2(target.y - START.y, target.x - START.x);

    this.el.status.textContent = 'Charging power shot…';
    this.el.reticle.style.opacity = '0.28';
    this.placeBall(START, reducedMotion ? 1 : 0.92);

    if (!reducedMotion) {
      this.el.ball.animate(
        [
          { filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.5))', offset: 0 },
          { filter: 'drop-shadow(0 0 14px rgba(106,255,176,.82))', offset: 1 },
        ],
        { duration: anticipation, easing: 'ease-out', fill: 'forwards' },
      );
    }

    this.timeline.at(anticipation, () => {
      this.el.status.textContent = 'Shot in flight.';
      this.trail.begin(START);
      const frame = (now) => {
        const t = clamp01((now - startTime) / duration);
        const eased = easeOutCubic(t);
        const arc = Math.sin(Math.PI * t) * (reducedMotion ? 0 : 34 * power);
        const point = {
          x: START.x + (target.x - START.x) * eased,
          y: START.y + (target.y - START.y) * eased - arc,
        };
        this.placeBall(point, 1 + 0.12 * power * Math.sin(Math.PI * t), 720 * t * power);
        this.trail.push(point);

        if (t < 1) {
          this.raf = requestAnimationFrame(frame);
        } else {
          this.raf = 0;
          this.impact(target, incomingAngle, reducedMotion);
        }
      };
      this.raf = requestAnimationFrame(frame);
    });
  }

  impact(target, incomingAngle, reducedMotion) {
    const strength = Math.max(0.6, this.settings.power);
    const screen = this.worldToScreen(target);
    const rect = this.el.stage.getBoundingClientRect();

    this.el.status.textContent = 'Impact.';
    this.el.ball.style.opacity = '0';
    this.el.flash.style.setProperty('--impact-x', `${screen.x / rect.width * 100}%`);
    this.el.flash.style.setProperty('--impact-y', `${screen.y / rect.height * 100}%`);

    const flashOpacity = Math.min(0.95, 0.28 + this.settings.flash * 0.5);
    if (this.settings.flash > 0.01) {
      this.el.flash.animate(
        [{ opacity: 0 }, { opacity: flashOpacity, offset: 0.16 }, { opacity: 0 }],
        { duration: reducedMotion ? 80 : 105, easing: 'linear' },
      );
    }

    this.playImpactRays(target, strength, reducedMotion);
    this.shockwave.play({ x: target.x, y: target.y, strength, reducedMotion });
    this.particles.emit({
      x: screen.x,
      y: screen.y,
      incomingAngle,
      strength,
      amount: this.settings.particles,
      reducedMotion,
    });
    shake(this.el.stage, this.settings.shake * strength);

    if (!reducedMotion) {
      this.el.net.animate(
        [
          { transform: 'translateX(0) scaleX(1)' },
          { transform: `translateX(${Math.min(12, 5 + strength * 4)}px) scaleX(${1 + 0.035 * strength})`, offset: 0.28 },
          { transform: 'translateX(0) scaleX(1)' },
        ],
        { duration: 260, easing: 'cubic-bezier(.12,.75,.2,1)' },
      );

      this.el.impactLabel.animate(
        [
          { opacity: 0, transform: 'translate(-50%, -50%) scale(.62) rotate(-5deg)' },
          { opacity: 1, transform: 'translate(-50%, -50%) scale(1.1) rotate(-1deg)', offset: 0.32 },
          { opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', offset: 0.58 },
          { opacity: 0, transform: 'translate(-50%, -58%) scale(.96) rotate(0deg)' },
        ],
        { duration: 440, easing: 'cubic-bezier(.08,.82,.22,1)' },
      );
    }

    this.trail.fade(reducedMotion ? 80 : 210);
    this.timeline.at(reducedMotion ? 140 : 480, () => {
      this.playing = false;
      this.el.ball.style.opacity = '1';
      this.placeBall(START);
      this.el.reticle.style.opacity = '0.72';
      this.el.status.textContent = 'Ready. Tune the effect or fire again.';
    });
  }

  playImpactRays(target, strength, reducedMotion) {
    const baseLength = (reducedMotion ? 22 : 38) * (0.8 + strength * 0.35);
    this.rays.forEach((line, index) => {
      const angle = (index / this.rays.length) * Math.PI * 2 + 0.08;
      const inner = 10 + (index % 3) * 3;
      const outer = baseLength * (0.72 + (index % 4) * 0.12);
      const x1 = target.x + Math.cos(angle) * inner;
      const y1 = target.y + Math.sin(angle) * inner;
      const x2 = target.x + Math.cos(angle) * outer;
      const y2 = target.y + Math.sin(angle) * outer;
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.animate(
        [
          { opacity: 0, strokeDashoffset: outer },
          { opacity: 0.95, strokeDashoffset: 0, offset: 0.2 },
          { opacity: 0 },
        ],
        { duration: reducedMotion ? 100 : 220, easing: 'ease-out' },
      );
    });
  }
}
