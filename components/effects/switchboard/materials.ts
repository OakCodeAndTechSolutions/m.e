'use client';

import { useMemo } from 'react';
import { MeshStandardMaterial } from 'three';

export function useSwitchboardMaterials() {
  return useMemo(() => {
    const enclosure = new MeshStandardMaterial({
      color: '#e8e6e1',
      roughness: 0.62,
      metalness: 0.04,
    });
    const enclosureInner = new MeshStandardMaterial({
      color: '#d8d5cf',
      // Stands in for light bounced inside the box; the downward-facing top was near black.
      emissive: '#d8d5cf',
      emissiveIntensity: 0.28,
      roughness: 0.68,
      metalness: 0.02,
    });
    const plasticGrey = new MeshStandardMaterial({
      color: '#d4d4d8',
      roughness: 0.55,
      metalness: 0.05,
    });
    const plasticDark = new MeshStandardMaterial({
      color: '#2e2e34',
      roughness: 0.44,
      metalness: 0.1,
    });
    const plasticYellow = new MeshStandardMaterial({
      color: '#f0bf0c',
      roughness: 0.48,
      metalness: 0.04,
    });
    /** Pin busbar insulating cover, as on the reference boards. */
    const busCover = new MeshStandardMaterial({
      color: '#25863d',
      roughness: 0.5,
      metalness: 0.04,
    });
    const copper = new MeshStandardMaterial({
      color: '#b8703f',
      roughness: 0.3,
      metalness: 0.92,
    });
    const dinRail = new MeshStandardMaterial({
      color: '#9a9aa4',
      roughness: 0.28,
      metalness: 0.9,
    });
    const brass = new MeshStandardMaterial({
      color: '#a16207',
      roughness: 0.26,
      metalness: 0.95,
    });
    const brassChannel = new MeshStandardMaterial({
      color: '#78350f',
      roughness: 0.26,
      metalness: 0.92,
    });
    const sheathGrey = new MeshStandardMaterial({
      color: '#8a847c',
      roughness: 0.62,
      metalness: 0.04,
    });
    const screw = new MeshStandardMaterial({
      color: '#6b6b74',
      roughness: 0.26,
      metalness: 0.92,
    });
    const wireActive = new MeshStandardMaterial({
      color: '#b91c1c',
      roughness: 0.42,
      metalness: 0.04,
    });
    const wireNeutral = new MeshStandardMaterial({
      color: '#1c1c1f',
      roughness: 0.42,
      metalness: 0.04,
    });
    const wireEarth = new MeshStandardMaterial({
      color: '#65a30d',
      roughness: 0.45,
      metalness: 0.04,
    });
    const backboard = new MeshStandardMaterial({
      color: '#4a453f',
      roughness: 0.88,
      metalness: 0.02,
    });
    const wall = new MeshStandardMaterial({
      color: '#232326',
      roughness: 0.94,
      metalness: 0.0,
    });
    const labelGreen = new MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.58,
      metalness: 0.04,
    });
    const highlight = new MeshStandardMaterial({
      color: '#d4a574',
      emissive: '#d4a574',
      emissiveIntensity: 0.18,
      roughness: 0.45,
      metalness: 0.08,
    });

    return {
      enclosure,
      enclosureInner,
      plasticGrey,
      plasticDark,
      busCover,
      copper,
      plasticYellow,
      dinRail,
      brass,
      brassChannel,
      sheathGrey,
      screw,
      wireActive,
      wireNeutral,
      wireEarth,
      backboard,
      wall,
      labelGreen,
      highlight,
    };
  }, []);
}

export type SwitchboardMaterials = ReturnType<typeof useSwitchboardMaterials>;
