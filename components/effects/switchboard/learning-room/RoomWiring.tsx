'use client';

import { useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import type { Vec3 } from '../circuit-data';
import { PathWire } from '../wiring/PathWire';
import { FIXTURES, HEIGHTS, KITCHEN, ROOM_LOADS, worldGland } from './room-layout';

function join(...segs: Vec3[][]): Vec3[] {
  const out: Vec3[] = [];
  for (const seg of segs) {
    for (const p of seg) {
      const prev = out[out.length - 1];
      if (!prev || prev[0] !== p[0] || prev[1] !== p[1] || prev[2] !== p[2]) out.push(p);
    }
  }
  return out;
}

type Props = {
  liveById: Record<string, boolean>;
  isolatorOn: boolean;
  kitchenLightsOn: boolean;
  loungeLevel: number;
};

const OVAL = 0.36;

/** In-wall TPS: lighting on the board wall; kitchen circuits on z=0 at staggered heights. */
export function RoomWiring({ liveById, isolatorOn, kitchenLightsOn, loungeLevel }: Props) {
  const sheath = useMemo(
    () => new MeshStandardMaterial({ color: '#f3f0e8', roughness: 0.55, metalness: 0.03 }),
    []
  );

  const cx = HEIGHTS.cavityX;
  const cz = HEIGHTS.cavityZ;
  const lightingGland = worldGland(ROOM_LOADS.lighting);
  const powerGland = worldGland(ROOM_LOADS.power);
  const fridgeGland = worldGland(ROOM_LOADS.fridge);
  const ovenGland = worldGland(ROOM_LOADS.oven);
  const inductionGland = worldGland(ROOM_LOADS.induction);
  const loungePowerGland = worldGland(ROOM_LOADS.loungePower);
  const loungeLightGland = worldGland(ROOM_LOADS.loungeLight);

  const lightingLive = liveById[ROOM_LOADS.lighting] ?? false;
  const powerLive = liveById[ROOM_LOADS.power] ?? false;
  const fridgeLive = liveById[ROOM_LOADS.fridge] ?? false;
  const ovenLive = liveById[ROOM_LOADS.oven] ?? false;
  const inductionLive = liveById[ROOM_LOADS.induction] ?? false;
  const loungePowerLive = liveById[ROOM_LOADS.loungePower] ?? false;
  const loungeLightLive = liveById[ROOM_LOADS.loungeLight] ?? false;
  const hobLive = inductionLive && isolatorOn;

  const l1 = FIXTURES.wallLight1;
  const l2 = FIXTURES.wallLight2;
  const sw = FIXTURES.lightSwitch;
  const da = FIXTURES.loungeDimmerA;
  const db = FIXTURES.loungeDimmerB;
  const ls1 = FIXTURES.loungeSconce1;
  const ls2 = FIXTURES.loungeSconce2;
  const lg = FIXTURES.loungeGpo;
  const lz = HEIGHTS.loungeCavityZ;
  const underBoard = 0.9;

  /** Leave the knockout and go straight into the stud bay — no dangling room stubs. */
  const intoCavity = (gland: Vec3, y: number): Vec3[] => [
    gland,
    [cx, gland[1] - 0.006, gland[2]],
    [cx, y, gland[2]],
    [cx, y, cz],
    [0.38, y, cz],
  ];

  /** Board → switch height → switch → up the bay → wall lights over the prints. */
  const lightingSheath: Vec3[] = [
    lightingGland,
    [cx, lightingGland[1] - 0.006, lightingGland[2]],
    [cx, HEIGHTS.switch, lightingGland[2]],
    [cx, HEIGHTS.switch, sw.z],
    [cx, HEIGHTS.light, sw.z],
    [cx, HEIGHTS.light, l2.z],
    [cx, HEIGHTS.light, l1.z],
  ];

  const light1Stub: Vec3[] = [
    [cx, HEIGHTS.light, l1.z],
    [l1.x - 0.006, HEIGHTS.light, l1.z],
  ];
  const light2Stub: Vec3[] = [
    [cx, HEIGHTS.light, l2.z],
    [l2.x - 0.006, HEIGHTS.light, l2.z],
  ];

  const powerSheath = join(intoCavity(powerGland, HEIGHTS.splashGpoY), [
    [0.38, HEIGHTS.splashGpoY, cz],
    [FIXTURES.rangehood.x, HEIGHTS.splashGpoY, cz],
    [FIXTURES.gpoSingle.x, HEIGHTS.splashGpoY, cz],
    [FIXTURES.dishwasher.x, HEIGHTS.splashGpoY, cz],
    [FIXTURES.gpoDouble.x, HEIGHTS.splashGpoY, cz],
  ]);

  const hoodTee: Vec3[] = [
    [FIXTURES.rangehood.x, HEIGHTS.splashGpoY, cz],
    [FIXTURES.rangehood.x, FIXTURES.rangehood.y, cz],
  ];

  const dwDrop: Vec3[] = [
    [FIXTURES.dishwasher.x, HEIGHTS.splashGpoY, cz],
    [FIXTURES.dwGpo.x, HEIGHTS.gpo, cz],
  ];

  const inductionToIsolator = join(intoCavity(inductionGland, HEIGHTS.inductionY), [
    [0.38, HEIGHTS.inductionY, cz],
    [FIXTURES.cookIsolator.x, HEIGHTS.inductionY, cz],
  ]);

  const isolatorFeed: Vec3[] = [
    [FIXTURES.cookIsolator.x, HEIGHTS.inductionY, cz],
    [FIXTURES.cookIsolator.x, HEIGHTS.splashGpoY, cz],
    [FIXTURES.cookIsolator.x, 0.99, cz],
    [FIXTURES.cooktop.x, 0.99, cz],
    [FIXTURES.cooktop.x, KITCHEN.benchH - 0.02, cz],
  ];

  const ovenSheath = join(intoCavity(ovenGland, HEIGHTS.ovenY), [
    [0.38, HEIGHTS.ovenY, cz],
    [FIXTURES.oven.x, HEIGHTS.ovenY, cz],
  ]);

  const fridgeSheath = join(intoCavity(fridgeGland, HEIGHTS.fridgeY), [
    [0.38, HEIGHTS.fridgeY, cz],
    [FIXTURES.fridgeGpo.x, HEIGHTS.fridgeY, cz],
    [FIXTURES.fridgeGpo.x, HEIGHTS.splashGpoY, cz],
  ]);

  const tps = { sag: true, oval: OVAL, soft: false as const };

  return (
    <group>
      {/* Ceiling branches revealed with the wall installation. */}
      {[
        { z: 1.5, fromZ: FIXTURES.wallLight1.z, on: kitchenLightsOn },
        { z: 5.5, fromZ: FIXTURES.loungeDimmerA.z, on: loungeLightLive && loungeLevel > 0 },
      ].map(({ z, fromZ, on }) => (
        <PathWire
          key={z}
          points={[
            [cx, HEIGHTS.light, fromZ],
            [cx, 2.65, fromZ],
            [cx, 2.65, z],
            [2, 2.65, z],
            [4.4, 2.65, z],
          ]}
          radius={0.0075}
          material={sheath}
          live={on}
          segments={36}
          oval={OVAL}
          soft={false}
        />
      ))}
      <PathWire
        points={lightingSheath}
        radius={0.0085}
        material={sheath}
        live={lightingLive}
        segments={48}
        {...tps}
      />
      <PathWire
        points={light1Stub}
        radius={0.0075}
        material={sheath}
        live={lightingLive}
        segments={8}
        oval={OVAL}
        soft={false}
      />
      <PathWire
        points={light2Stub}
        radius={0.0075}
        material={sheath}
        live={lightingLive}
        segments={8}
        oval={OVAL}
        soft={false}
      />
      <PathWire
        points={powerSheath}
        radius={0.01}
        material={sheath}
        live={powerLive}
        segments={56}
        {...tps}
      />
      <PathWire
        points={hoodTee}
        radius={0.009}
        material={sheath}
        live={powerLive}
        segments={12}
        oval={OVAL}
        soft={false}
      />
      <PathWire
        points={dwDrop}
        radius={0.009}
        material={sheath}
        live={powerLive}
        segments={12}
        oval={OVAL}
        soft={false}
      />
      <PathWire
        points={inductionToIsolator}
        radius={0.011}
        material={sheath}
        live={inductionLive}
        segments={48}
        {...tps}
      />
      <PathWire
        points={isolatorFeed}
        radius={0.011}
        material={sheath}
        live={hobLive}
        segments={20}
        oval={OVAL}
        sag
        soft={false}
      />
      <PathWire
        points={ovenSheath}
        radius={0.01}
        material={sheath}
        live={ovenLive}
        segments={48}
        {...tps}
      />
      <PathWire
        points={fridgeSheath}
        radius={0.01}
        material={sheath}
        live={fridgeLive}
        segments={52}
        {...tps}
      />

      <PathWire
        points={[
          [cx, HEIGHTS.switch, sw.z],
          [sw.x - 0.008, HEIGHTS.switch, sw.z],
        ]}
        radius={0.0075}
        material={sheath}
        live={lightingLive}
        segments={6}
        oval={OVAL}
        soft={false}
      />

      <PathWire
        points={[
          loungeLightGland,
          [cx, loungeLightGland[1] - 0.006, loungeLightGland[2]],
          [cx, underBoard, loungeLightGland[2]],
          [cx, underBoard, da.z],
          [cx, HEIGHTS.switch, da.z],
          [cx, HEIGHTS.light, da.z],
          [cx, HEIGHTS.light, lz],
          [ls1.x, HEIGHTS.light, lz],
          [ls2.x, HEIGHTS.light, lz],
        ]}
        radius={0.0085}
        material={sheath}
        live={loungeLightLive}
        segments={56}
        {...tps}
      />
      <PathWire
        points={[
          [cx, HEIGHTS.switch, da.z],
          [da.x - 0.008, HEIGHTS.switch, da.z],
        ]}
        radius={0.0075}
        material={sheath}
        live={loungeLightLive}
        segments={6}
        oval={OVAL}
        soft={false}
      />
      <PathWire
        points={[
          [ls1.x, HEIGHTS.light, lz],
          [ls1.x, HEIGHTS.light, ls1.z + 0.006],
        ]}
        radius={0.0075}
        material={sheath}
        live={loungeLightLive}
        segments={6}
        oval={OVAL}
        soft={false}
      />
      <PathWire
        points={[
          [ls2.x, HEIGHTS.light, lz],
          [ls2.x, HEIGHTS.light, ls2.z + 0.006],
        ]}
        radius={0.0075}
        material={sheath}
        live={loungeLightLive}
        segments={6}
        oval={OVAL}
        soft={false}
      />
      <PathWire
        points={[
          [ls1.x, HEIGHTS.light, lz],
          [db.x, HEIGHTS.light, lz],
          [db.x, HEIGHTS.switch, lz],
          [db.x, HEIGHTS.switch, db.z + 0.006],
        ]}
        radius={0.0075}
        material={sheath}
        live={loungeLightLive}
        segments={16}
        oval={OVAL}
        sag
        soft={false}
      />
      <PathWire
        points={[
          loungePowerGland,
          [cx, loungePowerGland[1] - 0.006, loungePowerGland[2]],
          [cx, underBoard, loungePowerGland[2]],
          [cx, underBoard, lz],
          [0.4, underBoard, lz],
          [lg.x, underBoard, lz],
          [lg.x, lg.y, lz],
          [lg.x, lg.y, lg.z + 0.006],
        ]}
        radius={0.01}
        material={sheath}
        live={loungePowerLive}
        segments={52}
        {...tps}
      />
    </group>
  );
}
