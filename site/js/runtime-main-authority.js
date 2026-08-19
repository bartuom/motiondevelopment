const BUILD = 'P3.13.2';
const INTRO = 'P3.13.2 unifies the reference-driven visual pass back into the canonical Runtime Lab. Explosion V2 uses the Particlr-derived layered texture model; Magic Burst V2 uses the real tsParticles ribbon shape. Component bridges no longer define the visible global build.';

const effectInput = document.querySelector('#effect-select');
const eyebrow = document.querySelector('.eyebrow');
const hudBuild = document.querySelector('.runtime-hud__build');
const intro = document.querySelector('.intro');
const logOutput = document.querySelector('#p2-log');

let bootSelectionApplied = false;

function appendLog(message) {
  if (!logOutput) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function enforceBuildUi() {
  const eyebrowText = `FXDeck / Runtime / Build ${BUILD}`;
  if (eyebrow && eyebrow.textContent !== eyebrowText) eyebrow.textContent = eyebrowText;
  if (hudBuild && hudBuild.textContent !== BUILD) hudBuild.textContent = BUILD;
  if (intro && intro.textContent !== INTRO) intro.textContent = INTRO;
  document.documentElement.dataset.fxdeckBuild = BUILD;
  globalThis.FXDeckRuntimeBuild = BUILD;
}

function v2Ready() {
  const fx = globalThis.FXDeck;
  if (!fx?.resolve) return false;
  try {
    fx.resolve('explosion', { version: 'v2', variant: 'default' });
    fx.resolve('magicBurst', { version: 'v2', variant: 'default' });
    return true;
  } catch {
    return false;
  }
}

function applyCanonicalBootSelection() {
  if (bootSelectionApplied || !effectInput || !v2Ready()) return false;
  bootSelectionApplied = true;
  effectInput.value = 'explosion';
  effectInput.dispatchEvent(new Event('change', { bubbles: true }));
  appendLog(`${BUILD} CANONICAL LAB: Explosion V2 selected after all reference-driven V2 definitions became available`);
  return true;
}

enforceBuildUi();

const observer = new MutationObserver(enforceBuildUi);
for (const node of [eyebrow, hudBuild, intro]) {
  if (node) observer.observe(node, { childList: true, characterData: true, subtree: true });
}

let attempts = 0;
const bootTimer = window.setInterval(() => {
  attempts += 1;
  enforceBuildUi();
  if (applyCanonicalBootSelection() || attempts >= 120) {
    window.clearInterval(bootTimer);
    if (!bootSelectionApplied) appendLog(`${BUILD} CANONICAL LAB WARNING: V2 boot selection was not confirmed in time`);
  }
}, 50);

window.addEventListener('pageshow', enforceBuildUi);
window.addEventListener('focus', enforceBuildUi);
