'use client';

import { useEffect, useMemo } from 'react';
import {
  CanvasTexture,
  type BufferGeometry,
  type Material,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { cableGeometry } from './cable-geometry';
import { CABLE_COLOR } from './board-cables';
import type { CableSamples } from './cable-route';

/** Metres of sheath per repeat of the printed legend. */
export const LEGEND_PITCH = 0.5;

/**
 * The legend printed along TPS: faint ink on the top flat, condensed because the flat is
 * a few millimetres wide while the texture is long. White elsewhere so the material
 * colour carries the sheath.
 */
function paintLegend(text: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(0.42, 1);
  ctx.fillStyle = '#c4c4bf';
  ctx.font = '500 15px "Segoe UI", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 30, 10);
  ctx.restore();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export type CableMaterials = {
  light: MeshStandardMaterial;
  power: MeshStandardMaterial;
  cooking: MeshStandardMaterial;
  submain: MeshStandardMaterial;
  tie: MeshStandardMaterial;
  saddle: MeshStandardMaterial;
  grommet: MeshStandardMaterial;
};

/**
 * PVC sheath: white for lighting runs and light grey for power, the way most sparkies
 * keep the two apart at a glance. Satin, not glossy.
 */
export function useCableMaterials(): CableMaterials {
  const materials = useMemo(() => {
    const legend = (text: string) => paintLegend(text);
    const sheath = (color: string, text: string) =>
      new MeshStandardMaterial({ color, map: legend(text), roughness: 0.46, metalness: 0 });
    return {
      light: sheath(
        CABLE_COLOR.light,
        'ELECTRIC CABLE  1.5mm²  2C+E  TPS  450/750V  AS/NZS 5000.2   ELECTRIC CABLE  1.5mm²  2C+E  TPS'
      ),
      power: sheath(
        CABLE_COLOR.power,
        'ELECTRIC CABLE  2.5mm²  2C+E  TPS  450/750V  AS/NZS 5000.2   ELECTRIC CABLE  2.5mm²  2C+E  TPS'
      ),
      cooking: sheath(
        CABLE_COLOR.cooking,
        'ELECTRIC CABLE  6mm²  2C+E  TPS  0.6/1kV  AS/NZS 5000.2   ELECTRIC CABLE  6mm²  2C+E  TPS'
      ),
      submain: sheath(
        CABLE_COLOR.submain,
        'ELECTRIC CABLE  16mm²  2C+E  TPS  0.6/1kV  AS/NZS 5000.1   ELECTRIC CABLE  16mm²  2C+E  TPS'
      ),
      tie: new MeshStandardMaterial({ color: '#141414', roughness: 0.52, metalness: 0 }),
      saddle: new MeshStandardMaterial({ color: '#f2f1ec', roughness: 0.5, metalness: 0 }),
      grommet: new MeshStandardMaterial({ color: '#1d1d1f', roughness: 0.86, metalness: 0 }),
    };
  }, []);
  useEffect(
    () => () => {
      for (const m of Object.values(materials)) {
        m.map?.dispose();
        m.dispose();
      }
    },
    [materials]
  );
  return materials;
}

type Props = {
  samples: CableSamples;
  width: number;
  thickness: number;
  material: Material;
};

/** One run of flat TPS along pre-framed samples. */
export function Cable({ samples, width, thickness, material }: Props) {
  const geometry = useMemo<BufferGeometry>(
    () => cableGeometry(samples, { width, thickness, uvLength: LEGEND_PITCH }),
    [samples, width, thickness]
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}
