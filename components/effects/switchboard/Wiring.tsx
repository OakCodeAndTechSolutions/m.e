'use client';

import { useEffect, useMemo } from 'react';
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { CIRCUITS, circuitNumber, type Vec3 } from './circuit-data';
import { BOARD_METRES_PER_UNIT, MM } from './din';
import type { SwitchboardMaterials } from './materials';
import { useEarthStripeTexture } from './textures';
import { CABLE_COLOR, CABLE_SIZE } from './wiring/board-cables';
import { Cable } from './wiring/Cable';
import { sampleRoute } from './wiring/cable-route';
import { buildWirePaths } from './wiring/wire-paths';

const FACE: Vec3 = [0, 0, 1];

function sample(points: Vec3[], radius: number) {
  return sampleRoute(
    points.map((at) => ({ at, face: FACE })),
    {
      radius,
      step: 0.058,
      wander: 0,
    }
  );
}

/** A small identification tag wrapped around each jacket immediately inside the entry. */
function JacketTag({ at, id, width }: { at: Vec3; id: string; width: number }) {
  const map = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    ctx.fillStyle = '#f3eee0';
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = '#30332e';
    ctx.fillRect(0, 0, 256, 9);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 43px "Segoe UI", sans-serif';
    ctx.fillText(id, 128, 56, 235);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [id]);
  useEffect(() => () => map.dispose(), [map]);

  return (
    <mesh position={at} raycast={() => null}>
      <planeGeometry args={[width, 3.1 * MM]} />
      <meshStandardMaterial map={map} roughness={0.7} />
    </mesh>
  );
}

export function Wiring({
  materials,
  traceCircuit,
}: {
  materials: SwitchboardMaterials;
  traceCircuit: string;
}) {
  const earthMap = useEarthStripeTexture();
  const earth = useMemo(() => {
    const mat = materials.wireEarth.clone();
    mat.color.set('#ffffff');
    mat.map = earthMap;
    return mat;
  }, [materials.wireEarth, earthMap]);
  useEffect(() => () => earth.dispose(), [earth]);

  const insulation = useMemo(() => {
    const active = materials.wireActive;
    const neutral = materials.wireNeutral;
    const physical = { active, neutral, earth };
    const selected = {
      active: active.clone(),
      neutral: neutral.clone(),
      earth: earth.clone(),
    };
    for (const mat of Object.values(selected)) {
      mat.emissive.set('#d88328');
      mat.emissiveIntensity = 0.17;
    }
    return { physical, selected };
  }, [materials.wireActive, materials.wireNeutral, earth]);
  useEffect(
    () => () => Object.values(insulation.selected).forEach((mat) => mat.dispose()),
    [insulation]
  );

  const sheath = useMemo(() => {
    const plastic = (color: string) => new MeshStandardMaterial({ color, roughness: 0.48 });
    const trace = plastic('#ffc05b');
    trace.emissive.set('#f28b23');
    trace.emissiveIntensity = 0.65;
    return {
      light: plastic(CABLE_COLOR.light),
      power: plastic(CABLE_COLOR.power),
      cooking: plastic(CABLE_COLOR.cooking),
      submain: plastic(CABLE_COLOR.submain),
      trace,
    };
  }, []);
  useEffect(() => () => Object.values(sheath).forEach((mat) => mat.dispose()), [sheath]);

  const { looms, links } = useMemo(() => {
    const paths = buildWirePaths();
    const sampleCore = (core: (typeof paths.links)[number]) => ({
      ...core,
      samples: sample(core.points, core.diameter * 3),
    });
    const looms = [paths.source, ...paths.circuits].map(({ circuitId, kind, jacket, cores }) => {
      const { w, t } = CABLE_SIZE[kind];
      const width = w / BOARD_METRES_PER_UNIT;
      const thickness = t / BOARD_METRES_PER_UNIT;
      const [x, y, z] = jacket[0]!;
      const tag = CIRCUITS.find((c) => c.id === circuitId);
      return {
        circuitId,
        kind,
        width,
        thickness,
        tag: tag ? circuitNumber(tag).padStart(2, '0') : 'SUB',
        tagAt: [x, y - 0.052, z + thickness / 2 + 0.005] as Vec3,
        samples: sample(jacket, width * 2.5),
        cores: cores.map(sampleCore),
      };
    });
    return { looms, links: paths.links.map(sampleCore) };
  }, []);

  return (
    <group>
      {looms.map(({ circuitId, kind, cores, samples, width, thickness, tag, tagAt }) => {
        const highlighted = circuitId === traceCircuit;
        return (
          <group key={circuitId}>
            <Cable
              samples={samples}
              width={width}
              thickness={thickness}
              material={highlighted ? sheath.trace : sheath[kind]}
            />
            <JacketTag id={tag} at={tagAt} width={width + 0.6 * MM} />
            {cores.map((core) => (
              <Cable
                key={core.kind}
                samples={core.samples}
                width={core.diameter}
                thickness={core.diameter}
                material={insulation[highlighted ? 'selected' : 'physical'][core.kind]}
              />
            ))}
          </group>
        );
      })}
      {links.map((core) => (
        <Cable
          key={core.kind}
          samples={core.samples}
          width={core.diameter}
          thickness={core.diameter}
          material={insulation.physical[core.kind]}
        />
      ))}
    </group>
  );
}
