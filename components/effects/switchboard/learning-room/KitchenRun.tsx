'use client';

import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { useEffect, useRef, useMemo, type RefObject } from 'react';
import {
  Box3,
  CanvasTexture,
  DoubleSide,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Path,
  Quaternion,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { PathWire } from '../wiring/PathWire';
import { dressBlackAppliance, dressKitchenProduct } from './appliance-dress';
import { preparePhoriaDishwasher, prepareFrenchFridgeDoors3 } from './appliance-hinge';
import { FittedGltf, findNamed } from './FittedGltf';
import {
  JoineryBay,
  JoineryEndPanel,
  JoineryFascia,
  JoineryFridgeHousing,
  JoineryKick,
  JoineryOvenDrawer,
  JoineryPacker,
  JoinerySubtop,
} from './KitchenJoinery';
import { POLYHAVEN, ROOM_GLB } from './room-assets';
import { useRepeatingPbr } from './room-textures';
import { preloadKeptGltf } from './useKeptGltf';
import { WallSwitch } from './WallSwitch';
import { FIXTURES, HEIGHTS, KITCHEN, KITCHEN_BAYS, type RoomInteractId } from './room-layout';
import { RoomHit } from './RoomHit';
import { SwitchedPowerPoint } from './SwitchedPowerPoint';

const BENCH_T = 0.03;
const BENCH_EDGE = 0.0018;
const BENCH_EXTRUSION = {
  depth: BENCH_T - BENCH_EDGE * 2,
  bevelEnabled: true,
  bevelSize: BENCH_EDGE,
  bevelThickness: BENCH_EDGE,
  bevelSegments: 1,
  steps: 1,
};
const FACE = KITCHEN.benchDepth;
/** Center of overlay doors (hinge on FACE, 18 mm thick). */
const FRONT = FACE + 0.018;
/** Marble hole sits under the rim so the cupboard never shows around the bowls. */
const SINK_CUT = { w: 0.72, d: 0.42, cz: 0.3 } as const;
/** The built-in oven sits above a shallow drawer and a 16 mm rail. */
const RAIL_H = 0.016;
const OVEN_H = 0.595;
const OVEN_DRAWER_H = KITCHEN.benchH - KITCHEN.kickH - RAIL_H - OVEN_H;
const DW_H = KITCHEN.benchH - KITCHEN.kickH - RAIL_H;
const FILL = 0.018;
const PACK = 0.01;
const HOUSING_H = KITCHEN.upperY + KITCHEN.upperH;
const FRIDGE_W = 1.09;
const FRIDGE_H = 1.82;

/** A continuous honed slab, with the sink cut into it and a softened exposed edge. */
function BenchRun({ startX, endX, sinkX }: { startX: number; endX: number; sinkX: number }) {
  const maps = useRepeatingPbr(POLYHAVEN.marbleSlab, [0.58, 0.58]);
  const slab = useMemo(() => {
    const outline = new Shape();
    const front = -(KITCHEN.benchDepth + 0.03 - BENCH_EDGE);
    outline.moveTo(startX - 0.004 + BENCH_EDGE, -BENCH_EDGE);
    outline.lineTo(endX + 0.004 - BENCH_EDGE, -BENCH_EDGE);
    outline.lineTo(endX + 0.004 - BENCH_EDGE, front);
    outline.lineTo(startX - 0.004 + BENCH_EDGE, front);
    outline.closePath();

    const cut = new Path();
    const left = sinkX - SINK_CUT.w / 2 - BENCH_EDGE;
    const right = sinkX + SINK_CUT.w / 2 + BENCH_EDGE;
    const back = -(SINK_CUT.cz - SINK_CUT.d / 2 - BENCH_EDGE);
    const innerFront = -(SINK_CUT.cz + SINK_CUT.d / 2 + BENCH_EDGE);
    cut.moveTo(left, back);
    cut.lineTo(left, innerFront);
    cut.lineTo(right, innerFront);
    cut.lineTo(right, back);
    cut.closePath();
    outline.holes.push(cut);
    return outline;
  }, [startX, endX, sinkX]);
  return (
    <mesh
      position={[0, KITCHEN.benchH + BENCH_EDGE, 0]}
      rotation-x={-Math.PI / 2}
      castShadow
      receiveShadow
    >
      <extrudeGeometry args={[slab, BENCH_EXTRUSION]} />
      <meshStandardMaterial
        map={maps.map}
        normalMap={maps.normalMap}
        normalScale={[0.22, 0.22]}
        roughnessMap={maps.roughnessMap}
        roughness={0.72}
      />
    </mesh>
  );
}

/** Warm glazed subway with pale grout — repeating atlas so grout stays sharp. */
function useGlazedSubway(w: number, h: number) {
  const map = useMemo(() => {
    const columns = 8;
    const rows = 4;
    const tileW = 128;
    const tileH = 64;
    const canvas = document.createElement('canvas');
    canvas.width = tileW * columns;
    canvas.height = tileH * rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.fillStyle = '#b9aa96';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < rows; row++) {
      for (let column = -1; column < columns; column++) {
        const x = (column + (row % 2) * 0.5) * tileW;
        const y = row * tileH;
        const tone = Math.sin((row * columns + ((column + columns) % columns)) * 3.17) * 8;
        const color = (offset: number) =>
          `rgb(${208 + tone + offset}, ${190 + tone + offset}, ${165 + tone + offset})`;
        const glaze = ctx.createLinearGradient(x, y, x, y + tileH);
        glaze.addColorStop(0, color(15));
        glaze.addColorStop(0.1, color(5));
        glaze.addColorStop(0.65, color(0));
        glaze.addColorStop(0.95, color(-5));
        glaze.addColorStop(1, color(-17));
        ctx.fillStyle = glaze;
        ctx.fillRect(x + 1.3, y + 1.3, tileW - 2.6, tileH - 2.6);
      }
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.wrapS = RepeatWrapping;
    map.wrapT = RepeatWrapping;
    map.anisotropy = 8;
    map.repeat.set(w / (0.15 * columns), h / (0.075 * rows));
    map.needsUpdate = true;
    return map;
  }, [w, h]);
  useEffect(() => () => map.dispose(), [map]);
  return map;
}

function TiledSplash({ x, w, h, z }: { x: number; w: number; h: number; z: number }) {
  const map = useGlazedSubway(w, h);
  const t = 0.01;
  return (
    <mesh position={[x + w / 2, KITCHEN.benchH + BENCH_T + h / 2, z - t / 2]} receiveShadow>
      <boxGeometry args={[w, h, t]} />
      <meshStandardMaterial map={map} roughness={0.42} envMapIntensity={0.72} />
    </mesh>
  );
}

function SplashUpstand({ x0, x1 }: { x0: number; x1: number }) {
  const w = x1 - x0;
  const maps = useRepeatingPbr(POLYHAVEN.marbleSlab, [Math.max(1.2, w / 2.1), 0.12]);
  return (
    <group>
      <mesh
        position={[(x0 + x1) / 2, KITCHEN.benchH + BENCH_T + 0.012, 0.022]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w, 0.024, 0.018]} />
        <meshStandardMaterial
          map={maps.map}
          normalMap={maps.normalMap}
          roughnessMap={maps.roughnessMap}
          roughness={0.38}
          metalness={0.06}
          envMapIntensity={1.05}
        />
      </mesh>
      <mesh position={[(x0 + x1) / 2, KITCHEN.benchH + BENCH_T + 0.001, 0.032]}>
        <boxGeometry args={[w, 0.003, 0.004]} />
        <meshStandardMaterial color="#2c2c2e" roughness={0.72} metalness={0.04} />
      </mesh>
    </group>
  );
}

