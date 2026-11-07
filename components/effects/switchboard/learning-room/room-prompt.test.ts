import { describe, expect, it } from 'vitest';
import { INITIAL_ROOM_PLAY } from './room-play';
import { roomActionPrompt } from './room-prompt';

const live = {
  powerLive: true,
  hobLive: true,
  loungePowerLive: true,
  loungeLightLive: true,
  kitchenLightLive: true,
};

describe('contextual fitting prompts', () => {
  it('matches the state of the visible door', () => {
    expect(roomActionPrompt('fridge', INITIAL_ROOM_PLAY, live)).toEqual({
      text: 'Open fridge',
      actionable: true,
    });
    expect(roomActionPrompt('fridge', { ...INITIAL_ROOM_PLAY, fridgeOpen: true }, live).text).toBe(
      'Close fridge'
    );
  });

  it('explains a dead circuit without suggesting the appliance will start', () => {
    expect(roomActionPrompt('toaster', INITIAL_ROOM_PLAY, { ...live, powerLive: false })).toEqual({
      text: 'Kitchen power is off',
      actionable: false,
    });
  });

  it('keeps a mechanical wall switch actionable when its supply is off', () => {
    expect(roomActionPrompt('switch', INITIAL_ROOM_PLAY, { ...live, kitchenLightLive: false })).toEqual({
      text: 'Lights off · circuit off',
      actionable: true,
    });
    expect(roomActionPrompt('loungeDimmerA', INITIAL_ROOM_PLAY, { ...live, loungeLightLive: false })).toEqual({
      text: 'Lounge lights on · circuit off',
      actionable: true,
    });
  });

  it('distinguishes a socket rocker from its appliance', () => {
    const play = { ...INITIAL_ROOM_PLAY, loungeSocketOn: false };
    expect(roomActionPrompt('tvGpo', play, live).text).toBe('Power point on');
    expect(roomActionPrompt('tv', play, live).text).toBe('Switch the lounge power point on');
  });

  it('explains each lounge dimmer step', () => {
    for (const [level, label] of [
      [0, 'Lounge lights on'],
      [0.35, 'Set lounge lights to 70%'],
      [0.7, 'Set lounge lights to 100%'],
      [1, 'Lounge lights off'],
    ] as const) {
      expect(
        roomActionPrompt('loungeDimmerA', { ...INITIAL_ROOM_PLAY, loungeDimmer: level }, live).text
      ).toBe(label);
    }
  });
});
