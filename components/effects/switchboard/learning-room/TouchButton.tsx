'use client';

import { useRef, type ComponentPropsWithRef } from 'react';

type Props = Omit<ComponentPropsWithRef<'button'>, 'onClick'> & { onClick: () => void };

/** Browsers can omit a compatibility click after a canvas drag. Complete a touch tap directly. */
export function TouchButton({ onClick, ...props }: Props) {
  const down = useRef<{ id: number; x: number; y: number } | null>(null);
  const lastTouch = useRef(-Infinity);
  return (
    <button
      {...props}
      onPointerDown={(event) => {
        if (event.pointerType === 'touch') {
          down.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }
        props.onPointerDown?.(event);
      }}
      onPointerCancel={(event) => {
        down.current = null;
        props.onPointerCancel?.(event);
      }}
      onPointerUp={(event) => {
        const start = down.current;
        down.current = null;
        if (
          !props.disabled &&
          event.pointerType === 'touch' &&
          start?.id === event.pointerId &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8
        ) {
          lastTouch.current = event.timeStamp;
          onClick();
        }
        props.onPointerUp?.(event);
      }}
      onClick={(event) => {
        // Keyboard activation and mouse clicks still use the normal button behaviour.
        if (event.detail === 0 || event.timeStamp - lastTouch.current > 500) onClick();
      }}
    />
  );
}
