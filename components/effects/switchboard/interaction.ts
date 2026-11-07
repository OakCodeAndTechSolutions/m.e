import type { ThreeEvent } from '@react-three/fiber';

export const OPEN_SWITCHBOARD_PROMPT = 'Open switchboard';

/** Look-drag on mobile: ignore the click that fires when the finger lifts. */
let lookDragActive = false;
let lastInteractAt = -Infinity;

export const INTERACTION_REACH = 2.4;

export function setLookDragActive(active: boolean) {
  lookDragActive = active;
}

export function isLookDragActive() {
  return lookDragActive;
}

export function markInteract() {
  lastInteractAt = performance.now();
}

export function wasRecentInteract(windowMs = 280) {
  return performance.now() - lastInteractAt < windowMs;
}

/** Stop propagation and set pointer cursor — shared by all interactive board parts. */
export function onInteractiveEnter(e: ThreeEvent<PointerEvent>, onHover?: () => void): void {
  e.stopPropagation();
  document.body.style.cursor = e.distance > INTERACTION_REACH ? 'auto' : 'pointer';
  onHover?.();
}

export function onInteractiveLeave(onHoverEnd?: () => void): void {
  document.body.style.cursor = 'auto';
  onHoverEnd?.();
}

export function onInteractiveClick(
  e: ThreeEvent<MouseEvent> | ThreeEvent<PointerEvent>,
  action: () => void
): void {
  e.stopPropagation();
  // Click requires a press on the object; zooms and look-drags never operate it.
  if (e.button > 0 || e.delta > 5 || e.distance > INTERACTION_REACH) return;
  if (lookDragActive) return;
  if (wasRecentInteract()) return;
  markInteract();
  action();
}
