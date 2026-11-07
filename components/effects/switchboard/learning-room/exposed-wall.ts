import type { Vec3 } from '../circuit-data';
import type { RouteCorner } from '../wiring/cable-route';
import { BOARD_CABLE_ENTRIES, CABLE_SIZE, type CableKind } from '../wiring/board-cables';
import { BOARD_CUTOUT, BOARD_MOUNT, ROOM, boardLocalToWorld } from './room-layout';

export { CABLE_SIZE } from '../wiring/board-cables';

/**
 * The board wall (x = 0) is left unlined: a 90 × 35 MGP10 frame at 450 centres with
 * the back of the neighbouring room's plasterboard behind it. Everything here is in
 * room metres. The room-side face of the studs is x = 0; the plaster line, where wall
 * boxes and the board frame finish, is 10 mm in front of it.
 */
export const FRAME = {
  /** Stud width along the wall. */
  studW: 0.035,
  /** Stud depth through the wall. */
  studD: 0.09,
  plateH: 0.035,
  front: 0,
  back: -0.09,
  mid: -0.045,
  plasterLine: 0.01,
  bottomPlateTop: 0.035,
  /** Underside of the double top plate. */
  topPlateUnder: ROOM.height - 0.07,
  nogginY: 1.35,
  spacing: 0.45,
} as const;

export type Stud = { z: number; y0: number; y1: number };
export type Noggin = { z0: number; z1: number; y: number };

/** Flush tub, framed tight between trimmers with a sill noggin and a head noggin. */
export const BOARD_TUB = {
  z0: BOARD_CUTOUT.z0,
  z1: BOARD_CUTOUT.z1,
  y0: BOARD_CUTOUT.y0,
  y1: BOARD_CUTOUT.y1,
  /** Cable entries along the top of the tub, on the stud centre line. */
  entryX: boardLocalToWorld(BOARD_CABLE_ENTRIES[0]!.point)[0],
} as const;

/** Head noggin sits clear of the tub so the cable entries stay in view. */
export const HEAD_NOGGIN_Y = BOARD_TUB.y1 + 0.12 + FRAME.plateH / 2;
export const SILL_NOGGIN_Y = BOARD_TUB.y0 - FRAME.plateH / 2;
const TRIMMER_A = BOARD_TUB.z0 - FRAME.studW / 2;
const TRIMMER_B = BOARD_TUB.z1 + FRAME.studW / 2;

/** Height of the horizontal runs that feed the switch drops, through holes in the studs. */
export const BRANCH_Y = 2.4;

/** Flush PVC wall boxes screwed to the side of a stud, front on the plaster line. */
export const WALL_BOX = { w: 0.068, h: 0.108, d: 0.035 } as const;

/**
 * A box beside stud `studZ`, on its +z or -z side. Returns the box centre (where the
 * plate goes) and the face of the stud the drop cables are saddled to.
 */
function boxBeside(studZ: number, side: 1 | -1, y: number) {
  const face = studZ + side * (FRAME.studW / 2);
  return {
    z: face + side * (WALL_BOX.w / 2),
    y,
    studFace: face,
    side,
  };
}

/** Kitchen light switch beside the 4.5 m stud, dimmer beside the 6.75 m stud. */
export const SWITCH_BOX = boxBeside(4.5, 1, 1.16);
export const DIMMER_BOX = boxBeside(6.75, -1, 1.16);

/** Wall plates sit on the boxes at the plaster line. */
export const PLATE_X = FRAME.plasterLine + 0.008;

export function boardWallStuds(): Stud[] {
  const studs: Stud[] = [];
  const full = { y0: FRAME.bottomPlateTop, y1: FRAME.topPlateUnder };
  studs.push({ z: FRAME.studW / 2, ...full });
  for (let z = FRAME.spacing; z < ROOM.depth - 0.1; z += FRAME.spacing) {
    const zz = Number(z.toFixed(3));
    if (zz > BOARD_TUB.z0 - FRAME.studW && zz < BOARD_TUB.z1 + FRAME.studW) {
      // A common stud through the tub is cut and stops at the sill noggin.
      studs.push({ z: zz, y0: FRAME.bottomPlateTop, y1: SILL_NOGGIN_Y - FRAME.plateH / 2 });
      continue;
    }
    studs.push({ z: zz, ...full });
  }
  studs.push({ z: TRIMMER_A, ...full }, { z: TRIMMER_B, ...full });
  studs.push({ z: ROOM.depth - FRAME.studW / 2, ...full });
  return studs.sort((a, b) => a.z - b.z);
}

