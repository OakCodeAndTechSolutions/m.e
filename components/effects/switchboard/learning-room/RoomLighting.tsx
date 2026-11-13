'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Object3D, type RectAreaLight } from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { useSwitchboard } from '../SwitchboardContext';
import { BOARD_MOUNT, FIXTURES, ROOM } from './room-layout';
import type { RoomLightMode } from './room-lighting';

RectAreaLightUniformsLib.init();

/** Glazing in the far wall (see FinishedInterior): x = room width, z 1.32–5.48, y 0.72–2.34. */
const WINDOW = { z: 3.4, y: 1.53, width: 4.16, height: 1.62 } as const;
const ROOM_CENTRE: [number, number, number] = [ROOM.width / 2, 0.6, ROOM.depth / 2];
/** Late-morning sun from the window side, high enough that it lands on the floor. */
const SUN_DIRECTION = [0.78, 0.58, 0.16] as const;

/**
 * Neutral reflection environment built from light panels: a bright window on the +X
 * side and a soft ceiling. It replaces an interior HDR whose coloured windows tinted
 * every glossy surface, and needs no download.
 */
function RoomReflections({ intensity }: { intensity: number }) {
  return (
    <Environment resolution={128} environmentIntensity={intensity}>
      <color attach="background" args={['#d9d4cc']} />
      <Lightformer
        form="rect"
        intensity={3}
        color="#fffaf2"
        position={[6, 0.6, 0]}
        rotation-y={-Math.PI / 2}
        scale={[6, 2.4, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.2}
        color="#fff6ea"
        position={[0, 5, 0]}
        rotation-x={Math.PI / 2}
        scale={[8, 8, 1]}
      />
      <Lightformer
        form="rect"
        intensity={0.5}
        color="#e8dccb"
        position={[-6, 0.5, 0]}
        rotation-y={Math.PI / 2}
        scale={[6, 2.4, 1]}
      />
    </Environment>
  );
}

type Point = [number, number, number];

const BOARD_TARGET: Point = [0, BOARD_MOUNT.y, BOARD_MOUNT.z];
const BOARD_GUIDE: Point = [1.14, 1.94, BOARD_MOUNT.z + 0.16];
const KITCHEN_TARGET: Point = [
  FIXTURES.lightSwitch.x,
  FIXTURES.lightSwitch.y,
  FIXTURES.lightSwitch.z,
];
const LOUNGE_TARGET: Point = [
  FIXTURES.loungeDimmerA.x,
  FIXTURES.loungeDimmerA.y,
  FIXTURES.loungeDimmerA.z,
];

function LocatorLight({
  from,
  at,
  intensity,
  angle = 0.28,
}: {
  from: Point;
  at: Point;
  intensity: number;
  angle?: number;
}) {
  const target = useMemo(() => new Object3D(), []);
  return (
    <>
      <primitive object={target} position={at} />
      <spotLight
        position={from}
        target={target}
        angle={angle}
        penumbra={0.98}
        decay={2}
        distance={2.5}
        intensity={intensity}
        color="#f6d7a6"
      />
    </>
  );
}

/** The poster view uses daylight. The walkthrough uses dusk so switched light is visible. */
export function RoomLighting({
  mode,
  guideKitchen,
  guideLounge,
}: {
  mode: RoomLightMode;
  guideKitchen: boolean;
  guideLounge: boolean;
}) {
  const sunTarget = useMemo(() => new Object3D(), []);
  const windowLight = useRef<RectAreaLight>(null);
  const roomBounce = useRef<RectAreaLight>(null);
  const { coverOpen } = useSwitchboard();
  const preview = mode === 'preview';
  const lit = mode === 'lit';
  const sky = preview ? '#cfd6da' : '#101c2b';
  const switchTarget =
    !coverOpen && mode === 'switches'
      ? guideKitchen
        ? KITCHEN_TARGET
        : guideLounge
          ? LOUNGE_TARGET
          : null
      : null;
  const guideFrom: Point = switchTarget
    ? [0.51, switchTarget[1] + 0.16, switchTarget[2]]
    : BOARD_GUIDE;
  const guideIntensity = preview
    ? 0
    : mode === 'board'
      ? 8.2
      : coverOpen
        ? 6.5
        : switchTarget
          ? 0.92
          : 1.15;

  useLayoutEffect(() => {
    windowLight.current?.lookAt(ROOM_CENTRE[0], WINDOW.y - 0.2, WINDOW.z);
    roomBounce.current?.lookAt(ROOM.width, 1.3, ROOM.depth / 2);
  }, []);

  const sunPosition = useMemo<[number, number, number]>(
    () => [
      ROOM_CENTRE[0] + SUN_DIRECTION[0] * 9,
      ROOM_CENTRE[1] + SUN_DIRECTION[1] * 9,
      ROOM_CENTRE[2] + SUN_DIRECTION[2] * 9,
    ],
    []
  );

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 18, 42]} />

      {/* Bounce: neutral from above, warm from the timber floor. */}
      <hemisphereLight
        args={[preview ? '#f1e8dc' : '#b2c9ed', '#8c7258', preview ? 0.38 : lit ? 0.3 : 0.076]}
      />

      <primitive object={sunTarget} position={ROOM_CENTRE} />
      <directionalLight
        position={sunPosition}
        target={sunTarget}
        intensity={preview ? 3.4 : 0}
        color="#fff0d8"
        castShadow={preview}
        shadow-mapSize={[2048, 2048]}
        shadow-radius={6}
        shadow-camera-near={2}
        shadow-camera-far={20}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
      />

      <rectAreaLight
        ref={windowLight}
        position={[ROOM.width - 0.04, WINDOW.y, WINDOW.z]}
        width={WINDOW.width}
        height={WINDOW.height}
        intensity={preview ? 6 : lit ? 0.54 : 0.135}
        color={preview ? '#fff5e8' : '#9fbce9'}
      />
      {/* Light the sunlit room returns to the window wall, which faces away from the sky. */}
      <rectAreaLight
        ref={roomBounce}
        position={[ROOM.width - 3.2, 1.2, ROOM.depth / 2]}
        width={ROOM.depth - 0.4}
        height={2}
        intensity={preview ? 1.6 : lit ? 0.27 : 0}
        color="#f4e6d2"
      />

      <LocatorLight
        from={guideFrom}
        at={switchTarget ?? BOARD_TARGET}
        intensity={guideIntensity}
        angle={switchTarget ? 0.28 : 0.32}
      />
      <RoomReflections intensity={preview ? 0.55 : lit ? 0.26 : 0.048} />
    </>
  );
}
