'use client';

import { RoundedBox } from '@react-three/drei';

type Props = {
  position: [number, number, number];
  /** Y rotation so the fitting faces into the room. */
  rotationY: number;
  /** 0 = off, 1 = full. */
  level: number;
};

const BODY_R = 0.034;
const BODY_H = 0.15;
const STANDOFF = 0.075;

/**
 * Up/down cylinder wall light: matte black body on a short arm, open at both ends so
 * it throws a beam up and down the wall. Local +Z points out of the wall.
 */
export function WallLight({ position, rotationY, level }: Props) {
  const on = level > 0.02;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[0.07, 0.1, 0.012]} radius={0.004} smoothness={3} position={[0, 0, 0.006]}>
        <meshStandardMaterial color="#1d1d1f" roughness={0.6} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0, 0, STANDOFF / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.009, STANDOFF, 12]} />
        <meshStandardMaterial color="#1d1d1f" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0, STANDOFF]} castShadow>
        <cylinderGeometry args={[BODY_R, BODY_R, BODY_H, 28, 1, true]} />
        <meshStandardMaterial color="#1d1d1f" roughness={0.55} metalness={0.35} side={2} />
      </mesh>
      {/* Lit diffusers recessed in each end. */}
      {[1, -1].map((end) => (
        <mesh
          key={end}
          position={[0, end * (BODY_H / 2 - 0.006), STANDOFF]}
          rotation={[(end * -Math.PI) / 2, 0, 0]}
        >
          <circleGeometry args={[BODY_R * 0.86, 24]} />
          <meshStandardMaterial
            color={on ? '#fff3dc' : '#b9b4aa'}
            emissive="#ffd9a3"
            emissiveIntensity={on ? 1.6 + level * 1.4 : 0}
            roughness={0.4}
          />
        </mesh>
      ))}
      {/* A broad, gentle wash from a little way out, not a hotspot on the plaster. */}
      <pointLight
        position={[0, 0, 0.55]}
        intensity={on ? 0.35 + level * 0.55 : 0}
        distance={3.4}
        decay={2}
        color="#ffe6c4"
      />
    </group>
  );
}
