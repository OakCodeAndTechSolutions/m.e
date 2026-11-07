import { Vector3 } from 'three';
import type { Vec3 } from '../circuit-data';

/**
 * Routes for flat TPS cable. A route is a list of corner points the cable is pulled
 * through (holes, clips, entries). Corners become circular bends no tighter than the
 * cable allows, long free spans sag a little under their own weight, and every sample
 * carries a frame so the flat of the sheath can lie against the timber it is fixed to.
 */

export type CableFrame = {
  /** Along the cable. */
  t: Vector3;
  /** Normal of the flat face (thickness direction). */
  n: Vector3;
  /** Across the flat (width direction). */
  b: Vector3;
};

export type CableSamples = {
  points: Vector3[];
  frames: CableFrame[];
  /** Cumulative length at each sample, metres. */
  lengths: number[];
};

export type RouteCorner = {
  at: Vec3;
  /** Direction the flat of the sheath faces from this corner on (defaults to the previous). */
  face?: Vec3;
  /** Bend radius at this corner, metres (defaults to the route radius). */
  radius?: number;
  /** The span leaving this corner hangs free between supports and sags. */
  sag?: number;
};

const EPS = 1e-6;

function v(p: Vec3) {
  return new Vector3(p[0], p[1], p[2]);
}

/** Drop repeated corners: a zero-length span has no direction to bend from. */
function dedupe(corners: RouteCorner[]): RouteCorner[] {
  const out: RouteCorner[] = [];
  for (const c of corners) {
    const prev = out[out.length - 1];
    if (prev && v(prev.at).distanceToSquared(v(c.at)) < 1e-8) continue;
    out.push(c);
  }
  return out;
}

/** A fillet sample: the corner it belongs to and, on a bend, how far round it (0..1). */
type Piece = { point: Vector3; corner: number; arc?: number };

/**
 * Replace each corner with a circular arc of the requested radius. The tangent length
 * is limited to half of each neighbouring span (all of a span that ends the route), so
 * close corners get the largest bend that still fits rather than overlapping arcs.
 */
export function filletCorners(corners: RouteCorner[], radius: number): Piece[] {
  const cs = dedupe(corners);
  if (cs.length < 2) return cs.map((c, i) => ({ point: v(c.at), corner: i }));
  const pts = cs.map((c) => v(c.at));
  const out: Piece[] = [{ point: pts[0]!.clone(), corner: 0 }];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1]!;
    const p = pts[i]!;
    const b = pts[i + 1]!;
    const lenIn = p.distanceTo(a);
    const lenOut = b.distanceTo(p);
    const d0 = p.clone().sub(a).divideScalar(lenIn);
    const d1 = b.clone().sub(p).divideScalar(lenOut);
    const cos = Math.min(1, Math.max(-1, d0.dot(d1)));
    const turn = Math.acos(cos);
    if (turn < 1e-3) {
      out.push({ point: p.clone(), corner: i });
      continue;
    }
    const r = cs[i]!.radius ?? radius;
    const half = Math.tan(turn / 2);
    const maxIn = i - 1 === 0 ? lenIn : lenIn / 2;
    const maxOut = i + 1 === pts.length - 1 ? lenOut : lenOut / 2;
    const tangent = Math.min(r * half, maxIn * 0.999, maxOut * 0.999);
    const rEff = tangent / half;
    const start = p.clone().addScaledVector(d0, -tangent);
    const end = p.clone().addScaledVector(d1, tangent);
    // The centre lies along the inside bisector, r / cos(turn / 2) from the corner.
    const inside = d1.clone().sub(d0).normalize();
    const centre = p.clone().addScaledVector(inside, rEff / Math.cos(turn / 2));
    const from = start.clone().sub(centre);
    const to = end.clone().sub(centre);
    const sweep = from.angleTo(to);
    const steps = Math.max(2, Math.ceil(sweep / (Math.PI / 18)));
    const sinSweep = Math.sin(sweep);
    for (let k = 0; k <= steps; k++) {
      const s = k / steps;
      const point =
        sinSweep < EPS
          ? from.clone().lerp(to, s)
          : from
              .clone()
              .multiplyScalar(Math.sin((1 - s) * sweep) / sinSweep)
              .addScaledVector(to, Math.sin(s * sweep) / sinSweep);
      out.push({ point: point.add(centre), corner: i, arc: s });
    }
  }
  out.push({ point: pts[pts.length - 1]!.clone(), corner: pts.length - 1 });
  return out;
}

/** Deterministic 0..1 hash so every cable lies a little differently but never flickers. */
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export type RouteOptions = {
  /** Default bend radius, metres. TPS wants about six times its width. */
  radius: number;
  /** Longest straight sample, metres. */
  step?: number;
  /** Seed for the hand-laid wander. */
  seed?: number;
  /** Peak sideways wander on long straights, metres. */
  wander?: number;
};

/**
 * Fillet, resample and frame a route. Straight spans are subdivided so sag and wander
 * have somewhere to go; arcs keep their own spacing.
 */
