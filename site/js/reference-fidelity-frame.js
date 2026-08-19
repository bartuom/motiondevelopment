const BUILD = 'P3.14.1';
const query = new URLSearchParams(location.search);
const referenceId = query.get('ref') ?? 'particlr-explosion';
const canvas = document.querySelector('#reference-canvas');
const status = document.querySelector('#reference-status');

const REFERENCES = {
  'particlr-explosion': {
    label: 'Particlr Explosion — exact runtime fixture',
    source: 'brac/particlr-runtime test/fixtures/explosion.prt'
  },
  'tsparticles-ribbons': {
    label: 'tsParticles Ribbons — exact bundle recipe',
    source: 'tsparticles/tsparticles @tsparticles/ribbons 4.3.2'
  },
  'tsparticles-fireworks': {
    label: 'tsParticles Fireworks — Playground bundle recipe',
    source: 'tsparticles/tsparticles @tsparticles/fireworks 4.3.2'
  }
};

function setStatus(text, state = 'boot') {
  if (!status) return;
  status.textContent = text;
  status.dataset.state = state;
}

function notify(type, detail = {}) {
  parent.postMessage({
    type,
    build: BUILD,
    referenceId,
    ...detail
  }, location.origin);
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

async function runParticlrExplosion() {
  setStatus('Loading exact Particlr runtime + PixiJS…');

  const [PIXI, core, pixiAdapter] = await Promise.all([
    import('https://esm.sh/pixi.js@8.19.0'),
    import('https://esm.sh/@particlr/runtime@0.5.2?deps=pixi.js@8.19.0'),
    import('https://esm.sh/@particlr/runtime@0.5.2/pixi?deps=pixi.js@8.19.0')
  ]);

  const { Application } = PIXI;
  const { parseParticle, Effect } = core;
  const { PixiParticleRenderer } = pixiAdapter;

  if (typeof parseParticle !== 'function' || typeof Effect !== 'function' || typeof PixiParticleRenderer !== 'function') {
    throw new Error('Published @particlr/runtime 0.5.2 API surface is incomplete in CDN build.');
  }

  const sourceResponse = await fetch('./reference-data/particlr-explosion.prt?v=p3.14.1');
  if (!sourceResponse.ok) throw new Error(`Particlr fixture fetch failed: HTTP ${sourceResponse.status}`);
  const sourceText = await sourceResponse.text();
  const parsed = parseParticle(sourceText);
  if (!parsed?.doc) {
    throw new Error(`Particlr parse failed${parsed?.errors?.length ? `: ${parsed.errors.join(' | ')}` : ''}`);
  }

  const app = new Application();
  await app.init({
    canvas,
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(devicePixelRatio || 1, 2),
    autoDensity: true
  });

  let current = null;

  function destroyCurrent() {
    if (!current) return;
    try { app.stage.removeChild(current.view.container); } catch {}
    try { current.view.destroy?.(); } catch {}
    current = null;
  }

  function replay(point = { x: innerWidth * .5, y: innerHeight * .5 }) {
    destroyCurrent();
    const fx = new Effect(parsed.doc, { seed: 1337 });
    const view = new PixiParticleRenderer(fx);
    view.container.position.set(point.x, point.y);
    app.stage.addChild(view.container);
    current = { fx, view };
    return current;
  }

  app.ticker.add((ticker) => {
    if (!current) return;
    current.fx.step(Math.min(0.05, ticker.deltaMS / 1000));
    current.view.sync();
  });

  replay();
  canvas.addEventListener('pointerdown', (event) => replay(pointerPosition(event)));

  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin) return;
    if (event.data?.type === 'fxdeck-reference-play') replay(event.data.position);
    if (event.data?.type === 'fxdeck-reference-stop') destroyCurrent();
  });

  setStatus('EXACT: Particlr runtime 0.5.2 / fixture seed 1337', 'ready');
  notify('fxdeck-reference-ready', {
    label: REFERENCES[referenceId].label,
    engine: '@particlr/runtime 0.5.2 + PixiJS 8.19.0',
    fidelity: 'exact 0.5.2 fixture + matching published runtime'
  });
}

async function runRibbons() {
  setStatus('Loading official tsParticles Ribbons bundle…');
  const { ribbons } = await import('https://esm.sh/@tsparticles/ribbons@4.3.2');

  const exactOptions = {
    count: 5,
    emitterSize: { width: 100, height: 0 },
    positionX: 50,
    colors: ['#FF0055', '#00D1FF', '#FFD23F', '#61FF7E', '#B284FF'],
    ribbonOptions: {
      angle: 45,
      darken: { enable: true, value: 30 },
      count: 60,
      drag: 0.02,
      mass: 1,
      oscillationDistance: { min: 100, max: 140 },
      oscillationSpeed: { min: 3, max: 5 },
      particleDist: 8,
      velocityInherit: { min: 4, max: 6 }
    },
    scalar: 1,
    zIndex: 100,
    disableForReducedMotion: true
  };

  const emitAgain = await ribbons.create(canvas, exactOptions);

  async function replay() {
    if (typeof emitAgain === 'function') await emitAgain(exactOptions);
  }

  canvas.addEventListener('pointerdown', () => replay());
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin) return;
    if (event.data?.type === 'fxdeck-reference-play') replay();
  });

  setStatus('EXACT: @tsparticles/ribbons 4.3.2 defaults', 'ready');
  notify('fxdeck-reference-ready', {
    label: REFERENCES[referenceId].label,
    engine: '@tsparticles/ribbons 4.3.2',
    fidelity: 'exact bundle options'
  });
}

async function runFireworks() {
  setStatus('Loading official tsParticles Fireworks bundle…');
  const { fireworks } = await import('https://esm.sh/@tsparticles/fireworks@4.3.2');

  const playgroundOptions = {
    background: '#0a1026',
    colors: ['#ffffff', '#ffd166', '#72ddf7', '#f15bb5'],
    sounds: false,
    rate: { min: 2, max: 4 },
    speed: { min: 10, max: 25 }
  };

  let instance = await fireworks.create(canvas, playgroundOptions);

  async function replay() {
    instance?.destroy?.();
    instance = await fireworks.create(canvas, playgroundOptions);
  }

  function stop() {
    instance?.stop?.();
  }

  canvas.addEventListener('pointerdown', () => replay());
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin) return;
    if (event.data?.type === 'fxdeck-reference-play') replay();
    if (event.data?.type === 'fxdeck-reference-stop') stop();
  });

  setStatus('EXACT: @tsparticles/fireworks 4.3.2 Playground settings', 'ready');
  notify('fxdeck-reference-ready', {
    label: REFERENCES[referenceId].label,
    engine: '@tsparticles/fireworks 4.3.2',
    fidelity: 'Playground bundle settings'
  });
}

async function bootstrap() {
  const reference = REFERENCES[referenceId];
  if (!reference) throw new Error(`Unknown reference: ${referenceId}`);

  if (referenceId === 'particlr-explosion') await runParticlrExplosion();
  else if (referenceId === 'tsparticles-ribbons') await runRibbons();
  else if (referenceId === 'tsparticles-fireworks') await runFireworks();
}

bootstrap().catch((error) => {
  setStatus(`REFERENCE FAIL: ${error.message}`, 'error');
  notify('fxdeck-reference-error', { error: error.message });
  console.error(error);
});
