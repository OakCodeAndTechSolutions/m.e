import { BOARD, CIRCUITS, moduleBodyZ } from '../circuit-data';
import { BOARD_METRES_PER_UNIT, DIN_Z } from '../din';
import type { Vec3 } from '../circuit-data';

/** Corner at origin. Board wall = x=0 (faces +X). Kitchen wall = z=0 (faces +Z). */
export const ROOM = {
  width: 8.4,
  depth: 7.0,
  height: 2.7,
  studSpacing: 0.45,
  studSize: 0.09,
  plate: 0.09,
  /** 1.14 is the switch / splash-GPO noggin so fittings clip to timber. */
  nogginYs: [0.9, 1.14, 1.8] as const,
} as const;

/** 35×38 dwangs — staggered, not a 90 mm block filling the stud depth. */
export const NOGGIN = {
  h: 0.035,
  depth: 0.038,
  stagger: 0.05,
} as const;

export function nogginY(baseY: number, bayIndex: number) {
  const service = Math.abs(baseY - 1.14) < 0.02;
  const amp = service ? 0.018 : NOGGIN.stagger;
  return baseY + (bayIndex % 2 === 0 ? -amp : amp);
}

export const ROOM_LOADS = {
  lighting: 'light-1',
  power: 'power-1',
  fridge: 'fridge',
  oven: 'wall-oven',
  induction: 'hot-plates',
  loungePower: 'power-2',
  loungeLight: 'light-2',
} as const;

/** True size: an 18 mm pole is 18 mm, so the board reads as the real equipment. */
const BOARD_SCALE = BOARD_METRES_PER_UNIT;

/**
 * Flush tub in the framed opening of the unlined board wall: its back is flush with the
 * back of the 90 mm studs and its frame finishes on the plaster line. Centred at 1.5 m.
 */
export const BOARD_MOUNT = {
  scale: BOARD_SCALE,
  rotY: Math.PI / 2,
  x: -0.09 + (BOARD.depth / 2) * BOARD_SCALE,
  y: 1.5,
  z: 5.35,
} as const;

/**
 * Where the player stands to use the board, in front of the wall. Proximity, facing
 * and approach checks measure from here rather than from the flush-mounted tub.
 */
export const BOARD_STAND_X = 0.69;

/** Device fronts, in metres in front of the mount centre. */
export const BOARD_FACE_OFFSET = (moduleBodyZ() + DIN_Z.nose) * BOARD_SCALE;

/**
 * Face-on close-up while the enclosure cover is open. It frames the device row and its
 * labels (not the whole enclosure) so the 18 mm devices are large enough to operate.
 */
export const BOARD_INSPECT = {
  fov: 42,
  lookYBias: -0.11 * BOARD_SCALE,
  minDistance: 0.16,
  width: ((CIRCUITS.length + 1) * BOARD.rcboWidth + 0.26) * BOARD_SCALE,
  height: 1.2 * BOARD_SCALE,
} as const;

const BOARD_WORLD_W = BOARD.width * BOARD_MOUNT.scale;
const BOARD_WORLD_H = BOARD.height * BOARD_MOUNT.scale;

/** Hole in the plaster for the tub; the enclosure frame covers its edges. */
export const BOARD_CUTOUT = {
  z0: BOARD_MOUNT.z - BOARD_WORLD_W / 2,
  z1: BOARD_MOUNT.z + BOARD_WORLD_W / 2,
  y0: BOARD_MOUNT.y - BOARD_WORLD_H / 2,
  y1: BOARD_MOUNT.y + BOARD_WORLD_H / 2,
} as const;

/** Framed opening in the board wall — trimmer and sill centrelines half a stud outside the tub. */
export const BOARD_OPENING = {
  z0: BOARD_CUTOUT.z0 - 0.05,
  z1: BOARD_CUTOUT.z1 + 0.05,
  y0: BOARD_CUTOUT.y0 - 0.05,
  y1: BOARD_CUTOUT.y1 + 0.05,
} as const;

/** Greyscale carcass sizes. Appliances are fitted to these bays. */
export const KITCHEN = {
  startX: 0.28,
  benchH: 0.9,
  benchDepth: 0.6,
  kickH: 0.12,
  splashGpoY: 1.12,
  upperY: 1.46,
  upperH: 0.68,
  upperDepth: 0.33,
  endX: 5.68,
} as const;

