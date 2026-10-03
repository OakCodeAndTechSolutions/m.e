import { DIN, DIN_Z } from './din';

export type Vec3 = [number, number, number];

export type CircuitPole = {
  id: string;
  label: string;
  rating: string;
  index: number;
};

/**
 * Layout: modules on DIN (body in front of rail).
 * Neutral + earth bars on the BACK WALL (not side panels).
 * Comb feeds LINE + N at the TOP of RCBOs.
 * Outgoing TPS gathers into ONE floor gland (not scattered exits).
 */
/** Main + circuit poles (kept in sync with CIRCUITS.length + 1). */
const POLE_COUNT = 13; // 1 main + 12 RCBOs
const RCBO_WIDTH = 0.17;
const MODULE_PITCH = RCBO_WIDTH;
/** Tight box: small equal side margins so poles fill the enclosure */
const SIDE_MARGIN = 0.16;
const POLE_SPAN = (POLE_COUNT - 1) * MODULE_PITCH;
const BOARD_HEIGHT = 3.35;
const BOARD_WIDTH = POLE_SPAN + RCBO_WIDTH + SIDE_MARGIN * 2;

export const BOARD = {
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  /** Back of the tub to the frame-side origin: a 106 mm flush box fits a 90 mm stud cavity. */
  depth: 0.72,
  railY: 0,
  /** Rail sits back from the door so device noses clear it (see DIN_Z). */
  railZ: -0.12,
  mainWidth: RCBO_WIDTH,
  // Exact pole pitch — modules abut
  rcboWidth: RCBO_WIDTH,
  moduleGap: 0,
  moduleDepth: 0.55,
  moduleHeight: 0.86,
  /** Centered pole row — enclosure hugs the modules */
  firstModuleX: -POLE_SPAN / 2,
  /** Terminal bars flush on the back wall above the DIN */
  barY: 1.05,
  barZ: -0.27,
  /**
   * Single mains TPS gland (matches Enclosure top-left knockout 0).
   * Active + neutral + earth peel from this one cable inside the board.
   */
  mainsKnockout: [-BOARD_WIDTH / 2 + 0.22, 1.555, -0.2] as Vec3,
  /**
   * Floor gland plate under the load side — one aligned hole per circuit (neat row).
   */
  glandPlateZ: 0.32,
  /** Front plane of the flush-mount frame; the door sits just inside it. */
  frontZ: 0.64,
};

export const CIRCUITS: CircuitPole[] = [
  { id: 'hot-plates', label: 'PROTECTED INDUCTION', rating: 'C32', index: 0 },
  { id: 'wall-oven', label: 'PROTECTED OVEN', rating: 'C16', index: 1 },
  { id: 'heat-bank', label: 'SPARE', rating: 'C20', index: 2 },
  { id: 'power-1', label: 'PROTECTED KITCHEN POWER', rating: 'C20', index: 3 },
  { id: 'power-2', label: 'PROTECTED LOUNGE POWER', rating: 'C20', index: 4 },
  { id: 'power-3', label: 'SPARE', rating: 'C16', index: 5 },
  { id: 'power-4', label: 'SPARE', rating: 'C16', index: 6 },
  { id: 'light-1', label: 'PROTECTED KITCHEN LIGHT', rating: 'C10', index: 7 },
  { id: 'light-2', label: 'PROTECTED LOUNGE LIGHT', rating: 'C10', index: 8 },
  { id: 'light-3', label: 'SPARE', rating: 'C10', index: 9 },
  { id: 'fridge', label: 'PROTECTED FRIDGE', rating: 'C16', index: 10 },
  { id: 'ac', label: 'SPARE', rating: 'C20', index: 11 },
];

/** Circuits that actually leave this board into the room. Spare poles stay capped. */
export const ROOM_CIRCUIT_IDS = new Set([
  'hot-plates',
  'wall-oven',
  'power-1',
  'power-2',
  'light-1',
  'light-2',
  'fridge',
]);

/** Strip the PROTECTED prefix used on schedule labels. */
export function circuitDisplayName(label: string) {
  return label.replace(/^PROTECTED\s+/i, '').trim();
}

/** 1-based circuit designation printed on the label strip and schedule. */
export function circuitNumber(circuit: CircuitPole): string {
  return String(circuit.index + 1);
}

