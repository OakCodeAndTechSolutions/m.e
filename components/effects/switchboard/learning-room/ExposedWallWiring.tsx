'use client';

import { useEffect, useMemo } from 'react';
import { Matrix4, MeshStandardMaterial, Vector3, type BufferGeometry, type Material } from 'three';
import { saddleGeometry, tieBandGeometry } from '../wiring/cable-geometry';
import { sampleRoute } from '../wiring/cable-route';
import { Cable, useCableMaterials } from '../wiring/Cable';
import { useGameInput } from './GameInputContext';
import {
  BOARD_TUB,
  BRANCH_Y,
  CABLE_SIZE,
  DIMMER_BOX,
  DROP_SADDLES,
  FRAME,
  LOOM_TIES,
  SWITCH_BOX,
  SWITCHED_RETURN_X,
  WALL_BOX,
  exposedCables,
  loomEntries,
  loomLanes,
  switchFeedX,
} from './exposed-wall';

const ROOMWARD = new Vector3(1, 0, 0);
const UP = new Vector3(0, 1, 0);

/** Place a part whose local Y points away from the surface it sits on and Z along the cable. */
function placed(at: Vector3, out: Vector3, along: Vector3) {
  const x = new Vector3().crossVectors(out, along).normalize();
  return new Matrix4().makeBasis(x, out, along).setPosition(at);
}

function Part({
  geometry,
  matrix,
  material,
}: {
  geometry: BufferGeometry;
  matrix: Matrix4;
  material: Material;
}) {
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      material={material}
      matrix={matrix}
      matrixAutoUpdate={false}
      castShadow
      receiveShadow
    />
  );
}

/**
 * The circuits leaving the board, as an electrician dresses them in an open wall: up out
 * of grommets in the top of the tub into a tied loom, through the head noggin and the
 * top plate into the ceiling. The two lighting circuits peel off under the plate, run
 * through the studs and drop down a stud face to their switch boxes.
 */
export function ExposedWallWiring() {
  const { traceCircuit } = useGameInput();
  const materials = useCableMaterials();
  const traceMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#ffc05b',
        emissive: '#f28b23',
        emissiveIntensity: 0.65,
        roughness: 0.55,
      }),
    []
  );
  useEffect(() => () => traceMaterial.dispose(), [traceMaterial]);
  const runs = useMemo(
    () =>
      exposedCables().map((c, i) => {
        const size = CABLE_SIZE[c.kind];
        return {
          ...c,
          size,
          samples: sampleRoute(c.corners, { radius: size.w * 5, step: 0.03, seed: i }),
        };
      }),
    []
  );

  const ties = useMemo(() => {
    const lanes = loomLanes();
    return LOOM_TIES.map((y) => {
      const present = lanes.filter(
        (l) => y < BRANCH_Y - 0.06 || (l.id !== 'kitchen-light' && l.id !== 'lounge-light')
      );
      const lo = Math.min(...present.map((l) => l.z - CABLE_SIZE[l.kind].w / 2));
      const hi = Math.max(...present.map((l) => l.z + CABLE_SIZE[l.kind].w / 2));
      const t = Math.max(...present.map((l) => CABLE_SIZE[l.kind].t));
      return {
        y,
        geometry: tieBandGeometry(hi - lo, t),
        matrix: placed(new Vector3(BOARD_TUB.entryX, y, (lo + hi) / 2), ROOMWARD, UP),
      };
    });
  }, []);

  const grommets = useMemo(
    () =>
      loomEntries().map((e) => {
        const { w, t } = CABLE_SIZE[e.kind];
        return {
          id: e.id,
          geometry: tieBandGeometry(w + 0.0009, t + 0.0009, 0.0045, 0.0022, false),
          matrix: placed(new Vector3(BOARD_TUB.entryX, BOARD_TUB.y1 + 0.001, e.z), ROOMWARD, UP),
        };
      }),
    []
  );

  const saddles = useMemo(() => {
    const out: { key: string; geometry: BufferGeometry; matrix: Matrix4 }[] = [];
    const { w, t } = CABLE_SIZE.light;
    for (const box of [SWITCH_BOX, DIMMER_BOX]) {
      const away = new Vector3(0, 0, box.side);
      for (const y of DROP_SADDLES) {
        for (const x of [switchFeedX(box), SWITCHED_RETURN_X]) {
          out.push({
            key: `${box.z}-${y}-${x}`,
            geometry: saddleGeometry(w, t),
            matrix: placed(new Vector3(x, y, box.studFace), away, UP),
          });
        }
      }
    }
    return out;
  }, []);

  return (
    <group>
      {runs.map((r) => (
        <Cable
          key={r.id}
          samples={r.samples}
          width={r.size.w}
          thickness={r.size.t}
          material={r.circuitId === traceCircuit ? traceMaterial : materials[r.kind]}
        />
      ))}
      {ties.map((tie) => (
        <Part key={tie.y} geometry={tie.geometry} matrix={tie.matrix} material={materials.tie} />
      ))}
      {grommets.map((g) => (
        <Part key={g.id} geometry={g.geometry} matrix={g.matrix} material={materials.grommet} />
      ))}
      {saddles.map((s) => (
        <Part key={s.key} geometry={s.geometry} matrix={s.matrix} material={materials.saddle} />
      ))}
      {[SWITCH_BOX, DIMMER_BOX].map((box) => (
        <mesh
          key={box.z}
          position={[FRAME.plasterLine - WALL_BOX.d / 2, box.y, box.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[WALL_BOX.d, WALL_BOX.h, WALL_BOX.w]} />
          <meshStandardMaterial color="#dcdad3" roughness={0.55} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