export const HEIGHTS = {
  gpo: 0.34,
  splashGpoY: KITCHEN.splashGpoY,
  /** Fridge TPS sits above kitchen power so the two runs don't share a line. */
  fridgeY: 1.34,
  /** Induction TPS sits a stud above kitchen power so the two runs don't occupy the same line. */
  inductionY: 1.22,
  ovenY: 0.46,
  switch: 1.16,
  light: 2.18,
  portrait: 1.58,
  topPlate: ROOM.height - ROOM.plate / 2,
  cavityX: -ROOM.studSize / 2,
  cavityZ: -ROOM.studSize / 2,
  /** Lounge teaching wall cavity — studs sit just past z = ROOM.depth. */
  loungeCavityZ: ROOM.depth + ROOM.studSize / 2,
  /** Far teaching wall cavity — studs sit just past x = ROOM.width. */
  endCavityX: ROOM.width + ROOM.studSize / 2,
} as const;

export const IDLE_CAMERA = {
  position: [6.15, 1.68, 5.8] as Vec3,
  target: [1.8, 1.23, 2.25] as Vec3,
};

export const ISLAND = { x: 2.67, z: 2.15, w: 2.18, d: 0.91 } as const;
export const DINING = { x: 6.85, z: 2.6, w: 1.48, d: 1.8 } as const;
export const GUM = { x: 7.76, z: 5.95, w: 0.42, d: 0.42 } as const;

/**
 * Kitchen elevation along +X.
 * One 900 mm two-door cabinet each side of the dishwasher — not four 450 mm splits.
 * Isolator sits mid-cupboard, ~350 mm past the hob edge — not jammed against
 * the cooktop. Splash GPOs sit on opposite sides of the dishwasher.
 */
export const KITCHEN_BAYS = {
  sink: { x: 0.28, w: 0.8 },
  cabA: { x: 1.08, w: 0.45 },
  cook: { x: 1.53, w: 0.6 },
  cabL: { x: 2.13, w: 0.9 },
  dw: { x: 3.03, w: 0.6 },
  cabR: { x: 3.63, w: 0.9 },
  fridge: { x: 4.53, w: 1.15 },
} as const;

/** Plates on the unlined board wall sit on their wall boxes at the plaster line. */
const BOARD_WALL_PLATE_X = 0.018;

export const FIXTURES = {
  /** On a box beside the 4.5 m stud (see exposed-wall SWITCH_BOX). */
  lightSwitch: { x: BOARD_WALL_PLATE_X, y: HEIGHTS.switch, z: 4.5515 },
  /** Framed prints on the lounge wall, either side of the TV run. */
  portrait1: { x: 0.74, y: HEIGHTS.portrait, z: ROOM.depth - 0.014 },
  portrait2: { x: 5.32, y: HEIGHTS.portrait, z: ROOM.depth - 0.014 },
  sink: { x: 0.68, y: KITCHEN.benchH, z: 0.32 },
  cooktop: { x: 1.83, y: KITCHEN.benchH, z: 0.3 },
  oven: { x: 1.83, y: 0, z: 0.3 },
  rangehood: { x: 1.83, y: KITCHEN.upperY, z: 0.08 },
  cookIsolator: { x: 2.48, y: KITCHEN.splashGpoY, z: 0.018 },
  dishwasher: { x: 3.33, y: 0, z: 0.3 },
  dwGpo: { x: 3.33, y: HEIGHTS.gpo, z: 0.018 },
  toaster: { x: 4.08, y: KITCHEN.benchH, z: 0.34 },
  /** Type I double the toaster plugs into — fully on the splash, left of the fridge gable. */
  gpoDouble: { x: 4.32, y: KITCHEN.splashGpoY, z: 0.018 },
  /** Spare Type I double, left of the dishwasher. */
  gpoSingle: { x: 2.88, y: KITCHEN.splashGpoY, z: 0.018 },
  fridge: { x: 5.1, y: 0, z: 0.38 },
  fridgeGpo: { x: 4.95, y: KITCHEN.splashGpoY, z: 0.018 },
  /** Board wall, on a box beside the 6.75 m stud (see exposed-wall DIMMER_BOX). */
  loungeDimmerA: { x: BOARD_WALL_PLATE_X, y: HEIGHTS.switch, z: 6.6985 },
  loungeDimmerB: { x: 1.22, y: HEIGHTS.switch, z: ROOM.depth - 0.006 },
  loungeSconce1: { x: 1.38, y: HEIGHTS.light, z: ROOM.depth - 0.022 },
  loungeSconce2: { x: 4.62, y: HEIGHTS.light, z: ROOM.depth - 0.022 },
  /** Low double beside the TV unit, so the lead drops behind the cabinet, not across the wall. */
  loungeGpo: { x: 3.98, y: HEIGHTS.gpo, z: ROOM.depth - 0.006 },
  /** Centre of the TV panel, sitting on the media unit. */
  tv: { x: 2.92, y: 0.875, z: ROOM.depth - 0.15 },
} as const;

