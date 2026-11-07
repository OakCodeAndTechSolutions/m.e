import { describe, expect, it } from 'vitest';
import { createFrameBudget, DPR_LEVELS, sampleFrameBudget } from './frame-budget';

function run(seconds: number, fps: number, sample = createFrameBudget()) {
  const changes: number[] = [];
  for (let frame = 0; frame < seconds * fps; frame++) {
    const dpr = sampleFrameBudget(sample, 1 / fps);
    if (dpr !== null) changes.push(dpr);
  }
  return { sample, changes };
}

describe('frame budget', () => {
  it('keeps full quality at 60fps and 120fps', () => {
    expect(run(30, 60).changes).toEqual([]);
    expect(run(30, 120).changes).toEqual([]);
  });

  it('reduces quality before sustained 30fps feels unusable, and stops at the floor', () => {
    expect(run(20, 30).changes).toEqual(DPR_LEVELS.slice(1));
  });

  it('ignores startup work and one isolated slow window', () => {
    const { sample, changes } = run(2, 15);
    expect(changes).toEqual([]);
    run(1.5, 30, sample);
    expect(run(5, 60, sample).changes).toEqual([]);
    expect(sample.level).toBe(0);
  });

  it('does not downgrade after a background-tab pause', () => {
    const sample = createFrameBudget();
    run(3.5, 30, sample);
    for (const gap of [4, Infinity, NaN, -1]) expect(sampleFrameBudget(sample, gap)).toBeNull();
    expect(run(5, 60, sample).changes).toEqual([]);
  });

  it('skips resolution levels above the display pixel ratio', () => {
    const { changes } = run(20, 30, createFrameBudget(1));
    expect(changes).toEqual([0.85, 0.7]);
  });

  it('adapts even when sustained rendering is slower than four frames per second', () => {
    expect(run(20, 3, createFrameBudget(1)).changes).toEqual([0.85, 0.7]);
  });
});
