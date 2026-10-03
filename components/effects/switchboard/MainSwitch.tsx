'use client';

import { BOARD, mainSwitchX, moduleBodyZ } from './circuit-data';
import { DIN, DIN_Z, MM, NOSE_LAYOUT } from './din';
import { TOGGLE_OFF, TOGGLE_ON, useDampRotation } from './hooks/useDampRotation';
import { onInteractiveClick, onInteractiveEnter, onInteractiveLeave } from './interaction';
import { ModuleToggle } from './parts/ModuleToggle';
import { DEVICE_RED, useMainSwitchFaceTexture } from './textures';

type Props = {
  on: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
  disabled?: boolean;
};

/** Main switch: an isolator with a red handle so it stands apart from the RCBOs. */
export function MainSwitch({ on, onToggle, onHover, disabled = false }: Props) {
  const face = useMainSwitchFaceTexture();
  const handleRef = useDampRotation(on ? TOGGLE_ON : TOGGLE_OFF);
  const w = BOARD.mainWidth;
  const nose = DIN_Z.nose;
  const hover = () => onHover('main');
  const unhover = () => onHover(null);

  return (
    <group name="main-switch" position={[mainSwitchX(), BOARD.railY, moduleBodyZ()]}>
      <mesh
        visible={false}
        position={[0, 0, nose - 0.015]}
        onClick={disabled ? undefined : (e) => onInteractiveClick(e, onToggle)}
        onPointerOver={(e) => onInteractiveEnter(e, hover)}
        onPointerOut={() => onInteractiveLeave(unhover)}
      >
        <boxGeometry args={[w * 0.96, DIN.noseHeight, 0.04]} />
      </mesh>

      <mesh position={[0, NOSE_LAYOUT.label.y, nose + 0.2 * MM]} raycast={() => null}>
        <planeGeometry args={[w * 0.86, NOSE_LAYOUT.label.height]} />
        <meshStandardMaterial map={face} roughness={0.6} />
      </mesh>

      <group name="interact:main-toggle" position={[0, NOSE_LAYOUT.toggle.y, nose]}>
        <ModuleToggle
          handleRef={handleRef}
          on={on}
          accent={DEVICE_RED}
          onToggle={onToggle}
          disabled={disabled}
          onHover={hover}
          onHoverEnd={unhover}
        />
      </group>
    </group>
  );
}
