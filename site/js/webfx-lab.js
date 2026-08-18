const effectButtons = [...document.querySelectorAll('[data-effect]')];
const versionControls = document.querySelector('#version-controls');
const playButton = document.querySelector('#play-effect');
const activeName = document.querySelector('#active-name');
const activeDescription = document.querySelector('#active-description');

const WebFX = {
  container: null,
  activeEffect: 'burst',
  activeVersion: 'v0.2',
  registry: new Map(),

  register(effect) {
    this.registry.set(effect.id, effect);
  },

  get(effectId = this.activeEffect, version = this.activeVersion) {
    const effect = this.registry.get(effectId);
    if (!effect) throw new Error(`Unknown WebFX effect: ${effectId}`);
    const definition = effect.versions[version];
    if (!definition) throw new Error(`Unknown version ${version} for ${effectId}`);
    return { effect, definition };
  },

  async init() {
    if (!window.tsParticles) throw new Error('tsParticles did not load.');

    this.container = await window.tsParticles.load({
      id: 'webfx-particles',
      options: {
        fullScreen: { enable: false },
        background: { color: { value: 'transparent' } },
        detectRetina: true,
        fpsLimit: 60,
        pauseOnBlur: true,
        particles: {
          number: { value: 0 }
        },
        emitters: []
      }
    });
  },

  async play(effectId = this.activeEffect, version = this.activeVersion) {
    const { definition } = this.get(effectId, version);

    this.container?.particles?.clear?.();

    if (!this.container?.addEmitter) {
      throw new Error('Emitter plugin is unavailable in the loaded tsParticles bundle.');
    }

    await this.container.addEmitter(structuredClone(definition.emitter));
  }
};

WebFX.register({
  id: 'burst',
  label: 'Burst',
  versions: {
    'v0.1': {
      description: 'Baseline radial burst used to validate emitter lifecycle and particle cleanup.',
      emitter: {
        name: 'webfx-burst-v01',
        autoPlay: true,
        position: { x: 50, y: 50 },
        size: { width: 0, height: 0, mode: 'percent' },
        rate: { quantity: 11, delay: 0.018 },
        life: { count: 1, duration: 0.065, wait: false },
        particles: {
          color: { value: ['#ffffff', '#d9f2ff', '#83d8ff'] },
          shape: { type: 'circle' },
          opacity: {
            value: { min: 0.65, max: 1 },
            animation: { enable: true, speed: 4, sync: false, startValue: 'max', destroy: 'min' }
          },
          size: {
            value: { min: 1.2, max: 3.8 },
            animation: { enable: true, speed: 8, sync: false, startValue: 'max', destroy: 'min' }
          },
          move: {
            enable: true,
            direction: 'none',
            random: true,
            straight: true,
            speed: { min: 12, max: 28 },
            outModes: { default: 'destroy' }
          },
          life: {
            count: 1,
            duration: { value: { min: 0.22, max: 0.48 }, sync: false }
          }
        }
      }
    },

    'v0.2': {
      description: 'Directional gameplay burst: higher velocity, shorter life and most energy pushed forward.',
      emitter: {
        name: 'webfx-burst-v02',
        autoPlay: true,
        direction: 'right',
        position: { x: 50, y: 50 },
        size: { width: 0, height: 0, mode: 'percent' },
        rate: { quantity: 10, delay: 0.016 },
        life: { count: 1, duration: 0.06, wait: false },
        particles: {
          color: { value: ['#ffffff', '#cceeff', '#5bc9ff'] },
          shape: { type: 'circle' },
          opacity: {
            value: { min: 0.72, max: 1 },
            animation: { enable: true, speed: 5, sync: false, startValue: 'max', destroy: 'min' }
          },
          size: {
            value: { min: 1, max: 3.2 },
            animation: { enable: true, speed: 9, sync: false, startValue: 'max', destroy: 'min' }
          },
          move: {
            enable: true,
            direction: 'right',
            random: true,
            straight: false,
            speed: { min: 18, max: 38 },
            outModes: { default: 'destroy' }
          },
          life: {
            count: 1,
            duration: { value: { min: 0.18, max: 0.38 }, sync: false }
          }
        }
      }
    }
  }
});

WebFX.register({
  id: 'fountain',
  label: 'Fountain',
  versions: {
    'v0.1': {
      description: 'Short upward emitter testing gravity, staggered lifetime and a sustained spawn window.',
      emitter: {
        name: 'webfx-fountain-v01',
        autoPlay: true,
        direction: 'top',
        position: { x: 50, y: 72 },
        size: { width: 1, height: 0, mode: 'percent' },
        rate: { quantity: 3, delay: 0.035 },
        life: { count: 1, duration: 0.48, wait: false },
        particles: {
          color: { value: ['#fff2b0', '#ffc857', '#ff8d3a'] },
          shape: { type: 'circle' },
          opacity: {
            value: { min: 0.55, max: 1 },
            animation: { enable: true, speed: 1.8, sync: false, startValue: 'max', destroy: 'min' }
          },
          size: { value: { min: 1.1, max: 3 } },
          move: {
            enable: true,
            direction: 'top',
            random: true,
            straight: false,
            speed: { min: 12, max: 23 },
            gravity: { enable: true, acceleration: 22 },
            outModes: { default: 'destroy' }
          },
          life: {
            count: 1,
            duration: { value: { min: 0.65, max: 1.05 }, sync: false }
          }
        }
      }
    }
  }
});

function updateVersionControls() {
  const effect = WebFX.registry.get(WebFX.activeEffect);
  const versions = Object.keys(effect.versions);

  if (!versions.includes(WebFX.activeVersion)) {
    WebFX.activeVersion = versions.at(-1);
  }

  versionControls.innerHTML = '';
  versions.forEach((version) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = version;
    button.classList.toggle('is-active', version === WebFX.activeVersion);
    button.addEventListener('click', () => {
      WebFX.activeVersion = version;
      updateVersionControls();
      updateCaption();
      WebFX.play().catch(showError);
    });
    versionControls.appendChild(button);
  });
}

function updateCaption() {
  const { effect, definition } = WebFX.get();
  activeName.textContent = `${effect.label} / ${WebFX.activeVersion}`;
  activeDescription.textContent = definition.description;
}

function showError(error) {
  console.error(error);
  activeName.textContent = 'WebFX error';
  activeDescription.textContent = error.message;
}

effectButtons.forEach((button) => {
  button.addEventListener('click', () => {
    WebFX.activeEffect = button.dataset.effect;
    const effect = WebFX.registry.get(WebFX.activeEffect);
    WebFX.activeVersion = Object.keys(effect.versions).at(-1);

    effectButtons.forEach((item) => item.classList.toggle('is-active', item === button));
    updateVersionControls();
    updateCaption();
    WebFX.play().catch(showError);
  });
});

playButton.addEventListener('click', () => WebFX.play().catch(showError));

(async () => {
  try {
    await WebFX.init();
    updateVersionControls();
    updateCaption();
    await WebFX.play();
  } catch (error) {
    showError(error);
  }
})();

window.WebFX = WebFX;
