// All dimensions and velocities are in CSS pixels and seconds.
export const CONFIG = Object.freeze({
  count: { min: 5, max: 9, compactMax: 6, compactWidth: 700 },
  layout: { edge: 12, minDiameter: 64, maxDiameter: 500, attempts: 450, retries: 20 },
  physics: {
    step: 1 / 120, maxSteps: 8, iterations: 12,
    restitution: 0.88, wallRestitution: 0.76, damping: 0.16,
    wind: 2.8, maxSpeed: 1100, dragSpeed: 1400, releaseSpeed: 720,
    releaseGain: 1.0, speedDamping: 0.55, dampingThreshold: 40,
    dragResponse: 32, dragMass: 2.2, gapMin: 5, gapMax: 12,
  },
  interaction: { mouseThreshold: 6, touchThreshold: 9, clickSuppression: 450,
    sampleWindow: 110, sampleGap: 180, sampleLimit: 24, sampleMinSpan: 8, releaseStale: 140,
  },
  transition: { shuffle: 150, resize: 320 },
});
export const gap = (a, b) => Math.max(CONFIG.physics.gapMin,
  Math.min(CONFIG.physics.gapMax, (a.r + b.r) * 0.025));
