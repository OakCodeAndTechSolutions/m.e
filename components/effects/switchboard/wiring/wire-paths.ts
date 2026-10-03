import {
  BOARD,
  CIRCUITS,
  ROOM_CIRCUIT_IDS,
  earthBarScrew,
  mainSwitchX,
  moduleBottomNeutralTerminal,
  moduleBottomTerminal,
  moduleNeutralTerminal,
  moduleTopTerminal,
  neutralBarScrew,
  rcboX,
  type Vec3,
} from '../circuit-data';

/** Wiring plane behind the RCBO bodies — never clip through modules. */
function behindModules(): number {
  return -0.25;
}

/** Clearance under module bottoms before any lateral sweep. */
function belowModules(): number {
  return BOARD.railY - BOARD.moduleHeight * 0.58 - 0.12;
}

/** Per-circuit floor gland — one neat row on the gland plate. */
export function circuitExitGland(i: number): Vec3 {
  return [rcboX(i), -BOARD.height / 2 + 0.06, BOARD.glandPlateZ];
}

function sway(i: number, amp = 0.05): number {
  return Math.sin(i * 1.7 + 0.4) * amp;
}

export type WirePaths = {
  tpsSheath: Vec3[];
  /** Where the mains sheath ends and the cores peel. */
  tpsStrip: Vec3;
  tpsActiveCore: Vec3[];
  neutralIn: Vec3[];
  earthIn: Vec3[];
  enclosureBond: Vec3[];
  mainToComb: Vec3[];
  barToNeutComb: Vec3[];
  outgoingActive: Vec3[][];
  outgoingNeutral: Vec3[][];
  outgoingEarth: Vec3[][];
  outgoingTps: Vec3[][];
};

