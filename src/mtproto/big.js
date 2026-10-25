// An explicit accounting of the big strings this library holds at once (hex of packets and chunks), so a test can
// bound the peak under QuickJS's 64 MiB per-plugin cap. Counts characters of strings of at least BIG characters (hex:
// 2 per byte). It is a model, kept in step by hand where the code takes and drops such strings; it never touches data.
const BIG = 65536;
export const big = {
  live: 0,
  peak: 0,
  hold(n) { if (n >= BIG) { this.live += n; if (this.live > this.peak) this.peak = this.live; } return n; },
  release(n) { if (n >= BIG) this.live = Math.max(0, this.live - n); },
  reset() { this.live = 0; this.peak = 0; },
};
