'use client';

import { FIXTURES } from './room-layout';
import { WallSwitch } from './WallSwitch';

type FixtureProps = {
  lightSwitchOn: boolean;
  onToggleSwitch: () => void;
};

/** Board-wall fittings only. Kitchen appliances live in KitchenRun. */
export function Fixtures({ lightSwitchOn, onToggleSwitch }: FixtureProps) {
  const sw = FIXTURES.lightSwitch;
  return (
    <WallSwitch position={[sw.x, sw.y, sw.z]} wall="board" on={lightSwitchOn} onToggle={onToggleSwitch} />
  );
}
