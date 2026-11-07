'use client';

import { useMemo } from 'react';
import { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { ROOM_GLB } from './room-assets';
import { useKeptGltf, preloadKeptGltf } from './useKeptGltf';

preloadKeptGltf(ROOM_GLB.gpoDouble);

/** Plate material from the Sketchfab Type I GPO — generated fittings copy this. */
export function useTypeIPlateMaterial(): MeshStandardMaterial | null {
  const { scene } = useKeptGltf(ROOM_GLB.gpoDouble);
  return useMemo(() => {
    let found: MeshStandardMaterial | null = null;
    scene.traverse((obj) => {
      if (found) return;
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial;
      if (mat?.color) found = mat;
    });
    return found;
  }, [scene]);
}

export function paintPlatesFromTypeI(root: Object3D, src: MeshStandardMaterial | null) {
  if (!src) return;
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const m = mat as MeshStandardMaterial;
      if (!m?.color) continue;
      const n = (m.name || '').toLowerCase();
      if (n !== 'plate' && n !== 'rocker') continue;
      if (n === 'rocker' && m.color.r > 0.4 && m.color.g < 0.35) continue;
      m.color.copy(src.color);
      m.roughness = src.roughness;
      m.metalness = src.metalness;
      m.envMapIntensity = 1.08;
      m.needsUpdate = true;
    }
  });
}
