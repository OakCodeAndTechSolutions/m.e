export type RoomLightMode = 'preview' | 'lit' | 'board' | 'switches';

export function resolveRoomLighting({
  exploring,
  mainOn,
  kitchenCircuit,
  loungeCircuit,
  kitchenSwitch,
  loungeDimmer,
}: {
  exploring: boolean;
  mainOn: boolean;
  kitchenCircuit: boolean;
  loungeCircuit: boolean;
  kitchenSwitch: boolean;
  loungeDimmer: number;
}) {
  const kitchenAvailable = mainOn && kitchenCircuit;
  const loungeAvailable = mainOn && loungeCircuit;
  const kitchenOn = kitchenAvailable && kitchenSwitch;
  const loungeLevel = loungeAvailable ? loungeDimmer : 0;
  const mode: RoomLightMode = !exploring
    ? 'preview'
    : kitchenOn || loungeLevel > 0
      ? 'lit'
      : kitchenAvailable || loungeAvailable
        ? 'switches'
        : 'board';

  return {
    mode,
    kitchenOn,
    loungeLevel,
    guideKitchen: mode === 'switches' && kitchenAvailable,
    guideLounge: mode === 'switches' && loungeAvailable,
  };
}
