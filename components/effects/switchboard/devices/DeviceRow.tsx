'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import { BOARD, CIRCUITS, TERMINAL_X, mainSwitchX, moduleBodyZ, rcboX } from '../circuit-data';
import { DIN, DIN_Z, MM, NOSE_LAYOUT } from '../din';
import { useNeutralMarkTexture, useVoltageWarningTexture } from '../textures';
import {
  createCableEntryGeometry,
  createDinBodyGeometry,
  createDinClipGeometry,
  createScrewHeadGeometry,
  createScrewHoleGeometry,
  createScrewSlotGeometry,
} from './din-geometry';

type V3 = [number, number, number];

/** Pole centres, main switch first. Hover keys match SwitchboardContext ids. */
function poles(): { key: string; x: number }[] {
  return [
    { key: 'main', x: mainSwitchX() },
    ...CIRCUITS.map((c) => ({ key: c.id, x: rcboX(c.index) })),
  ];
}

function Parts({
  geometry,
  material,
  at,
  tint,
}: {
  geometry: BufferGeometry;
  material: Material;
  at: V3[];
  tint?: (number | null)[];
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    at.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p[0], p[1], p[2])));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [at]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !tint) return;
    const c = new Color();
    tint.forEach((t, i) => mesh.setColorAt(i, t === null ? c.set(1, 1, 1) : c.setHex(t)));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [tint]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, at.length]}
      receiveShadow
      raycast={() => null}
      frustumCulled={false}
    />
  );
}

/**
 * Every static part of the device row — moulded bodies, terminal screws, cable
 * entries, DIN clips, toggle openings, printed marks and warning labels — drawn as one
 * instanced mesh per part. Interactive parts live in Rcbo / MainSwitch.
 */
export function DeviceRow({ hovered }: { hovered: string | null }) {
  const warningMap = useVoltageWarningTexture();
  const neutralMap = useNeutralMarkTexture();

  const parts = useMemo(() => {
    const body = new MeshPhysicalMaterial({
      color: '#f4f4f2',
      roughness: 0.44,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.45,
    });
    return {
      geometry: {
        body: createDinBodyGeometry(),
        hole: createScrewHoleGeometry(),
        head: createScrewHeadGeometry(),
        slot: createScrewSlotGeometry(),
        entry: createCableEntryGeometry(),
        clip: createDinClipGeometry(),
        opening: new BoxGeometry(
          BOARD.rcboWidth * 0.66,
          NOSE_LAYOUT.toggle.openingHeight,
          0.6 * MM
        ),
        warning: new PlaneGeometry(NOSE_LAYOUT.warning.height * 1.3, NOSE_LAYOUT.warning.height),
        neutral: new PlaneGeometry(3 * MM, 3 * MM),
        markI: new BoxGeometry(0.5 * MM, 2.2 * MM, 0.2 * MM),
        markO: new TorusGeometry(0.9 * MM, 0.25 * MM, 6, 16),
      },
      material: {
        body,
        hole: new MeshStandardMaterial({ color: '#2b2b30', roughness: 0.85 }),
        head: new MeshStandardMaterial({ color: '#c3c6cc', roughness: 0.32, metalness: 0.85 }),
        slot: new MeshStandardMaterial({ color: '#3a3b40', roughness: 0.6, metalness: 0.4 }),
        entry: new MeshStandardMaterial({ color: '#1c1c1f', roughness: 0.9 }),
        clip: new MeshStandardMaterial({ color: '#f2c200', roughness: 0.5 }),
        opening: new MeshStandardMaterial({ color: '#c6c6cb', roughness: 0.7 }),
        warning: new MeshStandardMaterial({ map: warningMap, roughness: 0.55 }),
        neutral: new MeshStandardMaterial({ map: neutralMap, roughness: 0.6, transparent: true }),
        mark: new MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.6 }),
      },
    };
  }, [warningMap, neutralMap]);

  useLayoutEffect(
    () => () => {
      for (const g of Object.values(parts.geometry)) g.dispose();
      for (const m of Object.values(parts.material)) m.dispose();
    },
    [parts]
  );

  const placements = useMemo(() => {
    const y0 = BOARD.railY;
    const z0 = moduleBodyZ();
    const list = poles();
    const at = (x: number, y: number, z: number): V3 => [x, y0 + y, z0 + z];
    const ends = [1, -1] as const;
    const screwXs = [TERMINAL_X.neutral, TERMINAL_X.line];
    const faceZ = DIN_Z.shoulder;
    const nose = DIN_Z.nose;
    const markX = BOARD.rcboWidth * 0.39;
    const toggleTop = NOSE_LAYOUT.toggle.y + NOSE_LAYOUT.toggle.openingHeight / 2;
    const toggleBottom = NOSE_LAYOUT.toggle.y - NOSE_LAYOUT.toggle.openingHeight / 2;

    return {
      body: list.map((p) => at(p.x, 0, 0)),
      hole: list.flatMap((p) =>
        ends.flatMap((e) => screwXs.map((sx) => at(p.x + sx, e * DIN.screwY, faceZ + 0.2 * MM)))
      ),
      head: list.flatMap((p) =>
        ends.flatMap((e) => screwXs.map((sx) => at(p.x + sx, e * DIN.screwY, faceZ + 0.45 * MM)))
      ),
      slot: list.flatMap((p) =>
        ends.flatMap((e) => screwXs.map((sx) => at(p.x + sx, e * DIN.screwY, faceZ + 0.72 * MM)))
      ),
      entry: list.flatMap((p) =>
        ends.flatMap((e) =>
          screwXs.map((sx) => at(p.x + sx, e * (DIN.height / 2 + 0.2 * MM), DIN_Z.clamp))
        )
      ),
      clip: list.map((p) => at(p.x, 0, 0)),
      opening: list.map((p) => at(p.x, NOSE_LAYOUT.toggle.y, nose + 0.3 * MM)),
      warning: list.map((p) => at(p.x, NOSE_LAYOUT.warning.y, nose + 0.15 * MM)),
      neutral: list.flatMap((p) =>
        ends.map((e) => at(p.x + TERMINAL_X.neutral, e * (DIN.screwY + 5 * MM), faceZ + 0.15 * MM))
      ),
      markI: list.map((p) => at(p.x + markX, toggleTop - 1.4 * MM, nose + 0.2 * MM)),
      markO: list.map((p) => at(p.x + markX, toggleBottom + 1.4 * MM, nose + 0.2 * MM)),
    };
  }, []);

  // Hovered device takes a faint warm tint so the target is clear before clicking.
  const tint = useMemo(() => poles().map((p) => (p.key === hovered ? 0xffe7c4 : null)), [hovered]);

  const { geometry: g, material: m } = parts;
  return (
    <group>
      <Parts geometry={g.body} material={m.body} at={placements.body} tint={tint} />
      <Parts geometry={g.hole} material={m.hole} at={placements.hole} />
      <Parts geometry={g.head} material={m.head} at={placements.head} />
      <Parts geometry={g.slot} material={m.slot} at={placements.slot} />
      <Parts geometry={g.entry} material={m.entry} at={placements.entry} />
      <Parts geometry={g.clip} material={m.clip} at={placements.clip} />
      <Parts geometry={g.opening} material={m.opening} at={placements.opening} />
      <Parts geometry={g.warning} material={m.warning} at={placements.warning} />
      <Parts geometry={g.neutral} material={m.neutral} at={placements.neutral} />
      <Parts geometry={g.markI} material={m.mark} at={placements.markI} />
      <Parts geometry={g.markO} material={m.mark} at={placements.markO} />
    </group>
  );
}
