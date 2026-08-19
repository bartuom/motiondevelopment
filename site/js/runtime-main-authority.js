const BUILD = 'P3.15.0';
const INTRO = 'P3.15 Native Reference Integration: Ribbons and Fireworks reference recipes now run directly inside the existing FXDeck TsParticlesAdapter container. No iframe, no second canvas, no standalone demo background.';

const eyebrow = document.querySelector('.eyebrow');
const hudBuild = document.querySelector('.runtime-hud__build');
const intro = document.querySelector('.intro');
const logOutput = document.querySelector('#p2-log');

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

async function loadNativeReferenceBridge() {
  try {
    await import('./reference-fidelity-runtime-bridge.js?v=p3.15.0');
    appendLog(`${BUILD} NATIVE REFERENCE bridge loaded — same FXDeck tsParticles canvas`);
  } catch (error) {
    appendLog(`${BUILD} NATIVE REFERENCE bridge FAIL: ${error.message}`);
    console.error(error);
  }
}

enforceBuildUi();
await loadNativeReferenceBridge();

const observer = new MutationObserver(enforceBuildUi);
for (const node of [eyebrow, hudBuild, intro]) {
  if (node) observer.observe(node, { childList: true, characterData: true, subtree: true });
}

window.addEventListener('pageshow', enforceBuildUi);
window.addEventListener('focus', enforceBuildUi);
