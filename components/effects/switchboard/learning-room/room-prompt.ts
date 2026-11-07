import type { RoomInteractId } from './room-layout';
import type { RoomPlayState } from './room-play';

type RoomPromptLive = {
  powerLive: boolean;
  hobLive: boolean;
  loungePowerLive: boolean;
  loungeLightLive: boolean;
  kitchenLightLive: boolean;
};

type FixturePrompt = {
  text: string;
  actionable: boolean;
};

const labels: Record<RoomInteractId, [string, string]> = {
  switch: ['Lights on', 'Lights off'],
  sink: ['Run the tap', 'Stop tap'],
  gpoDouble: ['Plug / toast', 'Pop toaster'],
  toaster: ['Toast', 'Pop toaster'],
  cookIsolator: ['Cooktop isolator', 'Cooktop isolator'],
  cooktop: ['Boil the pot', 'Take pot off'],
  oven: ['Open oven', 'Close oven'],
  dishwasher: ['Open dishwasher', 'Close dishwasher'],
  fridge: ['Open fridge', 'Close fridge'],
  'sink-base': ['Open cupboard', 'Close cupboard'],
  'cabA-base': ['Open drawers', 'Close drawers'],
  'cabL-base': ['Open cupboard', 'Close cupboard'],
  'cabR-base': ['Open cupboard', 'Close cupboard'],
  'sink-upper': ['Open overhead', 'Close overhead'],
  'cabA-upper': ['Open overhead', 'Close overhead'],
  'cabL-upper': ['Open overhead', 'Close overhead'],
  'dw-upper': ['Open overhead', 'Close overhead'],
  'cabR-upper': ['Open overhead', 'Close overhead'],
  loungeDimmerA: ['Lounge lights', 'Lounge lights off'],
  loungeDimmerB: ['Lounge lights', 'Lounge lights off'],
  tv: ['TV on', 'TV off'],
  tvGpo: ['TV on', 'TV off'],
};

const action = (text: string): FixturePrompt => ({ text, actionable: true });
const unavailable = (text: string): FixturePrompt => ({ text, actionable: false });

export function roomActionPrompt(
  id: RoomInteractId,
  play: RoomPlayState,
  live: RoomPromptLive
): FixturePrompt {
  const [on, off] = labels[id];
  switch (id) {
    case 'switch':
      return action((play.lightSwitchOn ? off : on) + (live.kitchenLightLive ? '' : ' · circuit off'));
    case 'toaster':
      return !play.kitchenSocketOn
        ? unavailable('Switch the kitchen power point on')
        : !live.powerLive
          ? unavailable('Kitchen power is off')
          : action(play.toasterPop ? off : on);
    case 'gpoDouble':
      return action(play.kitchenSocketOn ? 'Power point off' : 'Power point on');
    case 'cookIsolator':
      return action(play.isolatorOn ? 'Cooktop isolator off' : 'Cooktop isolator on');
    case 'cooktop':
      return !live.hobLive
        ? unavailable(play.isolatorOn ? 'Cooktop circuit is off' : 'Turn the cooktop isolator on')
        : action(play.boiling ? off : on);
    case 'sink':
      return action(play.sinkOn ? off : on);
    case 'fridge':
      return action(play.fridgeOpen ? off : on);
    case 'loungeDimmerA':
    case 'loungeDimmerB': {
      const level = play.loungeDimmer;
      const label = level < 0.12
        ? 'Lounge lights on'
        : level < 0.52
          ? 'Set lounge lights to 70%'
          : level < 0.88
            ? 'Set lounge lights to 100%'
            : 'Lounge lights off';
      return action(label + (live.loungeLightLive ? '' : ' · circuit off'));
    }
    case 'tv':
      return !play.loungeSocketOn
        ? unavailable('Switch the lounge power point on')
        : !live.loungePowerLive
          ? unavailable('Lounge power is off')
          : action(play.tvOn ? off : on);
    case 'tvGpo':
      return action(play.loungeSocketOn ? 'Power point off' : 'Power point on');
    default:
      return action(play.openById[id] ? off : on);
  }
}
