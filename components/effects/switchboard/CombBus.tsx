'use client';

import {
  CIRCUITS,
  mainSwitchX,
  moduleBottomTerminal,
  moduleNeutralTerminal,
  moduleTopTerminal,
  rcboX,
} from './circuit-data';
import type { SwitchboardMaterials } from './materials';
import { CombSpine } from './parts/CombSpine';

type Props = {
  materials: SwitchboardMaterials;
};

/**
 * Active + Neutral insulated pin busbar above the RCBO row: copper pins under a green
 * cover with yellow end caps, as on the reference boards. Pins drop into TOP-face mouths.
 */
export function CombBus({ materials }: Props) {
  const first = rcboX(0);
  const last = rcboX(CIRCUITS.length - 1);
  const topA = moduleTopTerminal(first);
  const topN = moduleNeutralTerminal(first);
  const mid = (first + last) / 2;
  const span = last - first;
  const mainBot = moduleBottomTerminal(mainSwitchX());

  const activeY = topA[1] + 0.078;
  const activeZ = topA[2];
  const neutY = topN[1] + 0.06;
  const neutZ = topN[2];

  return (
    <group>
      <CombSpine
        circuits={CIRCUITS}
        mid={mid}
        span={span}
        spineY={activeY}
        spineZ={activeZ}
        metal={materials.copper}
        sleeve={materials.busCover}
        endCap={materials.plasticYellow}
        terminalAt={moduleTopTerminal}
        showFeedBlock
        feedX={first - 0.08}
        toothW={0.015}
        toothT={0.005}
      />

      {/* Brass link: main LOAD → active comb feed block */}
      <mesh
        position={[first - 0.08, (activeY + mainBot[1]) * 0.5, activeZ]}
        material={materials.copper}
        castShadow={false}
      >
        <boxGeometry args={[0.014, Math.abs(activeY - mainBot[1]) * 0.72, 0.01]} />
      </mesh>

      <CombSpine
        circuits={CIRCUITS}
        mid={mid}
        span={span - 0.02}
        spineY={neutY}
        spineZ={neutZ}
        metal={materials.copper}
        sleeve={materials.busCover}
        endCap={materials.plasticYellow}
        terminalAt={moduleNeutralTerminal}
        sleeveOffsetX={-0.012}
        toothW={0.012}
        toothT={0.005}
      />
    </group>
  );
}
