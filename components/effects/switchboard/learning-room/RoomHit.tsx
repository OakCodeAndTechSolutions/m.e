'use client';

import { useSwitchboard } from '../SwitchboardContext';
import { useGameInput } from './GameInputContext';
import { ROOM_LOADS, type RoomInteractId } from './room-layout';
import { roomActionPrompt } from './room-prompt';
import { useRoomTarget } from './use-room-target';

type Props = {
  onToggle: () => void;
  size: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  enabled?: boolean;
  hitId: RoomInteractId;
};

/** Shared invisible hit volume for look, click and tap. */
export function RoomHit({ onToggle, size, position, rotation, enabled = true, hitId }: Props) {
  const { play } = useGameInput();
  const { liveById, coverOpen } = useSwitchboard();
  const prompt = roomActionPrompt(hitId, play, {
    powerLive: !!liveById[ROOM_LOADS.power],
    hobLive: !!liveById[ROOM_LOADS.induction] && play.isolatorOn,
    loungePowerLive: !!liveById[ROOM_LOADS.loungePower],
    loungeLightLive: !!liveById[ROOM_LOADS.loungeLight],
    kitchenLightLive: !!liveById[ROOM_LOADS.lighting],
  });
  const target = useRoomTarget({
    activate: onToggle,
    prompt: prompt.text,
    actionable: prompt.actionable,
    enabled: enabled && !coverOpen,
  });
  if (!enabled) return null;

  return (
    <mesh
      name={'interact:' + hitId}
      position={position}
      rotation={rotation}
      visible={false}
      {...target}
    >
      <boxGeometry args={size} />
    </mesh>
  );
}
