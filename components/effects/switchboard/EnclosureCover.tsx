'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, MathUtils, SRGBColorSpace, type Group } from 'three';
import { BOARD } from './circuit-data';
import { BOARD_METRES_PER_UNIT, MM } from './din';
import { OPEN_SWITCHBOARD_PROMPT } from './interaction';
import { HouseModel } from './learning-room/HouseModel';
import { useRoomTarget } from './learning-room/use-room-target';

type Props = {
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
export function EnclosureCover({ open, onRequestOpen, onClose }: Props) {
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

  const target = useRoomTarget({
    activate: open ? onClose : onRequestOpen,
    prompt: open ? 'Close switchboard' : OPEN_SWITCHBOARD_PROMPT,
  });

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
        <HouseModel
          asset="board-door"
          at={[doorW / 2, 0, DOOR_DEPTH / 2]}
          scale={1 / BOARD_METRES_PER_UNIT}
        />
        <mesh
          name="interact:board-door"
          position={[doorW / 2, 0, DOOR_DEPTH / 2]}
          visible={false}
          {...target}
        >
          <boxGeometry args={[doorW + 0.08, doorH + 0.08, DOOR_DEPTH + 0.04]} />
        </mesh>

        <DoorLabel x={doorW / 2} y={doorH / 2 - 0.42} />
      </group>
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
