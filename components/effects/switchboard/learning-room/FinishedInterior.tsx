'use client';

import { RoundedBox } from '@react-three/drei';
import { useGameInput } from './GameInputContext';
import { BOARD_CUTOUT, ROOM } from './room-layout';

type V3 = [number, number, number];

function Block({ at, size, color = '#e6e1d7' }: { at: V3; size: V3; color?: string }) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

/**
 * Plaster on the board wall, cut around the flush-mounted switchboard tub. The
 * enclosure frame overlaps the cut edge, as on a real flush installation.
 */
function BoardWallPlaster() {
  const { depth: d, height: h } = ROOM;
  const { z0, z1, y0, y1 } = BOARD_CUTOUT;
  const x = -0.008;
  const t = 0.012;
  return (
    <>
      <Block at={[x, h / 2, z0 / 2]} size={[t, h, z0]} />
      <Block at={[x, h / 2, (z1 + d) / 2]} size={[t, h, d - z1]} />
      <Block at={[x, y0 / 2, (z0 + z1) / 2]} size={[t, y0, z1 - z0]} />
      <Block at={[x, (y1 + h) / 2, (z0 + z1) / 2]} size={[t, h - y1, z1 - z0]} />
    </>
  );
}

/** Finished plaster is a separate layer; the inspection view reveals the cavity. */
export function FinishedInterior() {
  const { wiringView } = useGameInput();
  const { width: w, depth: d, height: h } = ROOM;
  return (
    <group>
      <group visible={!wiringView}>
        <BoardWallPlaster />
        <Block at={[w / 2, h / 2, -0.008]} size={[w, h, 0.012]} />
        <Block at={[w / 2, h / 2, d + 0.008]} size={[w, h, 0.012]} color="#b2b5a4" />
      </group>

      {/* A real opening: the right wall is built around the glazing. */}
      <Block at={[w + 0.025, h / 2, 0.66]} size={[0.08, h, 1.32]} />
      <Block at={[w + 0.025, h / 2, 6.25]} size={[0.08, h, 1.5]} />
      <Block at={[w + 0.025, 0.36, 3.4]} size={[0.08, 0.72, 4.16]} />
      <Block at={[w + 0.025, 2.52, 3.4]} size={[0.08, 0.36, 4.16]} />
      <group position={[w - 0.015, 1.53, 3.4]} rotation={[0, -Math.PI / 2, 0]}>
        {/* A softly lit garden beyond the window, built from geometry. */}
        <mesh position={[0, 0, -0.24]}>
          <planeGeometry args={[4.2, 1.7]} />
          <meshBasicMaterial color={'#b9ccd0'} />
        </mesh>
        <mesh position={[0, -0.65, -0.2]}>
          <planeGeometry args={[4.2, 0.5]} />
          <meshBasicMaterial color={'#7c8e63'} />
        </mesh>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <mesh
            key={i}
            position={[-2 + i * 0.5, -0.38 + Math.sin(i * 3) * 0.14, -0.17]}
            scale={[0.4, 0.3, 0.04]}
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color={i % 2 ? '#889775' : '#6b805e'} />
          </mesh>
        ))}
        {[-2.06, -0.69, 0.69, 2.06].map((x) => (
          <Block key={x} at={[x, 0, 0.025]} size={[0.045, 1.7, 0.09]} color="#333c39" />
        ))}
        {[-0.83, 0.83].map((y) => (
          <Block key={y} at={[0, y, 0.025]} size={[4.16, 0.045, 0.09]} color="#333c39" />
        ))}
        <Block at={[0, -0.87, 0.055]} size={[4.3, 0.055, 0.22]} color="#eee9df" />
        {/* Linen folds on either side of the window. */}
        {[-1, 1].flatMap((side) =>
          Array.from({ length: 8 }, (_, i) => (
            <mesh
              key={`${side}-${i}`}
              position={[side * (1.9 + i * 0.055), -0.22, 0.14]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.042, 0.044, 2.12, 8]} />
              <meshStandardMaterial color={i % 2 ? '#d1c7b7' : '#e1d9cb'} roughness={1} />
            </mesh>
          ))
        )}
        <Block at={[0, 0.91, 0.16]} size={[4.6, 0.035, 0.035]} color="#49443d" />
      </group>

      {/* Skirting and cornices give the room a continuous, human-scale envelope. */}
      {[0, d].map((z) => (
        <group key={z}>
          <Block
            at={[w / 2, 0.06, z === 0 ? 0.008 : d - 0.008]}
            size={[w, 0.12, 0.024]}
            color="#f0ece4"
          />
          <Block
            at={[w / 2, h - 0.035, z === 0 ? 0.025 : d - 0.025]}
            size={[w, 0.07, 0.055]}
            color="#f0ece4"
          />
        </group>
      ))}
      {[0, w].map((x) => (
        <group key={x}>
          <Block
            at={[x === 0 ? 0.008 : w - 0.008, 0.06, d / 2]}
            size={[0.024, 0.12, d]}
            color="#f0ece4"
          />
          <Block
            at={[x === 0 ? 0.025 : w - 0.025, h - 0.035, d / 2]}
            size={[0.055, 0.07, d]}
            color="#f0ece4"
          />
        </group>
      ))}

      <DiningCorner />
    </group>
  );
}

