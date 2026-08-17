export function shake(element, strength = 1) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || strength <= 0.01) return;

  element.style.setProperty('--shake-strength', String(Math.min(1.75, strength)));
  element.classList.remove('is-shaking');
  void element.offsetWidth;
  element.classList.add('is-shaking');
  window.setTimeout(() => element.classList.remove('is-shaking'), 140);
}
