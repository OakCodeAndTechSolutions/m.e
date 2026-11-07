'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Matrix4, type InstancedMesh, type Mesh } from 'three';
import { BOARD, CIRCUITS, TERMINAL_X, mainSwitchX, moduleBodyZ, rcboX } from '../circuit-data';
import { BOARD_METRES_PER_UNIT, DIN, DIN_Z, MM } from '../din';
import { HOUSE_GLB } from '../learning-room/room-assets';
import { useKeptGltf } from '../learning-room/useKeptGltf';
import { useNeutralMarkTexture } from '../textures';

const MODULE_SCALE = 1 / BOARD_METRES_PER_UNIT;
const MOULD_Z = moduleBodyZ() + DIN_Z.rear;
const RCBO_X = CIRCUITS.map((c) => rcboX(c.index));
const ISOLATOR_X = [mainSwitchX()];

function MouldInstances({
  part,
  positions,
  hoveredIndex,
}: {
  part: Mesh;
  positions: number[];
  hoveredIndex: number;
}) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new Matrix4().makeScale(MODULE_SCALE, MODULE_SCALE, MODULE_SCALE);
    for (const [i, x] of positions.entries()) {
      mesh.setMatrixAt(i, matrix.setPosition(x, BOARD.railY, MOULD_Z));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [positions]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const tint = new Color();
    for (let i = 0; i < positions.length; i++) {
      mesh.setColorAt(i, i === hoveredIndex ? tint.set('#fff1db') : tint.setRGB(1, 1, 1));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [hoveredIndex, positions.length]);

  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, part.material, positions.length]}
      dispose={null}
      castShadow
      receiveShadow
      raycast={() => null}
    />
  );
}

/** The Blender mould is batched by material and instanced at the unchanged DIN pitch. */
function Moulds({
  asset,
  positions,
  hoveredIndex,
}: {
  asset: 'rcbo-body' | 'isolator-body';
  positions: number[];
  hoveredIndex: number;
}) {
  const { scene } = useKeptGltf(HOUSE_GLB[asset]);
  const parts = useMemo(() => {
    const meshes: Mesh[] = [];
    scene.traverse((node) => {
      const part = node as Mesh;
      if (part.isMesh) meshes.push(part);
    });
    return meshes;
  }, [scene]);

  return parts.map((part) => (
    <MouldInstances key={part.uuid} part={part} positions={positions} hoveredIndex={hoveredIndex} />
  ));
}

export function DeviceRow({ hovered }: { hovered: string | null }) {
  const neutralMap = useNeutralMarkTexture();
  const marks = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = marks.current;
    if (!mesh) return;
    const m = new Matrix4();
    for (const [i, x] of RCBO_X.entries()) {
      for (const [j, side] of [1, -1].entries()) {
        mesh.setMatrixAt(
          i * 2 + j,
          m.makeTranslation(
            x + TERMINAL_X.neutral,
            BOARD.railY + side * (DIN.screwY - 4.7 * MM),
            moduleBodyZ() + DIN_Z.shoulder + 0.08 * MM
          )
        );
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  return (
    <group>
      <Moulds
        asset="isolator-body"
        positions={ISOLATOR_X}
        hoveredIndex={hovered === 'main' ? 0 : -1}
      />
      <Moulds
        asset="rcbo-body"
        positions={RCBO_X}
        hoveredIndex={CIRCUITS.findIndex((c) => c.id === hovered)}
      />
      <instancedMesh
        ref={marks}
        args={[undefined, undefined, RCBO_X.length * 2]}
        raycast={() => null}
      >
        <planeGeometry args={[2.55 * MM, 2.55 * MM]} />
        <meshStandardMaterial map={neutralMap} roughness={0.6} transparent depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
