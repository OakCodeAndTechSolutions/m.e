'use client';

import { useMemo } from 'react';
import { BoxGeometry, PlaneGeometry } from 'three';
import { POLYHAVEN } from './room-assets';
import { BOARD_OPENING, HEIGHTS, NOGGIN, ROOM, boardWallStudZs, fridgeWallStudXs, nogginY } from './room-layout';
import { useRepeatingPbrMetal, useSizedPbr, type PbrMaps } from './room-textures';

/** H2 MGP radiata — straw construction timber, not furniture stain. */
const PINE = '#eee4b4';
const NOGGIN_YS = ROOM.nogginYs;
const FOIL_SHEET = 1.37;
const FOIL_OVERLAP = 0.1;
const FOIL_PITCH = FOIL_SHEET - FOIL_OVERLAP;

function fract(n: number) {
  return n - Math.floor(n);
}

function Timber({
  position,
  args,
  maps,
}: {
  position: [number, number, number];
  args: [number, number, number];
  maps: PbrMaps;
}) {
  const [px, py, pz] = position;
  const [ax, ay, az] = args;
  const geometry = useMemo(() => {
    const g = new BoxGeometry(ax, ay, az);
    const uv = g.attributes.uv;
    if (uv) {
      const ox = fract(px * 7.13 + pz * 3.71 + py * 1.17);
      const oy = fract(py * 5.29 + px * 2.17 + pz * 4.03);
      const flipU = fract(px * 4.91 + pz * 7.13 + py * 2.07) > 0.5 ? -1 : 1;
      const flipV = fract(px * 2.33 + pz * 5.17) > 0.55 ? -1 : 1;
      const sx = 0.62 + fract(px * 8.41 + py * 3.19) * 0.95;
      const sy = 0.72 + fract(pz * 6.73 + px * 1.91) * 0.8;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) * sx * flipU + ox, uv.getY(i) * sy * flipV + oy);
      }
      uv.needsUpdate = true;
    }
    return g;
  }, [ax, ay, az, px, py, pz]);

  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <meshStandardMaterial
        map={maps.map}
        normalMap={maps.normalMap}
        roughnessMap={maps.roughnessMap}
        color={PINE}
        roughness={0.92}
        metalness={0}
        envMapIntensity={0.45}
        normalScale={[0.85, 0.85]}
      />
    </mesh>
  );
}

function FoilSheet({
  maps,
  width,
  height,
  position,
  seed,
}: {
  maps: ReturnType<typeof useRepeatingPbrMetal>;
  width: number;
  height: number;
  position: [number, number, number];
  seed: number;
}) {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(width, height);
    const uv = g.attributes.uv;
    const ox = fract(seed * 1.71 + 0.13);
    const oy = fract(seed * 2.33 + 0.29);
    if (uv) {
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, uv.getX(i) + ox, uv.getY(i) + oy);
      }
      uv.needsUpdate = true;
    }
    return g;
  }, [width, height, seed]);

  return (
    <mesh geometry={geometry} position={position} receiveShadow>
      <meshStandardMaterial
        map={maps.map}
        normalMap={maps.normalMap}
        roughnessMap={maps.roughnessMap}
        metalnessMap={maps.metalnessMap}
        color="#f3ece3"
        roughness={0.62}
        metalness={0.16}
        envMapIntensity={0.7}
        normalScale={[0.1, 0.1]}
        emissive="#c6bfb4"
        emissiveIntensity={0.07}
      />
    </mesh>
  );
}

