'use client';

import { HouseModel } from './HouseModel';
import { DINING } from './room-layout';

export function DiningSet() {
  return (
    <group position={[DINING.x, 0, DINING.z]}>
      <HouseModel asset="dining-table" at={[0, 0, 0]} />
      {[-0.38, 0.38].flatMap((x) =>
        [-1, 1].map((side) => (
          <HouseModel
            key={x + ':' + side}
            asset="dining-chair"
            at={[x, 0, side * 0.67]}
            yaw={side === 1 ? 0 : Math.PI}
          />
        ))
      )}
    </group>
  );
}
