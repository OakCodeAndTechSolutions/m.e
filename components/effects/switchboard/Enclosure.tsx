'use client';

import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, Path, Shape } from 'three';
import { BOARD, CIRCUITS } from './circuit-data';
import { BOARD_METRES_PER_UNIT, MM } from './din';
import type { SwitchboardMaterials } from './materials';
import { BOARD_CABLE_ENTRIES, CABLE_SIZE } from './wiring/board-cables';
import { tieBandGeometry } from './wiring/cable-geometry';
import { ENCLOSURE_BOND } from './wiring/wire-paths';

type Props = {
  materials: SwitchboardMaterials;
};

/** Sheet steel, drawn a little heavier than 1 mm so edges catch the light. */
const WALL = 2.5 * MM;
/** Flush-mount frame: overlaps the plaster cut by this much on every side. */
const FRAME_LAP = 16 * MM;
const FRAME_T = 2 * MM;

function roundedRect(shape: Shape | Path, w: number, h: number, r: number) {
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
}

/** Front frame: a rounded steel ring around the tub opening, sitting on the plaster. */
function useFrameGeometry() {
  return useMemo(() => {
    const outer = new Shape();
    roundedRect(outer, BOARD.width + FRAME_LAP * 2, BOARD.height + FRAME_LAP * 2, 6 * MM);
    const hole = new Path();
    roundedRect(hole, BOARD.width - WALL * 2, BOARD.height - WALL * 2, 2 * MM);
    outer.holes.push(hole);
    const g = new ExtrudeGeometry(outer, {
      depth: FRAME_T,
      bevelEnabled: true,
      bevelThickness: 0.8 * MM,
      bevelSize: 0.8 * MM,
      bevelSegments: 2,
      curveSegments: 8,
    });
    g.translate(0, 0, BOARD.frontZ - FRAME_T - 0.8 * MM);
    return g;
  }, []);
}

function useCableEntryPlate(depth: number, center: number) {
  return useMemo(() => {
    const plate = new Shape();
    plate.moveTo(-BOARD.width / 2, -depth / 2);
    plate.lineTo(BOARD.width / 2, -depth / 2);
    plate.lineTo(BOARD.width / 2, depth / 2);
    plate.lineTo(-BOARD.width / 2, depth / 2);
    plate.closePath();
    for (const {
      point: [x, , z],
      kind,
    } of BOARD_CABLE_ENTRIES) {
      const size = CABLE_SIZE[kind];
      const hole = new Path();
      hole.absellipse(
        x,
        center - z,
        (size.w * 500 + 1.4) * MM,
        (size.t * 500 + 1.4) * MM,
        0,
        Math.PI * 2,
        true,
        0
      );
      plate.holes.push(hole);
    }
    return new ExtrudeGeometry(plate, { depth: WALL, bevelEnabled: false, curveSegments: 12 });
  }, [depth, center]);
}

/**
 * Flush-mount enclosure: a steel tub in the wall cavity, a galvanised chassis carrying
 * the DIN rail, protected cable entries, and a powder-coated frame.
 */
