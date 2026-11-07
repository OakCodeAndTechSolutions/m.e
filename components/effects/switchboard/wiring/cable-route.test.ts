import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { filletCorners, frameAt, offsetSamples, sampleRoute, type RouteCorner } from './cable-route';

const L: RouteCorner[] = [{ at: [0, 0, 0], face: [1, 0, 0] }, { at: [0, 1, 0] }, { at: [0, 1, 1] }];

describe('filletCorners', () => {
  it('turns a right angle into an arc of the requested radius', () => {
    const r = 0.1;
    const arc = filletCorners(L, r).filter((p) => p.corner === 1);
    const centre = new Vector3(0, 1 - r, r);
    for (const p of arc) expect(p.point.distanceTo(centre)).toBeCloseTo(r, 6);
    expect(arc[0]!.point.toArray()).toEqual([0, 1 - r, 0].map((n) => expect.closeTo(n, 6)));
    expect(arc.at(-1)!.point.toArray()).toEqual([0, 1, r].map((n) => expect.closeTo(n, 6)));
  });

  it('shrinks the bend to fit when corners are close together', () => {
    const tight: RouteCorner[] = [
      { at: [0, 0, 0] },
      { at: [0, 0.05, 0] },
      { at: [0, 0.05, 0.03] },
      { at: [0, 0.1, 0.03] },
    ];
    for (const p of filletCorners(tight, 0.5)) {
      expect(p.point.y).toBeGreaterThanOrEqual(-1e-9);
      expect(p.point.y).toBeLessThanOrEqual(0.1 + 1e-9);
      expect(p.point.z).toBeGreaterThanOrEqual(-1e-9);
      expect(p.point.z).toBeLessThanOrEqual(0.03 + 1e-9);
    }
  });

  it('keeps straight-through corners as plain points', () => {
    const line: RouteCorner[] = [{ at: [0, 0, 0] }, { at: [0, 0, 1] }, { at: [0, 0, 2] }];
    expect(filletCorners(line, 0.2)).toHaveLength(3);
  });
});

describe('sampleRoute', () => {
  it('frames every sample with the flat facing the requested side', () => {
    const s = sampleRoute(L, { radius: 0.1 });
    s.frames.forEach((f) => {
      expect(f.t.length()).toBeCloseTo(1, 6);
      expect(f.n.length()).toBeCloseTo(1, 6);
      expect(f.t.dot(f.n)).toBeCloseTo(0, 6);
      expect(f.b.dot(new Vector3().crossVectors(f.t, f.n))).toBeCloseTo(1, 6);
    });
    // Both legs are perpendicular to x, so the flat faces +x the whole way.
    for (const f of s.frames) expect(Math.abs(f.n.x)).toBeCloseTo(1, 6);
  });

  it('blends the face through a bend that changes it', () => {
    const twist: RouteCorner[] = [
      { at: [0, 1, 1], face: [1, 0, 0] },
      { at: [0, 1, 0], face: [0, 0, 1], radius: 0.2 },
      { at: [0, 0, 0] },
    ];
    const s = sampleRoute(twist, { radius: 0.2 });
    expect(Math.abs(s.frames[0]!.n.x)).toBeCloseTo(1, 6);
    expect(Math.abs(s.frames.at(-1)!.n.z)).toBeCloseTo(1, 6);
    for (let i = 1; i < s.frames.length; i++) {
      // No sample-to-sample flip of the flat.
      expect(s.frames[i]!.n.dot(s.frames[i - 1]!.n)).toBeGreaterThan(0.5);
    }
  });

  it('sags a free horizontal span below its supports', () => {
    const span: RouteCorner[] = [{ at: [0, 2, 0], sag: 0.01 }, { at: [0, 2, 0.45] }];
    const s = sampleRoute(span, { radius: 0.05, step: 0.02 });
    const lowest = Math.min(...s.points.map((p) => p.y));
    expect(lowest).toBeCloseTo(2 - 0.01, 3);
    expect(s.points[0]!.y).toBe(2);
    expect(s.points.at(-1)!.y).toBe(2);
  });

  it('measures length along the samples', () => {
    const s = sampleRoute([{ at: [0, 0, 0] }, { at: [0, 0, 1] }], { radius: 0.1 });
    expect(s.lengths.at(-1)).toBeCloseTo(1, 6);
    expect(frameAt(s, 0.5).point.z).toBeCloseTo(0.5, 6);
  });
});

describe('offsetSamples', () => {
  it('moves a run sideways across its flat', () => {
    const s = sampleRoute([{ at: [0, 0, 0], face: [1, 0, 0] }, { at: [0, 1, 0] }], { radius: 0.1 });
    const o = offsetSamples(s, 0.02);
    for (let i = 0; i < s.points.length; i++) {
      expect(o.points[i]!.distanceTo(s.points[i]!)).toBeCloseTo(0.02, 6);
    }
  });
});
