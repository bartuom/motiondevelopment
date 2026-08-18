import { registerHeavyImpact } from './heavy-impact.js?v=p3.6.0';
import { registerExplosion } from './explosion.js?v=p3.6.0';
import { registerFireball } from './fireball.js?v=p3.6.4';
import { registerEnvironmentEmitter } from './environment-emitter.js?v=p3.8.0';

export function registerProductionEffects(fx) {
  registerHeavyImpact(fx);
  registerExplosion(fx);
  registerFireball(fx);
  registerEnvironmentEmitter(fx);
  return fx;
}
