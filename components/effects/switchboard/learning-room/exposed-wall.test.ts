import { describe, expect, it } from 'vitest';
import { buildWirePaths } from '../wiring/wire-paths';
import { sampleRoute } from '../wiring/cable-route';
import {
  BOARD_TUB,
  CABLE_SIZE,
  DIMMER_BOX,
  FRAME,
  SWITCH_BOX,
  WALL_BOX,
  boardWallNoggins,
  boardWallStuds,
  cableHoles,
  exposedCables,
  loomLanes,
} from './exposed-wall';
import { FIXTURES, ROOM, boardLocalToWorld } from './room-layout';
import { CIRCUIT_TRACES } from './circuit-trace';

type Box = { min: [number, number, number]; max: [number, number, number] };

function timber(): Box[] {
  const { back, front, studW, plateH, topPlateUnder } = FRAME;
  const boxes: Box[] = [
    { min: [back, 0, 0], max: [front, plateH, ROOM.depth] },
    { min: [back, topPlateUnder, 0], max: [front, ROOM.height, ROOM.depth] },
  ];
  for (const s of boardWallStuds()) {
    boxes.push({ min: [back, s.y0, s.z - studW / 2], max: [front, s.y1, s.z + studW / 2] });
  }
  for (const n of boardWallNoggins()) {
    boxes.push({ min: [back, n.y - plateH / 2, n.z0], max: [front, n.y + plateH / 2, n.z1] });
  }
  return boxes;
}

function inside(p: { x: number; y: number; z: number }, b: Box, pad = 0) {
  return (
    p.x > b.min[0] + pad &&
    p.x < b.max[0] - pad &&
    p.y > b.min[1] + pad &&
    p.y < b.max[1] - pad &&
    p.z > b.min[2] + pad &&
    p.z < b.max[2] - pad
  );
}

describe('board wall frame', () => {
  it('keeps full-height studs clear of the tub', () => {
    for (const s of boardWallStuds()) {
      const overlapsZ =
        s.z + FRAME.studW / 2 > BOARD_TUB.z0 + 1e-6 && s.z - FRAME.studW / 2 < BOARD_TUB.z1 - 1e-6;
      const overlapsY = s.y1 > BOARD_TUB.y0 + 1e-6 && s.y0 < BOARD_TUB.y1 - 1e-6;
      expect(overlapsZ && overlapsY).toBe(false);
    }
  });

  it('frames the opening tight to the tub', () => {
    const zs = boardWallStuds().map((s) => s.z);
    expect(zs).toContainEqual(expect.closeTo(BOARD_TUB.z0 - FRAME.studW / 2, 6));
    expect(zs).toContainEqual(expect.closeTo(BOARD_TUB.z1 + FRAME.studW / 2, 6));
  });

  it('keeps noggins out of the tub', () => {
    for (const n of boardWallNoggins()) {
      const overlapsZ = n.z1 > BOARD_TUB.z0 && n.z0 < BOARD_TUB.z1;
      const overlapsY =
        n.y + FRAME.plateH / 2 > BOARD_TUB.y0 && n.y - FRAME.plateH / 2 < BOARD_TUB.y1;
      expect(overlapsZ && overlapsY).toBe(false);
    }
  });
});

describe('board wall cabling', () => {
  const cables = exposedCables().map((c) => ({
    ...c,
    samples: sampleRoute(c.corners, { radius: CABLE_SIZE[c.kind].w * 5, step: 0.01 }),
  }));
  const holes = cableHoles();

  it('joins each traced wall feed to its matching cable inside the enclosure', () => {
    const inside = buildWirePaths();
    for (const trace of CIRCUIT_TRACES) {
      const external = cables.find((c) => c.circuitId === trace.id);
      const loom = [inside.source, ...inside.circuits].find((c) => c.circuitId === trace.id);
      const end = loom?.jacket[0];
      expect(external).toBeDefined();
      expect(end).toBeDefined();
      const [x, y, z] = boardLocalToWorld(end!);
      const first = external!.samples.points[0]!;
      expect(first.x).toBeCloseTo(x, 6);
      expect(first.z).toBeCloseTo(z, 6);
      expect(first.y).toBeLessThan(y);
      expect(y).toBeLessThan(BOARD_TUB.y1);
    }
  });

  it('lays the loom side by side without overlap', () => {
    const lanes = loomLanes();
    for (let i = 1; i < lanes.length; i++) {
      const prev = lanes[i - 1]!;
      const cur = lanes[i]!;
      expect(cur.z - CABLE_SIZE[cur.kind].w / 2).toBeGreaterThan(
        prev.z + CABLE_SIZE[prev.kind].w / 2
      );
    }
  });

  it('only passes through timber where a hole is drilled', () => {
    const boxes = timber();
    for (const c of cables) {
      for (const p of c.samples.points) {
        for (const b of boxes) {
          if (!inside(p, b, 0.0005)) continue;
          // Ends buried in the top plate are where the cable goes up into the ceiling.
          if (p.y > FRAME.topPlateUnder - 1e-6) {
            const viaHole = holes.some(
              (h) => h.normal[1] < 0 && Math.hypot(h.at[0] - p.x, h.at[2] - p.z) < h.r
            );
            expect(viaHole, `${c.id} into the top plate at ${p.toArray()}`).toBe(true);
            continue;
          }
          const viaHole = holes.some((h) => {
            const axis = h.normal.findIndex((n) => n !== 0);
            const d = [p.x - h.at[0], p.y - h.at[1], p.z - h.at[2]];
            d[axis] = 0;
            return Math.hypot(d[0]!, d[1]!, d[2]!) < h.r;
          });
          expect(viaHole, `${c.id} through timber at ${p.toArray()}`).toBe(true);
        }
      }
    }
  });

  it('starts every circuit inside the board and ends in the ceiling or a wall box', () => {
    for (const c of cables) {
      const pts = c.samples.points;
      const first = pts[0]!;
      const last = pts.at(-1)!;
      const inBox = (p: typeof first) =>
        [SWITCH_BOX, DIMMER_BOX].some(
          (b) =>
            Math.abs(p.z - b.z) < WALL_BOX.w / 2 &&
            Math.abs(p.y - b.y) < WALL_BOX.h / 2 &&
            p.x > FRAME.plasterLine - WALL_BOX.d &&
            p.x < FRAME.plasterLine
        );
      const inTub = (p: typeof first) =>
        p.z > BOARD_TUB.z0 && p.z < BOARD_TUB.z1 && p.y < BOARD_TUB.y1 && p.y > BOARD_TUB.y0;
      const inCeiling = (p: typeof first) => p.y > FRAME.topPlateUnder;
      expect(inTub(first) || inBox(first), `${c.id} start`).toBe(true);
      expect(inCeiling(last) || inBox(last), `${c.id} end`).toBe(true);
    }
  });

  it('puts the wall plates on their boxes', () => {
    expect(FIXTURES.lightSwitch.z).toBeCloseTo(SWITCH_BOX.z, 3);
    expect(FIXTURES.loungeDimmerA.z).toBeCloseTo(DIMMER_BOX.z, 3);
  });
});
