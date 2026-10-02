'use client';

import { Suspense } from 'react';
import { POLYHAVEN } from './room-assets';
import { ROOM } from './room-layout';
import { useRepeatingPbr } from './room-textures';
import { FramedWalls } from './FramedWall';
import { FinishedInterior } from './FinishedInterior';
import { useGameInput } from './GameInputContext';

function GalleryFloor() {
  const maps = useRepeatingPbr(POLYHAVEN.laminate, [ROOM.width / 2.5, ROOM.depth / 2.5]);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[ROOM.width / 2, 0, ROOM.depth / 2]}
      receiveShadow
    >
      <planeGeometry args={[ROOM.width, ROOM.depth]} />
      <meshStandardMaterial
        map={maps.map}
        normalMap={maps.normalMap}
        roughnessMap={maps.roughnessMap}
        roughness={1}
        metalness={0.04}
      />
    </mesh>
  );
}

/**
 * A painted ceiling is lit almost entirely by light bounced off the floor and walls,
 * which the scene does not simulate. A small emissive term stands in for that bounce
 * so the ceiling reads as white plaster rather than a grey lid, and it lifts when the
 * downlights wash the room.
 */
function ceilingBounce(lightLevel: number) {
  return 0.2 + lightLevel * 0.1;
}

/** Open timber teaching frames on all four walls. */
export function LearningRoom({ lightLevel = 0 }: { lightLevel?: number }) {
  const { wiringView } = useGameInput();
  return (
    <group>
      <GalleryFloor />

      <mesh
        position={[ROOM.width / 2, ROOM.height, ROOM.depth / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.width + 4, ROOM.depth + 4]} />
        <meshStandardMaterial
          color="#f3efe6"
          emissive="#f6f1e7"
          emissiveIntensity={ceilingBounce(lightLevel)}
          roughness={0.95}
          metalness={0}
          envMapIntensity={0.3}
        />
      </mesh>

      {wiringView && (
        <Suspense fallback={null}>
          <FramedWalls />
        </Suspense>
      )}
      <FinishedInterior />
    </group>
  );
}