export function sampleRoute(corners: RouteCorner[], options: RouteOptions): CableSamples {
  const cs = dedupe(corners);
  const pieces = filletCorners(cs, options.radius);
  const step = options.step ?? 0.04;
  const seed = options.seed ?? 0;
  const wander = options.wander ?? 0;

  // Resample straights; tag each point with the span it lies on for sag and facing.
  const pts: Vector3[] = [];
  const spanOf: number[] = [];
  const spanT: number[] = [];
  const arcT: (number | undefined)[] = [];
  const straight: boolean[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const cur = pieces[i]!;
    if (i === 0) {
      pts.push(cur.point.clone());
      spanOf.push(0);
      spanT.push(0);
      arcT.push(undefined);
      straight.push(false);
      continue;
    }
    const prev = pieces[i - 1]!;
    const len = cur.point.distanceTo(prev.point);
    // Arc samples share a corner index; a jump in corner index is a straight span.
    const isStraight = cur.corner !== prev.corner || len > step * 1.5;
    const n = isStraight ? Math.max(1, Math.ceil(len / step)) : 1;
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      pts.push(prev.point.clone().lerp(cur.point, t));
      spanOf.push(isStraight ? prev.corner : cur.corner);
      spanT.push(isStraight ? t : 0);
      arcT.push(isStraight ? undefined : cur.arc);
      straight.push(isStraight && k < n);
    }
  }

  // Sag on spans flagged as free-hanging, deepest mid-span, scaled by span length.
  for (let i = 0; i < pts.length; i++) {
    if (!straight[i]) continue;
    const corner = cs[spanOf[i]!];
    const t = spanT[i]!;
    if (corner?.sag) {
      const next = cs[spanOf[i]! + 1];
      const span = next ? v(corner.at).distanceTo(v(next.at)) : 0;
      const scale = Math.min(1, (span / 0.45) ** 2);
      pts[i]!.y -= corner.sag * scale * 4 * t * (1 - t);
    }
  }

  const frames = buildFrames(pts, cs, spanOf, arcT);

  // Hand-laid wander across the flat on long straights, zero at the supports.
  if (wander > 0) {
    for (let i = 0; i < pts.length; i++) {
      if (!straight[i]) continue;
      const t = spanT[i]!;
      const envelope = Math.sin(Math.PI * t);
      const phase = hash(seed * 31 + spanOf[i]! * 7);
      const offset =
        wander * envelope * Math.sin(t * Math.PI * (1.4 + phase) + phase * 6.28) * (0.6 + phase * 0.4);
      pts[i]!.addScaledVector(frames[i]!.b, offset);
    }
  }

  const lengths: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    lengths.push(lengths[i - 1]! + pts[i]!.distanceTo(pts[i - 1]!));
  }
  return { points: pts, frames, lengths };
}

function buildFrames(
  pts: Vector3[],
  cs: RouteCorner[],
  spanOf: number[],
  arcT: (number | undefined)[]
): CableFrame[] {
  const faces: Vector3[] = [];
  let face = v(cs[0]?.face ?? [1, 0, 0]);
  for (const c of cs) {
    if (c.face) face = v(c.face).normalize();
    faces.push(face.clone());
  }
  const frames: CableFrame[] = [];
  let prevN: Vector3 | null = null;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const t = b.clone().sub(a);
    if (t.lengthSq() < EPS * EPS) t.set(0, 1, 0);
    t.normalize();
    const span = Math.min(spanOf[i]!, faces.length - 1);
    const arc = arcT[i];
    // Through a bend the face turns with it, from the incoming span's to the outgoing.
    const blended =
      arc === undefined || span === 0 ? null : faces[span - 1]!.clone().lerp(faces[span]!, arc);
    const hint = blended && blended.lengthSq() > 1e-4 ? blended.normalize() : faces[span]!;
    let n = hint.clone().addScaledVector(t, -hint.dot(t));
    if (n.lengthSq() < 0.04 && prevN) {
      // The cable runs along its own face hint (into a hole): carry the last frame on.
      n = prevN.clone().addScaledVector(t, -prevN.dot(t));
    }
    if (n.lengthSq() < EPS) n = new Vector3(0, 0, 1).cross(t);
    n.normalize();
    if (prevN && n.dot(prevN) < 0) n.negate();
    const bAxis = new Vector3().crossVectors(t, n).normalize();
    frames.push({ t, n, b: bAxis });
    prevN = n;
  }
  return frames;
}

/** Offset a framed centreline sideways (across the flat) and through its thickness. */
export function offsetSamples(base: CableSamples, across: number, through = 0): CableSamples {
  const points = base.points.map((p, i) =>
    p.clone().addScaledVector(base.frames[i]!.b, across).addScaledVector(base.frames[i]!.n, through)
  );
  const lengths: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1]! + points[i]!.distanceTo(points[i - 1]!));
  }
  return { points, frames: base.frames, lengths };
}

/** Point and frame at a distance along the samples, for ties and clips. */
export function frameAt(samples: CableSamples, distance: number): { point: Vector3; frame: CableFrame } {
  const { points, frames, lengths } = samples;
  const total = lengths[lengths.length - 1] ?? 0;
  const d = Math.min(Math.max(distance, 0), total);
  let i = 1;
  while (i < lengths.length - 1 && lengths[i]! < d) i++;
  const l0 = lengths[i - 1]!;
  const l1 = lengths[i]!;
  const s = l1 - l0 > EPS ? (d - l0) / (l1 - l0) : 0;
  const point = points[i - 1]!.clone().lerp(points[i]!, s);
  const f = frames[s < 0.5 ? i - 1 : i]!;
  return { point, frame: f };
}
