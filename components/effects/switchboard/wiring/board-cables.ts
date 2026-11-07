import { BOARD, type Vec3 } from '../circuit-data';
import { BOARD_METRES_PER_UNIT } from '../din';

/** Flat TPS outline in metres: across the flat × thickness. */
export const CABLE_SIZE = {
  light: { w: 0.009, t: 0.0052 },
  power: { w: 0.0105, t: 0.0058 },
  cooking: { w: 0.0138, t: 0.0068 },
  submain: { w: 0.0205, t: 0.0098 },
} as const;

export type CableKind = keyof typeof CABLE_SIZE;

export const CABLE_COLOR: Record<CableKind, string> = {
  light: '#f1f0eb',
  power: '#cfd0cc',
  cooking: '#cfd0cc',
  submain: '#c4c5c1',
};

/** Entries in wall order, opposite the board face. The tails follow pole order inside. */
const LOOM: { id: string; circuitId: string; kind: CableKind }[] = [
  { id: 'fridge', circuitId: 'fridge', kind: 'power' },
  { id: 'lounge-light', circuitId: 'light-2', kind: 'light' },
  { id: 'kitchen-light', circuitId: 'light-1', kind: 'light' },
  { id: 'lounge-power', circuitId: 'power-2', kind: 'power' },
  { id: 'kitchen-power', circuitId: 'power-1', kind: 'power' },
  { id: 'oven', circuitId: 'wall-oven', kind: 'power' },
  { id: 'induction', circuitId: 'hot-plates', kind: 'cooking' },
  { id: 'submain', circuitId: 'submain', kind: 'submain' },
];

const inset = 0.03 / BOARD_METRES_PER_UNIT;
const span = BOARD.width - inset * 2;
const z = 0.045 / BOARD_METRES_PER_UNIT - BOARD.depth / 2;

export const BOARD_CABLE_ENTRIES = LOOM.map((c, i) => ({
  ...c,
  point: [span / 2 - (span * i) / (LOOM.length - 1), BOARD.height / 2, z] as Vec3,
}));

export function boardCableEntry(circuitId: string): Vec3 {
  const entry = BOARD_CABLE_ENTRIES.find((c) => c.circuitId === circuitId);
  if (!entry) throw new Error(`No board cable entry for ${circuitId}`);
  return entry.point;
}
