'use client';

import { useEffect, useState } from 'react';
import { Cable, House, CircleHelp } from 'lucide-react';
import { useCoarsePointer } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { useGameHud, useGameInput } from './GameInputContext';

/** The room is the interface. Keep only the architectural cutaway switch. */
export function LearningHud({ visible }: { visible: boolean }) {
  const { wiringView, setWiringView, dismissEntryHint } = useGameInput();
  const { entryHint, pointerHint, actionPrompt } = useGameHud();
  const [showHelp, setShowHelp] = useState(false);
  const { coarse } = useCoarsePointer();
  useEffect(() => {
    if (!visible || !entryHint) return;
    const timer = window.setTimeout(dismissEntryHint, 7000);
    return () => window.clearTimeout(timer);
  }, [visible, entryHint, dismissEntryHint]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 font-sans">
      <div className="pointer-events-auto absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))] flex items-center gap-2">
        {/* The label names the action, so it is not also a pressed toggle. */}
        <button
          type="button"
          onClick={() => setWiringView(!wiringView)}
          className={cn(
            'flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm text-white backdrop-blur-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white',
            wiringView
              ? 'border-primary/60 bg-primary/25 hover:bg-primary/35'
              : 'border-white/20 bg-black/60 hover:bg-black/75'
          )}
        >
          {wiringView ? <House size={15} aria-hidden /> : <Cable size={15} aria-hidden />}
          {wiringView ? 'Show walls' : 'Show wiring'}
        </button>
        <button
          type="button"
          aria-label="Room controls"
          aria-expanded={showHelp}
          aria-controls="room-controls-help"
          onClick={() => setShowHelp((value) => !value)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <CircleHelp size={20} aria-hidden />
        </button>
      </div>
      {showHelp && (
        <div
          id="room-controls-help"
          className="absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-white/15 bg-black/80 px-4 py-3 text-sm text-white shadow-xl backdrop-blur-md"
        >
          <p className="font-semibold">Controls</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs text-white/85">
            {(coarse
              ? [
                  ['Stick', 'Walk'],
                  ['Drag', 'Look around'],
                  ['Tap', 'Use a switch, appliance or the board'],
                ]
              : [
                  ['WASD / arrows', 'Walk'],
                  ['Drag', 'Look around'],
                  ['Click or F', 'Use a fitting'],
                  ['Shift / wheel', 'Zoom'],
                  ['Esc', 'Step back or leave the room'],
                ]
            ).map(([key, action]) => (
              <div key={key} className="contents">
                <dt>
                  <kbd className="rounded border border-white/25 bg-white/10 px-1.5 py-0.5 font-sans text-[11px] text-white">
                    {key}
                  </kbd>
                </dt>
                <dd className="self-center">{action}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-white/70">
            Show wiring opens up the walls so you can follow each cable from the board.
          </p>
        </div>
      )}
      {!showHelp && (entryHint || pointerHint || (!coarse && actionPrompt)) && (
        <p
          role="status"
          className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-center text-xs leading-relaxed text-white/90 backdrop-blur-sm max-sm:bottom-32"
        >
          {pointerHint ||
            (!coarse && actionPrompt) ||
            (coarse
              ? 'Move with the stick · drag to look · tap objects to use'
              : 'WASD to move · drag to look · click objects to use')}
        </p>
      )}
    </div>
  );
}