export function Enclosure({ materials }: Props) {
  const { width: w, height: h, depth: d } = BOARD;
  const frame = useFrameGeometry();
  const back = -d / 2;
  const tubDepth = BOARD.frontZ - back;
  const tubZ = back + tubDepth / 2;

  const top = useCableEntryPlate(tubDepth, tubZ);
  const sleeves = useMemo(
    () =>
      BOARD_CABLE_ENTRIES.map(({ circuitId, point, kind }) => {
        const { w, t } = CABLE_SIZE[kind];
        return {
          circuitId,
          point,
          geometry: tieBandGeometry(w + 0.0009, t + 0.0009, 0.0032, 0.0021, false),
        };
      }),
    []
  );
  useEffect(
    () => () => {
      top.dispose();
      frame.dispose();
      for (const sleeve of sleeves) sleeve.geometry.dispose();
    },
    [top, frame, sleeves]
  );

  // Under the rail ends, clear of the tub walls.
  const bracketX = (CIRCUITS.length + 1) * BOARD.rcboWidth * 0.5 + 0.02;

  return (
    <group>
      {/* Tub: back, floor, top and sides. */}
      <mesh position={[0, 0, back + WALL / 2]} receiveShadow material={materials.enclosureInner}>
        <boxGeometry args={[w, h, WALL]} />
      </mesh>
      <mesh
        position={[0, -h / 2 + WALL / 2, tubZ]}
        receiveShadow
        material={materials.enclosureInner}
      >
        <boxGeometry args={[w, WALL, tubDepth]} />
      </mesh>
      <mesh
        geometry={top}
        position={[0, h / 2 - WALL, tubZ]}
        rotation-x={-Math.PI / 2}
        receiveShadow
        material={materials.enclosureInner}
      />
      {sleeves.map(({ circuitId, point: [x, y, z], geometry }) => (
        <mesh
          key={circuitId}
          position={[x, y - WALL, z]}
          rotation-x={-Math.PI / 2}
          scale={1 / BOARD_METRES_PER_UNIT}
          geometry={geometry}
          material={materials.plasticDark}
          receiveShadow
        />
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={`lr${side}`}
          position={[side * (w / 2 - WALL / 2), 0, tubZ]}
          receiveShadow
          material={materials.enclosureInner}
        >
          <boxGeometry args={[WALL, h, tubDepth]} />
        </mesh>
      ))}

      <mesh geometry={frame} castShadow receiveShadow material={materials.enclosure} />

      {/* Galvanised chassis plate and the two brackets that stand the rail off it. */}
      <mesh position={[0, BOARD.railY + 0.25, back + WALL + 0.012]} receiveShadow>
        <boxGeometry args={[w - 0.24, h * 0.62, 1.4 * MM]} />
        <meshStandardMaterial color="#b9bdc1" roughness={0.42} metalness={0.75} />
      </mesh>
      {[-1, 1].map((side) => {
        const z0 = back + WALL + 0.02;
        const z1 = BOARD.railZ - 0.04;
        return (
          <group key={`br${side}`} position={[side * bracketX, BOARD.railY, (z0 + z1) / 2]}>
            <mesh receiveShadow>
              <boxGeometry args={[0.16, 0.42, z1 - z0]} />
              <meshStandardMaterial color="#b9bdc1" roughness={0.42} metalness={0.75} />
            </mesh>
            {[-1, 1].map((flange) => (
              <mesh key={flange} position={[side * 0.07, flange * 0.19, 0]} receiveShadow>
                <boxGeometry args={[0.02, 0.04, z1 - z0 + 0.002]} />
                <meshStandardMaterial color="#a8acb1" roughness={0.45} metalness={0.75} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Bonded steel tub: washer, ring lug and hex nut on the chassis stud. */}
      <group position={ENCLOSURE_BOND} rotation-x={Math.PI / 2}>
        <mesh position={[0, -0.026, 0]} material={materials.screw}>
          <cylinderGeometry args={[3.5 * MM, 3.5 * MM, 1.3 * MM, 24]} />
        </mesh>
        <mesh position={[0, -0.014, 0]} material={materials.brass}>
          <cylinderGeometry args={[2.85 * MM, 2.85 * MM, 0.85 * MM, 20]} />
        </mesh>
        <mesh position={[0, 0.001, 0]} material={materials.screw}>
          <cylinderGeometry args={[2.25 * MM, 2.25 * MM, 1.8 * MM, 6]} />
        </mesh>
      </group>

      {/* Door catches on the latch side. */}
      {[0.9, -0.9].map((y) => (
        <mesh
          key={y}
          position={[w / 2 - WALL - 0.02, y, BOARD.frontZ - 0.06]}
          material={materials.plasticGrey}
        >
          <boxGeometry args={[0.04, 0.12, 0.05]} />
        </mesh>
      ))}
    </group>
  );
}