function UnderCabinetLed({ x0, x1, live }: { x0: number; x1: number; live: boolean }) {
  const w = x1 - x0;
  if (w < 0.12) return null;
  const y = KITCHEN.upperY - 0.007;
  const z = KITCHEN.upperDepth - 0.05;
  const cx = (x0 + x1) / 2;
  return (
    <group>
      <mesh position={[cx, y, z]} castShadow>
        <boxGeometry args={[w - 0.06, 0.012, 0.024]} />
        <meshStandardMaterial color="#c5c9ce" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[cx, y - 0.007, z]}>
        <boxGeometry args={[w - 0.08, 0.004, 0.016]} />
        <meshStandardMaterial
          color="#fff6e0"
          emissive="#fff1c2"
          emissiveIntensity={live ? 1.1 : 0.08}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function ToasterFlex({ live }: { live: boolean }) {
  const mat = useMemo(
    () => new MeshStandardMaterial({ color: '#1c1d20', roughness: 0.64, metalness: 0.06 }),
    []
  );
  const t = FIXTURES.toaster;
  const g = FIXTURES.gpoDouble;
  const bench = KITCHEN.benchH + BENCH_T;
  const sy = KITCHEN.splashGpoY;
  return (
    <PathWire
      points={[
        [t.x + 0.06, bench + 0.022, t.z + 0.01],
        [t.x + 0.16, bench + 0.006, 0.42],
        [g.x - 0.14, bench + 0.006, 0.26],
        [g.x - 0.08, sy + 0.008, 0.1],
        [g.x - 0.045, sy + 0.008, 0.068],
        [g.x - 0.03, sy + 0.008, 0.052],
      ]}
      radius={0.0042}
      material={mat}
      live={live}
      segments={20}
      oval={1}
      soft={false}
    />
  );
}

function hingeParts(root: Object3D, match: RegExp, extra?: RegExp): Group | null {
  const existing = root.userData.hinge as Group | undefined;
  if (existing) return existing;
  const parts: Object3D[] = [];
  root.traverse((obj) => {
    if (!obj.name) return;
    if (match.test(obj.name) || (extra && extra.test(obj.name))) parts.push(obj);
  });
  if (!parts.length) return null;
  const box = new Box3();
  for (const part of parts) box.expandByObject(part);
  const worldHinge = new Vector3((box.min.x + box.max.x) / 2, box.min.y, box.max.z);
  const host = parts[0]!.parent;
  if (!host) return null;
  const local = worldHinge.clone();
  host.worldToLocal(local);
  const pivot = new Group();
  pivot.name = 'hinge-pivot';
  host.add(pivot);
  pivot.position.copy(local);
  const q = new Quaternion();
  host.getWorldQuaternion(q).invert();
  pivot.quaternion.copy(q);
  const inner = new Group();
  inner.name = 'hinge-inner';
  pivot.add(inner);
  pivot.updateWorldMatrix(true, false);
  inner.updateWorldMatrix(true, false);
  for (const part of parts) inner.attach(part);
  root.userData.hinge = inner;
  return inner;
}

/** Keep an invisible hit box on the imported door as its actual hinge moves. */
function useHingedHit(group: RefObject<Group | null>) {
  const restInverse = useRef(new Matrix4());

  const bind = (hinge: Group | null) => {
    if (!hinge) return;
    hinge.updateWorldMatrix(true, false);
    restInverse.current.copy(hinge.matrixWorld).invert();
  };

  const follow = (hinge: Group) => {
    if (!group.current) return;
    hinge.updateWorldMatrix(true, false);
    group.current.matrix.multiplyMatrices(hinge.matrixWorld, restInverse.current);
    group.current.updateMatrixWorld(true);
  };

  return { bind, follow };
}

/** Product GLB whose door/glass mesh drops open around the bottom-front edge. */
function HingedAppliance({
  open,
  doorMatch,
  extraMatch,
  openAngle = 1.2,
  axis = 'x',
  url,
  maxSize,
  position,
  rotation,
  align,
  pin,
  pinPad,
  fit,
  preScale,
  envIntensity,
  hide,
  prepare,
  hitId,
  hitSize,
  hitPosition,
  onToggle,
}: {
  hitId: 'oven' | 'dishwasher';
  hitSize: [number, number, number];
  hitPosition: [number, number, number];
  onToggle: () => void;
  url: string;
  maxSize: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  align?: 'bottom' | 'center';
  pin?: 'center' | 'min' | 'front' | 'back';
  pinPad?: number;
  fit?: 'contain' | 'width' | 'height' | 'stretch';
  preScale?: number;
  envIntensity?: number;
  hide?: RegExp;
  prepare?: (root: Object3D) => void;
  open: boolean;
  doorMatch: RegExp;
  extraMatch?: RegExp;
  openAngle?: number;
  axis?: 'x' | 'y';
}) {
  const pivot = useRef<Group | null>(null);
  const hitGroup = useRef<Group>(null);
  const hit = useHingedHit(hitGroup);
  useFrame((_, delta) => {
    const g = pivot.current;
    if (!g) return;
    const target = open ? openAngle : 0;
    if (axis === 'y') g.rotation.y = MathUtils.damp(g.rotation.y, target, 8, delta);
    else g.rotation.x = MathUtils.damp(g.rotation.x, target, 8, delta);
    hit.follow(g);
  });
  return (
    <>
      <FittedGltf
        url={url}
        maxSize={maxSize}
        position={position}
        rotation={rotation}
        align={align}
        pin={pin}
        pinPad={pinPad}
        fit={fit}
        preScale={preScale}
        envIntensity={envIntensity}
        hide={hide}
        prepare={prepare ?? dressKitchenProduct}
        onReady={(root) => {
          const pre = findNamed(root, /^door_drop$/);
          pivot.current = (pre as Group | null) ?? hingeParts(root, doorMatch, extraMatch);
          hit.bind(pivot.current);
        }}
      />
      <group ref={hitGroup} matrixAutoUpdate={false}>
        <RoomHit hitId={hitId} size={hitSize} position={hitPosition} onToggle={onToggle} />
      </group>
    </>
  );
}

function FrenchFridge({
  open,
  position,
  maxSize,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
  position: [number, number, number];
  maxSize: [number, number, number];
}) {
  const left = useRef<Group | null>(null);
  const right = useRef<Group | null>(null);
  const leftHitGroup = useRef<Group>(null);
  const rightHitGroup = useRef<Group>(null);
  const leftHit = useHingedHit(leftHitGroup);
  const rightHit = useHingedHit(rightHitGroup);
  useFrame((_, delta) => {
    if (left.current) {
      left.current.rotation.y = MathUtils.damp(left.current.rotation.y, open ? -1.22 : 0, 8, delta);
      leftHit.follow(left.current);
    }
    if (right.current) {
      right.current.rotation.y = MathUtils.damp(
        right.current.rotation.y,
        open ? 1.22 : 0,
        8,
        delta
      );
      rightHit.follow(right.current);
    }
  });
  return (
    <>
      <FittedGltf
        url={ROOM_GLB.fridge}
        maxSize={maxSize}
        position={position}
        align="bottom"
        pin="front"
        pinPad={0.16}
        fit="contain"
        prepare={prepareFrenchFridgeDoors3}
        envIntensity={1}
        onReady={(root) => {
          left.current = findNamed(root, /^door_l$/) as Group | null;
          right.current = findNamed(root, /^door_r$/) as Group | null;
          leftHit.bind(left.current);
          rightHit.bind(right.current);
        }}
      />
      <group ref={leftHitGroup} matrixAutoUpdate={false}>
        <RoomHit
          hitId="fridge"
          onToggle={onToggle}
          size={[maxSize[0] * 0.48, maxSize[1] * 0.67, 0.16]}
          position={[position[0] - maxSize[0] / 4, maxSize[1] * 0.66, position[2] + 0.16]}
        />
      </group>
      <group ref={rightHitGroup} matrixAutoUpdate={false}>
        <RoomHit
          hitId="fridge"
          onToggle={onToggle}
          size={[maxSize[0] * 0.48, maxSize[1] * 0.67, 0.16]}
          position={[position[0] + maxSize[0] / 4, maxSize[1] * 0.66, position[2] + 0.16]}
        />
      </group>
      <RoomHit
        hitId="fridge"
        onToggle={onToggle}
        size={[maxSize[0] * 0.95, maxSize[1] * 0.34, 0.16]}
        position={[position[0], maxSize[1] * 0.17, position[2] + 0.16]}
      />
    </>
  );
}

function WallGpo({
  position,
  onToggle,
  live = false,
}: {
  position: [number, number, number];
  onToggle?: () => void;
  live?: boolean;
}) {
  const maxSize: [number, number, number] = [0.155, 0.1, 0.032];
  return (
    <group position={position}>
      <FittedGltf
        url={ROOM_GLB.gpoDouble}
        maxSize={maxSize}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        align="center"
        pin="back"
        share
        shadows={false}
        envIntensity={live ? 1.15 : 1.05}
      />
      {onToggle && <RoomHit onToggle={onToggle} size={[0.24, 0.18, 0.14]} hitId="gpoDouble" />}
    </group>
  );
}

function CookIsolator({
  position,
  on,
  onToggle,
}: {
  position: [number, number, number];
  on: boolean;
  onToggle: () => void;
}) {
  return <WallSwitch position={position} wall="kitchen" on={on} onToggle={onToggle} isolator />;
}

function CookPot({ boiling, position }: { boiling: boolean; position: [number, number, number] }) {
  const steam = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = steam.current;
    if (!g) return;
    g.visible = boiling;
    if (!boiling) return;
    g.children.forEach((child, i) => {
      const t = (clock.elapsedTime * 0.7 + i * 0.22) % 1;
      child.position.y = 0.16 + t * 0.26;
      child.position.x = Math.sin(clock.elapsedTime * 2 + i) * 0.025;
      child.scale.setScalar((0.014 + t * 0.028) / 0.014);
      const mesh = child as Mesh;
      const mat = mesh.material as MeshStandardMaterial;
      if (mat) mat.opacity = 0.28 * (1 - t);
    });
  });
  return (
    <group position={position}>
      <FittedGltf
        url={ROOM_GLB.pot}
        maxSize={[0.22, 0.14, 0.22]}
        position={[0, 0, 0]}
        align="bottom"
        pin="center"
        fit="contain"
        envIntensity={1.2}
      />
      <group ref={steam} visible={boiling}>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} position={[0, 0.08, 0]} scale={[0.65, 1.7, 0.65]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshStandardMaterial
              color="#eef2f6"
              transparent
              opacity={0.2}
              roughness={1}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Sink GLB is FrontSide and the bowl floors cull when you look down. */
function dressSink(root: Object3D) {
  dressKitchenProduct(root);
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const m = mat as MeshStandardMaterial;
      if (!m) continue;
      m.side = DoubleSide;
      m.transparent = false;
      m.opacity = 1;
      m.depthWrite = true;
      m.metalness = Math.max(m.metalness, 0.86);
      m.roughness = 0.28;
      if (!m.map) m.color.set('#c8ccd0');
      m.needsUpdate = true;
    }
  });
}

