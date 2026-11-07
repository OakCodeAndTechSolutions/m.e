import { describe, expect, it } from 'vitest';
import { resolveRoomLighting } from './room-lighting';

const supplied = {
  exploring: true,
  mainOn: true,
  kitchenCircuit: true,
  loungeCircuit: true,
  kitchenSwitch: true,
  loungeDimmer: 0.7,
};

describe('walkthrough lighting', () => {
  it('uses the switchboard locator if the main or both lighting breakers are off', () => {
    for (const state of [
      { ...supplied, mainOn: false },
      { ...supplied, kitchenCircuit: false, loungeCircuit: false },
    ]) {
      expect(resolveRoomLighting(state)).toEqual({
        mode: 'board',
        kitchenOn: false,
        loungeLevel: 0,
        guideKitchen: false,
        guideLounge: false,
      });
    }
  });

  it('guides to the switches that can bring the lights back without altering their positions', () => {
    const dark = { ...supplied, kitchenSwitch: false, loungeDimmer: 0 };
    expect(resolveRoomLighting(dark)).toMatchObject({
      mode: 'switches',
      guideKitchen: true,
      guideLounge: true,
    });
    expect(resolveRoomLighting({ ...dark, kitchenCircuit: false })).toMatchObject({
      mode: 'switches',
      guideKitchen: false,
      guideLounge: true,
    });
    expect(resolveRoomLighting({ ...dark, kitchenSwitch: true })).toMatchObject({
      mode: 'lit',
      kitchenOn: true,
    });
  });

  it('keeps a daylight poster view and honors each switch and dimmer independently', () => {
    expect(resolveRoomLighting({ ...supplied, exploring: false, mainOn: false }).mode).toBe(
      'preview'
    );
    expect(resolveRoomLighting({ ...supplied, kitchenCircuit: false })).toMatchObject({
      mode: 'lit',
      kitchenOn: false,
      loungeLevel: 0.7,
      guideKitchen: false,
      guideLounge: false,
    });
  });
});
