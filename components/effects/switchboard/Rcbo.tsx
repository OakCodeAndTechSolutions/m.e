'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';
import { BOARD, moduleBodyZ, rcboX, type CircuitPole } from './circuit-data';
import { DIN, DIN_Z, MM, NOSE_LAYOUT } from './din';
import { TOGGLE_OFF, TOGGLE_ON, useDampRotation } from './hooks/useDampRotation';
import { onInteractiveClick, onInteractiveEnter, onInteractiveLeave } from './interaction';
import { ModuleToggle } from './parts/ModuleToggle';
import { DEVICE_GREEN, useRcboFaceTexture, useTestButtonTexture } from './textures';

type Props = {
  circuit: CircuitPole;
  on: boolean;
  onToggle: () => void;
  onTest: () => void;
  onHover: (id: string | null) => void;
  disabled?: boolean;
};

const TEST = NOSE_LAYOUT.test;

/**
 * Interactive front of one RCBO: printed label, operating handle and T (test) button.
 * The moulded body, terminals and printed marks are drawn by DeviceRow.
 */
export function Rcbo({ circuit, on, onToggle, onTest, onHover, disabled = false }: Props) {
  const x = rcboX(circuit.index);
  const face = useRcboFaceTexture(circuit.rating);
  const testFace = useTestButtonTexture();
  const handleRef = useDampRotation(on ? TOGGLE_ON : TOGGLE_OFF);
  const testRef = useRef<Group>(null);
  const testPress = useRef(0);

  useFrame((_, delta) => {
    if (!testRef.current) return;
    testPress.current = MathUtils.damp(testPress.current, 0, 10, delta);
    testRef.current.position.z = -testPress.current * 0.8 * MM;
  });

  const w = BOARD.rcboWidth;
  const nose = DIN_Z.nose;
  const hover = () => onHover(circuit.id);
  const unhover = () => onHover(null);
  const pressTest = () => {
    testPress.current = 1;
    onTest();
  };

  return (
    <group name={`rcbo:${circuit.id}`} position={[x, BOARD.railY, moduleBodyZ()]}>
      {/* The whole nose operates the handle, as a click on the device would. */}
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

      <group name={`interact:${circuit.id}:toggle`} position={[0, NOSE_LAYOUT.toggle.y, nose]}>
        <ModuleToggle
          handleRef={handleRef}
          on={on}
          accent={DEVICE_GREEN}
          onToggle={onToggle}
          disabled={disabled}
          onHover={hover}
          onHoverEnd={unhover}
        />
      </group>

      {/* T: the integral test device. It only trips a closed, energised RCBO. */}
      <group position={[TEST.x, TEST.y, nose]}>
        <mesh position={[0, 0, 0.3 * MM]} raycast={() => null}>
          <boxGeometry args={[TEST.size + 1.2 * MM, TEST.size + 1.2 * MM, 0.5 * MM]} />
          <meshStandardMaterial color={DEVICE_GREEN} roughness={0.5} />
        </mesh>
        <group ref={testRef}>
          <mesh position={[0, 0, 1.1 * MM]} raycast={() => null}>
            <boxGeometry args={[TEST.size, TEST.size, 1.2 * MM]} />
            <meshStandardMaterial color="#ececea" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0, 1.75 * MM]} raycast={() => null}>
            <planeGeometry args={[TEST.size * 0.86, TEST.size * 0.86]} />
            <meshStandardMaterial map={testFace} roughness={0.45} />
          </mesh>
        </group>
        <mesh
          visible={false}
          name={`interact:${circuit.id}:test`}
          position={[0, 0, 0.03]}
          onClick={disabled ? undefined : (e) => onInteractiveClick(e, pressTest)}
          onPointerOver={(e) => onInteractiveEnter(e, hover)}
          onPointerOut={() => onInteractiveLeave(unhover)}
        >
          <boxGeometry args={[TEST.size * 1.6, TEST.size * 1.6, 0.06]} />
        </mesh>
      </group>
    </group>
  );
}