function Sarking({
  position,
  rotation,
  size,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
}) {
  const maps = useRepeatingPbrMetal(POLYHAVEN.foilSarking, [FOIL_SHEET / 2.2, size[1] / 2.2]);
  const count = Math.max(1, Math.ceil((size[0] - FOIL_OVERLAP) / FOIL_PITCH));
  const sheets = Array.from({ length: count }, (_, i) => {
    const x = -size[0] / 2 + FOIL_SHEET / 2 + i * FOIL_PITCH;
    return { i, x };
  });
  return (
    <group position={position} rotation={rotation}>
      {sheets.map(({ i, x }) => (
        <FoilSheet
          key={`foil-${i}`}
          maps={maps}
          width={FOIL_SHEET}
          height={size[1]}
          position={[x, 0, i * 0.0007]}
          seed={i + size[0]}
        />
      ))}
      {sheets.slice(1).map(({ i, x }) => (
        <mesh key={`tape-${i}`} position={[x - FOIL_SHEET / 2 + FOIL_OVERLAP / 2, 0, 0.0024]} receiveShadow>
          <planeGeometry args={[0.08, size[1]]} />
          <meshStandardMaterial color="#6a7178" roughness={0.62} metalness={0.22} envMapIntensity={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function openingHitsZ(z: number, pad = 0.02) {
  return z > BOARD_OPENING.z0 - pad && z < BOARD_OPENING.z1 + pad;
}

function openingHitsY(y: number, pad = 0.04) {
  return y > BOARD_OPENING.y0 - pad && y < BOARD_OPENING.y1 + pad;
}

/** Open MGP10 frame (no plaster) so TPS in the cavity stays visible. */
export function FramedWalls() {
  const vMaps = useSizedPbr(POLYHAVEN.treatedPine, [0.09, 2.6], 1.2, 0, 0.05);
  const hMaps = useSizedPbr(POLYHAVEN.treatedPine, [2.6, 0.09], 1.2, Math.PI / 2, 0.05);
  const nMaps = useSizedPbr(POLYHAVEN.treatedPine, [2.6, 0.035], 1.2, Math.PI / 2, 0.05);
  const boardZs = boardWallStudZs();
  const fridgeXs = fridgeWallStudXs();
  const s = ROOM.studSize;
  const doubleTop = ROOM.plate * 2;
  const studH = ROOM.height - ROOM.plate - doubleTop;
  const studY = ROOM.plate + studH / 2;
  const cx = HEIGHTS.cavityX;
  const cz = HEIGHTS.cavityZ;
  const openW = BOARD_OPENING.z1 - BOARD_OPENING.z0;
  const openZ = (BOARD_OPENING.z0 + BOARD_OPENING.z1) / 2;
  const lintelT = s * 0.9;
  const sillY = BOARD_OPENING.y0;
  const headY = BOARD_OPENING.y1;
  const crippleBelowH = Math.max(0.08, sillY - lintelT / 2 - ROOM.plate);
  const crippleBelowY = ROOM.plate + crippleBelowH / 2;
  const topOfFrame = ROOM.height - doubleTop;
  const crippleAboveH = Math.max(0.08, topOfFrame - (headY + lintelT / 2));
  const crippleAboveY = headY + lintelT / 2 + crippleAboveH / 2;
  const jackH = headY - lintelT / 2 - ROOM.plate;
  const jackY = ROOM.plate + jackH / 2;
  const crippleZs = [openZ - openW * 0.28, openZ + openW * 0.28];

  return (
    <group>
      <Sarking
        position={[-s - 0.014, ROOM.height / 2, ROOM.depth / 2]}
        rotation={[0, Math.PI / 2, 0]}
        size={[ROOM.depth + 0.2, ROOM.height]}
      />
      <Sarking
        position={[ROOM.width / 2, ROOM.height / 2, -s - 0.014]}
        rotation={[0, 0, 0]}
        size={[ROOM.width + 0.2, ROOM.height]}
      />

      <Timber maps={hMaps} position={[cx, ROOM.plate / 2, ROOM.depth / 2]} args={[s, ROOM.plate, ROOM.depth + s]} />
      <Timber
        maps={hMaps}
        position={[cx, ROOM.height - ROOM.plate / 2, ROOM.depth / 2]}
        args={[s, ROOM.plate, ROOM.depth + s]}
      />
      <Timber
        maps={hMaps}
        position={[cx, ROOM.height - ROOM.plate - ROOM.plate / 2, ROOM.depth / 2]}
        args={[s, ROOM.plate, ROOM.depth + s]}
      />

      {boardZs.map((z) =>
        openingHitsZ(z) ? null : (
          <Timber key={`bz-${z}`} maps={vMaps} position={[cx, studY, z]} args={[s, studH, s]} />
        ),
      )}

      {NOGGIN_YS.map((y) =>
        boardZs.slice(0, -1).map((z, i) => {
          const mid = z + ROOM.studSpacing / 2;
          if (openingHitsZ(mid) && openingHitsY(y)) return null;
          return (
            <Timber
              key={`bn-${y}-${z}`}
              maps={nMaps}
              position={[cx + s / 2 - NOGGIN.depth / 2, nogginY(y, i), mid]}
              args={[NOGGIN.depth, NOGGIN.h, ROOM.studSpacing - s]}
            />
          );
        }),
      )}

      <Timber maps={vMaps} position={[cx, jackY, BOARD_OPENING.z0]} args={[s, jackH, s]} />
      <Timber maps={vMaps} position={[cx, jackY, BOARD_OPENING.z1]} args={[s, jackH, s]} />
      <Timber maps={hMaps} position={[cx, sillY, openZ]} args={[s, lintelT, openW - s]} />
      <Timber maps={hMaps} position={[cx, headY, openZ]} args={[s, lintelT, openW - s]} />
      {crippleZs.map((z) => (
        <group key={`cr-${z}`}>
          <Timber maps={vMaps} position={[cx, crippleBelowY, z]} args={[s, crippleBelowH, s]} />
          <Timber maps={vMaps} position={[cx, crippleAboveY, z]} args={[s, crippleAboveH, s]} />
        </group>
      ))}

      {/* The flush enclosure sits between the trimmers; no backing board. */}

      <Timber maps={hMaps} position={[ROOM.width / 2, ROOM.plate / 2, cz]} args={[ROOM.width + s, ROOM.plate, s]} />
      <Timber
        maps={hMaps}
        position={[ROOM.width / 2, ROOM.height - ROOM.plate / 2, cz]}
        args={[ROOM.width + s, ROOM.plate, s]}
      />
      <Timber
        maps={hMaps}
        position={[ROOM.width / 2, ROOM.height - ROOM.plate - ROOM.plate / 2, cz]}
        args={[ROOM.width + s, ROOM.plate, s]}
      />

      {fridgeXs.map((x) => (
        <Timber key={`fx-${x}`} maps={vMaps} position={[x, studY, cz]} args={[s, studH, s]} />
      ))}

      {NOGGIN_YS.map((y) =>
        fridgeXs.slice(0, -1).map((x, i) => (
          <Timber
            key={`fn-${y}-${x}`}
            maps={nMaps}
            position={[x + ROOM.studSpacing / 2, nogginY(y, i), cz + s / 2 - NOGGIN.depth / 2]}
            args={[ROOM.studSpacing - s, NOGGIN.h, NOGGIN.depth]}
          />
        )),
      )}

      <Sarking
        position={[ROOM.width / 2, ROOM.height / 2, ROOM.depth + s + 0.014]}
        rotation={[0, Math.PI, 0]}
        size={[ROOM.width + 0.2, ROOM.height]}
      />
      <Timber
        maps={hMaps}
        position={[ROOM.width / 2, ROOM.plate / 2, HEIGHTS.loungeCavityZ]}
        args={[ROOM.width + s, ROOM.plate, s]}
      />
      <Timber
        maps={hMaps}
        position={[ROOM.width / 2, ROOM.height - ROOM.plate / 2, HEIGHTS.loungeCavityZ]}
        args={[ROOM.width + s, ROOM.plate, s]}
      />
      <Timber
        maps={hMaps}
        position={[ROOM.width / 2, ROOM.height - ROOM.plate - ROOM.plate / 2, HEIGHTS.loungeCavityZ]}
        args={[ROOM.width + s, ROOM.plate, s]}
      />
      {fridgeXs.map((x) => (
        <Timber key={`lz-${x}`} maps={vMaps} position={[x, studY, HEIGHTS.loungeCavityZ]} args={[s, studH, s]} />
      ))}
      {NOGGIN_YS.map((y) =>
        fridgeXs.slice(0, -1).map((x, i) => (
          <Timber
            key={`ln-${y}-${x}`}
            maps={nMaps}
            position={[
              x + ROOM.studSpacing / 2,
              nogginY(y, i + 1),
              HEIGHTS.loungeCavityZ - s / 2 + NOGGIN.depth / 2,
            ]}
            args={[ROOM.studSpacing - s, NOGGIN.h, NOGGIN.depth]}
          />
        )),
      )}

      <Sarking
        position={[ROOM.width + s + 0.014, ROOM.height / 2, ROOM.depth / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[ROOM.depth + 0.2, ROOM.height]}
      />
      <Timber
        maps={hMaps}
        position={[HEIGHTS.endCavityX, ROOM.plate / 2, ROOM.depth / 2]}
        args={[s, ROOM.plate, ROOM.depth + s]}
      />
      <Timber
        maps={hMaps}
        position={[HEIGHTS.endCavityX, ROOM.height - ROOM.plate / 2, ROOM.depth / 2]}
        args={[s, ROOM.plate, ROOM.depth + s]}
      />
      <Timber
        maps={hMaps}
        position={[HEIGHTS.endCavityX, ROOM.height - ROOM.plate - ROOM.plate / 2, ROOM.depth / 2]}
        args={[s, ROOM.plate, ROOM.depth + s]}
      />
      {boardZs.map((z) => (
        <Timber key={`ez-${z}`} maps={vMaps} position={[HEIGHTS.endCavityX, studY, z]} args={[s, studH, s]} />
      ))}
      {NOGGIN_YS.map((y) =>
        boardZs.slice(0, -1).map((z, i) => (
          <Timber
            key={`en-${y}-${z}`}
            maps={nMaps}
            position={[
              HEIGHTS.endCavityX - s / 2 + NOGGIN.depth / 2,
              nogginY(y, i + 2),
              z + ROOM.studSpacing / 2,
            ]}
            args={[NOGGIN.depth, NOGGIN.h, ROOM.studSpacing - s]}
          />
        )),
      )}
    </group>
  );
}