/** Pure layout: all loom routes for the board. */
export function buildWirePaths(): WirePaths {
  const mainX = mainSwitchX();
  const mainTop = moduleTopTerminal(mainX);
  const mainBot = moduleBottomTerminal(mainX);
  const firstTop = moduleTopTerminal(rcboX(0));
  const firstN = moduleNeutralTerminal(rcboX(0));
  const back = behindModules();
  const under = belowModules();

  const combFeed: Vec3 = [firstTop[0], firstTop[1] + 0.075, firstTop[2]];
  const neutCombFeed: Vec3 = [firstN[0], firstN[1] + 0.058, firstN[2]];

  // --- Incoming mains: ONE TPS through the top-left gland, dressed down the back wall ---
  const gland = BOARD.mainsKnockout;
  const outside: Vec3 = [gland[0] - 0.1, gland[1] + 0.32, gland[2] - 0.12];
  // Sheath stops just under the gland; cores peel and run flat on the back plane.
  const strip: Vec3 = [gland[0] + 0.06, gland[1] - 0.26, back];

  const tpsSheath: Vec3[] = [
    outside,
    [gland[0] - 0.03, gland[1] + 0.1, gland[2] - 0.02],
    gland,
    [gland[0] + 0.03, gland[1] - 0.14, back + 0.01],
    strip,
  ];

  const neutScrew0 = neutralBarScrew(0);
  const earthScrew0 = earthBarScrew(0);
  const runY = BOARD.barY + 0.17; // horizontal dressing line just above both bars
  const leftWallX = mainX - 0.11; // clear of the neutral bar end cap

  // Active: down the left inner wall, then into the MAIN top terminal
  const tpsActiveCore: Vec3[] = [
    strip,
    [leftWallX, strip[1] - 0.12, back],
    [leftWallX, mainTop[1] + 0.3, back],
    [mainTop[0] - 0.03, mainTop[1] + 0.14, mainTop[2] - 0.05],
    [mainTop[0], mainTop[1] + 0.05, mainTop[2]],
    mainTop,
  ];

  // Neutral: short drop straight onto the first neutral-bar screw
  const neutralIn: Vec3[] = [
    strip,
    [strip[0] + 0.03, strip[1] - 0.1, back],
    [neutScrew0[0], BOARD.barY + 0.1, back],
    [neutScrew0[0], BOARD.barY + 0.03, BOARD.barZ + 0.02],
    neutScrew0,
  ];

  // Earth: along the dressing line across the back, then down onto the earth bar
  const earthIn: Vec3[] = [
    strip,
    [strip[0] + 0.08, runY, back],
    [earthScrew0[0] - 0.12, runY, back],
    [earthScrew0[0], BOARD.barY + 0.1, back],
    [earthScrew0[0], BOARD.barY + 0.03, BOARD.barZ + 0.02],
    earthScrew0,
  ];

  // Enclosure bond: earth bar → right inner wall stud
  const bondX = BOARD.width / 2 - 0.16;
  const enclosureBond: Vec3[] = [
    earthBarScrew(1),
    [earthBarScrew(1)[0], BOARD.barY + 0.1, back],
    [bondX - 0.05, BOARD.barY + 0.12, back],
    [bondX, BOARD.barY - 0.02, back],
    [bondX, BOARD.barY - 0.25, -BOARD.depth / 2 + 0.04],
  ];

  // Main load → comb: drop below, behind, then up into feed — clear of RCBO bodies
  const mainToComb: Vec3[] = [
    mainBot,
    [mainBot[0], mainBot[1] - 0.06, mainBot[2]],
    [mainBot[0], under, back],
    [mainX - 0.08, under, back],
    [combFeed[0] - 0.06, under + 0.1, back],
    [combFeed[0] - 0.04, combFeed[1] - 0.05, back + 0.08],
    [combFeed[0] - 0.02, combFeed[1], combFeed[2]],
    combFeed,
  ];

  const barToNeutComb: Vec3[] = [
    neutralBarScrew(2),
    [neutralBarScrew(2)[0], BOARD.barY - 0.12, back],
    [neutCombFeed[0], neutCombFeed[1] + 0.2, back],
    [neutCombFeed[0], neutCombFeed[1] + 0.06, neutCombFeed[2] - 0.04],
    neutCombFeed,
  ];

  const outgoingActive: Vec3[][] = [];
  const outgoingNeutral: Vec3[][] = [];
  const outgoingEarth: Vec3[][] = [];
  const outgoingTps: Vec3[][] = [];

  // Earth loom: bar → horizontal bundle → right-hand trunk → base bundle → each gland.
  const usedCircuits = CIRCUITS.filter((c) => ROOM_CIRCUIT_IDS.has(c.id));
  const trunkX = rcboX(CIRCUITS.length - 1) + 0.16;
  const loomTopY = BOARD.barY - 0.16;
  const loomBaseY = under - 0.02;

  for (const c of CIRCUITS) {
    const i = c.index;
    const x = rcboX(i);
    const bot = moduleBottomTerminal(x);
    const nBot = moduleBottomNeutralTerminal(x);
    const exit = circuitExitGland(i);
    const gz = BOARD.glandPlateZ;
    const s = sway(i, 0.012);

    // Join directly above THIS pole's gland — same X, same Z
    const join: Vec3 = [x, under - 0.08, gz];
    const mouthA: Vec3 = [join[0] + 0.008, join[1] + 0.04, join[2] + 0.006];
    const mouthN: Vec3 = [join[0] - 0.008, join[1] + 0.038, join[2] - 0.005];
    const mouthE: Vec3 = [join[0] + 0.002, join[1] + 0.036, join[2] + 0.008];

    const used = ROOM_CIRCUIT_IDS.has(c.id);

    if (used) {
      outgoingActive.push([
        bot,
        [bot[0], bot[1] - 0.05, bot[2]],
        [bot[0] + s, under + 0.03, Math.min(bot[2] - 0.04, gz + 0.05)],
        [x, under, gz],
        [x, join[1] + 0.05, gz],
        mouthA,
        join,
      ]);

      outgoingNeutral.push([
        nBot,
        [nBot[0], nBot[1] - 0.05, nBot[2]],
        [nBot[0] - s, under + 0.02, Math.min(nBot[2] - 0.04, gz + 0.05)],
        [x - 0.005, under - 0.02, gz],
        [x, join[1] + 0.045, gz],
        mouthN,
        join,
      ]);

      const screw = earthBarScrew(i + 2);
      const [sx, sy, sz] = screw;
      // Stagger each tail a little so the bundle reads as several cores, not one tube
      const k = usedCircuits.findIndex((u) => u.id === c.id);
      const lane = (k - (usedCircuits.length - 1) / 2) * 0.014;
      outgoingEarth.push([
        screw,
        [sx, sy - 0.06, sz + 0.06],
        [sx, loomTopY - lane, back],
        [trunkX - 0.06, loomTopY - lane, back],
        [trunkX + lane * 0.5, loomTopY - 0.1, back],
        [trunkX + lane * 0.5, loomBaseY + 0.1, back],
        [trunkX - 0.06, loomBaseY + lane, back],
        [x + 0.05, loomBaseY + lane, back],
        [x, loomBaseY - 0.01, back + 0.16],
        [x, join[1] + 0.04, gz],
        mouthE,
        join,
      ]);

      outgoingTps.push([
        [x, join[1] - 0.01, gz],
        [x, exit[1] + 0.16, gz],
        exit,
        [x, exit[1] - 0.04, gz],
      ]);
    } else {
      outgoingActive.push([]);
      outgoingNeutral.push([]);
      outgoingEarth.push([]);
      outgoingTps.push([]);
    }
  }

  return {
    tpsSheath,
    tpsStrip: strip,
    tpsActiveCore,
    neutralIn,
    earthIn,
    enclosureBond,
    mainToComb,
    barToNeutComb,
    outgoingActive,
    outgoingNeutral,
    outgoingEarth,
    outgoingTps,
  };
}