/** Centres of the full-height studs a horizontal run between `a` and `b` passes through. */
export function studsBetween(a: number, b: number): number[] {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const zs = boardWallStuds()
    .filter((s) => s.y1 >= BRANCH_Y)
    .filter((s) => s.z - FRAME.studW / 2 > lo + 1e-3 && s.z + FRAME.studW / 2 < hi - 1e-3)
    .map((s) => s.z);
  return a < b ? zs : zs.reverse();
}

/** Bays where a switch drop is saddled down a stud face are left without a noggin. */
function bayHasDrop(z0: number, z1: number) {
  return [SWITCH_BOX.studFace, DIMMER_BOX.studFace].some((f) => f >= z0 - 1e-3 && f <= z1 + 1e-3);
}

export function boardWallNoggins(): Noggin[] {
  const full = boardWallStuds().filter((s) => s.y1 > FRAME.topPlateUnder - 1e-6);
  const noggins: Noggin[] = [];
  for (let i = 0; i < full.length - 1; i++) {
    const z0 = full[i]!.z + FRAME.studW / 2;
    const z1 = full[i + 1]!.z - FRAME.studW / 2;
    if (z1 - z0 < 0.05) continue;
    const isBoardBay = z0 >= BOARD_TUB.z0 - 1e-3 && z1 <= BOARD_TUB.z1 + 1e-3;
    if (isBoardBay) {
      noggins.push({ z0, z1, y: SILL_NOGGIN_Y }, { z0, z1, y: HEAD_NOGGIN_Y });
      continue;
    }
    if (bayHasDrop(z0, z1)) continue;
    // Staggered so each can be skew-nailed through the stud.
    noggins.push({ z0, z1, y: FRAME.nogginY + (i % 2 === 0 ? -0.025 : 0.025) });
  }
  return noggins;
}

export type ExposedCable = {
  id: string;
  /** Circuit this cable belongs to (the submain is upstream of the board). */
  circuitId: string | 'submain';
  kind: CableKind;
  corners: RouteCorner[];
};

const LOOM = BOARD_CABLE_ENTRIES;

/** Gap between neighbouring cables in the tied loom. */
const LOOM_GAP = 0.0015;
/** Top of the tub and the first bend out of the grommets. */
const TUB_TOP = BOARD_TUB.y1;

/** Grommet centres along the tub top, spread evenly inside the trimmers. */
export function loomEntries(): { id: string; z: number; kind: CableKind }[] {
  return LOOM.map((c) => ({
    id: c.id,
    kind: c.kind,
    z: boardLocalToWorld(c.point)[2],
  }));
}

/** Where each cable sits in the tied loom: side by side, centred on the board. */
export function loomLanes(): { id: string; z: number; kind: CableKind }[] {
  const total = LOOM.reduce((s, c) => s + CABLE_SIZE[c.kind].w, 0) + LOOM_GAP * (LOOM.length - 1);
  let z = BOARD_MOUNT.z - total / 2;
  return LOOM.map((c) => {
    const w = CABLE_SIZE[c.kind].w;
    const lane = { id: c.id, kind: c.kind, z: z + w / 2 };
    z += w + LOOM_GAP;
    return lane;
  });
}

const FACE_ROOM: Vec3 = [1, 0, 0];
export const SWITCHED_RETURN_X = -0.017;

/** Opposing feeds peel off on separate depths, then pass through their studs. */
export function switchFeedX(box: ReturnType<typeof boxBeside>) {
  return box === SWITCH_BOX ? -0.031 : -0.061;
}

/** Out of a grommet, into its lane, and up through the head noggin. */
function riseFromTub(entryZ: number, laneZ: number): RouteCorner[] {
  const x = BOARD_TUB.entryX;
  return [
    { at: [x, TUB_TOP - 0.0005, entryZ], face: FACE_ROOM },
    { at: [x, TUB_TOP + 0.025, entryZ], radius: 0.04 },
    { at: [x, TUB_TOP + 0.095, laneZ], radius: 0.04 },
    { at: [x, HEAD_NOGGIN_Y, laneZ] },
  ];
}

/**
 * A light circuit leaves the loom, runs through the studs to its switch stud, drops down
 * the stud face into the top of the wall box, and its switched return goes back up the
 * same stud into the ceiling.
 */
