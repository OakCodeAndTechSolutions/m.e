export type FrameBudget = {
  elapsed: number;
  frames: number;
  slowWindows: number;
  level: number;
  warmup: number;
};
export const DPR_LEVELS = [1.25, 1, 0.85, 0.7] as const;

export function createFrameBudget(initialDpr: number = DPR_LEVELS[0]): FrameBudget {
  const level = DPR_LEVELS.findIndex((dpr) => dpr <= initialDpr);
  return {
    elapsed: 0,
    frames: 0,
    slowWindows: 0,
    level: level < 0 ? DPR_LEVELS.length - 1 : level,
    warmup: 2,
  };
}

/** Ignore suspension/loading gaps; require sustained missed 60Hz frames before reducing pixels. */
export function sampleFrameBudget(sample: FrameBudget, delta: number): number | null {
  if (!Number.isFinite(delta) || delta <= 0 || delta > 0.65) {
    sample.elapsed = 0;
    sample.frames = 0;
    sample.slowWindows = 0;
    return null;
  }
  if (sample.warmup > 0) {
    sample.warmup -= delta;
    return null;
  }
  sample.elapsed += delta;
  sample.frames++;
  if (sample.elapsed < 1.5) return null;
  sample.slowWindows = sample.frames / sample.elapsed < 50 ? sample.slowWindows + 1 : 0;
  sample.elapsed = 0;
  sample.frames = 0;
  if (sample.slowWindows < 2 || sample.level === DPR_LEVELS.length - 1) return null;
  sample.slowWindows = 0;
  sample.level++;
  return DPR_LEVELS[sample.level]!;
}
