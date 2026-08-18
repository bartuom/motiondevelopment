(() => {
  const output = document.querySelector('#core-log');
  const copyButton = document.querySelector('#copy-core-log');
  const clearButton = document.querySelector('#clear-core-log');
  const status = document.querySelector('#core-log-status');

  if (!output) return;

  function getText() {
    return output.textContent.trim();
  }

  function setStatus(message) {
    if (!status) return;
    status.textContent = message;
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
      status.textContent = '';
    }, 2200);
  }

  async function copy() {
    const text = getText();
    if (!text) {
      setStatus('Log is empty');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus(`Copied ${text.split('\n').length} lines`);
      return true;
    } catch (error) {
      setStatus('Clipboard blocked — select log manually');
      console.error(error);
      return false;
    }
  }

  function clear() {
    output.textContent = 'FXDeck Core Lab log cleared.';
    output.scrollTop = output.scrollHeight;
    setStatus('Cleared');
  }

  copyButton?.addEventListener('click', copy);
  clearButton?.addEventListener('click', clear);

  window.FXDeckLog = {
    getText,
    getLines: () => getText().split('\n').filter(Boolean),
    copy,
    clear
  };
})();
