'use client';

import { useEffect, useLayoutEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import { MathUtils, type WebGLRenderer } from 'three';
import { setLookDragActive } from '../interaction';
import { PLAYER, type RoomInteractId } from './room-layout';
import type { PlayerPose } from './player-motion';
import { tryRoomInteract } from './room-interact';

export type Keys = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  turnLeft: boolean;
  turnRight: boolean;
};

export type Zoom = {
  hold: boolean;
  amount: number;
};

export function emptyKeys(): Keys {
  return {
    forward: false,
    back: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: false,
  };
}

type Args = {
  enabled: boolean;
  gl: WebGLRenderer;
  pose: RefObject<PlayerPose>;
  keysRef: MutableRefObject<Keys>;
  zoomRef: MutableRefObject<Zoom>;
  coarseRef: MutableRefObject<boolean>;
  coverOpen: boolean;
  coverPromptOpen: boolean;
  onExit: () => void;
  onInteract: (id: RoomInteractId) => void;
  requestCoverOpen: () => void;
  denyCoverOpen: () => void;
  closeCover: () => void;
  dismissEntryHint: () => void;
};

function applyKey(keys: Keys, zoom: Zoom, code: string, down: boolean) {
  if (code === 'KeyW' || code === 'ArrowUp') keys.forward = down;
  if (code === 'KeyS' || code === 'ArrowDown') keys.back = down;
  if (code === 'KeyA') keys.left = down;
  if (code === 'KeyD') keys.right = down;
  if (code === 'ArrowLeft' || code === 'KeyQ') keys.turnLeft = down;
  if (code === 'ArrowRight' || code === 'KeyE') keys.turnRight = down;
  if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyZ') zoom.hold = down;
}

