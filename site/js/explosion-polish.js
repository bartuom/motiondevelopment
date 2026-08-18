const explosionRoot = document.querySelector('#effect-root');
const explosionVariantRoot = document.querySelector('#variant-controls');
const explosionNav = [...document.querySelectorAll('[data-effect]')];

function syncExplosionVariant() {
  const activeEffect = explosionNav.find((button) => button.classList.contains('is-active'))?.dataset.effect;

  if (activeEffect !== 'explosion') {
    delete explosionRoot.dataset.explosionVariant;
    return;
  }

  const activeVariant = explosionVariantRoot.querySelector('[data-variant].is-active')?.dataset.variant || 'small';
  explosionRoot.dataset.explosionVariant = activeVariant;
}

const explosionObserver = new MutationObserver(syncExplosionVariant);
explosionObserver.observe(explosionVariantRoot, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class'],
});

explosionNav.forEach((button) => {
  button.addEventListener('click', () => queueMicrotask(syncExplosionVariant));
});

syncExplosionVariant();
