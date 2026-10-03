'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping, PCFShadowMap } from 'three';
import { SwitchboardProvider } from './switchboard/SwitchboardContext';
import { CanvasPointerGate } from './switchboard/scene/CanvasPointerGate';
import { CoverLicensePrompt } from './switchboard/learning-room/CoverLicensePrompt';
import { GameInputProvider } from './switchboard/learning-room/GameInputContext';
import { LearningHud } from './switchboard/learning-room/LearningHud';
import { LearningScene } from './switchboard/learning-room/LearningScene';
import { MobileControls } from './switchboard/learning-room/MobileControls';
import { ShockOverlay } from './switchboard/learning-room/ShockOverlay';
import { preloadRoomModelPaths } from './switchboard/learning-room/room-assets';
import { preloadKeptGltf } from './switchboard/learning-room/useKeptGltf';
import { IDLE_CAMERA } from './switchboard/learning-room/room-layout';
import { RoomObjectives } from './switchboard/learning-room/RoomObjectives';
import { RoomPoster } from './room-poster';
import { cn } from '@/lib/utils';

for (const path of preloadRoomModelPaths()) {
  preloadKeptGltf(path);
}

interface HeroSceneCanvasProps {
  active?: boolean;
  controlsEnabled?: boolean;
  onExit?: () => void;
}

/**
 * Holds the poster over the canvas until the scene has mounted and the loaders are idle,
 * then fades away once. Later loads (the wiring cutaway) never bring it back.
 * Subscribes to loader progress here so the Canvas tree does not re-render per asset.
 */
function RoomLoadingOverlay({
  sceneReady,
  showStatus,
}: {
  sceneReady: boolean;
  /** The preview's poster already stands in; progress only matters once someone has entered. */
  showStatus: boolean;
}) {
  const { active, progress } = useProgress();
  const [revealed, setRevealed] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (revealed || !sceneReady || active) return;
    // Loaders go briefly idle between files; wait for a quiet moment before revealing.
    const timer = window.setTimeout(() => setRevealed(true), 350);
    return () => window.clearTimeout(timer);
  }, [revealed, sceneReady, active]);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => setGone(true), 600);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  if (gone) return null;
  const percent = Math.round(Math.min(progress, 99));
  return (
    <div
      className={cn(
        // Above the canvas, below the Enter button (z-10 in the showcase) and the room HUD.
        'pointer-events-none absolute inset-0 z-[5] transition-opacity duration-500',
        revealed ? 'opacity-0' : 'opacity-100'
      )}
    >
      <RoomPoster />
      {showStatus && (
        <div
          role="status"
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full bg-black/70 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm"
        >
          <span>{revealed ? 'Room ready' : 'Wiring up the room…'}</span>
          <span className="relative h-1 w-20 overflow-hidden rounded-full bg-white/20" aria-hidden>
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${revealed ? 100 : Math.max(percent, 6)}%` }}
            />
          </span>
          <span className="w-8 tabular-nums text-white/70">
            {revealed ? '100%' : `${percent}%`}
          </span>
        </div>
      )}
    </div>
  );
}

function LearningCanvasScene({
  controlsEnabled,
  onExit,
  onReady,
  onDprChange,
}: {
  controlsEnabled: boolean;
  onExit: () => void;
  onReady: () => void;
  onDprChange: (dpr: number) => void;
}) {
  useEffect(onReady, [onReady]);
  return (
    <>
      <CanvasPointerGate controlsEnabled={controlsEnabled} />
      <LearningScene controlsEnabled={controlsEnabled} onExit={onExit} onDprChange={onDprChange} />
    </>
  );
}

export default function HeroSceneCanvas({
  active = true,
  controlsEnabled = false,
  onExit,
}: HeroSceneCanvasProps) {
  const [ready, setReady] = useState(false);
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio, 1.25));
  const onReady = useCallback(() => setReady(true), []);
  return (
    <SwitchboardProvider>
      <GameInputProvider>
        <Canvas
          camera={{
            position: [...IDLE_CAMERA.position],
            fov: 64,
            near: 0.04,
            far: 60,
          }}
          dpr={dpr}
          frameloop={!active ? 'never' : controlsEnabled ? 'always' : 'demand'}
          className={`!absolute inset-0 !h-full !w-full !max-w-full ${
            controlsEnabled ? 'cursor-pointer' : ''
          }`}
          style={{
            pointerEvents: controlsEnabled ? 'auto' : 'none',
            touchAction: controlsEnabled ? 'none' : 'pan-y',
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            display: 'block',
          }}
          shadows={{ type: PCFShadowMap }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl, camera }) => {
            gl.setClearColor(0xb8b8be, 1);
            gl.shadowMap.type = PCFShadowMap;
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.domElement.style.pointerEvents = 'none';
            gl.domElement.style.touchAction = 'pan-y';
            gl.domElement.style.display = 'block';
            gl.domElement.style.width = '100%';
            gl.domElement.style.height = '100%';
            camera.lookAt(IDLE_CAMERA.target[0], IDLE_CAMERA.target[1], IDLE_CAMERA.target[2]);
          }}
        >
          <Suspense fallback={null}>
            <LearningCanvasScene
              controlsEnabled={controlsEnabled}
              onExit={onExit ?? (() => undefined)}
              onReady={onReady}
              onDprChange={setDpr}
            />
          </Suspense>
        </Canvas>
        <RoomLoadingOverlay sceneReady={ready} showStatus={controlsEnabled} />
        <LearningHud visible={controlsEnabled} />
        <RoomObjectives visible={controlsEnabled} />
        <MobileControls visible={controlsEnabled} />
        <CoverLicensePrompt />
        <ShockOverlay />
      </GameInputProvider>
    </SwitchboardProvider>
  );
}
