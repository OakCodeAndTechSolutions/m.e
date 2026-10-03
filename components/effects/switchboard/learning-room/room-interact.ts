import {
  BOARD_MOUNT,
  BOARD_STAND_X,
  facingDot,
  nearBoard,
  nearestRoomInteract,
  type RoomInteractId,
} from './room-layout';

export function tryRoomInteract(
  x: number,
  z: number,
  preferHigh: boolean,
  coverOpen: boolean,
  onInteract: (id: RoomInteractId) => void,
  requestCoverOpen: () => void,
  yaw?: number,
  closeCover?: () => void
): boolean {
  if (coverOpen) {
    closeCover?.();
    return Boolean(closeCover);
  }
  const hit = nearestRoomInteract(x, z, [], preferHigh, yaw);
  if (hit) {
    onInteract(hit.id);
    return true;
  }
  const facingBoard =
    yaw === undefined || facingDot(x, z, yaw, BOARD_STAND_X, BOARD_MOUNT.z) > 0.12;
  if (nearBoard(x, z) && facingBoard) {
    requestCoverOpen();
    return true;
  }
  return false;
}
