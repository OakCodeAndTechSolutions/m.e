'use client';

import { useMemo } from 'react';
import type { Mesh } from 'three';
import type { Vec3 } from '../circuit-data';
import { HOUSE_GLB } from './room-assets';
import { useKeptGltf } from './useKeptGltf';

/** Blender exports already use the scene's scale and placement origin. */
export function HouseModel({
  asset,
  at,
  yaw = 0,
  scale = 1,
  castShadow = true,
}: {
  asset: keyof typeof HOUSE_GLB;
  at: Vec3;
  yaw?: number;
  scale?: number;
  castShadow?: boolean;
}) {
  const { scene } = useKeptGltf(HOUSE_GLB[asset]);
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((part) => {
      const mesh = part as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.raycast = () => null;
    });
    return copy;
  }, [scene, castShadow]);
  return (
    <group position={at} rotation-y={yaw} scale={scale}>
      <primitive object={model} dispose={null} />
    </group>
  );
}
