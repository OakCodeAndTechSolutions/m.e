import type { TripReason } from '../useSwitchboardState';
import { INITIAL_ROOM_PLAY, type RoomPlayState } from './room-play';

export type ObjectiveId = 'lights' | 'dimmer' | 'isolator' | 'board' | 'rcdTest' | 'wiring';

export type RoomObjective = {
  id: ObjectiveId;
  label: string;
  /** Where to look, shown until the objective is done. */
  where: string;
  /** What the visitor just saw, shown once done. Keep to one plain sentence. */
  fact: string;
};

export const ROOM_OBJECTIVES: readonly RoomObjective[] = [
  {
    id: 'lights',
    label: 'Flip the kitchen light switch',
    where: 'Wall switch beside the switchboard',
    fact: 'Lights run on their own circuit, protected by a 10 A device at the board.',
  },
  {
    id: 'dimmer',
    label: 'Turn up the lounge dimmer',
    where: 'Next to the board, or on the lounge wall',
    fact: 'LED lamps need a matched dimmer, or they flicker and buzz.',
  },
  {
    id: 'isolator',
    label: 'Isolate the cooktop',
    where: 'Splashback switch, right of the cooktop',
    fact: 'A fixed cooktop has its own isolating switch so it can be safely disconnected.',
  },
  {
    id: 'board',
    label: 'Open the switchboard',
    where: 'White enclosure on the wall between the rooms',
    fact: 'Each circuit has its own labelled RCBO: overload and 30 mA safety switch in one.',
  },
  {
    id: 'rcdTest',
    label: 'Press an RCD test button',
    where: 'Open the board, then press TEST on a live circuit',
    fact: 'Test your safety switches every three months. Each one should trip straight away.',
  },
  {
    id: 'wiring',
    label: 'Look inside the walls',
    where: 'Use the Show wiring button',
    fact: 'TPS cable runs through the wall frame to every switch, light and power point.',
  },
];

export type ObjectiveSignals = {
  play: Pick<RoomPlayState, 'lightSwitchOn' | 'loungeDimmer' | 'isolatorOn'>;
  coverOpen: boolean;
  tripReason: TripReason;
  wiringView: boolean;
};

/** Objectives the current state demonstrates. Callers latch these; nothing un-completes. */
export function objectivesShown(signals: ObjectiveSignals): ObjectiveId[] {
  const shown: ObjectiveId[] = [];
  if (signals.play.lightSwitchOn !== INITIAL_ROOM_PLAY.lightSwitchOn) shown.push('lights');
  if (signals.play.loungeDimmer > 0) shown.push('dimmer');
  if (!signals.play.isolatorOn) shown.push('isolator');
  if (signals.coverOpen) shown.push('board');
  if (signals.tripReason === 'test') shown.push('rcdTest');
  if (signals.wiringView) shown.push('wiring');
  return shown;
}
