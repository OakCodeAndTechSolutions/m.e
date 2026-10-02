'use client';

import { useLayoutEffect, useMemo } from 'react';
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { PathWire } from '../wiring/PathWire';
import { DimmerSwitch } from './DimmerSwitch';
import { FittedGltf } from './FittedGltf';
import { POLYHAVEN, ROOM_GLB } from './room-assets';
import { FIXTURES, LOUNGE, ROOM } from './room-layout';
import { RoomHit } from './RoomHit';
import { SwitchedPowerPoint } from './SwitchedPowerPoint';
import { useRepeatingPbr } from './room-textures';
import { cloneGltfScene, setNamedEmissive } from './scene-graph';
import { preloadKeptGltf, useKeptGltf } from './useKeptGltf';

function TvScreen({ on, width, height }: { on: boolean; width: number; height: number }) {
  const map = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 432;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    const g = ctx.createLinearGradient(0, 0, 0, 432);
    g.addColorStop(0, '#0b1220');
    g.addColorStop(0.55, '#16324a');
    g.addColorStop(1, '#071018');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 768, 432);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, 768, 8);
    ctx.fillStyle = '#dbeafe';
    ctx.font = '600 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('HDMI 1', 48, 86);
    ctx.font = '500 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Lounge', 48, 118);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <mesh receiveShadow renderOrder={2} raycast={() => null}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={on ? map : null}
        emissive={on ? '#8ecae6' : '#000000'}
        emissiveMap={on ? map : null}
        emissiveIntensity={on ? 0.65 : 0}
        roughness={on ? 0.18 : 0.06}
        metalness={on ? 0.08 : 0.22}
        transparent={false}
        depthWrite
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
        color={on ? '#ffffff' : '#09090b'}
      />
    </mesh>
  );
}

/**
 * Samsung GLB screen in scene-root metres (Sketchfab Rx(-90) already applied).
 * Overlay is a FittedGltf child, so it inherits contain scale / pin / Ry(π).
 */
const TV_SCREEN = { x: 0.13, y: 0.57, z: 0.056, w: 1.42, h: 0.78 };

function LoungeTelevision({ on }: { on: boolean }) {
  const cab = LOUNGE.cab;
  const tv = FIXTURES.tv;
  return (
    <group position={[tv.x, cab.h, ROOM.depth]}>
      <FittedGltf
        url={ROOM_GLB.television}
        maxSize={[LOUNGE.tv.w, LOUNGE.tv.h, LOUNGE.tv.d]}
        position={[0, 0, 0]}
        rotation={[0, Math.PI, 0]}
        align="bottom"
        pin="front"
        fit="contain"
      >
        <group position={[TV_SCREEN.x, TV_SCREEN.y, TV_SCREEN.z]}>
          <TvScreen on={on} width={TV_SCREEN.w} height={TV_SCREEN.h} />
          <pointLight
            position={[0, 0, 0.18]}
            intensity={on ? 0.55 : 0}
            distance={2.4}
            color="#9ec9e0"
          />
        </group>
      </FittedGltf>
    </group>
  );
}

function Rug() {
  const maps = useRepeatingPbr(POLYHAVEN.knittedFleece, [3.4, 2.6]);
  const { x, w, d, z } = LOUNGE.rug;
  const h = 0.02;
  return (
    <mesh position={[x + w / 2, h / 2, z + d / 2]} receiveShadow raycast={() => null}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        map={maps.map}
        normalMap={maps.normalMap}
        roughnessMap={maps.roughnessMap}
        color="#9aa3ad"
        roughness={0.94}
        metalness={0.02}
        envMapIntensity={0.28}
        normalScale={[0.55, 0.55]}
      />
    </mesh>
  );
}

function Couch() {
  const { x, w, d, z } = LOUNGE.couch;
  return (
    <FittedGltf
      url={ROOM_GLB.sofa}
      maxSize={[w, 0.88, d]}
      position={[x + w / 2, 0, z + d / 2]}
      rotation={[0, 0, 0]}
      align="bottom"
      pin="center"
      fit="contain"
    />
  );
}

function CoffeeTable() {
  const { x, w, d, h, z } = LOUNGE.table;
  return (
    <FittedGltf
      url={ROOM_GLB.coffeeTable}
      maxSize={[w, h + 0.02, d]}
      position={[x + w / 2, 0, z + d / 2]}
      rotation={[0, Math.PI / 2, 0]}
      align="bottom"
      pin="center"
      fit="contain"
    />
  );
}

function TvUnit() {
  const { x, w, h, depth } = LOUNGE.cab;
  return (
    <FittedGltf
      url={ROOM_GLB.tvCabinet}
      maxSize={[w, h + 0.02, depth]}
      position={[x + w / 2, 0, ROOM.depth]}
      rotation={[0, Math.PI, 0]}
      align="bottom"
      pin="front"
      fit="contain"
    />
  );
}

