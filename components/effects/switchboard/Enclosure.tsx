'use client';

import { useMemo } from 'react';
import { ExtrudeGeometry, Path, Shape } from 'three';
import { BOARD, CIRCUITS, ROOM_CIRCUIT_IDS, rcboX } from './circuit-data';
import { MM } from './din';
import type { SwitchboardMaterials } from './materials';
import { KnockoutRing } from './parts/KnockoutRing';

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

/**
 * Flush-mount enclosure: a steel tub in the wall cavity, a galvanised chassis carrying
 * the DIN rail, cable entries top and bottom, and a powder-coated frame on the plaster.
 */
export function Enclosure({ materials }: Props) {
  const { width: w, height: h, depth: d } = BOARD;
  const frame = useFrameGeometry();
  const back = -d / 2;
  const tubDepth = BOARD.frontZ - back;
  const tubZ = back + tubDepth / 2;

  // Floor gland plate — one entry per circuit in a single aligned row.
  const firstX = rcboX(0);
  const lastX = rcboX(CIRCUITS.length - 1);
  const plateY = -h / 2 + WALL + 0.02;
  const plateW = lastX - firstX + 0.28;
  const plateCx = (firstX + lastX) / 2;

  const topY = h / 2 - WALL - 0.004;
  const mains = BOARD.mainsKnockout;
  // Under the rail ends, clear of the tub walls.
  const bracketX = (CIRCUITS.length + 1) * BOARD.rcboWidth * 0.5 + 0.02;

  return (
    <group>
      {/* Tub: back, floor, top and sides. */}
      <mesh position={[0, 0, back + WALL / 2]} receiveShadow material={materials.enclosureInner}>
        <boxGeometry args={[w, h, WALL]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`tb${side}`}
          position={[0, side * (h / 2 - WALL / 2), tubZ]}
          receiveShadow
          material={materials.enclosureInner}
        >
          <boxGeometry args={[w, WALL, tubDepth]} />
        </mesh>
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

      {/* Top entries: the mains TPS gland and capped spares. */}
      <KnockoutRing
        materials={materials}
        position={[mains[0], topY, mains[2]]}
        radius={0.11}
        tube={0.014}
      />
      {[0.32, 0.62, w - 0.6, w - 0.36].map((x, i) => (
        <group key={`ko${i}`} position={[-w / 2 + x, topY, back + 0.15]}>
          <KnockoutRing materials={materials} position={[0, 0, 0]} radius={0.07} tube={0.01} />
          <mesh position={[0, 0.006, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.004, 20]} />
            <meshStandardMaterial color="#dcdcd8" roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
      ))}

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

      <mesh position={[plateCx, plateY, BOARD.glandPlateZ]} material={materials.plasticGrey}>
        <boxGeometry args={[plateW, 0.04, 0.3]} />
      </mesh>
      {CIRCUITS.map((c) => {
        const used = ROOM_CIRCUIT_IDS.has(c.id);
        return (
          <group key={c.id} position={[rcboX(c.index), plateY + 0.02, BOARD.glandPlateZ]}>
            {used ? (
              <mesh position={[0, 0.002, 0]}>
                <cylinderGeometry args={[0.046, 0.046, 0.044, 16]} />
                <meshStandardMaterial color="#101012" roughness={0.92} metalness={0.04} />
              </mesh>
            ) : (
              <mesh position={[0, 0.004, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 0.006, 16]} />
                <meshStandardMaterial color="#c5c5c8" roughness={0.42} metalness={0.08} />
              </mesh>
            )}
            <KnockoutRing
              materials={materials}
              position={[0, 0.01, 0]}
              radius={0.056}
              tube={0.01}
            />
          </group>
        );
      })}
    </group>
  );
}
