'use client';

import { useTexture } from '@react-three/drei';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  type InstancedMesh,
  Matrix4,
  NoColorSpace,
  Quaternion,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FRAME, boardWallNoggins, boardWallStuds, cableHoles } from './exposed-wall';
import { POLYHAVEN } from './room-assets';
import { ROOM } from './room-layout';

/** Metres of timber per texture repeat along the grain. */
const GRAIN_TILE = 0.85;

type Axis = 0 | 1 | 2;

function fract(n: number) {
  return n - Math.floor(n);
}

/**
 * A dressed timber member as a box whose UVs are laid in world metres with the grain
 * along the member, offset per piece so neighbouring studs never repeat the same figure.
 */
function timberPiece(min: Vec3Tuple, max: Vec3Tuple, grain: Axis) {
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]] as const;
  const g = new BoxGeometry(size[0], size[1], size[2]);
  g.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  const seed = min[0] * 13.7 + min[1] * 7.31 + min[2] * 3.17;
  const offU = fract(seed * 1.618);
  const offV = fract(seed * 2.414);
  const pos = g.attributes.position!;
  const nor = g.attributes.normal!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) {
    const p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const n = [Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i))];
    const facing = (n[0]! > n[1]! ? (n[0]! > n[2]! ? 0 : 2) : n[1]! > n[2]! ? 1 : 2) as Axis;
    const plane = ([0, 1, 2] as Axis[]).filter((a) => a !== facing);
    const across = plane.find((a) => a !== grain) ?? plane[1]!;
    const along = plane.includes(grain) ? grain : plane[0]!;
    uv.setXY(i, p[along]! / GRAIN_TILE + offU, p[across]! / GRAIN_TILE + offV);
  }
  uv.needsUpdate = true;
  return g;
}

type Vec3Tuple = [number, number, number];

function useFrameGeometry() {
  return useMemo(() => {
    const { back, front, studW, plateH, topPlateUnder } = FRAME;
    const pieces = [
      timberPiece([back, 0, 0], [front, plateH, ROOM.depth], 2),
      timberPiece([back, topPlateUnder, 0], [front, topPlateUnder + plateH, ROOM.depth], 2),
      timberPiece([back, topPlateUnder + plateH, 0], [front, ROOM.height, ROOM.depth], 2),
    ];
    for (const s of boardWallStuds()) {
      pieces.push(timberPiece([back, s.y0, s.z - studW / 2], [front, s.y1, s.z + studW / 2], 1));
    }
    for (const n of boardWallNoggins()) {
      pieces.push(timberPiece([back, n.y - plateH / 2, n.z0], [front, n.y + plateH / 2, n.z1], 2));
    }
    const merged = mergeGeometries(pieces, false);
    for (const p of pieces) p.dispose();
    if (!merged) throw new Error('Could not merge the wall frame');
    return merged;
  }, []);
}

function prep(tex: Texture, color: boolean) {
  tex.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
}

