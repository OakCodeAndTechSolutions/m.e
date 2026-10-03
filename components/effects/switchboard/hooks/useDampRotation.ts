'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';

/**
 * AU RCBO / isolator toggle: I is up. The handle points out of the face, so a negative
 * X rotation lifts its tip (ON) and a positive one drops it (OFF).
 */
export const TOGGLE_ON = -0.5;
export const TOGGLE_OFF = 0.5;

/** Smoothly damp a group's rotation.x toward a target angle each frame. */
export function useDampRotation(targetAngle: number, lambda = 14) {
  const ref = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x = MathUtils.damp(ref.current.rotation.x, targetAngle, lambda, delta);
  });

  return ref;
}