function SteelBasinMat() {
  return (
    <meshStandardMaterial
      color="#d4dbe1"
      metalness={0.94}
      roughness={0.18}
      envMapIntensity={1.35}
      side={DoubleSide}
    />
  );
}

/** One rectangular well the size of the marble hole, plus a centre divider. */
function SinkBasins() {
  const cx = FIXTURES.sink.x;
  const z = SINK_CUT.cz;
  const t = 0.012;
  const depth = 0.18;
  const top = KITCHEN.benchH + BENCH_T - 0.002;
  const floorY = top - depth;
  const midY = floorY + depth / 2;
  // Walls tuck under the slab so looking down the hole cannot miss the steel.
  const w = SINK_CUT.w + 0.028;
  const d = SINK_CUT.d + 0.028;
  const divX = cx + 0.04;
  return (
    <group>
      <mesh position={[cx, floorY + t / 2, z]} receiveShadow>
        <boxGeometry args={[w, t, d]} />
        <SteelBasinMat />
      </mesh>
      <mesh position={[cx, midY, z - d / 2 + t / 2]} receiveShadow>
        <boxGeometry args={[w, depth, t]} />
        <SteelBasinMat />
      </mesh>
      <mesh position={[cx, midY, z + d / 2 - t / 2]} receiveShadow>
        <boxGeometry args={[w, depth, t]} />
        <SteelBasinMat />
      </mesh>
      <mesh position={[cx - w / 2 + t / 2, midY, z]} receiveShadow>
        <boxGeometry args={[t, depth, d]} />
        <SteelBasinMat />
      </mesh>
      <mesh position={[cx + w / 2 - t / 2, midY, z]} receiveShadow>
        <boxGeometry args={[t, depth, d]} />
        <SteelBasinMat />
      </mesh>
      <mesh position={[divX, midY, z]} receiveShadow>
        <boxGeometry args={[0.02, depth - 0.004, d - 0.024]} />
        <SteelBasinMat />
      </mesh>
    </group>
  );
}

