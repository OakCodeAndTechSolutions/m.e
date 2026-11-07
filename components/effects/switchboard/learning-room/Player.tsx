'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Group, MathUtils, PerspectiveCamera, Quaternion, Raycaster, Vector3 } from 'three';
import { useCoarsePointer, useMediaQuery } from '@/lib/hooks';
import { CIRCUITS } from '../circuit-data';
import { BOARD_INSPECT, IDLE_CAMERA, PLAYER_SPAWN, nearBoard } from './room-layout';
import { useGameInput } from './GameInputContext';
import { isLookDragActive, markInteract, wasRecentInteract } from '../interaction';
import { useSwitchboard } from '../SwitchboardContext';
import {
  boardInspectCameraAnchor,
  mergeMoveKeys,
  moveIntent,
  playingCameraAnchor,
  shockShakeOffset,
  stepPlayerPoseBudget,
  type PlayerPose,
} from './player-motion';
import { boardControlTarget, roomTargetAtView } from './room-target';
import type { RoomPlayState } from './room-play';
import { emptyKeys, usePlayerInput, type Zoom } from './use-player-input';

type Props = {
  enabled: boolean;
  onExit: () => void;
  play: RoomPlayState;
};

const FOV_DEFAULT = 64;
const FOV_ZOOM = 28;
const FOV_BOARD = BOARD_INSPECT.fov;
const BOARD_DEVICES = ['main', ...CIRCUITS.map((circuit) => circuit.id)];

