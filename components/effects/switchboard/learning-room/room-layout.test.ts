import { describe, expect, it } from 'vitest';
import {
  FIXTURES,
  KITCHEN,
  PLAYER,
  PLAYER_SPAWN,
  ROOM,
  atBoard,
  nearBoard,
  resolveOpenDoors,
  resolvePlayerPosition,
} from './room-layout';

describe('resolvePlayerPosition', () => {
  it('keeps the player inside the room', () => {
    const out = resolvePlayerPosition(-2, -2);
    expect(out.x).toBeGreaterThan(0.2);
    expect(out.z).toBeGreaterThan(0.2);
    expect(out.x).toBeLessThan(ROOM.width);
    expect(out.z).toBeLessThan(ROOM.depth);
  });

  it('cannot walk through the kitchen bench', () => {
    const out = resolvePlayerPosition(2.2, 0.1);
    expect(out.z).toBeGreaterThanOrEqual(KITCHEN.benchDepth + PLAYER.radius * 0.35 - 1e-6);
  });

  it('cannot walk through the fridge carcass', () => {
    const out = resolvePlayerPosition(FIXTURES.fridge.x, 0.05);
    expect(out.z).toBeGreaterThanOrEqual(FIXTURES.fridge.z + 0.4 + PLAYER.radius - 1e-6);
  });

  it('cannot walk into the switchboard', () => {
    const out = resolvePlayerPosition(0.02, 5.35);
    expect(out.x).toBeGreaterThan(0.1);
  });
});

describe('resolveOpenDoors', () => {
  it('pushes the player off a dropped dishwasher door', () => {
    const out = resolveOpenDoors(FIXTURES.dishwasher.x, 0.7, { dishwasher: true });
    expect(out.z).toBe(1.28);
  });

  it('pushes the player off open fridge doors', () => {
    const out = resolveOpenDoors(FIXTURES.fridge.x, 0.6, { fridge: true });
    expect(out.z).toBe(1.18);
  });

  it('does nothing when doors are closed', () => {
    const out = resolveOpenDoors(FIXTURES.dishwasher.x, 0.7, {});
    expect(out.z).toBe(0.7);
  });
});

describe('board proximity', () => {
  it('treats the spawn as away from the board', () => {
    expect(nearBoard(PLAYER_SPAWN.x, PLAYER_SPAWN.z)).toBe(false);
    expect(atBoard(PLAYER_SPAWN.x, PLAYER_SPAWN.z)).toBe(false);
  });

  it('detects standing in front of the enclosure', () => {
    expect(nearBoard(0.5, 5.35)).toBe(true);
    expect(atBoard(0.5, 5.35)).toBe(true);
  });

  it('does not treat the lounge dimmer as the board', () => {
    expect(nearBoard(FIXTURES.loungeDimmerA.x, FIXTURES.loungeDimmerA.z)).toBe(false);
  });
});
