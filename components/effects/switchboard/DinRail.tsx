'use client';

import { BOARD, CIRCUITS } from './circuit-data';
import { MM } from './din';
import type { SwitchboardMaterials } from './materials';

type Props = {
  materials: SwitchboardMaterials;
};

/** EN 60715 top-hat rail: 35 mm wide, 7.5 mm deep, with mounting slots. */
const RAIL_HALF = 17.5 * MM;
const HAT_HALF = 12.5 * MM;
const RAIL_DEPTH = 7.5 * MM;
const STEEL = 1 * MM;

/** Rail under the device row, with a clamp-type end stop at each end. */
export function DinRail({ materials }: Props) {
  const length = (CIRCUITS.length + 1) * BOARD.rcboWidth + 0.14;
  // Device rear faces sit on the rail's front web.
  const front = BOARD.railZ + 0.03;
  const back = front - RAIL_DEPTH;
  const slots = Math.floor(length / (25 * MM));

  return (
    <group position={[0, BOARD.railY, 0]}>
      <mesh position={[0, 0, front - STEEL / 2]} material={materials.dinRail} castShadow>
        <boxGeometry args={[length, HAT_HALF * 2, STEEL]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[0, side * (HAT_HALF - STEEL / 2), (front + back) / 2]}
            material={materials.dinRail}
          >
            <boxGeometry args={[length, STEEL, RAIL_DEPTH]} />
          </mesh>
          <mesh
            position={[0, side * (HAT_HALF + RAIL_HALF) * 0.5, back + STEEL / 2]}
            material={materials.dinRail}
          >
            <boxGeometry args={[length, RAIL_HALF - HAT_HALF, STEEL]} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: slots }, (_, i) => (
        <mesh
          key={i}
          position={[-length / 2 + (i + 0.5) * 25 * MM, 0, front + 0.05 * MM]}
          raycast={() => null}
        >
          <boxGeometry args={[15 * MM, 5.2 * MM, 0.2 * MM]} />
          <meshStandardMaterial color="#4a4d52" roughness={0.7} metalness={0.4} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <group key={`stop${side}`} position={[side * (length / 2 - 6 * MM), 0, front + 12 * MM]}>
          <mesh material={materials.plasticGrey} castShadow>
            <boxGeometry args={[9 * MM, 44 * MM, 26 * MM]} />
          </mesh>
          <mesh
            position={[0, 14 * MM, 13.1 * MM]}
            rotation={[Math.PI / 2, 0, 0]}
            material={materials.screw}
          >
            <cylinderGeometry args={[2.4 * MM, 2.4 * MM, 1 * MM, 14]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