export function Player({ enabled, onExit, play }: Props) {
  const { gl, events, invalidate, scene, camera } = useThree();
  const { coverOpen, coverPromptOpen, denyCoverOpen, closeCover, setHovered } = useSwitchboard();
  const {
    traceCircuit,
    traceDetail,
    setTraceDetail,
    mobileKeys,
    isStunned,
    setStunned,
    setActionPrompt,
    setPointerHintsEnabled,
    setPointerHint,
    setNearBoard,
  } = useGameInput();
  const { coarseRef } = useCoarsePointer();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const keysRef = useRef(emptyKeys());
  const zoomRef = useRef<Zoom>({ hold: false, amount: 0 });
  const pose = useRef<PlayerPose>({
    x: PLAYER_SPAWN.x,
    z: PLAYER_SPAWN.z,
    yaw: -2.35,
    pitch: -0.1,
    moving: false,
  });
  const dummyRef = useRef(new Group());
  const look = useRef({
    x: IDLE_CAMERA.target[0],
    y: IDLE_CAMERA.target[1],
    z: IDLE_CAMERA.target[2],
  });
  const promptRef = useRef<string | null>(null);
  const boardNearRef = useRef(false);
  const aimRay = useRef(new Raycaster());
  const keyboardDevice = useRef<string | null>(null);
  const shake = useRef(0);
  const hoverRefresh = useRef(0);
  const promptRefresh = useRef(0);
  const cameraTransition = useRef(0);
  const lastPickPosition = useRef(new Vector3(Infinity, Infinity, Infinity));
  const lastPickRotation = useRef(new Quaternion());

  // DEV-ONLY camera hook for design screenshots; remove before commit.
  const devCam = useRef<{
    p: [number, number, number];
    t: [number, number, number];
    fov: number;
  } | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as Record<string, unknown>;
    w.__roomCam = (p: [number, number, number], t: [number, number, number], fov = 64) => {
      devCam.current = { p, t, fov };
      invalidate();
    };
    w.__roomCamClear = () => {
      devCam.current = null;
      invalidate();
    };
    w.__roomPose = (x: number, z: number, yaw: number, pitch = 0) => {
      devCam.current = null;
      pose.current = { ...pose.current, x, z, yaw, pitch };
      cameraTransition.current = 0;
    };
  }, [invalidate]);

  useEffect(() => {
    cameraTransition.current = 0.8;
    if (!coverOpen) {
      keyboardDevice.current = null;
      setHovered(null);
      setTraceDetail(false);
    }
  }, [enabled, coverOpen, setHovered, setTraceDetail]);

  useEffect(() => {
    if (!enabled) {
      closeCover();
      denyCoverOpen();
      setActionPrompt(null);
      setPointerHintsEnabled(true);
      setPointerHint(null);
      setNearBoard(false);
      promptRef.current = null;
      boardNearRef.current = false;
    }
  }, [enabled, closeCover, denyCoverOpen, setActionPrompt, setNearBoard, setPointerHintsEnabled, setPointerHint]);

  useEffect(() => {
    const onShock = () => setStunned(1800);
    window.addEventListener('switchboard-shock', onShock);
    return () => window.removeEventListener('switchboard-shock', onShock);
  }, [setStunned]);

  usePlayerInput({
    enabled,
    gl,
    pose,
    keysRef,
    zoomRef,
    coarseRef,
    coverOpen,
    coverPromptOpen,
    onExit,
    onUse: () => {
      if (isStunned() || wasRecentInteract()) return;
      setPointerHintsEnabled(false);
      camera.updateMatrixWorld();
      const target =
        coverOpen && keyboardDevice.current
          ? boardControlTarget(scene, keyboardDevice.current, 'toggle')
          : roomTargetAtView(scene, camera, aimRay.current);
      if (!target) return;
      markInteract();
      target.activate();
    },
    onBoardKey: (code) => {
      if (code === 'KeyT') {
        setPointerHintsEnabled(false);
        const id =
          keyboardDevice.current ?? roomTargetAtView(scene, camera, aimRay.current)?.device?.id;
        const test = id ? boardControlTarget(scene, id, 'test') : null;
        if (test && !wasRecentInteract()) {
          markInteract();
          test.activate();
        }
        return true;
      }
      if (code !== 'ArrowLeft' && code !== 'ArrowRight') return false;
      setPointerHintsEnabled(false);
      const devices = BOARD_DEVICES.filter((id) => boardControlTarget(scene, id, 'toggle'));
      if (!devices.length) return true;
      const index = keyboardDevice.current ? devices.indexOf(keyboardDevice.current) : -1;
      const offset = code === 'ArrowRight' ? 1 : -1;
      const nextIndex =
        index < 0
          ? offset > 0
            ? 0
            : devices.length - 1
          : (index + offset + devices.length) % devices.length;
      const selected = devices[nextIndex]!;
      keyboardDevice.current = selected;
      setHovered(selected);
      return true;
    },
    onPointerActivity: () => {
      setPointerHintsEnabled(true);
      if (keyboardDevice.current) {
        keyboardDevice.current = null;
        setHovered(null);
      }
    },
    denyCoverOpen,
    closeCover,
  });

  useFrame(({ camera, clock }, delta) => {
    // A tab resume or shader compilation must not fling the camera across the room.
    delta = Math.min(delta, 0.1);
    cameraTransition.current = Math.max(0, cameraTransition.current - delta);
    const dummy = dummyRef.current;
    const persp = camera as PerspectiveCamera;
    const stunned = isStunned();
    const m = mobileKeys.current;
    const p = pose.current;
    const inspecting = zoomRef.current.hold || m.inspect;
    const merged = mergeMoveKeys(keysRef.current, m);
    const aspect = persp.aspect > 0.2 ? persp.aspect : 16 / 9;

    if (devCam.current) {
      const d = devCam.current;
      camera.position.set(...d.p);
      camera.lookAt(...d.t);
      if (persp.fov !== d.fov) {
        persp.fov = d.fov;
        persp.updateProjectionMatrix();
      }
      return;
    }

    if (enabled) {
      if (coverOpen && !coverPromptOpen && moveIntent(merged)) closeCover();
      const boardLocked = coverOpen || coverPromptOpen;
      const blocked = stunned || boardLocked;
      const next = stepPlayerPoseBudget(
        p,
        boardLocked ? { ...emptyKeys(), stickX: 0, stickY: 0 } : merged,
        Math.min(delta, 0.25),
        blocked,
        { dishwasher: !!play.openById.dishwasher, fridge: play.fridgeOpen }
      );
      pose.current = next;
      if (stunned && !reducedMotion) shake.current = Math.max(shake.current, 0.35);

      const boardNear = coverOpen || nearBoard(next.x, next.z);
      if (boardNear !== boardNearRef.current) {
        boardNearRef.current = boardNear;
        setNearBoard(boardNear);
      }
    }

    if (zoomRef.current.amount > 0 && !zoomRef.current.hold) {
      zoomRef.current.amount = MathUtils.damp(zoomRef.current.amount, 0, 5.5, delta);
      if (zoomRef.current.amount < 0.02) zoomRef.current.amount = 0;
    }

    const zoomT = enabled && !coverOpen ? Math.max(inspecting ? 1 : 0, zoomRef.current.amount) : 0;
    const targetFov =
      coverOpen && enabled ? FOV_BOARD : MathUtils.lerp(FOV_DEFAULT, FOV_ZOOM, zoomT);
    if (Math.abs(persp.fov - targetFov) > 0.05) {
      persp.fov = MathUtils.damp(persp.fov, targetFov, coverOpen ? 7 : 10, delta);
      persp.updateProjectionMatrix();
    }

    if (!enabled) {
      dummy.position.set(IDLE_CAMERA.position[0], IDLE_CAMERA.position[1], IDLE_CAMERA.position[2]);
      camera.position.lerp(dummy.position, 1 - Math.pow(0.04, delta));
      look.current.x = MathUtils.damp(look.current.x, IDLE_CAMERA.target[0], 5, delta);
      look.current.y = MathUtils.damp(look.current.y, IDLE_CAMERA.target[1], 5, delta);
      look.current.z = MathUtils.damp(look.current.z, IDLE_CAMERA.target[2], 5, delta);
      camera.lookAt(look.current.x, look.current.y, look.current.z);
      if (
        camera.position.distanceToSquared(dummy.position) > 0.000001 ||
        Math.abs(look.current.x - IDLE_CAMERA.target[0]) +
          Math.abs(look.current.y - IDLE_CAMERA.target[1]) +
          Math.abs(look.current.z - IDLE_CAMERA.target[2]) >
          0.001
      )
        invalidate();
      return;
    }

    const anchor = coverOpen
      ? boardInspectCameraAnchor(aspect, traceCircuit !== '', traceDetail ? traceCircuit : '')
      : playingCameraAnchor(pose.current, zoomT);
    dummy.position.set(anchor.posX, anchor.posY, anchor.posZ);

    if (!reducedMotion && shake.current > 0.01) {
      shake.current = MathUtils.damp(shake.current, 0, 4, delta);
      const off = shockShakeOffset(clock.elapsedTime, shake.current);
      dummy.position.x += off.x;
      dummy.position.y += off.y;
    } else {
      shake.current = 0;
    }

    const turning =
      keysRef.current.turnLeft || keysRef.current.turnRight || m.turnLeft || m.turnRight;
    if (!coverOpen && (isLookDragActive() || cameraTransition.current === 0)) {
      camera.position.copy(dummy.position);
      look.current.x = anchor.lookX;
      look.current.y = anchor.lookY;
      look.current.z = anchor.lookZ;
    } else {
      const camLambda = coverOpen ? 6.5 : turning ? 14 : 9;
      camera.position.x = MathUtils.damp(camera.position.x, dummy.position.x, camLambda, delta);
      camera.position.y = MathUtils.damp(camera.position.y, dummy.position.y, camLambda, delta);
      camera.position.z = MathUtils.damp(camera.position.z, dummy.position.z, camLambda, delta);
      const lookLambda = coverOpen ? 8 : turning ? 22 : 16;
      look.current.x = MathUtils.damp(look.current.x, anchor.lookX, lookLambda, delta);
      look.current.y = MathUtils.damp(look.current.y, anchor.lookY, lookLambda, delta);
      look.current.z = MathUtils.damp(look.current.z, anchor.lookZ, lookLambda, delta);
    }
    camera.lookAt(look.current.x, look.current.y, look.current.z);
    promptRefresh.current += delta;
    if (promptRefresh.current > 0.12 && !isLookDragActive()) {
      promptRefresh.current = 0;
      camera.updateMatrixWorld();
      const selected = coverOpen ? keyboardDevice.current : null;
      const target = coverPromptOpen
        ? null
        : selected
          ? boardControlTarget(scene, selected, 'toggle')
          : roomTargetAtView(scene, camera, aimRay.current);
      const canTest = selected && boardControlTarget(scene, selected, 'test');
      const prompt = target
        ? coarseRef.current || target.actionable === false
          ? target.prompt
          : 'F · ' + target.prompt + (canTest ? ' · T test' : '')
        : coverOpen && !coverPromptOpen && !coarseRef.current
          ? '← / → Select breaker'
          : null;
      if (prompt !== promptRef.current) {
        promptRef.current = prompt;
        setActionPrompt(prompt);
      }
    }
    // Re-pick a stationary mouse as the camera moves. Touch picks on the tap itself.
    hoverRefresh.current += delta;
    if (!coarseRef.current && hoverRefresh.current > 0.1 && !isLookDragActive()) {
      hoverRefresh.current = 0;
      if (
        camera.position.distanceToSquared(lastPickPosition.current) > 0.000001 ||
        camera.quaternion.angleTo(lastPickRotation.current) > 0.001
      ) {
        // The event raycaster reads matrixWorld, which the renderer updates later.
        camera.updateMatrixWorld();
        events.update?.();
        lastPickPosition.current.copy(camera.position);
        lastPickRotation.current.copy(camera.quaternion);
      }
    }
  });

  return null;
}
