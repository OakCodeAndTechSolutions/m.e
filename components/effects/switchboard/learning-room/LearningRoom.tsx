'use client';

import { Suspense } from 'react';
import { ROOM } from './room-layout';
import { ExposedWall } from './ExposedWall';
import { FinishedInterior } from './FinishedInterior';
import { HouseModel } from './HouseModel';

/**
 * A painted ceiling is lit almost entirely by light bounced off the floor and walls,
 * which the scene does not simulate. A small emissive term stands in for that bounce
 * so the ceiling reads as white plaster rather than a grey lid, and it lifts when the
 * downlights wash the room.
 */
function ceilingBounce(daylight: boolean, lightLevel: number) {
  return (daylight ? 0.06 : 0.003) + lightLevel * 0.08;
}

/** Floor, ceiling, the open board wall and the three finished walls. */
export function LearningRoom({ daylight, lightLevel }: { daylight: boolean; lightLevel: number }) {
  return (
    <group>
      <Suspense fallback={null}>
        <HouseModel asset="hardwood-floor" at={[0, 0, 0]} castShadow={false} />
      </Suspense>

      <mesh
        position={[ROOM.width / 2, ROOM.height, ROOM.depth / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        {/* Room-sized: any overhang acts as an eave and shades the window. */}
        <planeGeometry args={[ROOM.width + 0.2, ROOM.depth + 0.2]} />
        <meshStandardMaterial
          color="#f3efe6"
          emissive="#f6f1e7"
          emissiveIntensity={ceilingBounce(daylight, lightLevel)}
          roughness={0.95}
          metalness={0}
          envMapIntensity={0.3}
        />
      </mesh>

      <ExposedWall />
      <FinishedInterior daylight={daylight} />
    </group>
  );
}
