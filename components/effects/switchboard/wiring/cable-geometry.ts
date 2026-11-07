import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { CableSamples } from './cable-route';

/**
 * Flat TPS sheath: a stadium (two flats joined by half-round edges) swept along framed
 * samples. A round cable is the same outline with no flat. UV x runs along the cable in
 * metres / `uvLength`, so a printed legend repeats at its real pitch; UV y runs round
 * the sheath and the face the frame's normal points at is the top of the texture.
 */

type RingPoint = { x: number; y: number; nx: number; ny: number; u: number };

/** Outline in (across, through), anticlockwise from the top of the right-hand edge. */
export function stadiumRing(width: number, thickness: number, capSteps = 6): RingPoint[] {
  const r = thickness / 2;
  const flat = Math.max(0, width / 2 - r);
  const pts: Omit<RingPoint, 'u'>[] = [];
  for (let k = 0; k <= capSteps; k++) {
    const phi = Math.PI / 2 - (Math.PI * k) / capSteps;
    pts.push({ x: flat + r * Math.cos(phi), y: r * Math.sin(phi), nx: Math.cos(phi), ny: Math.sin(phi) });
  }
  for (let k = 0; k <= capSteps; k++) {
    const phi = -Math.PI / 2 - (Math.PI * k) / capSteps;
    pts.push({ x: -flat + r * Math.cos(phi), y: r * Math.sin(phi), nx: Math.cos(phi), ny: Math.sin(phi) });
  }
  pts.push({ ...pts[0]! });
  let total = 0;
  const along = [0];
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    along.push(total);
  }
  return pts.map((p, i) => ({ ...p, u: total > 0 ? along[i]! / total : 0 }));
}

export type CableGeometryOptions = {
  width: number;
  thickness: number;
  /** Metres of cable per UV unit along the length. */
  uvLength?: number;
  capSteps?: number;
  /** Close the cut ends (off where the cable disappears into a hole or gland). */
  caps?: boolean;
};

