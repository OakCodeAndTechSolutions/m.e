'use client';

import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, Path, Shape } from 'three';
import { BAR_PORTS, barLayout, earthBarTerminal, neutralBarTerminal } from './circuit-data';
import { MM } from './din';
import type { SwitchboardMaterials } from './materials';

const HEIGHT = 7.45 * MM;
const DEPTH = 8.8 * MM;

function TerminalBar({
  materials,
  width,
  center,
  kind,
}: {
  materials: SwitchboardMaterials;
  width: number;
  center: [number, number, number];
  kind: keyof typeof BAR_PORTS;
}) {
  const ports = useMemo(() => {
    const at = kind === 'earth' ? earthBarTerminal : neutralBarTerminal;
    return Array.from({ length: BAR_PORTS[kind] }, (_, i) => at(i)[0] - center[0]);
  }, [kind, center]);
  const body = useMemo(() => {
    const outline = new Shape();
    outline.moveTo(-width / 2, -HEIGHT / 2);
    outline.lineTo(width / 2, -HEIGHT / 2);
    outline.lineTo(width / 2, HEIGHT / 2);
    outline.lineTo(-width / 2, HEIGHT / 2);
    outline.closePath();
    for (const [i, x] of ports.entries()) {
      const hole = new Path();
      const radius = (kind === 'neutral' && i < 2 ? 3.13 : 2.31) * MM;
      hole.absarc(x, 0, radius, 0, Math.PI * 2, true);
      outline.holes.push(hole);
    }
    const g = new ExtrudeGeometry(outline, {
      depth: DEPTH - 0.36 * MM,
      bevelEnabled: true,
      bevelThickness: 0.18 * MM,
      bevelSize: 0.14 * MM,
      bevelSegments: 2,
      curveSegments: 10,
    });
    g.translate(0, 0, -DEPTH / 2 + 0.18 * MM);
    return g;
  }, [kind, ports, width]);
  useEffect(() => () => body.dispose(), [body]);

  return (
    <group position={center}>
      <mesh position={[0, -HEIGHT / 2 - 1.7 * MM, -2.3 * MM]}>
        <boxGeometry args={[width + 4.5 * MM, 3.7 * MM, 9 * MM]} />
        <meshStandardMaterial color={kind === 'earth' ? '#657649' : '#24292d'} roughness={0.62} />
      </mesh>
      <mesh position={[0, 0, -DEPTH / 2]} material={materials.plasticDark}>
        <boxGeometry args={[width, HEIGHT, 1.1 * MM]} />
      </mesh>
      <mesh geometry={body} material={materials.brass} castShadow receiveShadow />
      {ports.map((x) => (
        <group key={x} position={[x, HEIGHT / 2, 0]}>
          <mesh material={materials.brassChannel}>
            <cylinderGeometry args={[1.95 * MM, 2.15 * MM, 0.66 * MM, 14]} />
          </mesh>
          <mesh position={[0, 0.58 * MM, 0]} material={materials.screw}>
            <cylinderGeometry args={[1.57 * MM, 1.63 * MM, 0.65 * MM, 16]} />
          </mesh>
          <mesh position={[0, 0.92 * MM, 0]} rotation-y={x * 8} material={materials.plasticDark}>
            <boxGeometry args={[2.34 * MM, 0.1 * MM, 0.34 * MM]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The active supply has no connection to these separate neutral and earth links. */
export function TerminalBars({ materials }: { materials: SwitchboardMaterials }) {
  const { neutHalf, earthHalf, earthCx, neutCx, y, z } = barLayout();
  const centers = useMemo<[number, number, number][]>(
    () => [
      [neutCx, y, z],
      [earthCx, y, z],
    ],
    [earthCx, neutCx, y, z]
  );

  return (
    <>
      <TerminalBar materials={materials} width={neutHalf} center={centers[0]!} kind="neutral" />
      <TerminalBar materials={materials} width={earthHalf} center={centers[1]!} kind="earth" />
    </>
  );
}
