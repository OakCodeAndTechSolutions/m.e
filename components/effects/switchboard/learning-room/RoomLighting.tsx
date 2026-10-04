'use client';

import { Environment, Lightformer } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Object3D, type RectAreaLight } from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { ROOM } from './room-layout';

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
function RoomReflections() {
  return (
    <Environment resolution={128} environmentIntensity={0.55}>
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

/**
 * Daylight interior lighting. The room is lit the way a real one is: diffuse sky light
 * through the window (an area light filling the glazing), a soft-edged sun patch that
 * only enters through the glass (walls and ceiling cast), and warm bounce — a fill
 * from the timber floor plus light returned onto the window wall by the lit room.
 */
export function RoomLighting() {
  const sunTarget = useMemo(() => new Object3D(), []);
  const windowLight = useRef<RectAreaLight>(null);
  const roomBounce = useRef<RectAreaLight>(null);

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
      <color attach="background" args={['#cfd6da']} />
      <fog attach="fog" args={['#cfd6da', 18, 42]} />

      {/* Bounce: neutral from above, warm from the timber floor. */}
      <hemisphereLight args={['#f1e8dc', '#8c7258', 0.38]} />

      <primitive object={sunTarget} position={ROOM_CENTRE} />
      <directionalLight
        position={sunPosition}
        target={sunTarget}
        intensity={3.4}
        color="#fff0d8"
        castShadow
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
        intensity={6}
        color="#fff5e8"
      />
      {/* Light the sunlit room returns to the window wall, which faces away from the sky. */}
      <rectAreaLight
        ref={roomBounce}
        position={[ROOM.width - 3.2, 1.2, ROOM.depth / 2]}
        width={ROOM.depth - 0.4}
        height={2}
        intensity={1.6}
        color="#f4e6d2"
      />

      <RoomReflections />
    </>
  );
}