export function cableGeometry(samples: CableSamples, options: CableGeometryOptions): BufferGeometry {
  const { points, frames, lengths } = samples;
  const ring = stadiumRing(options.width, options.thickness, options.capSteps ?? 6);
  const uvLength = options.uvLength ?? 0.5;
  const m = ring.length;
  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const { n, b } = frames[i]!;
    for (const q of ring) {
      position.push(p.x + b.x * q.x + n.x * q.y, p.y + b.y * q.x + n.y * q.y, p.z + b.z * q.x + n.z * q.y);
      normal.push(b.x * q.nx + n.x * q.ny, b.y * q.nx + n.y * q.ny, b.z * q.nx + n.z * q.ny);
      uv.push(lengths[i]! / uvLength, q.u);
    }
  }
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 0; j < m - 1; j++) {
      const a = i * m + j;
      const bIdx = (i + 1) * m + j;
      const c = (i + 1) * m + j + 1;
      const d = i * m + j + 1;
      index.push(a, d, bIdx, bIdx, d, c);
    }
  }

  if (options.caps !== false && points.length > 1) {
    for (const end of [0, points.length - 1]) {
      const p = points[end]!;
      const { t, n, b } = frames[end]!;
      const sign = end === 0 ? -1 : 1;
      const centre = position.length / 3;
      position.push(p.x, p.y, p.z);
      normal.push(t.x * sign, t.y * sign, t.z * sign);
      uv.push(0, 0.5);
      for (const q of ring) {
        position.push(p.x + b.x * q.x + n.x * q.y, p.y + b.y * q.x + n.y * q.y, p.z + b.z * q.x + n.z * q.y);
        normal.push(t.x * sign, t.y * sign, t.z * sign);
        uv.push(0, 0.5);
      }
      for (let j = 0; j < m - 1; j++) {
        if (sign > 0) index.push(centre, centre + 1 + j, centre + 2 + j);
        else index.push(centre, centre + 2 + j, centre + 1 + j);
      }
    }
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(position, 3));
  g.setAttribute('normal', new Float32BufferAttribute(normal, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

/**
 * A nylon cable tie closed round a bundle `width` × `thickness`: a thin band in the
 * local XY plane, `band` wide along Z, with the locking head on the +X edge. Without the
 * head it is a rubber grommet round a cable entry.
 */
export function tieBandGeometry(
  width: number,
  thickness: number,
  band = 0.0036,
  strap = 0.0012,
  head = true
): BufferGeometry {
  const inner = stadiumRing(width + 0.0006, thickness + 0.0006, 8);
  const outer = stadiumRing(width + 0.0006 + strap * 2, thickness + 0.0006 + strap * 2, 8);
  const position: number[] = [];
  const normal: number[] = [];
  const index: number[] = [];
  const m = outer.length;
  const z0 = -band / 2;
  const z1 = band / 2;
  // Outer surface.
  for (const z of [z0, z1]) {
    for (const q of outer) {
      position.push(q.x, q.y, z);
      normal.push(q.nx, q.ny, 0);
    }
  }
  for (let j = 0; j < m - 1; j++) index.push(j, m + j, j + 1, m + j, m + j + 1, j + 1);
  // Side faces: annulus between the inner and outer outlines at each edge of the band.
  for (const [z, s] of [
    [z0, -1],
    [z1, 1],
  ] as const) {
    const base = position.length / 3;
    for (let j = 0; j < m; j++) {
      position.push(outer[j]!.x, outer[j]!.y, z, inner[j]!.x, inner[j]!.y, z);
      normal.push(0, 0, s, 0, 0, s);
    }
    for (let j = 0; j < m - 1; j++) {
      const o0 = base + j * 2;
      const i0 = o0 + 1;
      const o1 = base + (j + 1) * 2;
      const i1 = o1 + 1;
      if (s > 0) index.push(o0, i0, o1, o1, i0, i1);
      else index.push(o0, o1, i0, i0, o1, i1);
    }
  }
  if (head) {
    // Locking head: a small block on the +X edge.
    const hx = width / 2 + strap + 0.0018;
    appendBox(position, normal, index, hx, 0, 0, 0.0036, 0.0042, band + 0.0012);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(position, 3));
  g.setAttribute('normal', new Float32BufferAttribute(normal, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

/**
 * Plastic TPS saddle: a bridge over one cable with a screw foot each side, sitting on
 * the timber at local y = 0 with the cable running along Z.
 */
export function saddleGeometry(width: number, thickness: number): BufferGeometry {
  const position: number[] = [];
  const normal: number[] = [];
  const index: number[] = [];
  const wall = 0.0014;
  const band = 0.009;
  const span = width + wall * 2;
  // Bridge: top plate and two cheeks.
  appendBox(position, normal, index, 0, thickness + wall / 2, 0, span, wall, band);
  for (const s of [-1, 1]) {
    appendBox(position, normal, index, s * (width / 2 + wall / 2), thickness / 2, 0, wall, thickness, band);
    // Foot with a screw head.
    appendBox(position, normal, index, s * (width / 2 + wall + 0.0045), wall / 2, 0, 0.009, wall, band);
    appendBox(position, normal, index, s * (width / 2 + wall + 0.0045), wall + 0.0006, 0, 0.0055, 0.0012, 0.0055);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(position, 3));
  g.setAttribute('normal', new Float32BufferAttribute(normal, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

function appendBox(
  position: number[],
  normal: number[],
  index: number[],
  cx: number,
  cy: number,
  cz: number,
  w: number,
  h: number,
  d: number
) {
  const x = [cx - w / 2, cx + w / 2];
  const y = [cy - h / 2, cy + h / 2];
  const z = [cz - d / 2, cz + d / 2];
  const faces: [number[], [number, number, number][]][] = [
    [[1, 0, 0], [[x[1]!, y[0]!, z[1]!], [x[1]!, y[0]!, z[0]!], [x[1]!, y[1]!, z[0]!], [x[1]!, y[1]!, z[1]!]]],
    [[-1, 0, 0], [[x[0]!, y[0]!, z[0]!], [x[0]!, y[0]!, z[1]!], [x[0]!, y[1]!, z[1]!], [x[0]!, y[1]!, z[0]!]]],
    [[0, 1, 0], [[x[0]!, y[1]!, z[1]!], [x[1]!, y[1]!, z[1]!], [x[1]!, y[1]!, z[0]!], [x[0]!, y[1]!, z[0]!]]],
    [[0, -1, 0], [[x[0]!, y[0]!, z[0]!], [x[1]!, y[0]!, z[0]!], [x[1]!, y[0]!, z[1]!], [x[0]!, y[0]!, z[1]!]]],
    [[0, 0, 1], [[x[0]!, y[0]!, z[1]!], [x[1]!, y[0]!, z[1]!], [x[1]!, y[1]!, z[1]!], [x[0]!, y[1]!, z[1]!]]],
    [[0, 0, -1], [[x[1]!, y[0]!, z[0]!], [x[0]!, y[0]!, z[0]!], [x[0]!, y[1]!, z[0]!], [x[1]!, y[1]!, z[0]!]]],
  ];
  for (const [n, quad] of faces) {
    const base = position.length / 3;
    for (const p of quad) {
      position.push(...p);
      normal.push(...n);
    }
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}