function TapWater({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <mesh position={[x, y + 0.02, z]}>
      <cylinderGeometry args={[0.004, 0.006, 0.22, 8]} />
      <meshStandardMaterial
        color="#9ec9de"
        transparent
        opacity={0.38}
        roughness={0.08}
        metalness={0.05}
      />
    </mesh>
  );
}

type KitchenProps = {
  socketOn: boolean;
  onToggleSocket: () => void;
  lightsOn: boolean;
  powerLive: boolean;
  fridgeLive: boolean;
  ovenLive: boolean;
  hobLive: boolean;
  isolatorOn: boolean;
  fridgeOpen: boolean;
  toasterPop: boolean;
  sinkOn: boolean;
  boiling: boolean;
  openById: Partial<Record<RoomInteractId, boolean>>;
  onToggle: (id: RoomInteractId) => void;
  onToggleFridge: () => void;
  onToggleToaster: () => void;
  onToggleIsolator: () => void;
  onToggleSink: () => void;
  onToggleBoil: () => void;
};

export function KitchenRun({
  socketOn,
  onToggleSocket,
  lightsOn,
  powerLive,
  fridgeLive,
  ovenLive,
  hobLive,
  isolatorOn,
  fridgeOpen,
  toasterPop,
  sinkOn,
  boiling,
  openById = {},
  onToggle = () => {},
  onToggleFridge,
  onToggleToaster,
  onToggleIsolator,
  onToggleSink,
  onToggleBoil,
}: KitchenProps) {
  const sink = KITCHEN_BAYS.sink;
  const cabA = KITCHEN_BAYS.cabA;
  const cook = KITCHEN_BAYS.cook;
  const cabL = KITCHEN_BAYS.cabL;
  const dw = KITCHEN_BAYS.dw;
  const cabR = KITCHEN_BAYS.cabR;
  const fridge = KITCHEN_BAYS.fridge;

  const joineryEnd = fridge.x;
  const cookX = FIXTURES.cooktop.x;
  const toasterX = FIXTURES.toaster.x;
  const benchY = KITCHEN.benchH;
  const benchTop = KITCHEN.benchH + BENCH_T;
  const benchZ = 0.32;
  const splashY = KITCHEN.splashGpoY;
  const splashZ = 0.018;
  const splashH = KITCHEN.upperY - (KITCHEN.benchH + BENCH_T) - 0.01;
  const hood = FIXTURES.rangehood;

  const ovenOpen = !!openById.oven;
  const dwOpen = !!openById.dishwasher;
  const drawersOpen = !!openById['cabA-base'];

  const fridgeLeft = fridge.x + (fridge.w - FRIDGE_W) / 2;
  const fridgeMid = fridgeLeft + FRIDGE_W / 2;
  const ovenY = KITCHEN.kickH + OVEN_DRAWER_H;
  const gableDepth = KITCHEN.benchDepth + 0.018;
  const kickEnd = fridge.x;
  // Keep one appliance accent in the shader rather than five mostly dark lights.
  // Appliance surfaces retain their own powered/emissive state.
  const glow =
    fridgeOpen && fridgeLive
      ? { position: [fridgeMid, 1.05, 0.52], intensity: 0.85, distance: 1.6, color: '#f3efe6' }
      : ovenOpen && ovenLive
        ? {
            position: [FIXTURES.oven.x, 0.48, 0.4],
            intensity: 0.35,
            distance: 0.8,
            color: '#fdba74',
          }
        : dwOpen && powerLive
          ? {
              position: [dw.x + dw.w / 2, 0.46, 0.42],
              intensity: 0.22,
              distance: 0.7,
              color: '#e8eef5',
            }
          : powerLive && socketOn && toasterPop
            ? {
                position: [toasterX, benchY + 0.26, 0.34],
                intensity: 0.35,
                distance: 1.1,
                color: '#fde68a',
              }
            : {
                position: [cookX, benchY + 0.18, 0.3],
                intensity: hobLive && boiling ? 0.18 : 0,
                distance: 0.5,
                color: '#fdba74',
              };

  return (
    <group>
      <JoineryKick x={sink.x - FILL} w={kickEnd - (sink.x - FILL)} returns />
      <JoineryEndPanel x={sink.x - FILL} w={FILL} h={KITCHEN.benchH} depth={gableDepth} />
      <JoineryEndPanel
        x={sink.x - FILL}
        w={FILL}
        y={KITCHEN.upperY}
        h={KITCHEN.upperH}
        depth={KITCHEN.upperDepth + 0.018}
      />
      <BenchRun startX={KITCHEN.startX} endX={joineryEnd} sinkX={FIXTURES.sink.x} />
      <JoinerySubtop
        x={KITCHEN.startX}
        w={joineryEnd - KITCHEN.startX}
        cutX={sink.x}
        cutW={sink.w}
        cutZ0={0}
        cutZ1={KITCHEN.benchDepth}
      />
      <TiledSplash x={KITCHEN.startX} w={joineryEnd - KITCHEN.startX} h={splashH} z={splashZ} />
      <SplashUpstand x0={KITCHEN.startX} x1={joineryEnd} />
      <UnderCabinetLed x0={sink.x} x1={cook.x} live={lightsOn} />
      <UnderCabinetLed x0={cabL.x} x1={fridge.x} live={lightsOn} />

      <JoineryBay
        hitId="sink-base"
        onToggle={() => onToggle('sink-base')}
        x={sink.x}
        w={sink.w}
        y={0}
        h={KITCHEN.benchH}
        depth={KITCHEN.benchDepth}
        open={!!openById['sink-base']}
        kind="base"
        openTop
      />
      <JoineryBay
        hitId="cabA-base"
        onToggle={() => onToggle('cabA-base')}
        x={cabA.x}
        w={cabA.w}
        y={0}
        h={KITCHEN.benchH}
        depth={KITCHEN.benchDepth}
        open={drawersOpen}
        kind="base"
        drawers
      />
      <JoineryBay
        hitId="cabL-base"
        onToggle={() => onToggle('cabL-base')}
        x={cabL.x}
        w={cabL.w}
        y={0}
        h={KITCHEN.benchH}
        depth={KITCHEN.benchDepth}
        open={!!openById['cabL-base']}
        kind="base"
      />
      <JoineryBay
        hitId="cabR-base"
        onToggle={() => onToggle('cabR-base')}
        x={cabR.x}
        w={cabR.w}
        y={0}
        h={KITCHEN.benchH}
        depth={KITCHEN.benchDepth}
        open={!!openById['cabR-base']}
        kind="base"
      />

      <JoineryBay
        hitId="sink-upper"
        onToggle={() => onToggle('sink-upper')}
        x={sink.x}
        w={sink.w}
        y={KITCHEN.upperY}
        h={KITCHEN.upperH}
        depth={KITCHEN.upperDepth}
        open={!!openById['sink-upper']}
        kind="upper"
      />
      <JoineryBay
        hitId="cabA-upper"
        onToggle={() => onToggle('cabA-upper')}
        x={cabA.x}
        w={cabA.w}
        y={KITCHEN.upperY}
        h={KITCHEN.upperH}
        depth={KITCHEN.upperDepth}
        open={!!openById['cabA-upper']}
        kind="upper"
      />
      <JoineryBay
        hitId="cabL-upper"
        onToggle={() => onToggle('cabL-upper')}
        x={cabL.x}
        w={cabL.w}
        y={KITCHEN.upperY}
        h={KITCHEN.upperH}
        depth={KITCHEN.upperDepth}
        open={!!openById['cabL-upper']}
        kind="upper"
      />
      <JoineryBay
        hitId="dw-upper"
        onToggle={() => onToggle('dw-upper')}
        x={dw.x}
        w={dw.w}
        y={KITCHEN.upperY}
        h={KITCHEN.upperH}
        depth={KITCHEN.upperDepth}
        open={!!openById['dw-upper']}
        kind="upper"
      />
      <JoineryBay
        hitId="cabR-upper"
        onToggle={() => onToggle('cabR-upper')}
        x={cabR.x}
        w={cabR.w}
        y={KITCHEN.upperY}
        h={KITCHEN.upperH}
        depth={KITCHEN.upperDepth}
        open={!!openById['cabR-upper']}
        kind="upper"
      />

      <FittedGltf
        url={ROOM_GLB.sink}
        maxSize={[0.78, 0.22, 0.48]}
        position={[FIXTURES.sink.x, benchTop + 0.003, SINK_CUT.cz]}
        preScale={0.01}
        fit="width"
        align="top"
        prepare={dressSink}
        envIntensity={1}
      />
      <SinkBasins />
      <FittedGltf
        url={ROOM_GLB.tap}
        maxSize={[0.22, 0.32, 0.22]}
        position={[FIXTURES.sink.x, benchTop, 0.16]}
        prepare={dressKitchenProduct}
        envIntensity={1}
        shadows={false}
      />
      <FittedGltf
        url={ROOM_GLB.cooktop}
        maxSize={[0.58, 0.06, 0.52]}
        position={[FIXTURES.cooktop.x, benchTop, FIXTURES.cooktop.z]}
        align="bottom"
        fit="width"
        prepare={dressBlackAppliance}
        envIntensity={1}
      />
      <JoineryOvenDrawer x={cook.x} w={cook.w} y={KITCHEN.kickH} h={OVEN_DRAWER_H} />
      <HingedAppliance
        url={ROOM_GLB.oven}
        hitId="oven"
        hitSize={[cook.w - 0.04, OVEN_H, 0.16]}
        hitPosition={[FIXTURES.oven.x, ovenY + OVEN_H / 2, FRONT + 0.04]}
        onToggle={() => onToggle('oven')}
        maxSize={[cook.w - 0.008, OVEN_H, 0.72]}
        position={[FIXTURES.oven.x, ovenY, FRONT]}
        rotation={[0, -Math.PI / 2, 0]}
        align="bottom"
        pin="front"
        pinPad={0}
        preScale={0.001}
        fit="width"
        envIntensity={1}
        prepare={dressBlackAppliance}
        open={ovenOpen}
        doorMatch={/glass/i}
        openAngle={1.15}
      />
      <JoineryPacker x={cook.x} y={ovenY} h={OVEN_H} depth={KITCHEN.benchDepth} />
      <JoineryPacker x={cook.x + cook.w - 0.007} y={ovenY} h={OVEN_H} depth={KITCHEN.benchDepth} />
      <JoineryFascia
        x={cook.x + PACK}
        w={cook.w - PACK * 2}
        y={KITCHEN.benchH - RAIL_H}
        h={RAIL_H}
      />
      <FittedGltf
        url={ROOM_GLB.hood}
        maxSize={[cook.w, KITCHEN.upperH + 0.04, KITCHEN.upperDepth + 0.24]}
        position={[FIXTURES.rangehood.x, KITCHEN.upperY, 0.08]}
        align="bottom"
        pin="back"
        fit="width"
        prepare={dressBlackAppliance}
        envIntensity={1}
      />
      <HingedAppliance
        url={ROOM_GLB.dishwasher}
        hitId="dishwasher"
        hitSize={[dw.w - 0.04, DW_H, 0.16]}
        hitPosition={[FIXTURES.dishwasher.x, KITCHEN.kickH + DW_H / 2, FRONT + 0.04]}
        onToggle={() => onToggle('dishwasher')}
        maxSize={[dw.w - 0.01, DW_H - 0.008, 0.58]}
        position={[dw.x + dw.w / 2, KITCHEN.kickH + 0.002, FRONT]}
        align="bottom"
        pin="front"
        pinPad={0.04}
        fit="width"
        prepare={preparePhoriaDishwasher}
        envIntensity={1}
        open={dwOpen}
        doorMatch={/^door_drop$/}
        openAngle={1.15}
      />
      <JoineryFascia x={dw.x + PACK} w={dw.w - PACK * 2} y={KITCHEN.benchH - RAIL_H} h={RAIL_H} />
      <JoineryFridgeHousing
        x={fridge.x}
        w={fridge.w}
        h={HOUSING_H}
        openingX={fridgeLeft}
        openingW={FRIDGE_W}
        openingH={FRIDGE_H}
        depth={gableDepth}
      />
      <FrenchFridge
        onToggle={onToggleFridge}
        open={fridgeOpen}
        maxSize={[FRIDGE_W - 0.02, FRIDGE_H, 0.7]}
        position={[fridgeMid, 0, FRONT]}
      />
      <FittedGltf
        url={ROOM_GLB.toaster}
        maxSize={[0.26, 0.17, 0.15]}
        position={[toasterX, benchY + 0.042, 0.34]}
        prepare={dressKitchenProduct}
        envIntensity={1}
      />

      <RoomHit
        onToggle={onToggleSink}
        hitId="sink"
        size={[0.55, 0.24, 0.4]}
        position={[FIXTURES.sink.x, benchY + 0.12, 0.55]}
      />
      <RoomHit
        onToggle={onToggleBoil}
        hitId="cooktop"
        size={[0.56, 0.1, 0.48]}
        position={[cookX, benchY + 0.08, benchZ]}
      />
      <RoomHit
        onToggle={onToggleToaster}
        hitId="toaster"
        size={[0.32, 0.22, 0.2]}
        position={[toasterX, benchY + 0.14, benchZ]}
      />

      <CookPot
        boiling={hobLive && boiling}
        position={[cookX, benchTop + 0.01, FIXTURES.cooktop.z]}
      />
      {sinkOn && <TapWater x={FIXTURES.sink.x} y={benchTop + 0.14} z={0.28} />}
      {ovenOpen && ovenLive && (
        <FittedGltf
          url={ROOM_GLB.roast}
          maxSize={[0.2, 0.08, 0.14]}
          position={[FIXTURES.oven.x, ovenY + 0.08, 0.42]}
          align="bottom"
          envIntensity={1}
        />
      )}
      {toasterPop && (
        <>
          <RoundedBox
            args={[0.062, 0.08, 0.014]}
            radius={0.004}
            smoothness={3}
            position={[toasterX - 0.038, benchY + 0.24, 0.34]}
            castShadow
          >
            <meshStandardMaterial color="#c4a06a" roughness={0.88} metalness={0.02} />
          </RoundedBox>
          <RoundedBox
            args={[0.062, 0.08, 0.014]}
            radius={0.004}
            smoothness={3}
            position={[toasterX + 0.038, benchY + 0.24, 0.34]}
            castShadow
          >
            <meshStandardMaterial color="#b08958" roughness={0.88} metalness={0.02} />
          </RoundedBox>
        </>
      )}

      <group position={[FIXTURES.gpoDouble.x, splashY, splashZ]}>
        <SwitchedPowerPoint on={socketOn} onToggle={onToggleSocket} hitId="gpoDouble" />
      </group>
      <WallGpo position={[FIXTURES.gpoSingle.x, splashY, splashZ]} live={powerLive} />
      <WallGpo position={[FIXTURES.dwGpo.x, HEIGHTS.gpo, splashZ]} live={powerLive} />
      <WallGpo position={[FIXTURES.fridgeGpo.x, splashY, splashZ]} live={fridgeLive} />
      <CookIsolator
        position={[FIXTURES.cookIsolator.x, splashY, splashZ]}
        on={isolatorOn}
        onToggle={onToggleIsolator}
      />
      <ToasterFlex live={powerLive && socketOn} />

      <pointLight
        position={glow.position as [number, number, number]}
        intensity={glow.intensity}
        distance={glow.distance}
        color={glow.color}
      />
      <pointLight
        position={[hood.x, 1.48, 0.28]}
        intensity={lightsOn ? 0.28 : 0}
        distance={2.6}
        color="#f4f1ea"
      />
    </group>
  );
}

preloadKeptGltf(ROOM_GLB.fridge);
preloadKeptGltf(ROOM_GLB.oven);
preloadKeptGltf(ROOM_GLB.cooktop);
preloadKeptGltf(ROOM_GLB.toaster);
preloadKeptGltf(ROOM_GLB.sink);
preloadKeptGltf(ROOM_GLB.tap);
preloadKeptGltf(ROOM_GLB.gpoDouble);
preloadKeptGltf(ROOM_GLB.dishwasher);
preloadKeptGltf(ROOM_GLB.hood);
preloadKeptGltf(ROOM_GLB.pot);
preloadKeptGltf(ROOM_GLB.roast);
