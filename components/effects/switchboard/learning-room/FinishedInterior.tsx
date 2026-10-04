'use client';

import { Suspense, useMemo } from 'react';
import { CanvasTexture, Object3D, SRGBColorSpace } from 'three';
import { DiningSet } from './DiningSet';
import { useGameInput } from './GameInputContext';
import { BOARD_CUTOUT, ROOM } from './room-layout';

type V3 = [number, number, number];

function Block({ at, size, color = '#e6e1d7' }: { at: V3; size: V3; color?: string }) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

/**
 * Plaster on the board wall, cut around the flush-mounted switchboard tub. The
 * enclosure frame overlaps the cut edge, as on a real flush installation.
 */
function BoardWallPlaster() {
  const { depth: d, height: h } = ROOM;
  const { z0, z1, y0, y1 } = BOARD_CUTOUT;
  const x = -0.008;
  const t = 0.012;
  return (
    <>
      <Block at={[x, h / 2, z0 / 2]} size={[t, h, z0]} />
      <Block at={[x, h / 2, (z1 + d) / 2]} size={[t, h, d - z1]} />
      <Block at={[x, y0 / 2, (z0 + z1) / 2]} size={[t, y0, z1 - z0]} />
      <Block at={[x, (y1 + h) / 2, (z0 + z1) / 2]} size={[t, h - y1, z1 - z0]} />
    </>
  );
}

/** Finished plaster is a separate layer; the inspection view reveals the cavity. */
export function FinishedInterior() {
  const { wiringView } = useGameInput();
  const { width: w, depth: d, height: h } = ROOM;
  return (
    <group>
      <group visible={!wiringView}>
        <BoardWallPlaster />
        <Block at={[w / 2, h / 2, -0.008]} size={[w, h, 0.012]} />
        <Block at={[w / 2, h / 2, d + 0.008]} size={[w, h, 0.012]} color="#b2b5a4" />
      </group>

      {/* A real opening: the right wall is built around the glazing. */}
      <Block at={[w + 0.025, h / 2, 0.66]} size={[0.08, h, 1.32]} />
      <Block at={[w + 0.025, h / 2, 6.25]} size={[0.08, h, 1.5]} />
      <Block at={[w + 0.025, 0.36, 3.4]} size={[0.08, 0.72, 4.16]} />
      <Block at={[w + 0.025, 2.52, 3.4]} size={[0.08, 0.36, 4.16]} />
      <group position={[w - 0.015, 1.53, 3.4]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Out-of-focus garden beyond the glass, far enough out to show parallax. */}
        <GardenView />
        <mesh position={[0, 0, 0.02]} raycast={() => null}>
          <planeGeometry args={[4.16, 1.7]} />
          <meshStandardMaterial
            color="#dfe8ec"
            transparent
            opacity={0.07}
            roughness={0.04}
            metalness={0}
            envMapIntensity={1.4}
            depthWrite={false}
          />
        </mesh>
        {[-2.06, -0.69, 0.69, 2.06].map((x) => (
          <Block key={x} at={[x, 0, 0.025]} size={[0.045, 1.7, 0.09]} color="#333c39" />
        ))}
        {[-0.83, 0.83].map((y) => (
          <Block key={y} at={[0, y, 0.025]} size={[4.16, 0.045, 0.09]} color="#333c39" />
        ))}
        <Block at={[0, -0.87, 0.055]} size={[4.3, 0.055, 0.22]} color="#eee9df" />
        {/* Linen folds on either side of the window. */}
        {[-1, 1].flatMap((side) =>
          Array.from({ length: 8 }, (_, i) => (
            <mesh
              key={`${side}-${i}`}
              position={[side * (1.9 + i * 0.055), -0.22, 0.14]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.042, 0.044, 2.12, 8]} />
              <meshStandardMaterial color={i % 2 ? '#d1c7b7' : '#e1d9cb'} roughness={1} />
            </mesh>
          ))
        )}
        <Block at={[0, 0.91, 0.16]} size={[4.6, 0.035, 0.035]} color="#49443d" />
      </group>

      {/* Skirting and cornices give the room a continuous, human-scale envelope. */}
      {[0, d].map((z) => (
        <group key={z}>
          <Block
            at={[w / 2, 0.06, z === 0 ? 0.008 : d - 0.008]}
            size={[w, 0.12, 0.024]}
            color="#f0ece4"
          />
          <Block
            at={[w / 2, h - 0.035, z === 0 ? 0.025 : d - 0.025]}
            size={[w, 0.07, 0.055]}
            color="#f0ece4"
          />
        </group>
      ))}
      {[0, w].map((x) => (
        <group key={x}>
          <Block
            at={[x === 0 ? 0.008 : w - 0.008, 0.06, d / 2]}
            size={[0.024, 0.12, d]}
            color="#f0ece4"
          />
          <Block
            at={[x === 0 ? 0.025 : w - 0.025, h - 0.035, d / 2]}
            size={[0.055, 0.07, d]}
            color="#f0ece4"
          />
        </group>
      ))}

      <Suspense fallback={null}>
        <DiningSet />
      </Suspense>
    </group>
  );
}