function switchDrop(
  laneZ: number,
  box: ReturnType<typeof boxBeside>,
  kind: CableKind
): { feed: RouteCorner[]; switched: RouteCorner[] } {
  const { t } = CABLE_SIZE[kind];
  const faceZ = box.studFace + box.side * (t / 2);
  const faceStud: Vec3 = [0, 0, box.side];
  const boxTop = box.y + WALL_BOX.h / 2;
  const x = switchFeedX(box);
  // Each stud hole is a support; the cable sags a little in every bay between them.
  const holes = studsBetween(laneZ, faceZ).map((z): RouteCorner => ({
    at: [x, BRANCH_Y, z],
    sag: 0.005,
  }));
  const feed: RouteCorner[] = [
    { at: [FRAME.mid, BRANCH_Y - 0.08, laneZ], radius: 0.022 },
    { at: [x, BRANCH_Y - 0.032, laneZ], radius: 0.018 },
    { at: [x, BRANCH_Y, laneZ], radius: 0.035, sag: 0.004 },
    ...holes,
    { at: [x, BRANCH_Y, faceZ], face: faceStud, radius: 0.06 },
    { at: [x, boxTop + 0.13, faceZ], radius: 0.05 },
    { at: [-0.018, boxTop + 0.05, faceZ], radius: 0.04 },
    { at: [-0.018, boxTop - 0.02, faceZ] },
  ];
  const switched: RouteCorner[] = [
    { at: [-0.003, boxTop - 0.02, faceZ], face: faceStud },
    { at: [-0.003, boxTop + 0.05, faceZ], radius: 0.04 },
    { at: [SWITCHED_RETURN_X, boxTop + 0.16, faceZ], radius: 0.05 },
    { at: [SWITCHED_RETURN_X, ROOM.height - 0.02, faceZ] },
  ];
  return { feed, switched };
}

export function exposedCables(): ExposedCable[] {
  const entries = loomEntries();
  const lanes = loomLanes();
  const cables: ExposedCable[] = [];
  LOOM.forEach((c, i) => {
    const entryZ = entries[i]!.z;
    const laneZ = lanes[i]!.z;
    const rise = riseFromTub(entryZ, laneZ);
    if (c.id === 'kitchen-light' || c.id === 'lounge-light') {
      const box = c.id === 'kitchen-light' ? SWITCH_BOX : DIMMER_BOX;
      const drop = switchDrop(laneZ, box, c.kind);
      cables.push({
        id: c.id,
        circuitId: c.circuitId,
        kind: c.kind,
        corners: [...rise, ...drop.feed],
      });
      cables.push({
        id: `${c.id}-switched`,
        circuitId: c.circuitId,
        kind: c.kind,
        corners: drop.switched,
      });
      return;
    }
    cables.push({
      id: c.id,
      circuitId: c.circuitId,
      kind: c.kind,
      corners: [...rise, { at: [FRAME.mid, ROOM.height - 0.02, laneZ] }],
    });
  });
  return cables;
}

/** Heights of the black ties round the loom between the head noggin and the top plate. */
export const LOOM_TIES = [1.98, 2.15, 2.3, 2.52] as const;

/** Saddle heights on the switch-drop stud faces. */
export const DROP_SADDLES = [2.05, 1.72] as const;

export type Hole = { at: Vec3; normal: Vec3; r: number };

/** Drilled holes where cables pass through timber, drawn on both faces of the member. */
export function cableHoles(): Hole[] {
  const holes: Hole[] = [];
  const lanes = loomLanes();
  const ny = FRAME.plateH / 2 + 0.0006;
  for (const lane of lanes) {
    const r = CABLE_SIZE[lane.kind].w / 2 + 0.003;
    holes.push(
      { at: [FRAME.mid, HEAD_NOGGIN_Y + ny, lane.z], normal: [0, 1, 0], r },
      { at: [FRAME.mid, HEAD_NOGGIN_Y - ny, lane.z], normal: [0, -1, 0], r }
    );
    if (lane.id !== 'kitchen-light' && lane.id !== 'lounge-light') {
      holes.push({ at: [FRAME.mid, FRAME.topPlateUnder - 0.0006, lane.z], normal: [0, -1, 0], r });
    }
  }
  for (const box of [SWITCH_BOX, DIMMER_BOX]) {
    const faceZ = box.studFace + box.side * (CABLE_SIZE.light.t / 2);
    holes.push({
      at: [SWITCHED_RETURN_X, FRAME.topPlateUnder - 0.0006, faceZ],
      normal: [0, -1, 0],
      r: CABLE_SIZE.light.w / 2 + 0.003,
    });
  }
  // Horizontal runs through the studs between the loom and each switch stud.
  const runs = [
    { from: lanes.find((lane) => lane.id === 'kitchen-light')!.z, box: SWITCH_BOX },
    { from: lanes.find((lane) => lane.id === 'lounge-light')!.z, box: DIMMER_BOX },
  ];
  const r = CABLE_SIZE.light.w / 2 + 0.003;
  for (const { from, box } of runs) {
    const x = switchFeedX(box);
    for (const z of studsBetween(from, box.studFace)) {
      holes.push(
        { at: [x, BRANCH_Y, z - FRAME.studW / 2 - 0.0006], normal: [0, 0, -1], r },
        { at: [x, BRANCH_Y, z + FRAME.studW / 2 + 0.0006], normal: [0, 0, 1], r }
      );
    }
  }
  return holes;
}
