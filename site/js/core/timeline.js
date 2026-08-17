export class Timeline {
  constructor() {
    this.timers = new Set();
  }

  at(delay, callback) {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, Math.max(0, delay));
    this.timers.add(timer);
    return this;
  }

  clear() {
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
  }
}
