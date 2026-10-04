'use client';

import { FIXTURES } from './room-layout';
import { WallLight } from './WallLight';
import { WallSwitch } from './WallSwitch';

type FixtureProps = {
  lightsOn: boolean;
  lightSwitchOn: boolean;
  onToggleSwitch: () => void;
};

/** Board-wall fittings only. Kitchen appliances live in KitchenRun. */
export function Fixtures({ lightsOn, lightSwitchOn, onToggleSwitch }: FixtureProps) {
  const sw = FIXTURES.lightSwitch;
  const l1 = FIXTURES.wallLight1;
  const l2 = FIXTURES.wallLight2;

  return (
    <group>
      <WallSwitch
        position={[sw.x, sw.y, sw.z]}
        wall="board"
        on={lightSwitchOn}
        onToggle={onToggleSwitch}
      />
      {/* Up/down lights over the framed prints, on the kitchen lighting circuit. */}
      <WallLight position={[0, l1.y, l1.z]} rotationY={Math.PI / 2} level={lightsOn ? 1 : 0} />
      <WallLight position={[0, l2.y, l2.z]} rotationY={Math.PI / 2} level={lightsOn ? 1 : 0} />
    </group>
  );
}
