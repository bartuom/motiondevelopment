(() => {
  const output = document.querySelector('#spike-log');
  const copyButton = document.querySelector('#copy-log');
  const clearButton = document.querySelector('#clear-log');
  const copyStatus = document.querySelector('#copy-log-status');

  if (!output) return;

  const history = [];
  const seen = new Set();
  let internalWrite = false;

  function ingest(text) {
    String(text || '')
      .split('\n')
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .forEach((line) => {
        if (seen.has(line)) return;
        seen.add(line);
        history.push(line);
      });
  }

  function render() {
    internalWrite = true;
    output.textContent = history.join('\n');
    output.scrollTop = output.scrollHeight;
    queueMicrotask(() => { internalWrite = false; });
  }

  ingest(output.textContent);
  render();

  const observer = new MutationObserver(() => {
    if (internalWrite) return;
    ingest(output.textContent);
    render();
  });

  observer.observe(output, {
    childList: true,
    characterData: true,
    subtree: true
  });

  function appendLog(message) {
    const stamp = new Date().toLocaleTimeString([], { hour12: false });
    ingest(`[${stamp}] ${message}`);
    render();
  }

  // webfx-lab.js declares log() in classic-script global scope. Replacing the
  // global property keeps existing runner calls but removes the old line cap.
  window.log = appendLog;

  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(history.join('\n'));
      if (copyStatus) copyStatus.textContent = `Copied ${history.length} lines`;
    } catch (error) {
      if (copyStatus) copyStatus.textContent = 'Clipboard blocked — select the log manually';
      console.error(error);
    }
  });

  clearButton?.addEventListener('click', () => {
    history.length = 0;
    seen.clear();
    ingest('FXDeck spike log cleared.');
    render();
    if (copyStatus) copyStatus.textContent = '';
  });

  window.FXDeckLog = {
    append: appendLog,
    getText: () => history.join('\n'),
    getLines: () => [...history],
    clear: () => clearButton?.click()
  };
})();