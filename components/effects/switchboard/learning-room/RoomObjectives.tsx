'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronDown, Circle } from 'lucide-react';
import { useCoarsePointer } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { useSwitchboard } from '../SwitchboardContext';
import { useGameInput } from './GameInputContext';
import { ROOM_OBJECTIVES, objectivesShown, type ObjectiveId } from './room-objectives';

const TOAST_MS = 4200;

/** A short guided tour of the installation. Completing all of it offers a quote. */
export function RoomObjectives({ visible }: { visible: boolean }) {
  const { play, wiringView } = useGameInput();
  const { coverOpen, tripReason } = useSwitchboard();
  const { coarse } = useCoarsePointer();
  const [done, setDone] = useState<ReadonlySet<ObjectiveId>>(() => new Set());
  const [toast, setToast] = useState<ObjectiveId | null>(null);
  const [open, setOpen] = useState<boolean | null>(null);
  const doneRef = useRef(done);

  useEffect(() => {
    const fresh = objectivesShown({ play, coverOpen, tripReason, wiringView }).filter(
      (id) => !doneRef.current.has(id)
    );
    if (fresh.length === 0) return;
    const next = new Set([...doneRef.current, ...fresh]);
    doneRef.current = next;
    setDone(next);
    setToast(fresh.at(-1) ?? null);
  }, [play, coverOpen, tripReason, wiringView]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!visible) return null;

  const total = ROOM_OBJECTIVES.length;
  const count = done.size;
  const allDone = count === total;
  // Phones start collapsed so the list never covers the view; the board close-up needs the room.
  const expanded = (open ?? !coarse) && !(coarse && coverOpen);
  const toastItem = ROOM_OBJECTIVES.find((o) => o.id === toast);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 font-sans">
      <section
        aria-labelledby="room-objectives-title"
        className={cn(
          'pointer-events-auto absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] rounded-2xl border border-white/15 bg-black/65 text-white shadow-xl backdrop-blur-md',
          expanded ? 'w-[min(20rem,calc(100vw-1.5rem))]' : 'w-auto'
        )}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="room-objectives-list"
          onClick={() => setOpen(!expanded)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-4 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <span id="room-objectives-title" className="text-sm font-semibold">
            Things to try
          </span>
          <span className="flex items-center gap-2 text-xs tabular-nums text-white/75">
            <span className="sr-only">Completed</span>
            {count}/{total}
            <ChevronDown
              size={16}
              aria-hidden
              className={cn('transition-transform', expanded && 'rotate-180')}
            />
          </span>
        </button>
        <div
          className="mx-4 h-1 overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-label="Tour progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={count}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${(count / total) * 100}%` }}
          />
        </div>

        {expanded && (
          <ol id="room-objectives-list" className="max-h-[50dvh] space-y-0.5 overflow-y-auto p-2">
            {ROOM_OBJECTIVES.map((objective) => {
              const isDone = done.has(objective.id);
              return (
                <li key={objective.id} className="flex gap-3 rounded-xl px-2 py-1.5">
                  {isDone ? (
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-400"
                      aria-hidden
                    />
                  ) : (
                    <Circle size={18} className="mt-0.5 shrink-0 text-white/35" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-sm leading-snug',
                        isDone ? 'text-white' : 'text-white/90'
                      )}
                    >
                      <span className="sr-only">{isDone ? 'Done: ' : 'To do: '}</span>
                      {objective.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-white/60">
                      {isDone ? objective.fact : objective.where}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {allDone && (
          <div className={cn('border-t border-white/10 p-3', !expanded && 'mt-2')}>
            <p className="text-xs leading-snug text-white/75">
              That’s the tour. Need this done properly in your place?
            </p>
            <Link
              href="/contact"
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Get a quote
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        )}
        {!expanded && !allDone && <div className="h-2" />}
      </section>

      <div aria-live="polite" className="sr-only">
        {toastItem ? `Done: ${toastItem.label}. ${toastItem.fact}` : ''}
      </div>
      {toastItem && !expanded && (
        <div className="absolute left-1/2 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 animate-fade-in rounded-2xl border border-emerald-300/25 bg-black/75 px-4 py-3 text-white shadow-xl backdrop-blur-md max-sm:top-[calc(max(0.75rem,env(safe-area-inset-top))+7rem)]">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" aria-hidden />
            {toastItem.label}
          </p>
          <p className="mt-1 text-xs leading-snug text-white/75">{toastItem.fact}</p>
        </div>
      )}
    </div>
  );
}