/**
 * Daylit garden as an interior photographer sees it through a window: bright sky,
 * a soft tree line, a timber fence and lawn, all slightly out of focus. Painted with
 * radial gradients (not a canvas blur filter) so it renders the same in every browser.
 */
function paintGarden(): CanvasTexture {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');

  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  sky.addColorStop(0, '#dfe9f1');
  sky.addColorStop(1, '#f6f7f2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Soft canopy blobs: dark core fading to the sky, like foliage out of focus.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const blob = (x: number, y: number, r: number, core: string, alpha: number) => {
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0, core);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  for (let i = 0; i < 46; i++) {
    blob(
      rand() * W,
      H * (0.44 + rand() * 0.12),
      90 + rand() * 170,
      rand() > 0.5 ? '#7d8f6a' : '#8f9e78',
      0.55
    );
  }
  for (let i = 0; i < 40; i++) {
    blob(rand() * W, H * (0.54 + rand() * 0.06), 60 + rand() * 120, '#647654', 0.5);
  }
  ctx.globalAlpha = 1;

  // Timber paling fence and lawn.
  const fenceTop = H * 0.6;
  const fence = ctx.createLinearGradient(0, fenceTop, 0, H * 0.74);
  fence.addColorStop(0, '#a08a6f');
  fence.addColorStop(1, '#8c775d');
  ctx.fillStyle = fence;
  ctx.fillRect(0, fenceTop, W, H * 0.14);
  ctx.fillStyle = 'rgba(70,55,40,0.18)';
  for (let x = 0; x < W; x += 34) ctx.fillRect(x, fenceTop, 3, H * 0.14);
  const lawn = ctx.createLinearGradient(0, H * 0.74, 0, H);
  lawn.addColorStop(0, '#93a26f');
  lawn.addColorStop(1, '#7d8f5c');
  ctx.fillStyle = lawn;
  ctx.fillRect(0, H * 0.74, W, H * 0.26);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function GardenView() {
  const map = useMemo(() => paintGarden(), []);
  return (
    <mesh position={[0, -0.35, -1.6]} raycast={() => null}>
      <planeGeometry args={[10, 5]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

/** Warm 3000 K pool of light under a pair of downlights. */
function DownlightPool({ z, level }: { z: number; level: number }) {
  const target = useMemo(() => new Object3D(), []);
  return (
    <>
      <primitive object={target} position={[3.2, 0, z]} />
      <spotLight
        position={[3.2, ROOM.height - 0.03, z]}
        target={target}
        angle={1.05}
        penumbra={1}
        decay={2}
        distance={7}
        intensity={level * 14}
        color="#ffe2bd"
      />
    </>
  );
}

/** Recessed downlights share the same switched circuits as the wall fittings. */
export function CeilingLights({
  kitchenOn,
  loungeLevel,
}: {
  kitchenOn: boolean;
  loungeLevel: number;
}) {
  return (
    <group>
      {[
        { x: 2, z: 1.5, level: kitchenOn ? 1 : 0 },
        { x: 4.4, z: 1.5, level: kitchenOn ? 1 : 0 },
        { x: 2, z: 5.5, level: loungeLevel },
        { x: 4.4, z: 5.5, level: loungeLevel },
      ].map(({ x, z, level }) => (
        <group key={`${x}-${z}`} position={[x, ROOM.height - 0.016, z]}>
          <mesh>
            <cylinderGeometry args={[0.057, 0.057, 0.016, 24]} />
            <meshStandardMaterial color="#f1eee5" roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.044, 0.044, 0.003, 24]} />
            <meshStandardMaterial
              color="#f4e8d1"
              emissive="#ffdfad"
              emissiveIntensity={level * 2.5}
            />
          </mesh>
        </group>
      ))}
      {/*
        One shared pool per room, aimed down like the fittings it stands for: a point
        light near the ceiling washed the ceiling itself. Each lens stays emissive.
      */}
      <DownlightPool z={1.5} level={kitchenOn ? 1 : 0} />
      <DownlightPool z={5.5} level={loungeLevel} />
    </group>
  );
}
