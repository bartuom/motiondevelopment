export function runHook(instance, hooks, name, payload) {
  const hook = hooks?.[name];
  if (typeof hook !== 'function') return;
  const cleanup = hook(payload);
  if (typeof cleanup === 'function') instance.addCleanup(cleanup);
}

export async function burstTracked(instance, particleAdapter, options, position, burstOptions) {
  const burst = typeof particleAdapter.burst === 'function'
    ? particleAdapter.burst(options, position, burstOptions)
    : particleAdapter.spawn(options, position);
  const handle = await burst;

  if (instance.state !== 'playing') {
    handle.stop();
    return null;
  }

  instance.addCleanup(() => handle.stop());
  return handle;
}

export function scheduleAsync(instance, delayMs, task) {
  instance.timeout(() => {
    Promise.resolve()
      .then(task)
      .catch((error) => {
        instance.error = error;
        instance.stop('error');
        console.error(error);
      });
  }, delayMs);
}
