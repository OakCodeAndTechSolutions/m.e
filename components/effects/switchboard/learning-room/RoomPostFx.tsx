'use client';

import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useCoarsePointer } from '@/lib/hooks';
import { useSwitchboard } from '../SwitchboardContext';

/**
 * Photographic finish for the room: ambient occlusion grounds furniture, fittings and
 * joinery where they meet walls and floor (the biggest single cue that the room is
 * real), and Khronos Neutral tone mapping keeps white paint and daylight from
 * clipping without washing colours out.
 *
 * AO is sized to what is on screen. Room corners want a radius of most of a metre;
 * at the switchboard close-up that radius smears over flat steel, so the open board
 * gets a few centimetres instead. Touch devices get the cheaper AO setting, no MSAA.
 */
export function RoomPostFx() {
  const { coarse } = useCoarsePointer();
  const { coverOpen } = useSwitchboard();
  return (
    <EffectComposer multisampling={coarse ? 0 : 4} enableNormalPass={false}>
      <N8AO
        halfRes
        aoRadius={coverOpen ? 0.05 : 0.65}
        distanceFalloff={coverOpen ? 0.25 : 1}
        intensity={coverOpen ? 1.6 : 3.2}
        color="#231a12"
        quality={coarse ? 'performance' : 'medium'}
      />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}
