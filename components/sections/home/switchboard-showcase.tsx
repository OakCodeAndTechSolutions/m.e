'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Cable, DoorOpen, Gamepad2, Lightbulb, Play, ShieldCheck } from 'lucide-react';
import { HeroScene } from '@/components/effects/hero-scene';
import { RoomPoster } from '@/components/effects/room-poster';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCoarsePointer, useMediaQuery } from '@/lib/hooks';

const HIGHLIGHTS = [
  { icon: Lightbulb, text: 'Flip switches and dimmers' },
  { icon: ShieldCheck, text: 'Open the board and test an RCD' },
  { icon: Cable, text: 'Follow the cabling inside the walls' },
];

/** Live preview only where it is cheap: a desktop pointer, a wide screen and no Save-Data. */
const LIVE_PREVIEW_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 1024px)';

function prefersSavingData() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

// Fullscreen must escape the page's animated/isolated stacking contexts.
function RoomPortal({ active, children }: { active: boolean; children: ReactNode }) {
  const mount = useRef<HTMLDivElement>(null);
  const wasActive = useRef(false);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const attach = useCallback((node: HTMLDivElement | null) => {
    mount.current = node;
    if (!node) return;
    const element = document.createElement('div');
    element.style.display = 'contents';
    setHost(element);
    return () => element.remove();
  }, []);
  useLayoutEffect(() => {
    if (!host) return;
    const parent = active ? document.body : mount.current;
    parent?.appendChild(host);
    if (!active && wasActive.current) {
      requestAnimationFrame(() =>
        host.querySelector<HTMLButtonElement>('[data-room-enter]')?.focus({ preventScroll: true })
      );
    }
    wasActive.current = active;
  }, [active, host]);
  // Move one persistent portal host. Changing the portal target recreates WebGL,
  // uploads every texture again, and resets the player and appliance state.
  return (
    <>
      <div ref={attach} style={{ display: 'contents' }} />
      {host && createPortal(children, host)}
    </>
  );
}

/**
 * Full-bleed learning room. Copy lives above the canvas so it doesn't fight the 3D.
 * Play is OFF by default so the page can still scroll.
 */
export default function SwitchboardShowcase() {
  const [explore, setExplore] = useState(false);
  // Latched: once WebGL is created it stays mounted so exiting keeps the room's state.
  const [live, setLive] = useState(false);
  const { coarse } = useCoarsePointer();
  const livePreview = useMediaQuery(LIVE_PREVIEW_QUERY);
  const stageRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (live || !livePreview || !stage || prefersSavingData()) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setLive(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [live, livePreview]);

  const enter = () => {
    setLive(true);
    setExplore(true);
  };

  useEffect(() => {
    if (!explore) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.classList.add('room-playing');
    const shell = document.querySelector<HTMLElement>('[data-site-shell]');
    const previousInert = shell?.inert ?? false;
    if (shell) shell.inert = true;
    const focusFrame = requestAnimationFrame(() => exitRef.current?.focus({ preventScroll: true }));

    const onKey = (e: KeyboardEvent) => {
      if (roomRef.current?.querySelector('[aria-modal="true"]')) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        setExplore(false);
      }
      if (e.key !== 'Tab') return;
      const targets = Array.from(
        roomRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]'
        ) ?? []
      ).filter(
        (element) => element.getClientRects().length > 0 && !element.closest('[aria-hidden="true"]')
      );
      const first = targets[0];
      const last = targets.at(-1);
      if (!first || !last) return;
      if (
        e.shiftKey &&
        (document.activeElement === first || !roomRef.current?.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last || !roomRef.current?.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.classList.remove('room-playing');
      if (shell) shell.inert = previousInert;
      cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', onKey);
    };
  }, [explore]);

  return (
    <section
      id="switchboard-showcase"
      className="w-full max-w-[100vw] border-y border-border/40 bg-gradient-to-b from-background via-background to-muted/20"
      aria-labelledby="switchboard-showcase-title"
    >
      <div className="container max-w-4xl py-10 text-center sm:py-14">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Interactive installation
        </p>
        <h2
          id="switchboard-showcase-title"
          className="display-md font-display font-bold tracking-tight text-foreground text-balance"
        >
          Walk through a wired home
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          A kitchen and lounge built the way I’d wire yours. Use the fittings, open the switchboard
          and see where every cable runs.
        </p>
        <ul className="mt-6 flex flex-col items-center justify-center gap-x-6 gap-y-2 text-sm text-foreground/85 sm:flex-row sm:flex-wrap">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2 whitespace-nowrap">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div
        ref={stageRef}
        data-room-stage
        className="relative isolate min-h-[min(82vh,920px)] w-full overflow-x-clip overflow-y-hidden touch-pan-y sm:min-h-[min(78vh,840px)]"
      >
        <RoomPoster />
        <RoomPortal active={explore}>
          <div
            ref={roomRef}
            className="contents"
            role={explore ? 'dialog' : undefined}
            aria-modal={explore ? true : undefined}
            aria-label={explore ? 'Explore the electrical installation' : undefined}
          >
            <div
              className={cn(
                'overflow-hidden',
                explore
                  ? 'fixed inset-0 z-[60] h-dvh w-full overscroll-none touch-none'
                  : 'absolute inset-0 pointer-events-none'
              )}
              aria-hidden={!explore}
            >
              {live && (
                <HeroScene
                  observeId="switchboard-showcase"
                  controlsEnabled={explore}
                  onExit={() => setExplore(false)}
                  className={cn(
                    '!relative h-full max-w-full',
                    explore
                      ? 'min-h-0 touch-none'
                      : 'min-h-[min(82vh,920px)] touch-pan-y sm:min-h-[min(78vh,840px)]'
                  )}
                />
              )}
            </div>

            {explore ? (
              <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-end px-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
                <Button
                  ref={exitRef}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="pointer-events-auto min-h-11 touch-manipulation gap-2 border-white/20 bg-[#202824]/95 text-[#f3f1e9] backdrop-blur-md hover:bg-[#303b34] hover:text-white"
                  onClick={() => setExplore(false)}
                >
                  <DoorOpen className="h-4 w-4" />
                  Exit
                </Button>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-black/60 via-black/5 to-transparent px-4 pb-10 sm:pb-12">
                <div className="pointer-events-auto">
                  <Button
                    data-room-enter
                    type="button"
                    size="lg"
                    variant="default"
                    className="gradient-bg min-h-12 touch-manipulation gap-2 px-7 text-base font-semibold text-primary-foreground shadow-glow"
                    aria-haspopup="dialog"
                    onClick={enter}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Enter the room
                  </Button>
                </div>
                <p className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm">
                  {coarse ? (
                    <>
                      <Gamepad2 className="h-3.5 w-3.5" aria-hidden />
                      Stick to walk · drag to look · tap fittings
                    </>
                  ) : (
                    <>WASD to walk · drag to look · click or F to use</>
                  )}
                </p>
              </div>
            )}
          </div>
        </RoomPortal>
      </div>
    </section>
  );
}
