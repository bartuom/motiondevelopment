import { registerHeavyImpact } from './heavy-impact.js?v=p3.6.0';
import { registerExplosion } from './explosion.js?v=p3.6.0';
import { registerExplosionV2 } from './explosion-v2.js?v=p3.13.1';
import { registerFireball } from './fireball.js?v=p3.6.4';
import { registerEnvironmentEmitter } from './environment-emitter.js?v=p3.8.1';
import { registerRareReward } from './rare-reward.js?v=p3.9.0-r2';
import { registerFootballCardReveal } from './football-card-reveal.js?v=p3.10.0';
import { registerCriticalHit } from './critical-hit.js?v=p3.11.0';
import { registerMagicBurst } from './magic-burst.js?v=p3.12.0';
import { registerMagicBurstV2 } from './magic-burst-v2.js?v=p3.13.1';

export function registerProductionEffects(fx) {
  registerHeavyImpact(fx);
  registerExplosion(fx);
  registerExplosionV2(fx);
  registerFireball(fx);
  registerEnvironmentEmitter(fx);
  registerRareReward(fx);
  registerFootballCardReveal(fx);
  registerCriticalHit(fx);
  registerMagicBurst(fx);
  registerMagicBurstV2(fx);
  return fx;
}