/**
 * Open-plan lounge on the far wall (z = ROOM.depth). Sofa faces the TV.
 * Sizes are native model bounds (contain, never stretch).
 */
export const LOUNGE = {
  /** IKEA BYAS — native 1.60 × 0.45 × 0.44. */
  cab: { x: 2.12, w: 1.6, h: 0.45, depth: 0.44, kickH: 0.08 },
  /** ~65" panel after contain. */
  tv: { w: 1.45, h: 0.85, d: 0.3 },
  table: { x: 2.32, w: 1.2, d: 0.6, h: 0.39, z: 5.18 },
  couch: { x: 1.48, w: 2.75, d: 0.9, seatH: 0.42, z: 4.05 },
  rug: { x: 1.28, w: 3.2, d: 2.55, z: 3.92 },
} as const;

export type KitchenInteractId =
  | 'switch'
  | 'toaster'
  | 'gpoDouble'
  | 'fridge'
  | 'oven'
  | 'dishwasher'
  | 'cookIsolator'
  | 'cooktop'
  | 'sink'
  | 'sink-base'
  | 'cabA-base'
  | 'cabL-base'
  | 'cabR-base'
  | 'sink-upper'
  | 'cabA-upper'
  | 'cabL-upper'
  | 'dw-upper'
  | 'cabR-upper';

export type LoungeInteractId = 'loungeDimmerA' | 'loungeDimmerB' | 'tv' | 'tvGpo';

export type RoomInteractId = KitchenInteractId | LoungeInteractId;

export const PLAYER_SPAWN = {
  x: 5.8,
  y: 0,
  z: 3.8,
  /** Face the kitchen wall (z=0). */
  yaw: Math.PI,
} as const;

export const PLAYER = {
  radius: 0.24,
  height: 1.62,
  speed: 1.8,
  turnSpeed: 2.2,
  pitchMin: -1.15,
  pitchMax: 1.1,
} as const;

export function boardWallStudZs(): number[] {
  const zs: number[] = [];
  for (let z = 0; z <= ROOM.depth + 0.001; z += ROOM.studSpacing) zs.push(Number(z.toFixed(3)));
  return zs;
}

export function fridgeWallStudXs(): number[] {
  const xs: number[] = [];
  for (let x = 0; x <= ROOM.width + 0.001; x += ROOM.studSpacing) xs.push(Number(x.toFixed(3)));
  return xs;
}

/** Board local → world, including wall-mount Ry(90). */
export function boardLocalToWorld(local: Vec3): Vec3 {
  const s = BOARD_MOUNT.scale;
  const lx = local[0] * s;
  const ly = local[1] * s;
  const lz = local[2] * s;
  return [BOARD_MOUNT.x + lz, BOARD_MOUNT.y + ly, BOARD_MOUNT.z - lx];
}

export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function pushAabb(
  nx: number,
  nz: number,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  pad: number
): { x: number; z: number } {
  const ix0 = x0 - pad;
  const ix1 = x1 + pad;
  const iz0 = z0 - pad;
  const iz1 = z1 + pad;
  if (nx <= ix0 || nx >= ix1 || nz <= iz0 || nz >= iz1) return { x: nx, z: nz };
  const dl = nx - ix0;
  const dr = ix1 - nx;
  const db = nz - iz0;
  const dt = iz1 - nz;
  const m = Math.min(dl, dr, db, dt);
  if (m === dl) return { x: ix0, z: nz };
  if (m === dr) return { x: ix1, z: nz };
  if (m === db) return { x: nx, z: iz0 };
  return { x: nx, z: iz1 };
}