function DiningCorner() {
  return (
    <group position={[6.85, 0, 2.6]}>
      <RoundedBox
        args={[1.35, 0.045, 0.8]}
        radius={0.025}
        smoothness={3}
        position={[0, 0.75, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#a88459" roughness={0.65} />
      </RoundedBox>
      {[-0.52, 0.52].flatMap((x) =>
        [-0.27, 0.27].map((z) => (
          <Block key={`${x}-${z}`} at={[x, 0.365, z]} size={[0.045, 0.73, 0.045]} color="#7a6044" />
        ))
      )}
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[0, 0, side * 0.76]}
          rotation={[0, side === 1 ? 0 : Math.PI, 0]}
        >
          <RoundedBox
            args={[0.44, 0.055, 0.44]}
            radius={0.025}
            smoothness={2}
            position={[0, 0.46, 0]}
            castShadow
          >
            <meshStandardMaterial color="#a29b86" roughness={1} />
          </RoundedBox>
          <RoundedBox
            args={[0.44, 0.36, 0.045]}
            radius={0.02}
            smoothness={2}
            position={[0, 0.69, 0.2]}
            castShadow
          >
            <meshStandardMaterial color="#9c927b" roughness={0.95} />
          </RoundedBox>
          {[-0.17, 0.17].flatMap((x) =>
            [-0.17, 0.17].map((z) => (
              <Block
                key={`${x}-${z}`}
                at={[x, 0.22, z]}
                size={[0.035, 0.44, 0.035]}
                color="#695742"
              />
            ))
          )}
        </group>
      ))}
      <mesh position={[0.26, 0.88, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.09, 0.21, 20]} />
        <meshStandardMaterial color="#b9a18a" roughness={0.84} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i} position={[0.26, 0.95, 0]} rotation={[0.25 * Math.sin(i * 2), i * 1.8, 0.3]}>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.003, 0.004, 0.36, 6]} />
            <meshStandardMaterial color="#5c6650" />
          </mesh>
          {[0.12, 0.24].map((y) => (
            <mesh
              key={y}
              position={[0.025, y, 0]}
              scale={[0.055, 0.025, 0.013]}
              rotation={[0, 0, 0.6]}
            >
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#7d927e" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Recessed downlights share the same switched circuits as the wall fittings. */
export function CeilingLights({
  kitchenOn,
  loungeLevel,
}: {
  kitchenOn: boolean;
  loungeLevel: number;
}) {
  return (
    <group>
      {[
        { x: 2, z: 1.5, level: kitchenOn ? 1 : 0 },
        { x: 4.4, z: 1.5, level: kitchenOn ? 1 : 0 },
        { x: 2, z: 5.5, level: loungeLevel },
        { x: 4.4, z: 5.5, level: loungeLevel },
      ].map(({ x, z, level }) => (
        <group key={`${x}-${z}`} position={[x, ROOM.height - 0.016, z]}>
          <mesh>
            <cylinderGeometry args={[0.057, 0.057, 0.016, 24]} />
            <meshStandardMaterial color="#f1eee5" roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.044, 0.044, 0.003, 24]} />
            <meshStandardMaterial
              color="#f4e8d1"
              emissive="#ffdfad"
              emissiveIntensity={level * 2.5}
            />
          </mesh>
        </group>
      ))}
      {/* One shared pool per room; each downlight keeps its own emissive lens. */}
      <pointLight
        position={[3.2, ROOM.height - 0.25, 1.5]}
        intensity={kitchenOn ? 6.4 : 0}
        distance={6}
        decay={2}
        color="#ffdfb5"
      />
      <pointLight
        position={[3.2, ROOM.height - 0.25, 5.5]}
        intensity={loungeLevel * 6.4}
        distance={6}
        decay={2}
        color="#ffdfb5"
      />
    </group>
  );
}
