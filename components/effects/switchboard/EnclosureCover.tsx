'use client';

import { RoundedBox } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, MathUtils, SRGBColorSpace, type Group } from 'three';
import { BOARD } from './circuit-data';
import { MM } from './din';
import {
  INTERACTION_REACH,
  onInteractiveClick,
  onInteractiveEnter,
  onInteractiveLeave,
} from './interaction';
import type { SwitchboardMaterials } from './materials';
import { useGameInput } from './learning-room/GameInputContext';

type Props = {
  materials: SwitchboardMaterials;
  open: boolean;
  onRequestOpen: () => void;
  onClose: () => void;
};

const OPEN_ANGLE = -1.9;
/** Folded steel door: the return flange gives it depth at the edges. */
const DOOR_DEPTH = 6 * MM;

/**
 * Outer access door, hinged on the left of the frame with a quarter-turn latch on the
 * right. The fixed escutcheon remains behind it.
 */
export function EnclosureCover({ materials, open, onRequestOpen, onClose }: Props) {
  const { setPointerHint } = useGameInput();
  const hingeRef = useRef<Group>(null);
  const angle = useRef(open ? OPEN_ANGLE : 0);

  const doorW = BOARD.width + 6 * MM;
  const doorH = BOARD.height + 6 * MM;
  const z = BOARD.frontZ + 0.8 * MM;

  useFrame((_, delta) => {
    const target = open ? OPEN_ANGLE : 0;
    angle.current = MathUtils.damp(angle.current, target, 6, delta);
    if (hingeRef.current) hingeRef.current.rotation.y = angle.current;
  });

  const hint = (distance: number) =>
    distance > INTERACTION_REACH
      ? 'Walk closer to the switchboard'
      : open
        ? 'Close switchboard'
        : 'Open switchboard';

  return (
    <group position={[-doorW / 2, 0, z]}>
      {/* Hinge knuckles stay on the frame. */}
      {[doorH / 2 - 0.35, -doorH / 2 + 0.35].map((y) => (
        <mesh key={y} position={[-1.5 * MM, y, 3 * MM]}>
          <cylinderGeometry args={[2.6 * MM, 2.6 * MM, 0.26, 16]} />
          <meshStandardMaterial color="#d9dad7" roughness={0.35} metalness={0.7} />
        </mesh>
      ))}

      <group ref={hingeRef}>
        <RoundedBox
          name="interact:board-door"
          args={[doorW, doorH, DOOR_DEPTH]}
          radius={2.5 * MM}
          smoothness={3}
          position={[doorW / 2, 0, DOOR_DEPTH / 2]}
          castShadow
          receiveShadow
          onClick={(e) => onInteractiveClick(e, open ? onClose : onRequestOpen)}
          onPointerOver={(e) => {
            onInteractiveEnter(e);
            setPointerHint(hint(e.distance));
          }}
          onPointerOut={() => {
            onInteractiveLeave();
            setPointerHint(null);
          }}
        >
          <meshPhysicalMaterial
            color="#f3f2ee"
            roughness={0.42}
            metalness={0.06}
            clearcoat={0.25}
            clearcoatRoughness={0.45}
          />
        </RoundedBox>

        {/* Generous tap target for mobile while closed. */}
        {!open && (
          <mesh
            visible={false}
            position={[doorW / 2, 0, 0.06]}
            name="interact:board-open"
            onClick={(e) => {
              onInteractiveClick(e, onRequestOpen);
              setPointerHint(null);
            }}
            onPointerOver={(e) => {
              onInteractiveEnter(e);
              setPointerHint(hint(e.distance));
            }}
            onPointerOut={() => {
              onInteractiveLeave();
              setPointerHint(null);
            }}
          >
            <boxGeometry args={[doorW + 0.08, doorH + 0.08, 0.12]} />
          </mesh>
        )}

        <DoorLabel x={doorW / 2} y={doorH / 2 - 0.42} />
        <QuarterTurnLatch x={doorW - 0.16} materials={materials} />
      </group>
    </group>
  );
}

/** Flush quarter-turn latch: chrome bezel with a screwdriver slot. */
function QuarterTurnLatch({ x, materials }: { x: number; materials: SwitchboardMaterials }) {
  return (
    <group position={[x, 0, DOOR_DEPTH]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.6 * MM]} raycast={() => null}>
        <cylinderGeometry args={[7 * MM, 7.4 * MM, 1.2 * MM, 28]} />
        <meshStandardMaterial color="#cfd1d4" roughness={0.25} metalness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 1.3 * MM]} raycast={() => null}>
        <cylinderGeometry args={[4.6 * MM, 4.6 * MM, 0.6 * MM, 24]} />
        <meshStandardMaterial color="#9ea2a7" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0, 1.65 * MM]} material={materials.plasticDark} raycast={() => null}>
        <boxGeometry args={[7 * MM, 1.1 * MM, 0.4 * MM]} />
      </mesh>
    </group>
  );
}

/** Printed label on the door — a sticker, not a tooltip. */
function DoorLabel({ x, y }: { x: number; y: number }) {
  const map = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.fillStyle = '#f7f6f1';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 492, 236);
    ctx.fillStyle = '#18181b';
    ctx.textAlign = 'center';
    ctx.font = '800 54px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('SWITCHBOARD', 256, 92);
    ctx.font = '700 36px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('230 V ~ 50 Hz', 256, 148);
    ctx.font = '600 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Main switch & circuit protection inside', 256, 202);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <mesh position={[x, y, DOOR_DEPTH + 0.2 * MM]} raycast={() => null}>
      <planeGeometry args={[0.8, 0.4]} />
      <meshStandardMaterial map={map} roughness={0.5} />
    </mesh>
  );
}
