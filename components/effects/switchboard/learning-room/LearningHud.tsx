'use client';

import { useRef, useState } from 'react';
import { Cable, ZoomOut } from 'lucide-react';
import { useCoarsePointer } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { OPEN_SWITCHBOARD_PROMPT } from '../interaction';
import { useSwitchboard } from '../SwitchboardContext';
import { CIRCUIT_TRACES } from './circuit-trace';
import { useGameHud, useGameInput } from './GameInputContext';

const BUTTON =
  'pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/75 px-3 text-xs font-medium text-white transition hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';
const TOP_LEFT =
  'absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))]';

export function LearningHud({ visible }: { visible: boolean }) {
  const { traceCircuit, setTraceCircuit, traceDetail, setTraceDetail } = useGameInput();
  const { coverOpen, requestCoverOpen, closeCover } = useSwitchboard();
  const { pointerHint, actionPrompt, nearBoard } = useGameHud();
  const { coarse } = useCoarsePointer();
  const [panelOpen, setPanelOpen] = useState(false);
  const traceButton = useRef<HTMLButtonElement>(null);
  const trace = CIRCUIT_TRACES.find((c) => c.id === traceCircuit);
  const traceAvailable = nearBoard || coverOpen || !!trace;
  const showTrace = traceAvailable && panelOpen;
  const hint = pointerHint || actionPrompt;
  const canOpenBoard = coarse && nearBoard && !coverOpen && actionPrompt === OPEN_SWITCHBOARD_PROMPT;

  if (!visible) return null;

  const toggleDetail = () => {
    setTraceDetail(!traceDetail);
    setPanelOpen(false);
    traceButton.current?.focus();
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-50 font-sans">
      {traceAvailable && (
        <div className={cn(TOP_LEFT, 'flex flex-wrap gap-2 pr-24')}>
          <button
            ref={traceButton}
            type="button"
            aria-expanded={showTrace}
            aria-controls={showTrace ? 'room-circuit-trace' : undefined}
            onClick={() => setPanelOpen(!showTrace)}
            className={BUTTON}
          >
            <Cable size={16} className={trace ? 'text-amber-300' : undefined} aria-hidden />
            Trace wiring
          </button>
          {trace && coverOpen && traceDetail && !showTrace && (
            <button
              type="button"
              onClick={toggleDetail}
              className={BUTTON}
              aria-label="Show whole switchboard"
            >
              <ZoomOut size={16} aria-hidden />
              {trace.name}
            </button>
          )}
        </div>
      )}
      {showTrace && (
        <section
          id="room-circuit-trace"
          className="pointer-events-auto absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[calc(max(0.75rem,env(safe-area-inset-top))+3.3rem)] w-[min(17rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-5rem)] overflow-auto rounded-xl border border-white/15 bg-black/85 p-3 text-white shadow-lg"
        >
          <label className="block text-xs font-semibold" htmlFor="room-trace-circuit">
            Circuit on the exposed wall
          </label>
          <select
            id="room-trace-circuit"
            value={traceCircuit}
            onChange={(event) => {
              setTraceCircuit(event.target.value);
              setTraceDetail(false);
            }}
            className="mt-2 min-h-11 w-full rounded-lg border border-white/30 bg-neutral-900 px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            <option value="">Show all cables</option>
            {CIRCUIT_TRACES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {trace && (
            <p className="mt-2 text-xs leading-relaxed text-white/85" role="status">
              {trace.route}
            </p>
          )}
          {trace && coverOpen && trace.id !== 'submain' && (
            <button
              type="button"
              onClick={toggleDetail}
              className="mt-2 min-h-11 w-full rounded-lg border border-amber-300/45 bg-amber-300/10 px-2 text-xs font-medium text-amber-100 hover:bg-amber-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              {traceDetail ? 'Show whole switchboard' : 'Inspect this breaker'}
            </button>
          )}
        </section>
      )}
      {coarse && coverOpen && (
        <button
          type="button"
          className={cn(
            BUTTON,
            'absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] touch-manipulation'
          )}
          onClick={closeCover}
        >
          Close switchboard
        </button>
      )}
      {canOpenBoard && !showTrace ? (
        <button
          type="button"
          className={cn(
            BUTTON,
            'absolute bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+6rem)] left-1/2 -translate-x-1/2 touch-manipulation'
          )}
          onClick={requestCoverOpen}
        >
          {OPEN_SWITCHBOARD_PROMPT}
        </button>
      ) : hint && !showTrace ? (
        <p
          role="status"
          className={cn(
            'absolute left-1/2 max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-full bg-black/75 px-3.5 py-2 text-center text-xs leading-snug text-white/95',
            coarse
              ? 'bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+6rem)]'
              : 'bottom-[max(1.5rem,env(safe-area-inset-bottom))]'
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
