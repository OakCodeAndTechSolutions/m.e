'use client';

import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { RoomPoster } from './room-poster';

const HeroSceneCanvas = dynamic(() => import('./hero-scene-canvas'), {
  ssr: false,
  loading: () => <RoomPoster />,
});

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="absolute inset-0" role="status">
        <RoomPoster />
        <div className="absolute inset-0 grid place-content-center bg-black/55 p-6 text-center text-white">
          <p className="font-medium">The interactive room couldn’t load on this device.</p>
          <button
            type="button"
            className="mx-auto mt-3 min-h-11 rounded-md px-4 underline underline-offset-4"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

interface HeroSceneProps {
  className?: string;
  observeId?: string;
  controlsEnabled?: boolean;
  onExit?: () => void;
}

export function HeroScene({
  className,
  observeId = 'immersive-hero',
  controlsEnabled = false,
  onExit,
}: HeroSceneProps) {
  const [visible, setVisible] = useState(false);
  const [requested, setRequested] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  useEffect(() => {
    const el = document.getElementById(observeId);
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { threshold: 0.05 }
    );
    observer.observe(el);
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRequested(true);
          preload.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    preload.observe(el);
    return () => {
      observer.disconnect();
      preload.disconnect();
    };
  }, [observeId]);

  return (
    <div
      // Look-drags cross the HUD; they must never start a text selection.
      className={cn(
        'absolute inset-0 max-w-full select-none overflow-hidden touch-pan-y',
        className
      )}
      aria-hidden={!controlsEnabled}
      style={{ pointerEvents: controlsEnabled ? 'auto' : 'none' }}
    >
      <SceneErrorBoundary>
        <Suspense fallback={<RoomPoster />}>
          {requested || controlsEnabled ? (
            <HeroSceneCanvas
              active={pageVisible && (controlsEnabled || visible)}
              controlsEnabled={controlsEnabled}
              onExit={onExit}
            />
          ) : (
            <RoomPoster />
          )}
        </Suspense>
      </SceneErrorBoundary>
    </div>
  );
}
