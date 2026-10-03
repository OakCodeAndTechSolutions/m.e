import { MathUtils } from 'three';
import {
  BOARD_FACE_OFFSET,
  BOARD_INSPECT,
  BOARD_MOUNT,
  BOARD_STAND_X,
  PLAYER,
  resolveOpenDoors,
  resolvePlayerPosition,
} from './room-layout';

export type PlayerPose = {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  moving: boolean;
};

export type MoveKeys = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  stickX?: number;
  stickY?: number;
};

const STICK_DEADZONE = 0.1;

/** Map a pointer delta to a circular analog stick in [-1, 1]. */
export function analogFromDelta(dx: number, dy: number, max: number): { x: number; y: number } {
  if (!(max > 0) || !Number.isFinite(dx) || !Number.isFinite(dy)) return { x: 0, y: 0 };
  const mag = Math.hypot(dx, dy);
  if (mag < 1e-6) return { x: 0, y: 0 };
  const scale = Math.min(1, mag / max);
  return { x: (dx / mag) * scale, y: (dy / mag) * scale };
}

export function moveIntent(keys: MoveKeys): boolean {
  if (keys.forward || keys.back || keys.left || keys.right || keys.turnLeft || keys.turnRight) {
    return true;
  }
  const sx = keys.stickX ?? 0;
  const sy = keys.stickY ?? 0;
  return Math.hypot(sx, sy) > STICK_DEADZONE;
}

export function mergeMoveKeys(a: MoveKeys, b: MoveKeys): MoveKeys {
  return {
    forward: a.forward || b.forward,
    back: a.back || b.back,
    left: a.left || b.left,
    right: a.right || b.right,
    turnLeft: a.turnLeft || b.turnLeft,
    turnRight: a.turnRight || b.turnRight,
    stickX: MathUtils.clamp((a.stickX ?? 0) + (b.stickX ?? 0), -1, 1),
    stickY: MathUtils.clamp((a.stickY ?? 0) + (b.stickY ?? 0), -1, 1),
  };
}

export function stepPlayerPose(
  pose: PlayerPose,
  keys: MoveKeys,
  dt: number,
  stunned: boolean,
  doors: { dishwasher?: boolean; fridge?: boolean }
): PlayerPose {
  let { x, z, yaw } = pose;
  const pitch = MathUtils.clamp(pose.pitch, PLAYER.pitchMin, PLAYER.pitchMax);
  let moving = false;
  if (!stunned) {
    if (keys.turnLeft) yaw += PLAYER.turnSpeed * dt;
    if (keys.turnRight) yaw -= PLAYER.turnSpeed * dt;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    let vx = 0;
    let vz = 0;
    let analogMag = 0;
    const sx = keys.stickX ?? 0;
    const sy = keys.stickY ?? 0;
    const analog = Math.hypot(sx, sy);
    if (analog > STICK_DEADZONE) {
      analogMag = Math.min(1, analog);
      const fwd = (-sy / analog) * analogMag;
      const right = (sx / analog) * analogMag;
      vx = fwd * sin - right * cos;
      vz = fwd * cos + right * sin;
    } else {
      if (keys.forward) {
        vx += sin;
        vz += cos;
      }
      if (keys.back) {
        vx -= sin;
        vz -= cos;
      }
      if (keys.left) {
        vx += cos;
        vz -= sin;
      }
      if (keys.right) {
        vx -= cos;
        vz += sin;
      }
    }
    const len = Math.hypot(vx, vz);
    moving = len > 1e-4;
    if (moving) {
      const scale = analogMag > 0 ? analogMag : 1;
      const step = (PLAYER.speed * scale * dt) / len;
      // Separate axes so a blocked heading still slides along furniture.
      const alongX = resolvePlayerPosition(x + vx * step, z);
      const alongZ = resolvePlayerPosition(alongX.x, z + vz * step);
      x = alongZ.x;
      z = alongZ.z;
    }
  }
  const after = resolveOpenDoors(x, z, doors);
  return { x: after.x, z: after.z, yaw, pitch, moving };
}

/** Integrator cap — substep long frames so walk speed stays wall-clock. */
export const PLAYER_DT_CAP = 0.05;

export function stepPlayerPoseBudget(
  pose: PlayerPose,
  keys: MoveKeys,
  dt: number,
  stunned: boolean,
  doors: { dishwasher?: boolean; fridge?: boolean }
): PlayerPose {
  let remaining = Math.max(0, dt);
  let current = pose;
  while (remaining > 1e-8) {
    const slice = Math.min(PLAYER_DT_CAP, remaining);
    current = stepPlayerPose(current, keys, slice, stunned, doors);
    remaining -= slice;
  }
  return current;
}

export type CameraAnchor = {
  posX: number;
  posY: number;
  posZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
};

/** 0 far from the board, 1 standing in front of it. */
export function boardApproach(x: number, z: number): number {
  const dist = Math.hypot(x - BOARD_STAND_X, z - BOARD_MOUNT.z);
  return 1 - MathUtils.smoothstep(dist, 0.7, 2.15);
}

/** Eye-level first-person camera: looking never moves the viewer backwards. */
export function playingCameraAnchor(pose: PlayerPose, _zoomT: number): CameraAnchor {
  // Zoom changes the lens in Player, never the eye position.
  void _zoomT;
  const pitch = MathUtils.clamp(pose.pitch, PLAYER.pitchMin, PLAYER.pitchMax);
  const height = PLAYER.height;
  return {
    posX: pose.x,
    posY: height,
    posZ: pose.z,
    lookX: pose.x + Math.sin(pose.yaw) * Math.cos(pitch) * 3,
    lookY: height + Math.sin(pitch) * 3,
    lookZ: pose.z + Math.cos(pose.yaw) * Math.cos(pitch) * 3,
  };
}
/** Dolly onto the enclosure face so circuit IDs and toggles are usable. */
/** Camera distance from the board's mount centre that frames the device row. */
export function boardInspectDistance(aspect = 16 / 9): number {
  const halfFov = MathUtils.degToRad(BOARD_INSPECT.fov) / 2;
  const tanHalf = Math.tan(halfFov);
  const distH = BOARD_INSPECT.height / 2 / tanHalf;
  const distW = BOARD_INSPECT.width / 2 / (tanHalf * Math.max(aspect, 0.35));
  return BOARD_FACE_OFFSET + Math.max(distH, distW, BOARD_INSPECT.minDistance);
}

export function boardInspectCameraAnchor(aspect = 16 / 9): CameraAnchor {
  const dist = boardInspectDistance(aspect);
  return {
    posX: BOARD_MOUNT.x + dist,
    posY: BOARD_MOUNT.y + 0.006,
    posZ: BOARD_MOUNT.z,
    lookX: BOARD_MOUNT.x + BOARD_FACE_OFFSET,
    lookY: BOARD_MOUNT.y + BOARD_INSPECT.lookYBias,
    lookZ: BOARD_MOUNT.z,
  };
}

/** Deterministic shock offset — avoids per-frame Math.random. */
export function shockShakeOffset(elapsed: number, amount: number): { x: number; y: number } {
  return {
    x: Math.sin(elapsed * 53.1) * amount * 0.12,
    y: Math.cos(elapsed * 41.7) * amount * 0.08,
  };
}
