'use client';

import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { Mesh } from 'three';
import {
  INTERACTION_REACH,
  onInteractiveClick,
  onInteractiveEnter,
  onInteractiveLeave,
} from '../interaction';
import { useGameInput } from './GameInputContext';
import { registerRoomTarget } from './room-target';

export function useRoomTarget({
  activate,
  prompt,
  actionable = true,
  enabled = true,
  device,
  onHover,
  onLeave,
}: {
  activate: () => void;
  prompt: string;
  actionable?: boolean;
  enabled?: boolean;
  device?: { id: string; kind: 'toggle' | 'test' };
  onHover?: () => void;
  onLeave?: () => void;
}) {
  const scene = useThree((s) => s.scene);
  const { setPointerHint } = useGameInput();
  const current = useRef({ activate, prompt, actionable, device });
  const hover = useRef(false);

  useLayoutEffect(() => {
    current.current = { activate, prompt, actionable, device };
    if (hover.current) setPointerHint(enabled ? prompt : null);
  }, [activate, enabled, prompt, actionable, device, setPointerHint]);

  const ref = useCallback(
    (mesh: Mesh | null) => {
      if (!mesh || !enabled) return;
      const unregister = registerRoomTarget(scene, mesh, () => current.current);
      return () => {
        unregister();
        if (hover.current) {
          hover.current = false;
          setPointerHint(null);
        }
      };
    },
    [enabled, scene, setPointerHint]
  );

  const updatePointer = (event: ThreeEvent<PointerEvent>) => {
    const reached = event.pointerType !== 'touch' && event.distance <= INTERACTION_REACH;
    if (reached) setPointerHint(current.current.prompt);
    else if (hover.current) setPointerHint(null);
    hover.current = reached;
  };

  return {
    ref,
    onPointerOver: enabled
      ? (event: ThreeEvent<PointerEvent>) => {
          onInteractiveEnter(event, onHover);
          updatePointer(event);
        }
      : undefined,
    onPointerMove: enabled
      ? (event: ThreeEvent<PointerEvent>) => {
          onInteractiveEnter(event);
          updatePointer(event);
        }
      : undefined,
    onPointerOut: enabled
      ? () => {
          onInteractiveLeave(onLeave);
          if (hover.current) {
            hover.current = false;
            setPointerHint(null);
          }
        }
      : undefined,
    onClick: enabled
      ? (event: ThreeEvent<MouseEvent>) => onInteractiveClick(event, activate)
      : undefined,
  };
}
