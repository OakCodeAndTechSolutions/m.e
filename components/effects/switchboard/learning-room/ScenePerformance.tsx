'use client';

import { useEffect, useRef } from 'react';
import { useProgress } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useSwitchboard } from '../SwitchboardContext';
import { useGameInput } from './GameInputContext';
import { createFrameBudget, sampleFrameBudget } from './frame-budget';

/** Static shadows while walking; refresh when geometry arrives or a door moves. */
export function ScenePerformance({ onDprChange }: { onDprChange: (dpr: number) => void }) {
  const { gl, invalidate } = useThree();
  const renderer = useRef(gl);
  const { play, traceCircuit } = useGameInput();
  const { coverOpen, escutcheonRemoved, mainOn, rcboOn } = useSwitchboard();
  // Poll the loader store from the frame loop. Subscribing here would synchronously
  // set React state when a newly revealed useTexture starts loading during render.
  const loaded = useRef(0);
  const refreshAt = useRef(0);
  const sample = useRef(createFrameBudget(gl.getPixelRatio()));
  const settleUntil = useRef(0);
  const statsAt = useRef(0);

  useEffect(() => {
    const shadowMap = renderer.current.shadowMap;
    const previous = shadowMap.autoUpdate;
    shadowMap.autoUpdate = false;
    return () => {
      shadowMap.autoUpdate = previous;
    };
  }, [gl]);

  useEffect(() => {
    settleUntil.current = performance.now() + 1000;
    invalidate();
    const refresh = window.setTimeout(() => {
      renderer.current.shadowMap.needsUpdate = true;
      invalidate();
    }, 100);
    const settled = window.setTimeout(() => {
      renderer.current.shadowMap.needsUpdate = true;
      invalidate();
    }, 1000);
    return () => {
      window.clearTimeout(refresh);
      window.clearTimeout(settled);
    };
  }, [
    gl,
    invalidate,
    play.fridgeOpen,
    play.openById,
    play.lightSwitchOn,
    play.loungeDimmer,
    coverOpen,
    escutcheonRemoved,
    mainOn,
    rcboOn,
    traceCircuit,
  ]);

  useFrame((state, delta) => {
    const now = performance.now();
    const progress = useProgress.getState();
    if (process.env.NODE_ENV === 'development' && now - statsAt.current > 1000) {
      statsAt.current = now;
      renderer.current.domElement.dataset.roomPerformance = JSON.stringify({
        loading: progress.active,
        loop: state.frameloop,
        qualityLevel: sample.current.level,
        dpr: renderer.current.getPixelRatio(),
        calls: renderer.current.info.render.calls,
        triangles: renderer.current.info.render.triangles,
        geometries: renderer.current.info.memory.geometries,
        textures: renderer.current.info.memory.textures,
      });
    }
    if (progress.loaded !== loaded.current) {
      loaded.current = progress.loaded;
      refreshAt.current = now + 100;
      settleUntil.current = now + 1000;
    }
    if (refreshAt.current && now >= refreshAt.current) {
      renderer.current.shadowMap.needsUpdate = true;
      refreshAt.current = 0;
    }
    if (now < settleUntil.current) invalidate();
    if (progress.active || state.frameloop !== 'always' || document.hidden) return;
    const dpr = sampleFrameBudget(sample.current, delta);
    // Keep Canvas's prop in sync: imperative setDpr alone is overwritten on resize
    // and context updates, silently undoing adaptation while leaving the sample reduced.
    if (dpr !== null) onDprChange(Math.min(window.devicePixelRatio, dpr));
  });
  return null;
}
