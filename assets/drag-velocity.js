import { CONFIG } from './config.js';

// PointerEvent.timeStamp and client coordinates stay in one clock / CSS space.
// The bounded trailing window rejects stale releases and discontinuous input.
export class DragVelocity {
  constructor(options = CONFIG.interaction) {
    this.options = options;
    this.samples = [];
  }

  add(x, y, time) {
    if (![x, y, time].every(Number.isFinite)) { this.samples = []; return; }
    const last = this.samples[this.samples.length - 1];
    if (last && (time < last.time || time - last.time > this.options.sampleGap)) this.samples = [];
    else if (last && time === last.time) { last.x = x; last.y = y; return; }
    this.samples.push({ x, y, time });
    this.samples = this.samples.filter(s => time - s.time <= this.options.sampleWindow)
      .slice(-this.options.sampleLimit);
  }

  velocity(time) {
    const p = this.options, samples = this.samples;
    const last = samples[samples.length - 1];
    if (!last || !Number.isFinite(time) || time < last.time || time - last.time > p.releaseStale ||
      samples.length < 2 || last.time - samples[0].time < p.sampleMinSpan) return { x: 0, y: 0 };
    // Least-squares slope smooths event jitter without assuming an event rate.
    const mean = samples.reduce((m, s) => ({
      t: m.t + (s.time - last.time) / 1000 / samples.length,
      x: m.x + s.x / samples.length, y: m.y + s.y / samples.length,
    }), { t: 0, x: 0, y: 0 });
    let variance = 0, dx = 0, dy = 0;
    for (const s of samples) {
      const dt = (s.time - last.time) / 1000 - mean.t;
      variance += dt * dt;
      dx += dt * (s.x - mean.x); dy += dt * (s.y - mean.y);
    }
    if (variance < 1e-9) return { x: 0, y: 0 };
    return { x: dx / variance, y: dy / variance };
  }
}
