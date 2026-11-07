import { CIRCUITS, ROOM_CIRCUIT_IDS, circuitDisplayName, circuitNumber } from '../circuit-data';
import { ROOM_LOADS } from './room-layout';

const destinations: Record<string, string> = {
  [ROOM_LOADS.induction]: 'Up into the ceiling, then to the kitchen isolator and cooktop.',
  [ROOM_LOADS.oven]: 'Up into the ceiling, then down behind the built-in oven.',
  [ROOM_LOADS.power]:
    'Up into the ceiling, then to the kitchen outlets for the toaster and dishwasher.',
  [ROOM_LOADS.loungePower]: 'Up into the ceiling, then down to the outlet beside the TV.',
  [ROOM_LOADS.lighting]:
    'Across the studs to the kitchen switch, then back up to the downlights and pendants.',
  [ROOM_LOADS.loungeLight]:
    'Across the studs to the lounge dimmer, then back up to the downlights and wall lights.',
  [ROOM_LOADS.fridge]: 'Up into the ceiling, then down behind the fridge.',
};

export const CIRCUIT_TRACES = [
  ...CIRCUITS.filter((c) => ROOM_CIRCUIT_IDS.has(c.id)).map((c) => ({
    id: c.id,
    name: `${circuitNumber(c)} · ${circuitDisplayName(c.label).toLowerCase()}`,
    route: destinations[c.id]!,
  })),
  {
    id: 'submain',
    name: 'Incoming submain',
    route: 'Supply from the upstream switchboard enters the top of this enclosure.',
  },
];
