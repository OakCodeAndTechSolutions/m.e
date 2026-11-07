'use client';

import { useEffect, useRef } from 'react';
import { useCoarsePointer } from '@/lib/hooks';
import { analogFromDelta } from './player-motion';
import { useGameInput } from './GameInputContext';

type Props = {
  visible: boolean;
};

export function MobileControls({ visible }: Props) {
  const { coarse } = useCoarsePointer();
  const { mobileKeys: mobileKeysRef } = useGameInput();
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const reset = () => {
      pointerId.current = null;
      if (knobRef.current) knobRef.current.style.transform = 'translate(-50%, -50%)';
      Object.assign(mobileKeysRef.current, {
        forward: false,
        back: false,
        left: false,
        right: false,
        turnLeft: false,
        turnRight: false,
        inspect: false,
        stickX: 0,
        stickY: 0,
      });
    };
    const onVisibility = () => {
      if (document.hidden) reset();
    };
    if (!visible) reset();
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      reset();
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [visible, mobileKeysRef]);

  if (!visible || !coarse) return null;

  const resetKnob = () => {
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(-50%, -50%)';
    }
    Object.assign(mobileKeysRef.current, {
      forward: false,
      back: false,
      left: false,
      right: false,
      stickX: 0,
      stickY: 0,
    });
  };

  const applyStick = (clientX: number, clientY: number) => {
    const max = 42;
    const analog = analogFromDelta(clientX - origin.current.x, clientY - origin.current.y, max);
    mobileKeysRef.current.stickX = analog.x;
    mobileKeysRef.current.stickY = analog.y;
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${analog.x * max}px), calc(-50% + ${analog.y * max}px))`;
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== null) return;
    e.preventDefault();
    e.stopPropagation();
    pointerId.current = e.pointerId;
    const rect = e.currentTarget.getBoundingClientRect();
    origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is optional */
    }
    applyStick(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    e.preventDefault();
    applyStick(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetKnob();
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div
        ref={stickRef}
        data-room-stick
        className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] h-[5.5rem] w-[5.5rem] touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
      >
        <div className="absolute inset-0 rounded-full border border-white/25 bg-black/45" />
        <div
          ref={knobRef}
          className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white/25 shadow-md"
        />
      </div>
    </div>
  );
}