function Timber() {
  const geometry = useFrameGeometry();
  const [map, normalMap, roughnessMap] = useTexture([
    POLYHAVEN.mgpPine.diff,
    POLYHAVEN.mgpPine.nor,
    POLYHAVEN.mgpPine.arm,
  ]);
  useLayoutEffect(() => {
    prep(map, true);
    prep(normalMap, false);
    prep(roughnessMap, false);
  }, [map, normalMap, roughnessMap]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        map={map}
        normalMap={normalMap}
        normalScale={[0.6, 0.6]}
        roughnessMap={roughnessMap}
        roughness={1}
        metalness={0}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

/**
 * Back face of the neighbouring room's 10 mm plasterboard: grey-brown liner paper with
 * the sheet joints every 1200 mm and the manufacturer's print, seen between the studs.
 */
function paintPlasterboardBack(): CanvasTexture {
  const W = 512;
  const H = 1152;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.fillStyle = '#c7bea9';
  ctx.fillRect(0, 0, W, H);
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // Mottling in the liner paper.
  for (let i = 0; i < 90; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 30 + rand() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rand() > 0.5 ? '255,250,238' : '120,108,88';
    g.addColorStop(0, `rgba(${tone},0.07)`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(90,80,62,0.16)' : 'rgba(255,252,240,0.16)';
    ctx.fillRect(rand() * W, rand() * H, 1, 1 + rand() * 2);
  }
  // Manufacturer's print, repeated down the sheet.
  ctx.save();
  ctx.fillStyle = 'rgba(52,74,120,0.2)';
  ctx.font = '600 8px "Segoe UI", system-ui, sans-serif';
  for (let y = 120; y < H; y += 420) {
    ctx.fillText('10mm STANDARD PLASTERBOARD  ·  AS/NZS 2588  ·  1200 × 2700', 34, y);
  }
  ctx.restore();
  // Sheet edges: the recessed edge and the joint shadow at each side of the repeat.
  const edge = ctx.createLinearGradient(0, 0, 10, 0);
  edge.addColorStop(0, 'rgba(60,50,38,0.55)');
  edge.addColorStop(1, 'rgba(60,50,38,0)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, 10, H);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function PlasterboardBack() {
  const map = useMemo(() => {
    const t = paintPlasterboardBack();
    t.repeat.set(ROOM.depth / 1.2, 1);
    return t;
  }, []);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh
      position={[FRAME.back - 0.0004, ROOM.height / 2, ROOM.depth / 2]}
      rotation={[0, Math.PI / 2, 0]}
      receiveShadow
    >
      <planeGeometry args={[ROOM.depth, ROOM.height]} />
      <meshStandardMaterial map={map} roughness={0.93} metalness={0} envMapIntensity={0.35} />
    </mesh>
  );
}

const Z_AXIS = new Vector3(0, 0, 1);

/** Drilled holes: dark bore with a ring of freshly cut timber round the cable. */
function Holes() {
  const holes = useMemo(() => cableHoles(), []);
  const bore = useRef<InstancedMesh>(null);
  const rim = useRef<InstancedMesh>(null);
  const geo = useMemo(
    () => ({ bore: new CircleGeometry(1, 24), rim: new RingGeometry(1, 1.22, 24) }),
    []
  );
  useLayoutEffect(() => {
    const m = new Matrix4();
    const q = new Quaternion();
    holes.forEach((h, i) => {
      q.setFromUnitVectors(Z_AXIS, new Vector3(...h.normal));
      m.compose(new Vector3(...h.at), q, new Vector3(h.r, h.r, h.r));
      bore.current?.setMatrixAt(i, m);
      rim.current?.setMatrixAt(i, m);
    });
    if (bore.current) bore.current.instanceMatrix.needsUpdate = true;
    if (rim.current) rim.current.instanceMatrix.needsUpdate = true;
  }, [holes]);
  useEffect(
    () => () => {
      geo.bore.dispose();
      geo.rim.dispose();
    },
    [geo]
  );
  return (
    <group>
      <instancedMesh ref={bore} args={[geo.bore, undefined, holes.length]}>
        <meshStandardMaterial color="#2a1f14" roughness={1} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={rim} args={[geo.rim, undefined, holes.length]}>
        <meshStandardMaterial color="#f2dfb4" roughness={0.95} metalness={0} />
      </instancedMesh>
    </group>
  );
}

/** Ink grade stamps the mill rolls along MGP10, on the faces that look into the room. */
function paintStamp(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(28,44,96,0.78)';
  ctx.font = '800 30px "Arial Narrow", "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('MGP10  H2  90x35  ◆  AS/NZS 1748', 12, 26);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function GradeStamps() {
  const map = useMemo(() => paintStamp(), []);
  useEffect(() => () => map.dispose(), [map]);
  const stamps = useMemo(
    () =>
      boardWallStuds()
        .filter((s, i) => i % 3 === 1 && s.y1 - s.y0 > 1.5)
        .map((s, i) => ({ z: s.z, y: 0.55 + fract(s.z * 3.7) * 1.4, flip: i % 2 === 0 })),
    []
  );
  return (
    <group>
      {stamps.map((s) => (
        <mesh
          key={s.z}
          position={[FRAME.front + 0.0005, s.y, s.z]}
          rotation={[0, Math.PI / 2, s.flip ? Math.PI / 2 : -Math.PI / 2]}
        >
          <planeGeometry args={[0.36, 0.034]} />
          <meshStandardMaterial map={map} transparent roughness={0.9} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** The unlined board wall: frame, the plasterboard beyond it, holes and stamps. */
export function ExposedWall() {
  return (
    <group>
      <Timber />
      <PlasterboardBack />
      <Holes />
      <GradeStamps />
    </group>
  );
}
