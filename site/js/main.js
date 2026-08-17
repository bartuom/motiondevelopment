(() => {
  const stage = document.querySelector('#stage');
  const goal = document.querySelector('.goal');
  const ball = document.querySelector('#ball');
  const trail = document.querySelector('#trail');
  const flash = document.querySelector('#flash');
  const impactSprite = document.querySelector('#impactSprite');
  const particles = document.querySelector('#particles');
  const impactCopy = document.querySelector('#impactCopy');
  const playButton = document.querySelector('#playButton');
  const status = document.querySelector('#status');
  const presetButtons = [...document.querySelectorAll('[data-preset]')];

  const PRESETS = {
    normal:   { duration: 390, trail: .52, shake: 2, flash: .26, impact: .82, particles: 8,  distance: .72 },
    strong:   { duration: 340, trail: .82, shake: 5, flash: .42, impact: 1,    particles: 12, distance: 1 },
    critical: { duration: 295, trail: 1,   shake: 8, flash: .62, impact: 1.16, particles: 12, distance: 1.28 }
  };

  const PARTICLE_ANGLES = [-82, -64, -46, -27, -8, 12, 30, 48, 67, 88, 111, 138];
  let currentPreset = 'strong';
  let playing = false;
  let resetTimer = 0;

  function createParticles() {
    const fragment = document.createDocumentFragment();

    PARTICLE_ANGLES.forEach((angle, index) => {
      const particle = document.createElement('i');
      particle.className = 'particle';
      particle.dataset.index = String(index);
      fragment.appendChild(particle);
    });

    particles.appendChild(fragment);
  }

  function applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;

    currentPreset = name;
    const root = document.documentElement.style;
    root.setProperty('--shot-duration', `${preset.duration}ms`);
    root.setProperty('--trail-opacity', preset.trail);
    root.setProperty('--shake-distance', `${preset.shake}px`);
    root.setProperty('--flash-opacity', preset.flash);
    root.setProperty('--impact-scale', preset.impact);

    presetButtons.forEach((button) => {
      const active = button.dataset.preset === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    updateParticles(preset);
  }

  function updateParticles(preset) {
    [...particles.children].forEach((particle, index) => {
      const enabled = index < preset.particles;
      particle.hidden = !enabled;
      if (!enabled) return;

      const angle = PARTICLE_ANGLES[index] * Math.PI / 180;
      const distance = (42 + (index % 4) * 10) * preset.distance;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      particle.style.setProperty('--px', `${x.toFixed(1)}px`);
      particle.style.setProperty('--py', `${y.toFixed(1)}px`);
      particle.style.setProperty('--rotation', `${PARTICLE_ANGLES[index]}deg`);
      particle.style.setProperty('--delay', `${(index % 3) * 8}ms`);
    });
  }

  function setTrajectory() {
    const stageRect = stage.getBoundingClientRect();
    const ballRect = ball.getBoundingClientRect();
    const goalRect = goal.getBoundingClientRect();

    const startX = ballRect.left - stageRect.left + ballRect.width / 2;
    const startY = ballRect.top - stageRect.top + ballRect.height / 2;
    const targetX = goalRect.left - stageRect.left + goalRect.width * .72;
    const targetY = goalRect.top - stageRect.top + goalRect.height * .28;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    stage.style.setProperty('--shot-x', `${dx}px`);
    stage.style.setProperty('--shot-y', `${dy}px`);
    stage.style.setProperty('--trail-left', `${startX}px`);
    stage.style.setProperty('--trail-top', `${startY}px`);
    stage.style.setProperty('--trail-length', `${length}px`);
    stage.style.setProperty('--trail-angle', `${angle}deg`);
    stage.style.setProperty('--impact-left', `${targetX}px`);
    stage.style.setProperty('--impact-top', `${targetY}px`);
  }

  function clearEffectClasses() {
    ball.classList.remove('is-shooting');
    trail.classList.remove('active');
    flash.classList.remove('active');
    impactSprite.classList.remove('active');
    particles.classList.remove('active');
    impactCopy.classList.remove('active');
    stage.classList.remove('shake');
    goal.classList.remove('hit');
  }

  function impact() {
    status.textContent = currentPreset === 'critical' ? 'Critical impact' : 'Impact';
    impactSprite.classList.add('active');
    particles.classList.add('active');
    flash.classList.add('active');
    impactCopy.classList.add('active');
    stage.classList.add('shake');
    goal.classList.add('hit');

    clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      clearEffectClasses();
      playing = false;
      playButton.disabled = false;
      status.textContent = 'Ready';
    }, 560);
  }

  function play() {
    if (playing) return;
    playing = true;
    playButton.disabled = true;
    status.textContent = 'Shot';
    clearTimeout(resetTimer);
    clearEffectClasses();
    setTrajectory();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        trail.classList.add('active');
        ball.classList.add('is-shooting');
        ball.addEventListener('animationend', impact, { once: true });
      });
    });
  }

  presetButtons.forEach((button) => {
    button.addEventListener('click', () => applyPreset(button.dataset.preset));
  });

  playButton.addEventListener('click', play);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !event.repeat && document.activeElement?.tagName !== 'BUTTON') {
      event.preventDefault();
      play();
    }
  });
  window.addEventListener('resize', () => {
    if (!playing) setTrajectory();
  }, { passive: true });

  createParticles();
  applyPreset('strong');
  setTrajectory();
})();
