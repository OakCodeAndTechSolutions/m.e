'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { Switchboard } from '../Switchboard';
import { useSwitchboard } from '../SwitchboardContext';
import { AboutPortraits } from './AboutPortraits';
import { Fixtures } from './Fixtures';
import { KitchenRun } from './KitchenRun';
import { LearningRoom } from './LearningRoom';
import { LoungeRun } from './LoungeRun';
import { Player } from './Player';
import { ExposedWallWiring } from './ExposedWallWiring';
import { BOARD_MOUNT, ROOM_LOADS, type RoomInteractId } from './room-layout';
import type { RoomLive } from './room-play';
import { useGameInput } from './GameInputContext';
import { CeilingLights } from './FinishedInterior';
import { ScenePerformance } from './ScenePerformance';
import { RoomLighting } from './RoomLighting';
import { resolveRoomLighting } from './room-lighting';

type Props = {
  controlsEnabled: boolean;
  onExit: () => void;
  onDprChange: (dpr: number) => void;
};

function LearningSceneInner({ controlsEnabled, onExit, onDprChange }: Props) {
  const { liveById, mainOn } = useSwitchboard();
  const { play, dispatchRoom: dispatch } = useGameInput();

  const lightingLive = liveById[ROOM_LOADS.lighting] ?? false;
  const powerLive = liveById[ROOM_LOADS.power] ?? false;
  const fridgeLive = liveById[ROOM_LOADS.fridge] ?? false;
  const ovenLive = liveById[ROOM_LOADS.oven] ?? false;
  const inductionLive = liveById[ROOM_LOADS.induction] ?? false;
  const loungePowerLive = liveById[ROOM_LOADS.loungePower] ?? false;
  const loungeLightLive = liveById[ROOM_LOADS.loungeLight] ?? false;
  const hobLive = inductionLive && play.isolatorOn;
  const light = resolveRoomLighting({
    exploring: controlsEnabled,
    mainOn,
    kitchenCircuit: lightingLive,
    loungeCircuit: loungeLightLive,
    kitchenSwitch: play.lightSwitchOn,
    loungeDimmer: play.loungeDimmer,
  });
  const live = useMemo<RoomLive>(
    () => ({ powerLive, hobLive, loungePowerLive }),
    [powerLive, hobLive, loungePowerLive]
  );

  useEffect(() => {
    if (!powerLive) dispatch({ type: 'power-cut' });
  }, [powerLive, dispatch]);

  useEffect(() => {
    if (!hobLive) dispatch({ type: 'hob-cut' });
  }, [hobLive, dispatch]);

  useEffect(() => {
    if (!loungePowerLive) dispatch({ type: 'lounge-power-cut' });
  }, [loungePowerLive, dispatch]);

  const onInteract = useCallback(
    (id: RoomInteractId) => {
      dispatch({ type: 'interact', id, live });
    },
    [live, dispatch]
  );

  const toggleOpen = (id: RoomInteractId) => onInteract(id);

  return (
    <>
      <ScenePerformance onDprChange={onDprChange} />
      <RoomLighting
        mode={light.mode}
        guideKitchen={light.guideKitchen}
        guideLounge={light.guideLounge}
      />
      <LearningRoom
        daylight={light.mode === 'preview'}
        lightLevel={((light.kitchenOn ? 1 : 0) + light.loungeLevel) / 2}
      />
      <group
        position={[BOARD_MOUNT.x, BOARD_MOUNT.y, BOARD_MOUNT.z]}
        rotation={[0, BOARD_MOUNT.rotY, 0]}
        scale={BOARD_MOUNT.scale}
      >
        <Suspense fallback={null}>
          <Switchboard />
        </Suspense>
      </group>
      <ExposedWallWiring />
      <CeilingLights kitchenOn={light.kitchenOn} loungeLevel={light.loungeLevel} />
      <Suspense fallback={null}>
        <Fixtures lightSwitchOn={play.lightSwitchOn} onToggleSwitch={() => onInteract('switch')} />
      </Suspense>
      <Suspense fallback={null}>
        <KitchenRun
          powerLive={powerLive}
          socketOn={play.kitchenSocketOn}
          onToggleSocket={() => onInteract('gpoDouble')}
          lightsOn={light.kitchenOn}
          fridgeLive={fridgeLive}
          ovenLive={ovenLive}
          hobLive={hobLive}
          isolatorOn={play.isolatorOn}
          fridgeOpen={play.fridgeOpen}
          toasterPop={play.toasterPop}
          sinkOn={play.sinkOn}
          boiling={play.boiling}
          openById={play.openById}
          onToggle={toggleOpen}
          onToggleFridge={() => onInteract('fridge')}
          onToggleToaster={() => onInteract('toaster')}
          onToggleIsolator={() => onInteract('cookIsolator')}
          onToggleSink={() => onInteract('sink')}
          onToggleBoil={() => onInteract('cooktop')}
        />
      </Suspense>
      <Suspense fallback={null}>
        <LoungeRun
          powerLive={loungePowerLive}
          socketOn={play.loungeSocketOn}
          onToggleSocket={() => onInteract('tvGpo')}
          lightLive={loungeLightLive}
          dimmer={play.loungeDimmer}
          tvOn={play.tvOn}
          onCycleDimmer={() => onInteract('loungeDimmerA')}
          onToggleTv={() => onInteract('tv')}
        />
      </Suspense>
      <AboutPortraits />
      <Player enabled={controlsEnabled} onExit={onExit} play={play} />
    </>
  );
}

export function LearningScene(props: Props) {
  return <LearningSceneInner {...props} />;
}
