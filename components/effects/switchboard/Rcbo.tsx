'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';
import { BOARD, circuitDisplayName, moduleBodyZ, rcboX, type CircuitPole } from './circuit-data';
import { BOARD_METRES_PER_UNIT, DIN_Z, MM, NOSE_LAYOUT } from './din';
import { TOGGLE_OFF, TOGGLE_ON, useDampRotation } from './hooks/useDampRotation';
import { useRoomTarget } from './learning-room/use-room-target';
import { HouseModel } from './learning-room/HouseModel';
import { ModuleToggle } from './parts/ModuleToggle';
import { useRcboFaceTexture } from './textures';

type Props = {
  circuit: CircuitPole;
  on: boolean;
  onToggle: () => void;
  onTest: () => void;
  onHover: (id: string | null) => void;
  disabled?: boolean;
};

const TEST = NOSE_LAYOUT.test;
const MODULE_SCALE = 1 / BOARD_METRES_PER_UNIT;

/** The printed face and the two independent controls of a DIN-rail RCBO. */
export function Rcbo({ circuit, on, onToggle, onTest, onHover, disabled = false }: Props) {
  const face = useRcboFaceTexture(circuit.rating);
  const handleRef = useDampRotation(on ? TOGGLE_ON : TOGGLE_OFF);
  const testRef = useRef<Group>(null);
  const testPress = useRef(0);

  useFrame((_, delta) => {
    if (!testRef.current) return;
    testPress.current = MathUtils.damp(testPress.current, 0, 12, delta);
    testRef.current.position.z = -testPress.current * 1.05 * MM;
  });

  const nose = DIN_Z.nose;
  const hover = () => onHover(circuit.id);
  const unhover = () => onHover(null);
  const pressTest = () => {
    testPress.current = 1;
    onTest();
  };
  const circuitLabel = circuitDisplayName(circuit.label).toLowerCase();
  const testTarget = useRoomTarget({
    activate: pressTest,
    prompt: 'Test ' + circuitLabel,
    device: { id: circuit.id, kind: 'test' },
    enabled: !disabled,
    onHover: hover,
    onLeave: unhover,
  });

  return (
    <group
      name={'rcbo:' + circuit.id}
      position={[rcboX(circuit.index), BOARD.railY, moduleBodyZ()]}
    >
      <mesh position={[0, NOSE_LAYOUT.label.y, nose + 0.08 * MM]} raycast={() => null}>
        <planeGeometry args={[BOARD.rcboWidth * 0.92, NOSE_LAYOUT.label.height]} />
        <meshStandardMaterial map={face} transparent depthWrite={false} roughness={0.48} />
      </mesh>

      <group name={'interact:' + circuit.id + ':toggle'} position={[0, NOSE_LAYOUT.toggle.y, nose]}>
        <ModuleToggle
          handleRef={handleRef}
          on={on}
          deviceId={circuit.id}
          label={circuitLabel.charAt(0).toUpperCase() + circuitLabel.slice(1)}
          onToggle={onToggle}
          disabled={disabled}
          onHover={hover}
          onHoverEnd={unhover}
        />
      </group>

      <group position={[TEST.x, TEST.y, nose]}>
        <group ref={testRef}>
          <HouseModel asset="rcbo-test" at={[0, 0, -0.75 * MM]} scale={MODULE_SCALE} />
        </group>
        <mesh
          visible={false}
          name={'interact:' + circuit.id + ':test'}
          position={[0, 0, 1.2 * MM]}
          {...testTarget}
        >
          <boxGeometry args={[TEST.size * 1.68, TEST.size * 1.68, 4.5 * MM]} />
        </mesh>
      </group>
    </group>
  );
}
