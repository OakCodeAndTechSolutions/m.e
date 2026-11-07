import {
  BAR_PORTS,
  CIRCUITS,
  ROOM_CIRCUIT_IDS,
  earthBarTerminal,
  mainTerminal,
  moduleBottomNeutralTerminal,
  moduleBottomTerminal,
  moduleNeutralTerminal,
  moduleTopTerminal,
  neutralBarTerminal,
  rcboX,
  type Vec3,
} from '../circuit-data';
import { BOARD_METRES_PER_UNIT, DIN, MM } from '../din';
import { BOARD_CABLE_ENTRIES, CABLE_SIZE, boardCableEntry, type CableKind } from './board-cables';

// Between the rear tray and the DIN rail, clear of the rail brackets at each end.
const DRESS_PLANE = -0.252;

export const COMB_FEED = {
  active: [rcboX(0) - 0.09, DIN.height / 2 + 0.074, moduleTopTerminal(rcboX(0))[2] + 0.04] as Vec3,
  neutral: [
    rcboX(0) + 0.03,
    DIN.height / 2 + 0.073,
    moduleNeutralTerminal(rcboX(0))[2] - 0.047,
  ] as Vec3,
};
export const ENCLOSURE_BOND: Vec3 = [1.07, 0.82, -0.275];

type Core = {
  kind: 'active' | 'neutral' | 'earth';
  diameter: number;
  points: Vec3[];
};

type Loom = {
  circuitId: string;
  kind: CableKind;
  jacket: Vec3[];
  cores: Core[];
};

function wire(kind: Core['kind'], diameterMm: number, points: Vec3[]): Core {
  return { kind, diameter: diameterMm * MM, points };
}

/** One flat sheath across the enclosure entry, then a short kick toward the back. */
function jacket(circuitId: string, drop: number): Vec3[] {
  const [x, y, z] = boardCableEntry(circuitId);
  return [
    [x, y - 0.001, z],
    [x, y - 0.106, z],
    [x, y - drop + 0.1, DRESS_PLANE],
    [x, y - drop, DRESS_PLANE],
  ];
}

function insideTerminal(at: Vec3, side: 1 | -1): Vec3 {
  return [at[0], at[1] - side * 2.5 * MM, at[2]];
}

/** Cores emerge side by side across the long axis of the flat jacket. */
function breakout(end: Vec3, kind: CableKind, lane: -1 | 0 | 1): Vec3 {
  return [
    end[0] + lane * (CABLE_SIZE[kind].w / BOARD_METRES_PER_UNIT) * 0.27,
    end[1] + 0.018,
    end[2],
  ];
}

function submain(): Loom {
  const sleeve = jacket('submain', 0.34);
  const cut = sleeve.at(-1)!;
  const line = mainTerminal(1);
  const neutral = neutralBarTerminal(0);
  const earth = earthBarTerminal(0);
  return {
    circuitId: 'submain',
    kind: 'submain',
    jacket: sleeve,
    cores: [
      wire('active', 6.1, [
        breakout(cut, 'submain', -1),
        [-1.105, 1.1, DRESS_PLANE],
        [-1.105, 0.79, 0.06],
        [line[0], 0.62, line[2]],
        insideTerminal(line, 1),
      ]),
      wire('neutral', 6.1, [
        breakout(cut, 'submain', 0),
        [neutral[0], 1.22, -0.04],
        [neutral[0], neutral[1], neutral[2] + 0.085],
        neutral,
      ]),
      wire('earth', 4.5, [
        breakout(cut, 'submain', 1),
        [cut[0] + 0.07, 1.24, -0.11],
        [earth[0] - 0.1, 1.205, 0.012],
        [earth[0], 1.09, 0.01],
        earth,
      ]),
    ],
  };
}

const CORE_DIAMETER = {
  light: [2.65, 2.15],
  power: [3.3, 2.65],
  cooking: [4.45, 3.1],
} as const;

function outgoing(): Loom[] {
  return CIRCUITS.filter((c) => ROOM_CIRCUIT_IDS.has(c.id)).map((c, i) => {
    const entry = BOARD_CABLE_ENTRIES.find((e) => e.circuitId === c.id);
    if (!entry || entry.kind === 'submain') throw new Error('Missing outgoing jacket for ' + c.id);
    const { kind } = entry;
    const sleeve = jacket(c.id, 0.295 + (i % 2) * 0.018);
    const cut = sleeve.at(-1)!;
    const x = rcboX(c.index);
    const [diameter, earthDiameter] = CORE_DIAMETER[kind];
    const earth = earthBarTerminal(i + 1);

    // Parallel drops behind the rail. The exposed ends sweep forward as short pairs.
    const tail = (core: 'active' | 'neutral', at: Vec3, order: -1 | 1): Core => {
      const start = breakout(cut, kind, order);
      const [tx, ty, tz] = at;
      const low = ty - 0.195 - (i % 2) * 0.023;
      return wire(core, diameter, [
        start,
        [start[0] + order * 0.01, cut[1] - 0.07, DRESS_PLANE],
        [tx, 0.78, DRESS_PLANE],
        [tx, low + 0.075, DRESS_PLANE],
        [tx, low, -0.065],
        [tx, low + 0.024, tz - 0.035],
        [tx, ty - 0.063, tz],
        insideTerminal(at, -1),
      ]);
    };

    return {
      circuitId: c.id,
      kind,
      jacket: sleeve,
      cores: [
        tail('active', moduleBottomTerminal(x), 1),
        tail('neutral', moduleBottomNeutralTerminal(x), -1),
        wire('earth', earthDiameter, [
          breakout(cut, kind, 0),
          [cut[0], cut[1] - 0.055, -0.085],
          [earth[0], 1.17 + (i % 2) * 0.016, 0.01],
          [earth[0], earth[1] + 0.025, earth[2] + 0.092],
          earth,
        ]),
      ],
    };
  });
}

/** All jacket ends, terminal points and distinct conductor runs for the cutaway. */
export function buildWirePaths() {
  const source = submain();
  const circuits = outgoing();
  const mainOut = mainTerminal(-1);
  const neutral = neutralBarTerminal(1);
  const bond = earthBarTerminal(BAR_PORTS.earth - 1);
  const activeFeed = COMB_FEED.active;
  const neutralFeed = COMB_FEED.neutral;

  return {
    source,
    circuits,
    links: [
      wire('active', 6.1, [
        insideTerminal(mainOut, -1),
        [mainOut[0], mainOut[1] - 0.125, mainOut[2]],
        [-1.17, -0.62, 0.33],
        [-1.17, 0.35, 0.33],
        [-1.1, 0.57, 0.36],
        [activeFeed[0], activeFeed[1] + 0.075, activeFeed[2] + 0.045],
        activeFeed,
      ]),
      wire('neutral', 6.1, [
        neutral,
        [neutral[0], neutral[1], neutral[2] + 0.1],
        [neutralFeed[0] + 0.14, 0.84, 0.17],
        [neutralFeed[0], 0.66, neutralFeed[2] + 0.065],
        neutralFeed,
      ]),
      wire('earth', 3.3, [
        bond,
        [bond[0], bond[1], bond[2] + 0.07],
        [1.13, 0.95, -0.095],
        ENCLOSURE_BOND,
      ]),
    ],
  };
}
