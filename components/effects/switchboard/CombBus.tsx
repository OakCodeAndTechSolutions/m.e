'use client';

import { RoundedBox } from '@react-three/drei';
import { CIRCUITS, moduleNeutralTerminal, moduleTopTerminal, rcboX } from './circuit-data';
import { MM } from './din';
import type { SwitchboardMaterials } from './materials';
import { COMB_FEED } from './wiring/wire-paths';

/** Insulated two-pole comb with enclosed metal and shrouded pin roots. */
export function CombBus({ materials }: { materials: SwitchboardMaterials }) {
  const start = rcboX(0) - 9.6 * MM;
  const end = rcboX(CIRCUITS.length - 1) + 9.6 * MM;
  const [, terminalY, z] = moduleTopTerminal(rcboX(0));
  const mid = (start + end) / 2;
  const y = terminalY + 5.5 * MM;
  const w = end - start;

  return (
    <group>
      <RoundedBox
        args={[w, 5.7 * MM, 6.6 * MM]}
        radius={0.72 * MM}
        smoothness={2}
        position={[mid, y, z]}
        material={materials.enclosure}
      />
      <mesh position={[mid, y + 0.85 * MM, z + 3.35 * MM]} material={materials.busCover}>
        <boxGeometry args={[w - 5 * MM, 2.1 * MM, 0.16 * MM]} />
      </mesh>
      {[start, end].map((x) => (
        <RoundedBox
          key={x}
          args={[3.2 * MM, 6.3 * MM, 7.15 * MM]}
          radius={0.45 * MM}
          smoothness={2}
          position={[x, y, z]}
          material={materials.plasticYellow}
        />
      ))}
      {CIRCUITS.flatMap((c) => [
        moduleTopTerminal(rcboX(c.index)),
        moduleNeutralTerminal(rcboX(c.index)),
      ]).map(([x, mouthY, mouthZ]) => (
        <group key={x}>
          <mesh position={[x, mouthY + 1.38 * MM, mouthZ]} material={materials.enclosure}>
            <boxGeometry args={[2.9 * MM, 3.1 * MM, 3.55 * MM]} />
          </mesh>
          <mesh position={[x, mouthY - 1.1 * MM, mouthZ]} material={materials.copper}>
            <boxGeometry args={[1.8 * MM, 2.7 * MM, 1 * MM]} />
          </mesh>
        </group>
      ))}
      {Object.entries(COMB_FEED).map(([id, port]) => (
        <group key={id} position={port}>
          <RoundedBox
            args={[7.4 * MM, 5.9 * MM, 6.8 * MM]}
            radius={0.65 * MM}
            smoothness={2}
            position={[0, -0.7 * MM, -2.35 * MM]}
            material={materials.enclosure}
          />
          <mesh position={[0, 2.45 * MM, -1.75 * MM]} material={materials.screw}>
            <cylinderGeometry args={[1.55 * MM, 1.55 * MM, 0.85 * MM, 18]} />
          </mesh>
          <mesh position={[0, 2.91 * MM, -1.75 * MM]} material={materials.plasticDark}>
            <boxGeometry args={[2.4 * MM, 0.09 * MM, 0.4 * MM]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
