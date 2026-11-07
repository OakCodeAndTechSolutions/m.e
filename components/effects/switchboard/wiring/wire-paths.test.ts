import { describe, expect, it } from 'vitest';
import {
  BOARD,
  CIRCUITS,
  ROOM_CIRCUIT_IDS,
  earthBarTerminal,
  mainTerminal,
  moduleBottomNeutralTerminal,
  moduleBottomTerminal,
  neutralBarTerminal,
  rcboX,
  type Vec3,
} from '../circuit-data';
import { MM } from '../din';
import { boardCableEntry } from './board-cables';
import { buildWirePaths } from './wire-paths';

describe('dressed switchboard conductors', () => {
  const { source, circuits, links } = buildWirePaths();

  it('keeps the incoming neutral and earth on separate bars and active on the isolator', () => {
    const [active, neutral, earth] = source.cores;
    const [x, y, z] = mainTerminal(1);
    expect(active?.points.at(-1)).toEqual([x, y - 2.5 * MM, z]);
    expect(neutral?.points.at(-1)).toEqual(neutralBarTerminal(0));
    expect(earth?.points.at(-1)).toEqual(earthBarTerminal(0));
  });

  it('peels each jacket above the rail and terminates both load conductors at its own RCBO', () => {
    expect(new Set(circuits.map((c) => c.circuitId))).toEqual(ROOM_CIRCUIT_IDS);
    for (const [i, { circuitId, jacket, cores }] of circuits.entries()) {
      const [x, y, z] = boardCableEntry(circuitId);
      expect(jacket[0]).toEqual([x, y - 0.001, z]);
      expect(jacket.at(-1)?.[1]).toBeGreaterThan(BOARD.barY);
      expect(new Set(cores.map(({ points }) => points[0]![0])).size).toBe(3);

      const pole = CIRCUITS.find((c) => c.id === circuitId)!;
      const checkLoad = ([px, py, pz]: Vec3) => [px, py + 2.5 * MM, pz];
      const deviceX = rcboX(pole.index);
      expect(cores[0]?.points.at(-1)).toEqual(checkLoad(moduleBottomTerminal(deviceX)));
      expect(cores[1]?.points.at(-1)).toEqual(checkLoad(moduleBottomNeutralTerminal(deviceX)));
      expect(cores[2]?.points.at(-1)).toEqual(earthBarTerminal(i + 1));
    }
  });

  it('keeps jacket entries in device order and both load cores behind the rail', () => {
    let lastX = source.jacket[0]![0];
    for (const { jacket, cores } of circuits) {
      expect(jacket[0]![0]).toBeGreaterThan(lastX);
      lastX = jacket[0]![0];
      for (const core of cores.filter(({ kind }) => kind !== 'earth')) {
        expect(core.points[2]![2]).toBeLessThan(BOARD.railZ);
        expect(core.points[3]![2]).toBe(core.points[2]![2]);
      }
    }
  });

  it('dresses all interior runs within the steel tub', () => {
    const looms = [source, ...circuits];
    const points = [
      ...looms.flatMap((loom) => [...loom.jacket, ...loom.cores.flatMap((core) => core.points)]),
      ...links.flatMap((core) => core.points),
    ];
    for (const [x, y, z] of points) {
      expect(Math.abs(x)).toBeLessThan(BOARD.width / 2 - 2.5 * MM);
      expect(Math.abs(y)).toBeLessThan(BOARD.height / 2);
      expect(z).toBeGreaterThan(-BOARD.depth / 2 + 2.5 * MM);
      expect(z).toBeLessThan(BOARD.frontZ);
    }
  });
});
