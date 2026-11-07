'use client';

import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { Group, MathUtils } from 'three';
import { KITCHEN, type RoomInteractId } from './room-layout';
import { RoomHit } from './RoomHit';

/** Paperbark and muted olive laminate, with matching edge banding. */
export const JOINERY = '#e5e0d4';
const JoineryFinish = createContext(JOINERY);
const JOINERY_IN = '#e2ddd4';
const KICK = '#3a3d42';
const HANDLE = '#a68453';

const PANEL = 0.018;
const REVEAL = 0.002;
const DOOR_T = 0.018;
const KICK_RECESS = 0.036;
const HANDLE_LEN = 0.152;
const HANDLE_R = 0.006;
const HANDLE_PROJ = 0.03;

function HandleMat() {
  return (
    <meshStandardMaterial color={HANDLE} roughness={0.38} metalness={0.72} envMapIntensity={1.15} />
  );
}

function Box({
  w,
  h,
  d,
  position,
  interior,
  edgeBand = false,
}: {
  w: number;
  h: number;
  d: number;
  position: [number, number, number];
  interior?: boolean;
  edgeBand?: boolean;
}) {
  const finish = useContext(JoineryFinish);
  if (w < 0.004 || h < 0.004 || d < 0.004) return null;
  const material = (
    <meshStandardMaterial color={interior ? JOINERY_IN : finish} roughness={0.72} />
  );
  if (edgeBand) {
    return (
      <RoundedBox
        args={[w, h, d]}
        radius={0.0015}
        smoothness={1}
        position={position}
        castShadow
        receiveShadow
        raycast={() => null}
      >
        {material}
      </RoundedBox>
    );
  }
  return (
    <mesh position={position} castShadow receiveShadow raycast={() => null}>
      <boxGeometry args={[w, h, d]} />
      {material}
    </mesh>
  );
}

