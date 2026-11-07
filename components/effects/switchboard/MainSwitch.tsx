'use client';

import { BOARD, mainSwitchX, moduleBodyZ } from './circuit-data';
import { DIN_Z, MM, NOSE_LAYOUT } from './din';
import { TOGGLE_OFF, TOGGLE_ON, useDampRotation } from './hooks/useDampRotation';
import { ModuleToggle } from './parts/ModuleToggle';
import { useMainSwitchFaceTexture } from './textures';

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
      <mesh position={[0, NOSE_LAYOUT.label.y, nose + 0.08 * MM]} raycast={() => null}>
        <planeGeometry args={[w * 0.86, NOSE_LAYOUT.label.height]} />
        <meshStandardMaterial map={face} transparent depthWrite={false} roughness={0.48} />
      </mesh>

      <group name="interact:main-toggle" position={[0, NOSE_LAYOUT.toggle.y, nose]}>
        <ModuleToggle
          handleRef={handleRef}
          on={on}
          isolator
          label="Main switch"
          deviceId="main"
          onToggle={onToggle}
          disabled={disabled}
          onHover={hover}
          onHoverEnd={unhover}
        />
      </group>
    </group>
  );
}