/** Split a display name into short label-strip lines (max 3, ≤ ~9 chars each). */
export function circuitLabelLines(label: string): string[] {
  const words = circuitDisplayName(label).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length <= 9) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word);
    }
  }
  return lines.slice(0, 3);
}

export function modulePitch(): number {
  return BOARD.rcboWidth + BOARD.moduleGap;
}

export function mainSwitchX(): number {
  return BOARD.firstModuleX;
}

export function rcboX(index: number): number {
  return BOARD.firstModuleX + modulePitch() + index * modulePitch();
}

export function moduleBodyZ(): number {
  return BOARD.railZ + BOARD.moduleDepth / 2 + 0.02;
}

/**
 * Terminal clamps in module-local space: cables enter the top/bottom faces directly
 * under the front screws. N on the left, line/load on the right.
 */
function terminalLocal() {
  const xOff = BOARD.rcboWidth * 0.235;
  const yEnd = DIN.height / 2;
  const z = DIN_Z.clamp;
  return {
    lineTop: { x: xOff, y: yEnd, z },
    neutralTop: { x: -xOff, y: yEnd, z },
    lineBottom: { x: xOff, y: -yEnd, z },
    neutralBottom: { x: -xOff, y: -yEnd, z },
  } as const;
}

/** Terminal screw X offsets on the shoulder faces, matching the cable clamps. */
export const TERMINAL_X = { neutral: -BOARD.rcboWidth * 0.235, line: BOARD.rcboWidth * 0.235 };

/** LINE (active) top cable mouth — TOP face, right side. */
export function moduleTopTerminal(x: number): Vec3 {
  const t = terminalLocal().lineTop;
  return [x + t.x, BOARD.railY + t.y, moduleBodyZ() + t.z];
}

/** Load active bottom cable mouth — BOTTOM face, right side. */
export function moduleBottomTerminal(x: number): Vec3 {
  const t = terminalLocal().lineBottom;
  return [x + t.x, BOARD.railY + t.y, moduleBodyZ() + t.z];
}

/** Neutral top cable mouth — TOP face, left (N). */
export function moduleNeutralTerminal(x: number): Vec3 {
  const t = terminalLocal().neutralTop;
  return [x + t.x, BOARD.railY + t.y, moduleBodyZ() + t.z];
}

/** Neutral load bottom cable mouth — BOTTOM face, left (N). */
export function moduleBottomNeutralTerminal(x: number): Vec3 {
  const t = terminalLocal().neutralBottom;
  return [x + t.x, BOARD.railY + t.y, moduleBodyZ() + t.z];
}

export function poleSpan(): number {
  return rcboX(CIRCUITS.length - 1) - mainSwitchX();
}

export function poleCenterX(): number {
  return (mainSwitchX() + rcboX(CIRCUITS.length - 1)) / 2;
}

/**
 * Neutral + earth bars on the BACK WALL spanning the pole row
 * (not on left/right side panels).
 */
export function barLayout() {
  const first = mainSwitchX();
  const last = rcboX(CIRCUITS.length - 1);
  const mid = (first + last) / 2;
  // Fit bars to the pole span — side-by-side on the back wall
  const neutHalf = POLE_SPAN * 0.46;
  const earthHalf = POLE_SPAN * 0.46;
  const neutCx = mid - earthHalf / 2 - 0.06;
  const earthCx = mid + neutHalf / 2 + 0.06;
  return {
    neutHalf,
    earthHalf,
    earthCx,
    neutCx,
    y: BOARD.barY,
    z: BOARD.barZ,
  };
}

/** 0 = supply in, 1 = bond/spare, 2+ = circuit tails */
export function earthBarScrew(i: number): Vec3 {
  const { earthHalf, earthCx, y, z } = barLayout();
  const total = CIRCUITS.length + 2;
  const left = earthCx - earthHalf / 2 + 0.05;
  const span = earthHalf - 0.1;
  const x = left + (i / Math.max(total - 1, 1)) * span;
  return [x, y, z];
}

export function neutralBarScrew(i: number): Vec3 {
  const { neutHalf, neutCx, y, z } = barLayout();
  const total = CIRCUITS.length + 2;
  const left = neutCx - neutHalf / 2 + 0.05;
  const span = neutHalf - 0.1;
  const x = left + (i / Math.max(total - 1, 1)) * span;
  return [x, y, z];
}

export function loomLateral(i: number, count: number, spacing = 0.036): number {
  return (i - (count - 1) / 2) * spacing;
}