/** Stainless D-handle. Vertical on doors, horizontal on drawers. */
function BarHandle({
  position,
  vertical,
  length = HANDLE_LEN,
}: {
  position: [number, number, number];
  vertical: boolean;
  length?: number;
}) {
  const span = length * 0.38;
  return (
    <group position={position}>
      <mesh rotation={vertical ? [0, 0, 0] : [0, 0, Math.PI / 2]} castShadow raycast={() => null}>
        <cylinderGeometry args={[HANDLE_R, HANDLE_R, length, 18]} />
        <HandleMat />
      </mesh>
      {([-span, span] as const).map((off) => (
        <mesh
          key={off}
          position={vertical ? [0, off, -HANDLE_PROJ / 2] : [off, 0, -HANDLE_PROJ / 2]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          raycast={() => null}
        >
          <cylinderGeometry args={[HANDLE_R * 0.78, HANDLE_R * 0.78, HANDLE_PROJ, 12]} />
          <HandleMat />
        </mesh>
      ))}
    </group>
  );
}

function HingedDoor({
  x,
  y,
  z,
  w,
  h,
  hinge,
  open,
  handle,
  hitId,
  onToggle,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  hinge: 'left' | 'right';
  open: boolean;
  handle: 'left' | 'right';
  hitId: RoomInteractId;
  onToggle: () => void;
}) {
  const pivot = useRef<Group>(null);
  const dir = hinge === 'left' ? -1 : 1;
  useFrame((_, delta) => {
    if (!pivot.current) return;
    pivot.current.rotation.y = MathUtils.damp(
      pivot.current.rotation.y,
      open ? dir * 1.22 : 0,
      8,
      delta
    );
  });
  const originX = hinge === 'left' ? x : x + w;
  const inset = 0.036;
  const hx = handle === 'left' ? inset : w - inset;
  return (
    <group ref={pivot} position={[originX, y, z]}>
      <group position={[hinge === 'left' ? 0 : -w, 0, 0]}>
        <Box w={w} h={h} d={DOOR_T} position={[w / 2, h / 2, DOOR_T / 2]} edgeBand />
        <BarHandle position={[hx, h * 0.5, DOOR_T + HANDLE_PROJ]} vertical />
        <RoomHit
          hitId={hitId}
          onToggle={onToggle}
          position={[w / 2, h / 2, DOOR_T / 2]}
          size={[w - 0.008, h - 0.012, 0.08]}
        />
      </group>
    </group>
  );
}

function Carcass({
  x,
  y,
  w,
  h,
  depth,
  kick = 0,
  openTop = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  kick?: number;
  /** Leave the top open so a sink can drop through. */
  openTop?: boolean;
}) {
  const y0 = y + kick;
  const ih = h - kick;
  const back = PANEL * 0.6;
  const cx = x + w / 2;
  const zMid = depth / 2;
  const innerW = w - 2 * PANEL;
  const sideH = openTop ? Math.max(0.2, ih - 0.24) : ih;
  const sideMidY = y0 + sideH / 2;
  return (
    <group>
      <Box
        w={PANEL}
        h={sideH}
        d={depth}
        position={[x + PANEL / 2, sideMidY, zMid]}
      />
      <Box
        w={PANEL}
        h={sideH}
        d={depth}
        position={[x + w - PANEL / 2, sideMidY, zMid]}
      />
      <Box
        w={innerW}
        h={PANEL}
        d={depth}
        position={[cx, y0 + PANEL / 2, zMid]}
        interior
      />
      {!openTop && (
        <Box
          w={innerW}
          h={PANEL}
          d={depth}
          position={[cx, y0 + ih - PANEL / 2, zMid]}
          interior
        />
      )}
      <Box
        w={innerW}
        h={openTop ? sideH - PANEL : ih - 2 * PANEL}
        d={back}
        position={[cx, y0 + (openTop ? sideH : ih) / 2, back / 2]}
        interior
      />
      {!openTop && (
        <Box
          w={innerW - 0.004}
          h={PANEL * 0.7}
          d={depth - back - 0.04}
          position={[cx, y0 + ih * 0.48, zMid + 0.01]}
          interior
        />
      )}
    </group>
  );
}

function SlabDrawer({ w, h }: { w: number; h: number }) {
  return <Box w={w} h={h} d={DOOR_T} position={[w / 2, h / 2, DOOR_T / 2]} edgeBand />;
}

function KickMat() {
  return (
    <meshStandardMaterial color={KICK} roughness={0.38} metalness={0.18} envMapIntensity={0.85} />
  );
}

/** Recessed vinyl plinth — 18 mm front, dark lining so the toe-space is not a cave. */
export function JoineryKick({ x, w, returns = true }: { x: number; w: number; returns?: boolean }) {
  const t = 0.018;
  const frontZ = KITCHEN.benchDepth + DOOR_T - KICK_RECESS;
  const h = KITCHEN.kickH - 0.004;
  const y = h / 2 + 0.002;
  const liningZ = frontZ - 0.032;
  return (
    <group>
      <mesh position={[x + w / 2, y, frontZ - t / 2]} castShadow receiveShadow raycast={() => null}>
        <boxGeometry args={[w, h, t]} />
        <KickMat />
      </mesh>
      <mesh position={[x + w / 2, y, liningZ]} receiveShadow raycast={() => null}>
        <boxGeometry args={[Math.max(0.02, w - t * 2), h - 0.006, 0.01]} />
        <meshStandardMaterial color="#16181a" roughness={0.88} metalness={0.04} />
      </mesh>
      {returns && (
        <>
          <mesh
            position={[x + t / 2, y, (frontZ - t) / 2]}
            castShadow
            receiveShadow
            raycast={() => null}
          >
            <boxGeometry args={[t, h, Math.max(0.02, frontZ - t)]} />
            <KickMat />
          </mesh>
          <mesh
            position={[x + w - t / 2, y, (frontZ - t) / 2]}
            castShadow
            receiveShadow
            raycast={() => null}
          >
            <boxGeometry args={[t, h, Math.max(0.02, frontZ - t)]} />
            <KickMat />
          </mesh>
        </>
      )}
    </group>
  );
}

export function JoineryFascia({
  x,
  w,
  y,
  h,
  depth,
}: {
  x: number;
  w: number;
  y: number;
  h: number;
  depth?: number;
}) {
  if (h < 0.006) return null;
  const face = depth ?? KITCHEN.benchDepth + DOOR_T;
  return (
    <Box
      w={w - REVEAL}
      h={h - REVEAL}
      d={DOOR_T}
      position={[x + w / 2, y + h / 2, face - DOOR_T / 2]}
    />
  );
}

/** Finished gable / scribe filler, floor to a given height. */
export function JoineryEndPanel({
  x,
  w,
  y = 0,
  h,
  depth,
}: {
  x: number;
  w: number;
  y?: number;
  h: number;
  depth: number;
}) {
  if (w < 0.006 || h < 0.02) return null;
  return (
    <Box
      w={w}
      h={h}
      d={depth}
      position={[x + w / 2, y + h / 2, depth / 2]}
    />
  );
}

/** 6–8 mm laminate packer between an appliance and the neighbouring door. */
export function JoineryPacker({
  x,
  y,
  h,
  depth,
}: {
  x: number;
  y: number;
  h: number;
  depth: number;
}) {
  const w = 0.007;
  if (h < 0.04) return null;
  return (
    <Box
      w={w}
      h={h}
      d={0.018}
      position={[x + w / 2, y + h / 2, depth + 0.009]}
    />
  );
}

/**
 * Fridge tower: 18 mm gables + a hollow oak bulkhead, not a solid timber brick.
 * Opening is the appliance cutout; leftover width is equal scribes.
 */
export function JoineryFridgeHousing({
  x,
  w,
  h,
  openingX,
  openingW,
  openingH,
  depth,
}: {
  x: number;
  w: number;
  h: number;
  openingX: number;
  openingW: number;
  openingH: number;
  depth: number;
}) {
  const leftW = openingX - x;
  const rightW = x + w - (openingX + openingW);
  const canopyH = h - openingH;
  const kickH = KITCHEN.kickH - 0.004;
  const kickZ = KITCHEN.benchDepth + DOOR_T - KICK_RECESS - 0.009;
  return (
    <group>
      <JoineryEndPanel x={x} w={leftW} h={h} depth={depth} />
      <JoineryEndPanel x={openingX + openingW} w={rightW} h={h} depth={depth} />
      {leftW > 0.008 && (
        <mesh
          position={[x + leftW / 2, kickH / 2 + 0.002, kickZ]}
          castShadow
          receiveShadow
          raycast={() => null}
        >
          <boxGeometry args={[leftW, kickH, 0.018]} />
          <KickMat />
        </mesh>
      )}
      {rightW > 0.008 && (
        <mesh
          position={[openingX + openingW + rightW / 2, kickH / 2 + 0.002, kickZ]}
          castShadow
          receiveShadow
          raycast={() => null}
        >
          <boxGeometry args={[rightW, kickH, 0.018]} />
          <KickMat />
        </mesh>
      )}
      {canopyH > 0.02 && (
        <>
          <Box
            w={openingW}
            h={canopyH}
            d={PANEL}
            position={[openingX + openingW / 2, openingH + canopyH / 2, depth - PANEL / 2]}
          />
          <Box
            w={openingW}
            h={PANEL}
            d={depth}
            position={[openingX + openingW / 2, h - PANEL / 2, depth / 2]}
          />
          <Box
            w={openingW}
            h={PANEL}
            d={depth - PANEL}
            position={[openingX + openingW / 2, openingH + PANEL / 2, (depth - PANEL) / 2]}
            interior
          />
        </>
      )}
    </group>
  );
}

/** Matching laminate drawer under the built-in oven. */
export function JoineryOvenDrawer({ x, w, y, h }: { x: number; w: number; y: number; h: number }) {
  const depth = KITCHEN.benchDepth;
  const frontW = w - REVEAL * 2;
  const frontH = h - REVEAL * 2;
  return (
    <group>
      <Box
        w={PANEL}
        h={h}
        d={depth}
        position={[x + PANEL / 2, y + h / 2, depth / 2]}
      />
      <Box
        w={PANEL}
        h={h}
        d={depth}
        position={[x + w - PANEL / 2, y + h / 2, depth / 2]}
      />
      <Box
        w={w - 2 * PANEL}
        h={PANEL}
        d={depth}
        position={[x + w / 2, y + PANEL / 2, depth / 2]}
        interior
      />
      <Box
        w={w - 2 * PANEL}
        h={h - PANEL}
        d={PANEL * 0.6}
        position={[x + w / 2, y + PANEL + (h - PANEL) / 2, PANEL * 0.3]}
        interior
      />
      <group position={[x + REVEAL, y + REVEAL, depth]}>
        <SlabDrawer w={frontW} h={frontH} />
        <BarHandle
          position={[frontW / 2, frontH / 2, DOOR_T + HANDLE_PROJ]}
          vertical={false}
          length={Math.min(0.16, frontW * 0.42)}
        />
      </group>
    </group>
  );
}

/** 14 mm oak strip under the marble so the bench isn't floating on a flat hex. */
export function JoinerySubtop({
  x,
  w,
  cutX,
  cutW,
  cutZ0,
  cutZ1,
}: {
  x: number;
  w: number;
  cutX?: number;
  cutW?: number;
  cutZ0?: number;
  cutZ1?: number;
}) {
  const y = KITCHEN.benchH - 0.006;
  const d = KITCHEN.benchDepth;
  const h = 0.014;
  if (cutX == null || cutW == null || cutZ0 == null || cutZ1 == null) {
    return (
      <Box w={w + 0.01} h={h} d={d} position={[x + w / 2, y, d / 2]} />
    );
  }
  const x1 = x + w;
  const cutR = cutX + cutW;
  const backD = Math.max(0, cutZ0 - 0);
  const frontD = Math.max(0, d - cutZ1);
  return (
    <group>
      <Box
        w={cutX - x}
        h={h}
        d={d}
        position={[x + (cutX - x) / 2, y, d / 2]}
      />
      <Box
        w={x1 - cutR}
        h={h}
        d={d}
        position={[cutR + (x1 - cutR) / 2, y, d / 2]}
      />
      {backD >= 0.004 && (
        <Box
          w={cutW}
          h={h}
          d={backD}
          position={[cutX + cutW / 2, y, backD / 2]}
        />
      )}
      {frontD >= 0.004 && (
        <Box
          w={cutW}
          h={h}
          d={frontD}
          position={[cutX + cutW / 2, y, (cutZ1 + d) / 2]}
        />
      )}
    </group>
  );
}

export function JoineryBay({
  x,
  w,
  y,
  h,
  depth,
  open,
  kind,
  drawers = false,
  openTop = false,
  hitId,
  onToggle,
}: {
  x: number;
  w: number;
  y: number;
  h: number;
  depth: number;
  open: boolean;
  hitId: RoomInteractId;
  onToggle: () => void;
  kind: 'base' | 'upper';
  drawers?: boolean;
  openTop?: boolean;
}) {
  const kick = kind === 'base' ? KITCHEN.kickH : 0;
  const doorY = y + kick + REVEAL;
  const doorH = h - kick - REVEAL * 2;
  const doorZ = depth;
  const pair = w >= 0.55 && !drawers;
  const doorW = pair ? (w - REVEAL * 3) / 2 : w - REVEAL * 2;
  const leftX = x + REVEAL;
  const slide = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!slide.current) return;
    slide.current.position.z = MathUtils.damp(
      slide.current.position.z,
      open && drawers ? 0.22 : 0,
      8,
      delta
    );
  });

  let fronts: ReactNode = null;
  if (drawers) {
    const n = 4;
    const gaps = REVEAL * (n + 1);
    const dh = (doorH - gaps) / n;
    fronts = (
      <group ref={slide}>
        <RoomHit
          hitId={hitId}
          onToggle={onToggle}
          position={[leftX + doorW / 2, doorY + doorH / 2, doorZ + DOOR_T / 2]}
          size={[doorW - 0.008, doorH - 0.012, 0.08]}
        />
        {Array.from({ length: n }, (_, i) => {
          const dy = doorY + REVEAL + i * (dh + REVEAL);
          return (
            <group key={i} position={[leftX, dy, doorZ]}>
              <SlabDrawer w={doorW} h={dh} />
              <BarHandle
                position={[doorW / 2, dh / 2, DOOR_T + HANDLE_PROJ]}
                vertical={false}
                length={Math.min(0.14, doorW * 0.42)}
              />
            </group>
          );
        })}
      </group>
    );
  } else if (pair) {
    fronts = (
      <>
        <HingedDoor
          x={leftX}
          y={doorY}
          z={doorZ}
          w={doorW}
          h={doorH}
          hinge="left"
          handle="right"
          open={open}
          hitId={hitId}
          onToggle={onToggle}
        />
        <HingedDoor
          x={leftX + doorW + REVEAL}
          y={doorY}
          z={doorZ}
          w={doorW}
          h={doorH}
          hinge="right"
          handle="left"
          open={open}
          hitId={hitId}
          onToggle={onToggle}
        />
      </>
    );
  } else {
    fronts = (
      <HingedDoor
        x={leftX}
        y={doorY}
        z={doorZ}
        w={doorW}
        h={doorH}
        hinge="left"
        handle="right"
        open={open}
        hitId={hitId}
        onToggle={onToggle}
      />
    );
  }

  return (
    <group>
      <Carcass x={x} y={y} w={w} h={h} depth={depth - 0.004} kick={kick} openTop={openTop} />
      <JoineryFinish.Provider value={kind === 'base' ? '#656c54' : JOINERY}>
        {fronts}
      </JoineryFinish.Provider>
    </group>
  );
}