function LoungeSconces({ lightsOn, dimmer }: { lightsOn: boolean; dimmer: number }) {
  const { scene } = useKeptGltf(ROOM_GLB.sconce);
  const a = useMemo(() => cloneGltfScene(scene, { skipRaycast: true }), [scene]);
  const b = useMemo(() => cloneGltfScene(scene, { skipRaycast: true }), [scene]);
  const glow = lightsOn ? 0.7 + dimmer * 1.1 : 0;
  useLayoutEffect(() => {
    setNamedEmissive(a, 'Shade', lightsOn, { intensity: glow });
    setNamedEmissive(b, 'Shade', lightsOn, { intensity: glow });
  }, [a, b, lightsOn, glow]);
  const s1 = FIXTURES.loungeSconce1;
  const s2 = FIXTURES.loungeSconce2;
  const intensity = lightsOn ? 0.45 + dimmer * 1.15 : 0;
  return (
    <group>
      <primitive object={a} position={[s1.x, s1.y, s1.z]} rotation={[0, Math.PI, 0]} scale={1.18} />
      <primitive object={b} position={[s2.x, s2.y, s2.z]} rotation={[0, Math.PI, 0]} scale={1.18} />
      <>
        <pointLight
          position={[s1.x, s1.y - 0.02, s1.z - 0.28]}
          intensity={intensity}
          distance={5.2}
          color="#fff4d6"
        />
        <pointLight
          position={[s2.x, s2.y - 0.02, s2.z - 0.28]}
          intensity={intensity}
          distance={5.2}
          color="#fff4d6"
        />
      </>
    </group>
  );
}

type Props = {
  socketOn: boolean;
  onToggleSocket: () => void;
  powerLive: boolean;
  lightLive: boolean;
  dimmer: number;
  tvOn: boolean;
  onCycleDimmer: () => void;
  onToggleTv: () => void;
};

export function LoungeRun({
  powerLive,
  socketOn,
  onToggleSocket,
  lightLive,
  dimmer,
  tvOn,
  onCycleDimmer,
  onToggleTv,
}: Props) {
  const flex = useMemo(
    () => new MeshStandardMaterial({ color: '#1c1d20', roughness: 0.64, metalness: 0.06 }),
    []
  );
  const lightsOn = lightLive && dimmer > 0.04;
  const screenOn = powerLive && socketOn && tvOn;
  const cab = LOUNGE.cab;
  const zFront = ROOM.depth - cab.depth;
  const gpo = FIXTURES.loungeGpo;
  const tv = FIXTURES.tv;
  const cabEnd = cab.x + cab.w;
  // The GPO is turned to face the room, so its supply outlet (local -x) sits at +x.
  const plugX = gpo.x + 0.029;
  const plugZ = gpo.z - 0.03;

  return (
    <group>
      <Rug />
      <Couch />
      <CoffeeTable />
      <TvUnit />
      <LoungeTelevision on={screenOn} />

      <group position={[gpo.x, gpo.y, gpo.z]} rotation={[0, Math.PI, 0]}>
        <SwitchedPowerPoint on={socketOn} onToggle={onToggleSocket} hitId="tvGpo" />
      </group>
      {/* TV lead: along the back of the unit, over its end, and a short drop to the plug. */}
      <PathWire
        points={[
          [tv.x + 0.56, cab.h + 0.2, ROOM.depth - 0.07],
          [tv.x + 0.64, cab.h + 0.05, ROOM.depth - 0.05],
          [tv.x + 0.7, cab.h + 0.014, ROOM.depth - 0.042],
          [cabEnd - 0.03, cab.h + 0.012, ROOM.depth - 0.038],
          [cabEnd + 0.025, cab.h - 0.035, ROOM.depth - 0.034],
          [cabEnd + 0.08, 0.17, ROOM.depth - 0.03],
          [plugX - 0.06, 0.13, plugZ],
          [plugX, gpo.y - 0.07, plugZ],
          [plugX, gpo.y - 0.024, plugZ],
        ]}
        radius={0.006}
        material={flex}
        live={powerLive && socketOn}
        segments={24}
        oval={1}
        soft={false}
      />

      <DimmerSwitch
        position={[FIXTURES.loungeDimmerA.x, FIXTURES.loungeDimmerA.y, FIXTURES.loungeDimmerA.z]}
        wall="board"
        level={dimmer}
        onCycle={onCycleDimmer}
      />
      <DimmerSwitch
        position={[FIXTURES.loungeDimmerB.x, FIXTURES.loungeDimmerB.y, FIXTURES.loungeDimmerB.z]}
        wall="lounge"
        level={dimmer}
        onCycle={onCycleDimmer}
      />

      <LoungeSconces lightsOn={lightsOn} dimmer={dimmer} />

      <RoomHit
        onToggle={onToggleTv}
        hitId="tv"
        size={[LOUNGE.tv.w + 0.06, LOUNGE.tv.h + 0.04, 0.22]}
        position={[tv.x, cab.h + LOUNGE.tv.h / 2, zFront - 0.1]}
      />
    </group>
  );
}

preloadKeptGltf(ROOM_GLB.gpoDouble);
preloadKeptGltf(ROOM_GLB.sconce);
preloadKeptGltf(ROOM_GLB.sofa);
preloadKeptGltf(ROOM_GLB.coffeeTable);
preloadKeptGltf(ROOM_GLB.television);
preloadKeptGltf(ROOM_GLB.tvCabinet);
