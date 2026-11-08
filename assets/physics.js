import { CONFIG, gap } from './config.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function limit(body, max) {
  const speed = Math.hypot(body.vx, body.vy);
  if (speed > max) { body.vx *= max / speed; body.vy *= max / speed; }
}

// A small, deterministic circle solver. It has no DOM, timers, or random source.
export class World {
  constructor(bodies, bounds, obstacles = [], options = {}) {
    this.bodies = bodies;
    this.bounds = bounds;
    this.obstacles = obstacles;
    this.options = { ...CONFIG.physics, ...options };
    this.time = 0;
    this.accumulator = 0;
  }

  advance(elapsed) {
    const p = this.options;
    this.accumulator += clamp(elapsed, 0, p.step * p.maxSteps);
    let steps = 0;
    while (this.accumulator >= p.step && steps < p.maxSteps) {
      this.step(p.step);
      this.accumulator -= p.step;
      steps++;
    }
    return steps;
  }

  step(dt = this.options.step) {
    const p = this.options;
    this.time += dt;
    for (const b of this.bodies) {
      if (b.drag) {
        const dx = b.drag.x - b.x, dy = b.drag.y - b.y;
        const response = 1 - Math.exp(-p.dragResponse * dt);
        b.vx += (dx * p.dragResponse - b.vx) * response;
        b.vy += (dy * p.dragResponse - b.vy) * response;
        limit(b, p.dragSpeed);
      } else {
        const phase = b.phase || 0;
        // Low-frequency force, not a repeating position animation.
        b.vx += p.wind * (Math.sin(this.time * 0.13 + b.y * 0.002 + phase) + 0.35 * Math.cos(this.time * 0.21)) * dt;
        b.vy += p.wind * (Math.cos(this.time * 0.11 + b.x * 0.002 - phase) + 0.35 * Math.sin(this.time * 0.17)) * dt;
        const releaseDamping = b.inertiaRemaining > 0 ? p.releaseDamping : 0;
        b.inertiaRemaining = Math.max(0, (b.inertiaRemaining || 0) - dt);
        const damping = Math.exp(-(p.damping + releaseDamping) * dt);
        b.vx *= damping; b.vy *= damping;
        limit(b, p.maxSpeed);
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
    }
    this.solve(true);
    for (const b of this.bodies) limit(b, b.drag ? p.dragSpeed : p.maxSpeed);
  }

  inverseMass(b) { return 1 / (b.r * b.r * (b.drag ? this.options.dragMass : 1)); }

  solve(impulses = false, iterations = this.options.iterations) {
    const p = this.options;
    for (let k = 0; k < iterations; k++) {
      for (let i = 0; i < this.bodies.length; i++) {
        const a = this.bodies[i];
        for (let j = i + 1; j < this.bodies.length; j++) {
          const b = this.bodies[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const target = a.r + b.r + gap(a, b);
          const distance = Math.hypot(dx, dy);
          if (distance >= target) continue;
          const nx = distance > 0.0001 ? dx / distance : 1;
          const ny = distance > 0.0001 ? dy / distance : 0;
          const ia = this.inverseMass(a), ib = this.inverseMass(b), total = ia + ib;
          const correction = (target - distance + 0.001) / total;
          a.x -= nx * correction * ia; a.y -= ny * correction * ia;
          b.x += nx * correction * ib; b.y += ny * correction * ib;
          const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (impulses && relative < 0) {
            const e = relative < -1 ? p.restitution : 0;
            const impulse = -(1 + e) * relative / total;
            a.vx -= impulse * ia * nx; a.vy -= impulse * ia * ny;
            b.vx += impulse * ib * nx; b.vy += impulse * ib * ny;
          }
        }
      }
      for (const b of this.bodies) this.contain(b, impulses);
    }
  }

  contain(b, impulses) {
    const { width, height, edge = CONFIG.layout.edge } = this.bounds;
    const e = this.options.wallRestitution;
    const bounce = (nx, ny) => {
      const v = b.vx * nx + b.vy * ny;
      if (impulses && v < 0) { b.vx -= (1 + e) * v * nx; b.vy -= (1 + e) * v * ny; }
    };
    if (b.x < b.r + edge) { b.x = b.r + edge; bounce(1, 0); }
    if (b.x > width - b.r - edge) { b.x = width - b.r - edge; bounce(-1, 0); }
    if (b.y < b.r + edge) { b.y = b.r + edge; bounce(0, 1); }
    if (b.y > height - b.r - edge) { b.y = height - b.r - edge; bounce(0, -1); }
    for (const box of this.obstacles) {
      const cx = clamp(b.x, box.x, box.x + box.width);
      const cy = clamp(b.y, box.y, box.y + box.height);
      let dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
      const radius = b.r + 8;
      if (d >= radius) continue;
      if (d < 0.0001) {
        const sides = [
          { depth: b.x - box.x, x: -1, y: 0 },
          { depth: box.x + box.width - b.x, x: 1, y: 0 },
          { depth: b.y - box.y, x: 0, y: -1 },
          { depth: box.y + box.height - b.y, x: 0, y: 1 },
        ].sort((a, c) => a.depth - c.depth);
        dx = sides[0].x; dy = sides[0].y; d = -sides[0].depth;
      } else { dx /= d; dy /= d; }
      let nextX = b.x + dx * (radius - d), nextY = b.y + dy * (radius - d);
      const fits = (x, y) => x >= b.r + edge && x <= width - b.r - edge && y >= b.r + edge && y <= height - b.r - edge;
      if (!fits(nextX, nextY)) {
        // Corner controls touch viewport edges. Escape toward the usable stage,
        // never resolve a control collision by pushing an orb off screen.
        const candidates = [
          { x: box.x - radius, y: b.y }, { x: box.x + box.width + radius, y: b.y },
          { x: b.x, y: box.y - radius }, { x: b.x, y: box.y + box.height + radius },
        ].filter(c => fits(c.x, c.y)).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y));
        if (!candidates.length) continue;
        nextX = candidates[0].x; nextY = candidates[0].y;
        const distance = Math.hypot(nextX - b.x, nextY - b.y);
        dx = (nextX - b.x) / distance; dy = (nextY - b.y) / distance;
      }
      b.x = nextX; b.y = nextY;
      bounce(dx, dy);
    }
  }

  release(body, motion = true, velocity = null) {
    body.drag = null;
    body.inertiaRemaining = 0;
    if (motion) {
      if (velocity) {
        body.vx = Number.isFinite(velocity.x) ? velocity.x * this.options.releaseGain : 0;
        body.vy = Number.isFinite(velocity.y) ? velocity.y * this.options.releaseGain : 0;
      }
      limit(body, this.options.releaseSpeed);
      body.inertiaRemaining = this.options.releaseDampingDuration;
    } else { body.vx = 0; body.vy = 0; }
  }
}
