'use client';

import type { RefObject } from 'react';
import type { Group } from 'three';
import { BOARD } from '../circuit-data';
import { BOARD_METRES_PER_UNIT, MM, NOSE_LAYOUT } from '../din';
import { useRoomTarget } from '../learning-room/use-room-target';
import { HouseModel } from '../learning-room/HouseModel';
import { useToggleStateTexture } from '../textures';

type Props = {
  handleRef: RefObject<Group | null>;
  /** Physical contact position, independent of upstream supply. */
  on: boolean;
  isolator?: boolean;
  label?: string;
  deviceId: string;
  onToggle: () => void;
  disabled?: boolean;
  onHover?: () => void;
  onHoverEnd?: () => void;
};

const MODULE_SCALE = 1 / BOARD_METRES_PER_UNIT;
const OPENING_H = NOSE_LAYOUT.toggle.openingHeight;

export function ModuleToggle({
  handleRef,
  on,
  isolator = false,
  label = 'breaker',
  deviceId,
  onToggle,
  disabled = false,
  onHover,
  onHoverEnd,
}: Props) {
  const indication = useToggleStateTexture(on);
  const target = useRoomTarget({
    activate: onToggle,
    prompt: label + (on ? ' off' : ' on'),
    device: { id: deviceId, kind: 'toggle' },
    enabled: !disabled,
    onHover,
    onLeave: onHoverEnd,
  });

  return (
    <group>
      <mesh position={[0, 6.6 * MM, -0.25 * MM]} raycast={() => null}>
        <planeGeometry args={[8.8 * MM, 2.35 * MM]} />
        <meshStandardMaterial map={indication} roughness={0.56} />
      </mesh>

      <group ref={handleRef} position={[0, 0, -NOSE_LAYOUT.toggle.pivot]}>
        <HouseModel
          asset={isolator ? 'isolator-toggle' : 'rcbo-toggle'}
          at={[0, 0, 0]}
          scale={MODULE_SCALE}
        />
      </group>

      <mesh visible={false} position={[0, 0, 3.2 * MM]} {...target}>
        <boxGeometry args={[BOARD.rcboWidth * 0.92, OPENING_H + 2 * MM, 12 * MM]} />
      </mesh>
    </group>
  );
}
