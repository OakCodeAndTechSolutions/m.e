'use client';

import { RoundedBox } from '@react-three/drei';
import type { RefObject } from 'react';
import type { Group } from 'three';
import { BOARD } from '../circuit-data';
import { MM, NOSE_LAYOUT } from '../din';
import { onInteractiveClick, onInteractiveEnter, onInteractiveLeave } from '../interaction';
import { DEVICE_GREEN, DEVICE_RED, usePaddleTexture } from '../textures';

type Props = {
  handleRef: RefObject<Group | null>;
  /** Contact position — drives the indicator window, independent of supply. */
  on: boolean;
  accent: string;
  onToggle: () => void;
  disabled?: boolean;
  onHover?: () => void;
  onHoverEnd?: () => void;
};

const OPENING_H = NOSE_LAYOUT.toggle.openingHeight;
const HANDLE_REACH = 9 * MM;

/**
 * Operating handle in the nose opening (the opening itself is part of DeviceRow):
 * a white handle that flips up for ON (I) and down for OFF (O) with a coloured ▲▼
 * paddle, and a contact-position window above it (red = closed, green = open). The
 * hit box is fixed so the target does not move with the handle.
 */
export function ModuleToggle({
  handleRef,
  on,
  accent,
  onToggle,
  disabled = false,
  onHover,
  onHoverEnd,
}: Props) {
  const paddle = usePaddleTexture(accent);
  const w = BOARD.rcboWidth;

  return (
    <group>
      <mesh position={[0, OPENING_H / 2 + 1.3 * MM, 0.2 * MM]} raycast={() => null}>
        <boxGeometry args={[w * 0.46, 1.5 * MM, 0.3 * MM]} />
        <meshStandardMaterial
          color={on ? DEVICE_RED : DEVICE_GREEN}
          emissive={on ? DEVICE_RED : DEVICE_GREEN}
          emissiveIntensity={0.2}
          roughness={0.35}
        />
      </mesh>

      <group ref={handleRef}>
        <RoundedBox
          args={[w * 0.42, 4.6 * MM, HANDLE_REACH]}
          radius={0.9 * MM}
          smoothness={3}
          position={[0, 0, HANDLE_REACH / 2]}
          raycast={() => null}
        >
          <meshPhysicalMaterial
            color="#f7f7f5"
            roughness={0.4}
            clearcoat={0.3}
            clearcoatRoughness={0.4}
          />
        </RoundedBox>
        <RoundedBox
          args={[w * 0.6, 3 * MM, 1.6 * MM]}
          radius={0.5 * MM}
          smoothness={3}
          position={[0, 0, HANDLE_REACH + 0.3 * MM]}
          raycast={() => null}
        >
          <meshStandardMaterial map={paddle} roughness={0.42} />
        </RoundedBox>
      </group>

      <mesh
        visible={false}
        position={[0, 0, 0.05]}
        onClick={disabled ? undefined : (e) => onInteractiveClick(e, onToggle)}
        onPointerOver={(e) => onInteractiveEnter(e, onHover)}
        onPointerOut={() => onInteractiveLeave(onHoverEnd)}
      >
        <boxGeometry args={[w * 0.9, OPENING_H + 0.012, 0.11]} />
      </mesh>
    </group>
  );
}
