import { CONFIG, gap } from './config.js';

export function clearOfBoxes(body, boxes) {
  return boxes.every(box => {
    const x = Math.max(box.x, Math.min(box.x + box.width, body.x));
    const y = Math.max(box.y, Math.min(box.y + box.height, body.y));
    return Math.hypot(body.x - x, body.y - y) >= body.r + 10;
  });
}

export function countLimit(width, height) {
  return width < CONFIG.count.compactWidth || height < 520 ? CONFIG.count.compactMax : CONFIG.count.max;
}

// Random sequential packing: nearby satellites and deliberately open space.
// Retry with smaller radii rather than accepting overlaps or a hidden grid.
export function arrange(count, width, height, boxes = [], rng = Math.random, previous = [], minimums = []) {
  const p = CONFIG.layout;
  const compact = width < 700;
  const maximum = Math.min(p.maxDiameter, width * (compact ? 0.65 : 0.37), height * (compact ? 0.31 : 0.57));
  const ratios = [1, 0.68, 0.52, 0.42, 0.34, 0.30, 0.27, 0.24, 0.22];
  const sizes = ratios.slice(0, count).map((r, i) => r * (i === 0 ? 0.93 + rng() * 0.12 : 0.88 + rng() * 0.24));
  for (let retry = 0; retry < p.retries; retry++) {
    const bodies = [];
    const scale = Math.pow(0.94, retry);
    for (let i = 0; i < count; i++) {
      const minimum = Math.max(minimums[i] || 0, Math.min(p.minDiameter, Math.max(48, Math.min(width, height) * 0.19)));
      const r = Math.max(minimum, maximum * sizes[i] * scale) / 2;
      const xRange = width - 2 * (r + p.edge), yRange = height - 2 * (r + p.edge);
      if (xRange < 0 || yRange < 0) break;
      let accepted;
      for (let attempt = 0; attempt < p.attempts; attempt++) {
        let x, y;
        if (attempt === 0 && previous[i]) {
          x = previous[i].x; y = previous[i].y;
        } else if (bodies.length && attempt % 3 !== 0) {
          const anchor = bodies[Math.floor(rng() * bodies.length)];
          const angle = rng() * Math.PI * 2;
          const distance = anchor.r + r + gap(anchor, { r }) + 14 + rng() * maximum * 0.18;
          x = anchor.x + Math.cos(angle) * distance;
          y = anchor.y + Math.sin(angle) * distance;
        } else {
          x = r + p.edge + rng() * xRange;
          y = r + p.edge + rng() * yRange;
        }
        const b = { x, y, r, vx: 0, vy: 0, phase: rng() * Math.PI * 2 };
        if (x < r + p.edge || x > width - r - p.edge || y < r + p.edge || y > height - r - p.edge) continue;
        if (!clearOfBoxes(b, boxes)) continue;
        if (bodies.some(a => Math.hypot(x - a.x, y - a.y) < r + a.r + gap(a, b) + 3)) continue;
        const angle = rng() * Math.PI * 2, speed = 7 + rng() * 9;
        b.vx = Math.cos(angle) * speed; b.vy = Math.sin(angle) * speed;
        accepted = b; break;
      }
      if (!accepted) break;
      bodies.push(accepted);
    }
    if (bodies.length === count) return bodies;
  }
  // Very short split-screen windows can require fewer usable targets.
  if (count > 3) return arrange(count - 1, width, height, boxes, rng, previous, minimums);
  throw new Error('可用空间过小，请增大窗口后重试。');
}
