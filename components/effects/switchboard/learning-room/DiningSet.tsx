'use client';

import { RoundedBox } from '@react-three/drei';
import { useMemo } from 'react';
import {
  CatmullRomCurve3,
  DoubleSide,
  LatheGeometry,
  MeshStandardMaterial,
  Quaternion,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { PbrMaps } from './room-textures';
import { POLYHAVEN } from './room-assets';
import { useSizedPbr } from './room-textures';

type V3 = [number, number, number];

/** Dining table footprint matches the collision box in room-layout (6.15–7.55, 1.55–3.65). */
export const DINING = { x: 6.85, z: 2.6, topY: 0.745 } as const;

const TABLE = { w: 1.4, d: 0.82, t: 0.032 } as const;

/** Tapered round leg from `top` to `bottom`, splayed by the vector between them. */
function Leg({
  top,
  bottom,
  rTop,
  rBottom,
  material,
}: {
  top: V3;
  bottom: V3;
  rTop: number;
  rBottom: number;
  material: MeshStandardMaterial;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...top);
    const b = new Vector3(...bottom);
    const dir = a.clone().sub(b);
    const len = dir.length();
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
    return {
      position: a.add(b).multiplyScalar(0.5).toArray() as V3,
      quaternion: quat,
      length: len,
    };
  }, [top, bottom]);
  return (
    <mesh position={position} quaternion={quaternion} material={material} castShadow receiveShadow>
      <cylinderGeometry args={[rTop, rBottom, length, 16]} />
    </mesh>
  );
}

function useOak(size: [number, number], rotation = 0) {
  return useSizedPbr(POLYHAVEN.oakVeneer, size, 0.6, rotation);
}

/** Oiled oak for legs and frames; one material per part so maps can repeat per size. */
function useTimber(maps: PbrMaps, roughness: number) {
  return useMemo(
    () =>
      new MeshStandardMaterial({
        map: maps.map,
        normalMap: maps.normalMap,
        roughnessMap: maps.roughnessMap,
        color: '#e2cfb4',
        roughness,
      }),
    [maps, roughness]
  );
}

function Table() {
  const top = useOak([TABLE.w, TABLE.d]);
  const legs = useOak([0.05, 0.75], Math.PI / 2);
  const legMaterial = useTimber(legs, 0.7);
  const insetX = TABLE.w / 2 - 0.12;
  const insetZ = TABLE.d / 2 - 0.1;
  return (
    <group>
      <RoundedBox
        args={[TABLE.w, TABLE.t, TABLE.d]}
        radius={0.01}
        smoothness={4}
        position={[0, DINING.topY - TABLE.t / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          map={top.map}
          normalMap={top.normalMap}
          roughnessMap={top.roughnessMap}
          color="#e6d3b8"
          roughness={0.62}
          normalScale={[0.4, 0.4]}
        />
      </RoundedBox>
      {/* Rail under the top so the legs read as joined, not glued on. */}
      <mesh position={[0, DINING.topY - TABLE.t - 0.03, 0]} material={legMaterial} castShadow>
        <boxGeometry args={[TABLE.w - 0.3, 0.06, TABLE.d - 0.24]} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Leg
            key={`${sx}${sz}`}
            top={[sx * insetX, DINING.topY - TABLE.t, sz * insetZ]}
            bottom={[sx * (insetX + 0.035), 0, sz * (insetZ + 0.03)]}
            rTop={0.024}
            rBottom={0.015}
            material={legMaterial}
          />
        ))
      )}
    </group>
  );
}

function Chair({ facing }: { facing: 1 | -1 }) {
  const oak = useOak([0.44, 0.44]);
  const timber = useTimber(oak, 0.68);
  const seatY = 0.45;
  const legX = 0.18;
  const legZ = 0.17;
  return (
    // Local -Z faces the table.
    <group position={[0, 0, facing * 0.62]} rotation={[0, facing === 1 ? 0 : Math.PI, 0]}>
      <RoundedBox
        args={[0.44, 0.026, 0.42]}
        radius={0.008}
        smoothness={3}
        position={[0, seatY, 0]}
        material={timber}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[0.41, 0.034, 0.39]}
        radius={0.014}
        smoothness={4}
        position={[0, seatY + 0.028, -0.005]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#7d7468" roughness={0.95} />
      </RoundedBox>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Leg
            key={`${sx}${sz}`}
            top={[sx * legX, seatY - 0.013, sz * legZ]}
            bottom={[sx * (legX + 0.025), 0, sz * (legZ + 0.025)]}
            rTop={0.016}
            rBottom={0.011}
            material={timber}
          />
        ))
      )}
      {/* Rear posts rise to a curved backrest rail. */}
      {[-1, 1].map((sx) => (
        <Leg
          key={`post${sx}`}
          top={[sx * 0.17, 0.82, 0.2]}
          bottom={[sx * legX, seatY, legZ]}
          rTop={0.011}
          rBottom={0.014}
          material={timber}
        />
      ))}
      <mesh position={[0, 0.77, -0.13]} castShadow material={timber}>
        <cylinderGeometry args={[0.36, 0.36, 0.08, 32, 1, true, -0.6, 1.2]} />
      </mesh>
    </group>
  );
}

/** Matte ceramic vase with a few dried branches — a quiet centrepiece. */
function Centrepiece() {
  const vase = useMemo(() => {
    const profile = [
      [0, 0],
      [0.05, 0],
      [0.062, 0.03],
      [0.066, 0.1],
      [0.05, 0.17],
      [0.032, 0.2],
      [0.03, 0.235],
      [0.034, 0.245],
    ].map(([x, y]) => new Vector2(x, y));
    return new LatheGeometry(profile, 40);
  }, []);
  const stems = useMemo(
    () =>
      [
        [0.02, 0.62, 0.05, -0.06],
        [-0.03, 0.55, -0.12, 0.02],
        [0.0, 0.66, 0.1, 0.09],
        [0.03, 0.5, 0.16, -0.04],
        [-0.02, 0.6, -0.06, -0.13],
      ].map(([x, h, bx, bz]) => {
        const curve = new CatmullRomCurve3([
          new Vector3(x, 0.2, 0),
          new Vector3(x + bx * 0.3, 0.2 + h * 0.5, bz * 0.3),
          new Vector3(x + bx, 0.2 + h, bz),
        ]);
        return new TubeGeometry(curve, 16, 0.0026, 5, false);
      }),
    []
  );
  return (
    <group position={[0.28, DINING.topY, -0.06]}>
      <mesh geometry={vase} castShadow receiveShadow>
        <meshStandardMaterial color="#d9d3c7" roughness={0.88} side={DoubleSide} />
      </mesh>
      {stems.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <meshStandardMaterial color="#5b4636" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Oak dining table with two chairs, beside the window. */
export function DiningSet() {
  return (
    <group position={[DINING.x, 0, DINING.z]}>
      <Table />
      <Chair facing={1} />
      <Chair facing={-1} />
      <Centrepiece />
    </group>
  );
}