/** Keyboard, wheel zoom and look-drag. Object clicks are handled by the scene. */
export function usePlayerInput({
  enabled,
  gl,
  pose,
  keysRef,
  zoomRef,
  coarseRef,
  coverOpen,
  coverPromptOpen,
  onExit,
  onInteract,
  requestCoverOpen,
  denyCoverOpen,
  closeCover,
  dismissEntryHint,
}: Args) {
  // Read current scene state without tearing down a captured drag or held keys.
  const latest = useRef({
    coverOpen,
    coverPromptOpen,
    onExit,
    onInteract,
    requestCoverOpen,
    denyCoverOpen,
    closeCover,
    dismissEntryHint,
  });
  useLayoutEffect(() => {
    latest.current = {
      coverOpen,
      coverPromptOpen,
      onExit,
      onInteract,
      requestCoverOpen,
      denyCoverOpen,
      closeCover,
      dismissEntryHint,
    };
  });
  useEffect(() => {
    if (!enabled) {
      keysRef.current = emptyKeys();
      zoomRef.current = { hold: false, amount: 0 };
      return;
    }

    const onDown = (e: KeyboardEvent) => {
      const {
        coverOpen,
        coverPromptOpen,
        onExit,
        onInteract,
        requestCoverOpen,
        denyCoverOpen,
        closeCover,
        dismissEntryHint,
      } = latest.current;
      const target = e.target instanceof Element ? e.target : null;
      if (e.code !== 'Escape') {
        if (target?.closest('input, select, textarea, [contenteditable="true"]')) return;
        // Preserve native button/link activation without trapping movement after navigation.
        if (target?.closest('button, a[href]') && (e.code === 'Enter' || e.code === 'Space')) {
          return;
        }
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        if (coverPromptOpen) {
          denyCoverOpen();
          return;
        }
        if (coverOpen) {
          e.stopImmediatePropagation();
          closeCover();
          return;
        }
        onExit();
        return;
      }
      if (coverPromptOpen) return;
      if (
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'Space' ||
        e.code === 'KeyZ' ||
        e.code.startsWith('Shift')
      ) {
        e.preventDefault();
      }
      if (
        e.repeat &&
        (e.code === 'KeyF' || e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape')
      ) {
        return;
      }
      applyKey(keysRef.current, zoomRef.current, e.code, true);
      if (
        keysRef.current.forward ||
        keysRef.current.back ||
        keysRef.current.left ||
        keysRef.current.right ||
        keysRef.current.turnLeft ||
        keysRef.current.turnRight
      ) {
        dismissEntryHint();
      }
      if (e.repeat) return;
      if (e.code === 'KeyF' || e.code === 'Enter' || e.code === 'Space') {
        tryRoomInteract(
          pose.current.x,
          pose.current.z,
          zoomRef.current.hold,
          coverOpen,
          onInteract,
          requestCoverOpen,
          pose.current.yaw,
          closeCover
        );
      }
    };
    const onUp = (e: KeyboardEvent) => applyKey(keysRef.current, zoomRef.current, e.code, false);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current.amount = MathUtils.clamp(
        zoomRef.current.amount + (e.deltaY > 0 ? -0.08 : 0.08),
        0,
        1
      );
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 1) {
        e.preventDefault();
        zoomRef.current.hold = true;
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 1) zoomRef.current.hold = false;
    };
    const onContext = (e: MouseEvent) => e.preventDefault();

    const canvas = gl.domElement;
    window.addEventListener('keydown', onDown, true);
    window.addEventListener('keyup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContext);

    const look = { id: -1, x: 0, y: 0, dragging: false, canLook: false };
    const TAP_PX = 5;

    function onPointerMove(e: PointerEvent) {
      if (look.id !== e.pointerId || !look.canLook) return;
      const dx = e.clientX - look.x;
      const dy = e.clientY - look.y;
      if (!look.dragging && dx * dx + dy * dy < TAP_PX * TAP_PX) return;
      if (!look.dragging) {
        look.dragging = true;
        latest.current.dismissEntryHint();
        setLookDragActive(true);
        if (latest.current.coverOpen) latest.current.closeCover();
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* capture is optional — window listeners still track */
        }
      }
      const sens = e.pointerType === 'touch' ? 0.004 : 0.0028;
      pose.current.yaw -= dx * sens;
      pose.current.pitch = MathUtils.clamp(
        pose.current.pitch - dy * sens,
        PLAYER.pitchMin,
        PLAYER.pitchMax
      );
      look.x = e.clientX;
      look.y = e.clientY;
    }
    function unbindLookWindow() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
    }
    function releaseLook(pointerId: number) {
      look.id = -1;
      look.dragging = false;
      look.canLook = false;
      unbindLookWindow();
      if (canvas.hasPointerCapture(pointerId)) {
        canvas.releasePointerCapture(pointerId);
      }
    }
    function onPointerUp(e: PointerEvent) {
      if (look.id !== e.pointerId) return;
      const dragged = look.dragging;
      releaseLook(e.pointerId);
      if (dragged) {
        e.stopImmediatePropagation();
        window.setTimeout(() => setLookDragActive(false), 0);
        return;
      }
      // A missed tap must not operate an unrelated nearby fitting.
      window.setTimeout(() => setLookDragActive(false), 0);
    }
    const onPointerDown = (e: PointerEvent) => {
      if (latest.current.coverPromptOpen || look.id !== -1) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      look.id = e.pointerId;
      look.x = e.clientX;
      look.y = e.clientY;
      look.dragging = false;
      look.canLook = true;
      setLookDragActive(false);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp, true);
      window.addEventListener('pointercancel', onPointerUp, true);
    };
    const clearHeld = () => {
      keysRef.current = emptyKeys();
      zoomRef.current.hold = false;
      if (look.id !== -1) releaseLook(look.id);
      setLookDragActive(false);
    };
    const onBlur = () => clearHeld();
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') clearHeld();
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearHeld();
      unbindLookWindow();
      window.removeEventListener('keydown', onDown, true);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('contextmenu', onContext);
      canvas.removeEventListener('pointerdown', onPointerDown);
      setLookDragActive(false);
    };
  }, [enabled, gl, pose, keysRef, zoomRef, coarseRef]);
}
