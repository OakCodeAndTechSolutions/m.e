import { describe, expect, it } from 'vitest';
import { INITIAL_ROOM_PLAY } from './room-play';
import { ROOM_OBJECTIVES, objectivesShown, type ObjectiveSignals } from './room-objectives';

const idle: ObjectiveSignals = {
  play: INITIAL_ROOM_PLAY,
  coverOpen: false,
  tripReason: null,
  wiringView: false,
};

describe('objectivesShown', () => {
  it('starts with nothing done', () => {
    expect(objectivesShown(idle)).toEqual([]);
  });

  it('counts a light switch flip away from the starting state', () => {
    const off = { ...idle, play: { ...INITIAL_ROOM_PLAY, lightSwitchOn: false } };
    expect(objectivesShown(off)).toEqual(['lights']);
  });

  it('only counts a deliberate RCD test, not a shock trip', () => {
    expect(objectivesShown({ ...idle, tripReason: 'shock' })).toEqual([]);
    expect(objectivesShown({ ...idle, tripReason: 'test' })).toEqual(['rcdTest']);
  });

  it('reports every objective when the whole tour is shown at once', () => {
    const all = objectivesShown({
      play: { ...INITIAL_ROOM_PLAY, lightSwitchOn: false, loungeDimmer: 0.35, isolatorOn: false },
      coverOpen: true,
      tripReason: 'test',
      wiringView: true,
    });
    expect(new Set(all)).toEqual(new Set(ROOM_OBJECTIVES.map((o) => o.id)));
  });
});