/** Same furniture AABBs as the player, with a caller-supplied pad. */
export function resolveSolidPosition(x: number, z: number, pad: number): { x: number; z: number } {
  let nx = Math.min(ROOM.width - pad - 0.1, Math.max(pad + 0.22, x));
  let nz = Math.min(ROOM.depth - pad - 0.1, Math.max(pad + 0.22, z));

  const boardHalfW = (BOARD.width / 2) * BOARD_MOUNT.scale + pad;
  // Flush board: only the frame and door stand proud of the wall.
  const boardFront = BOARD_MOUNT.x + (BOARD.frontZ + 0.05) * BOARD_MOUNT.scale + pad * 0.25;
  if (Math.abs(nz - BOARD_MOUNT.z) < boardHalfW && nx < boardFront) {
    nx = boardFront;
  }

  const benchFront = KITCHEN.benchDepth + pad * 0.35;
  if (nx > KITCHEN.startX - pad && nx < KITCHEN.endX + pad && nz < benchFront) {
    nz = benchFront;
  }

  const fridge = FIXTURES.fridge;
  const fw = 0.48 + pad;
  const fd = 0.4 + pad;
  if (Math.abs(nx - fridge.x) < fw && nz < fridge.z + fd) {
    nz = fridge.z + fd;
  }

  const cabZ0 = ROOM.depth - LOUNGE.cab.depth;
  for (const { x, z, w, d } of [ISLAND, DINING, GUM]) {
    ({ x: nx, z: nz } = pushAabb(nx, nz, x - w / 2, x + w / 2, z - d / 2, z + d / 2, pad));
  }
  ({ x: nx, z: nz } = pushAabb(
    nx,
    nz,
    LOUNGE.cab.x,
    LOUNGE.cab.x + LOUNGE.cab.w,
    cabZ0,
    ROOM.depth,
    pad * 0.35
  ));
  ({ x: nx, z: nz } = pushAabb(
    nx,
    nz,
    LOUNGE.couch.x,
    LOUNGE.couch.x + LOUNGE.couch.w,
    LOUNGE.couch.z,
    LOUNGE.couch.z + LOUNGE.couch.d,
    pad * 0.45
  ));
  ({ x: nx, z: nz } = pushAabb(
    nx,
    nz,
    LOUNGE.table.x,
    LOUNGE.table.x + LOUNGE.table.w,
    LOUNGE.table.z,
    LOUNGE.table.z + LOUNGE.table.d,
    pad * 0.3
  ));

  return { x: nx, z: nz };
}

export function resolvePlayerPosition(x: number, z: number): { x: number; z: number } {
  return resolveSolidPosition(x, z, PLAYER.radius);
}

/** Keep the player off dropped / swung doors. */
export function resolveOpenDoors(
  x: number,
  z: number,
  open: { dishwasher?: boolean; fridge?: boolean }
): { x: number; z: number } {
  const nx = x;
  let nz = z;
  const pad = PLAYER.radius;
  if (open.dishwasher && Math.abs(nx - FIXTURES.dishwasher.x) < 0.36 + pad && nz < 1.28) {
    nz = 1.28;
  }
  if (open.fridge && Math.abs(nx - FIXTURES.fridge.x) < 0.62 + pad && nz < 1.18) {
    nz = 1.18;
  }
  return { x: nx, z: nz };
}

export function nearPoint(px: number, pz: number, x: number, z: number, radius = 1.4): boolean {
  return dist2(px, pz, x, z) < radius * radius;
}

export function nearBoard(px: number, pz: number): boolean {
  return nearPoint(px, pz, BOARD_STAND_X, BOARD_MOUNT.z, 1.15);
}

/** Standing in front of the enclosure — close enough to use the toggles. */
export function atBoard(px: number, pz: number): boolean {
  return nearPoint(px, pz, BOARD_STAND_X + 0.1, BOARD_MOUNT.z, 0.95);
}
