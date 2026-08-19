const BUILD = 'P3.13.3';
const INTRO = 'P3.13.3 fixes the reference-driven V2 boot path: Explosion V2 initializes independently, while Magic Burst V2 explicitly loads the tsParticles motion and ribbon plugins before use.';
const BOOT_SETTLE_MS = 1500;

const effectInput = document.querySelector('#effect-select');
const eyebrow = document.querySelector('.eyebrow');
const hudBuild = document.querySelector('.runtime-hud__build');
const intro = document.querySelector('.intro');
const logOutput = document.querySelector('#p2-log');
const startedAt = performance.now();

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

function explosionV2Ready() {
  const fx = globalThis.FXDeck;
  if (!fx?.resolve) return false;
  try {
    const explosion = fx.resolve('explosion', { version: 'v2', variant: 'default' });
    const bridge = globalThis.FXDeckReferenceV2;
    return explosion.version === 'v2' && (!bridge || bridge.readiness?.explosion === true);
  } catch {
    return false;
  }
}

function applyCanonicalBootSelection() {
  if (bootSelectionApplied || !effectInput || !explosionV2Ready()) return false;
  if (performance.now() - startedAt < BOOT_SETTLE_MS) return false;

  bootSelectionApplied = true;
  effectInput.value = 'explosion';
  effectInput.dispatchEvent(new Event('change', { bubbles: true }));
  const magicReady = globalThis.FXDeckReferenceV2?.readiness?.magicBurst === true;
  appendLog(`${BUILD} CANONICAL LAB: settled on Explosion V2; Magic Burst V2 ${magicReady ? 'READY' : 'not yet ready'}`);
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
  if (applyCanonicalBootSelection() || attempts >= 160) {
    window.clearInterval(bootTimer);
    if (!bootSelectionApplied) appendLog(`${BUILD} CANONICAL LAB WARNING: Explosion V2 boot readiness was not confirmed in time`);
  }
}, 50);

window.addEventListener('pageshow', enforceBuildUi);
window.addEventListener('focus', enforceBuildUi);