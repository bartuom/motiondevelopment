const BUILD = 'P3.7.1';

const stage = document.querySelector('#impact-stage');
const logOutput = document.querySelector('#p2-log');

function appendLog(message) {
  if (!logOutput) return;
  const stamp = new Date().toLocaleTimeString([], { hour12: false });
  logOutput.textContent += `\n[${stamp}] ${message}`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function waitForGrid(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const poll = () => {
      const world = document.querySelector('#effect-world');
      const adapter = globalThis.FXDeckLab?.particleAdapter;
      const canvas = adapter?.container?.canvas?.domElement;
      if (world && adapter && canvas) return resolve({ world, adapter, canvas });
      if (performance.now() - startedAt > timeoutMs) return reject(new Error('Effect Grid canvas projection prerequisites were not ready.'));
      window.setTimeout(poll, 20);
    };
    poll();
  });
}

waitForGrid()
  .then(({ world, adapter, canvas }) => {
    let baseWidth = Math.max(1, stage.clientWidth);
    let baseHeight = Math.max(1, stage.clientHeight);
    let resizeRaf = 0;

    const setFixedCanvasBox = () => {
      baseWidth = Math.max(1, stage.clientWidth);
      baseHeight = Math.max(1, stage.clientHeight);
      canvas.style.setProperty('width', `${baseWidth}px`, 'important');
      canvas.style.setProperty('height', `${baseHeight}px`, 'important');
      canvas.style.setProperty('transform-origin', '0 0', 'important');
    };

    const projectCanvasAcrossWorld = () => {
      const worldWidth = Math.max(1, world.clientWidth);
      const worldHeight = Math.max(1, world.clientHeight);
      const sx = worldWidth / baseWidth;
      const sy = worldHeight / baseHeight;
      canvas.style.setProperty('transform', `scale(${sx}, ${sy})`, 'important');
    };

    const updateProjection = () => {
      projectCanvasAcrossWorld();
      resizeRaf = 0;
    };

    const scheduleProjection = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(updateProjection);
    };

    setFixedCanvasBox();
    projectCanvasAcrossWorld();

    const worldObserver = new MutationObserver(scheduleProjection);
    worldObserver.observe(world, { attributes: true, attributeFilter: ['style'] });

    window.addEventListener('resize', () => {
      window.setTimeout(() => {
        setFixedCanvasBox();
        adapter.container?.canvas?.resize?.();
        projectCanvasAcrossWorld();
      }, 0);
    });

    globalThis.FXDeckGridCanvasProjection = {
      refresh() {
        setFixedCanvasBox();
        projectCanvasAcrossWorld();
      },
      getState() {
        return {
          viewport: { width: baseWidth, height: baseHeight },
          world: { width: world.clientWidth, height: world.clientHeight },
          backing: {
            width: adapter.container?.canvas?.size?.width ?? 0,
            height: adapter.container?.canvas?.size?.height ?? 0
          }
        };
      }
    };

    appendLog(`${BUILD} grid canvas projection ready: logical world zoom uses fixed viewport-sized particle backing canvas`);
  })
  .catch((error) => {
    appendLog(`${BUILD} grid canvas projection FAIL: ${error.message}`);
    console.error(error);
  });