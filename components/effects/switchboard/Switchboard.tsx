'use client';

import { useMemo } from 'react';
import { ExtrudeGeometry, Path, Shape } from 'three';
import {
  BOARD,
  CIRCUITS,
  circuitLabelLines,
  circuitNumber,
  mainSwitchX,
  moduleBodyZ,
  rcboX,
} from './circuit-data';
import { DeviceRow } from './devices/DeviceRow';
import { CombBus } from './CombBus';
import { DinRail } from './DinRail';
import { DIN, DIN_Z, MM } from './din';
import { Enclosure } from './Enclosure';
import { EnclosureCover } from './EnclosureCover';
import { useGameInput } from './learning-room/GameInputContext';
import { MainSwitch } from './MainSwitch';
import { useSwitchboardMaterials } from './materials';
import { TripFlash } from './parts/TripFlash';
import { Rcbo } from './Rcbo';
import { useSwitchboard } from './SwitchboardContext';
import { TerminalBars } from './TerminalBars';
import { Wiring } from './Wiring';
import {
  type LabelStripCell,
  useLabelStripTexture,
  useMainSwitchPlateTexture,
  useRcdNoticeTexture,
} from './textures';

const STRIP_H = 0.3;

/**
 * Escutcheon (inner cover): pressed steel sitting on the device shoulders, with one
 * 45 mm cut-out the device noses pass through. Terminals and busbars stay behind it.
 */
const ESC_BACK = moduleBodyZ() + DIN_Z.shoulder + 0.3 * MM;
const ESC_T = 1.2 * MM;
const ESC_FACE = ESC_BACK + ESC_T;
/** Fills the tub opening (2.5 mm walls) with a hair of clearance. */
const ESC = {
  width: BOARD.width - 6.5 * MM,
  height: BOARD.height - 6.5 * MM,
  radius: 3 * MM,
} as const;
const CUTOUT = {
  width: (CIRCUITS.length + 1) * BOARD.rcboWidth + 1 * MM,
  height: DIN.noseHeight + 1 * MM,
} as const;

function useEscutcheonGeometry() {
  return useMemo(() => {
    const { width: w, height: h, radius: r } = ESC;
    const panel = new Shape();
    panel.moveTo(-w / 2 + r, -h / 2);
    panel.lineTo(w / 2 - r, -h / 2);
    panel.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    panel.lineTo(w / 2, h / 2 - r);
    panel.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    panel.lineTo(-w / 2 + r, h / 2);
    panel.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    panel.lineTo(-w / 2, -h / 2 + r);
    panel.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const cw = CUTOUT.width / 2;
    const ch = CUTOUT.height / 2;
    const hole = new Path();
    hole.moveTo(-cw, BOARD.railY - ch);
    hole.lineTo(-cw, BOARD.railY + ch);
    hole.lineTo(cw, BOARD.railY + ch);
    hole.lineTo(cw, BOARD.railY - ch);
    hole.closePath();
    panel.holes.push(hole);
    const g = new ExtrudeGeometry(panel, {
      depth: ESC_T,
      bevelEnabled: true,
      bevelThickness: 0.3 * MM,
      bevelSize: 0.3 * MM,
      bevelSegments: 2,
      curveSegments: 6,
    });
    g.translate(0, 0, ESC_BACK);
    return g;
  }, []);
}

/**
 * Circuit designations sit beneath the devices on the escutcheon. The cutaway
 * shows a separate copy of the schedule against the back of the tub.
 */
function LabelStrip({ onEscutcheon }: { onEscutcheon: boolean }) {
  const cells = useMemo<LabelStripCell[]>(
    () => [
      { id: 'MAIN', lines: ['MAIN', 'SWITCH'], tone: 'main' },
      ...CIRCUITS.map((c) => ({ id: circuitNumber(c), lines: circuitLabelLines(c.label) })),
    ],
    []
  );
  const map = useLabelStripTexture(cells);
  const x0 = mainSwitchX() - BOARD.mainWidth / 2;
  const x1 = rcboX(CIRCUITS.length - 1) + BOARD.rcboWidth / 2;
  const width = x1 - x0;
  const y = onEscutcheon
    ? BOARD.railY - CUTOUT.height / 2 - 3 * MM - STRIP_H / 2
    : -BOARD.height / 2 + 5.5 * MM + STRIP_H / 2;
  return (
    <mesh
      position={[
        (x0 + x1) / 2,
        y,
        onEscutcheon ? ESC_FACE + 0.6 * MM : -BOARD.depth / 2 + 3.2 * MM,
      ]}
      receiveShadow
      raycast={() => null}
    >
      <boxGeometry args={[width, STRIP_H, 0.8 * MM]} />
      <meshStandardMaterial map={map} roughness={0.5} metalness={0.02} />
    </mesh>
  );
}

function MainSwitchPlate() {
  const map = useMainSwitchPlateTexture();
  return (
    <mesh
      position={[
        mainSwitchX() + 0.06,
        BOARD.railY + CUTOUT.height / 2 + 3 * MM + 0.04,
        ESC_FACE + 0.5 * MM,
      ]}
      raycast={() => null}
    >
      <boxGeometry args={[BOARD.mainWidth + 0.14, 0.08, 0.6 * MM]} />
      <meshStandardMaterial map={map} roughness={0.5} metalness={0.02} />
    </mesh>
  );
}

/** Domed cover screw, chrome on a white collar. */
function CoverScrew({ x, y }: { x: number; y: number }) {
  return (
    <group position={[x, y, ESC_FACE]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.4 * MM]} raycast={() => null}>
        <cylinderGeometry args={[3.2 * MM, 3.4 * MM, 0.8 * MM, 20]} />
        <meshStandardMaterial color="#e9e9e6" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.8 * MM]} scale={[1, 1, 0.45]} raycast={() => null}>
        <sphereGeometry args={[2.4 * MM, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d7d9dd" roughness={0.22} metalness={0.9} />
      </mesh>
    </group>
  );
}

function Escutcheon() {
  const geometry = useEscutcheonGeometry();
  const sx = ESC.width / 2 - 9 * MM;
  const sy = ESC.height / 2 - 9 * MM;
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow onClick={(e) => e.stopPropagation()}>
        <meshPhysicalMaterial
          color="#f2f1ec"
          roughness={0.48}
          metalness={0.05}
          clearcoat={0.2}
          clearcoatRoughness={0.5}
        />
      </mesh>
      {[-1, 1].flatMap((ix) =>
        [-1, 1].map((iy) => <CoverScrew key={`${ix}${iy}`} x={ix * sx} y={iy * sy} />)
      )}
    </group>
  );
}

function RcdNotice({ z }: { z: number }) {
  const map = useRcdNoticeTexture();
  return (
    <mesh position={[0, 0.9, z]} raycast={() => null}>
      <boxGeometry args={[0.88, 0.22, 0.6 * MM]} />
      <meshStandardMaterial map={map} roughness={0.6} metalness={0.01} />
    </mesh>
  );
}

/** Composes board assemblies. State lives in SwitchboardProvider. */
export function Switchboard() {
  const { traceCircuit } = useGameInput();
  const materials = useSwitchboardMaterials();
  const {
    mainOn,
    rcboOn,
    setHovered,
    tripFlashId,
    toggleMain,
    toggleRcbo,
    tripRcbo,
    flashCircuit,
    hovered,
    coverOpen,
    requestCoverOpen,
    closeCover,
  } = useSwitchboard();

  const boardUnlocked = coverOpen;
  const cutaway = boardUnlocked && traceCircuit !== '';

  return (
    <group>
      <Enclosure materials={materials} />
      <group visible={boardUnlocked}>
        {cutaway ? (
          <>
            <DinRail materials={materials} />
            <TerminalBars materials={materials} />
            <CombBus materials={materials} />
            <Wiring materials={materials} traceCircuit={traceCircuit} />
          </>
        ) : (
          <Escutcheon />
        )}

        {flashCircuit && (
          <TripFlash x={rcboX(flashCircuit.index)} active={tripFlashId === flashCircuit.id} />
        )}

        <DeviceRow hovered={hovered} />
        <MainSwitch
          on={mainOn}
          onToggle={toggleMain}
          onHover={setHovered}
          disabled={!boardUnlocked}
        />

        {CIRCUITS.map((circuit) => (
          <Rcbo
            key={circuit.id}
            circuit={circuit}
            on={rcboOn[circuit.id] ?? true}
            onToggle={() => toggleRcbo(circuit.id)}
            onTest={() => tripRcbo(circuit.id)}
            onHover={setHovered}
            disabled={!boardUnlocked}
          />
        ))}
        <LabelStrip onEscutcheon={!cutaway} />
        {!cutaway && <MainSwitchPlate />}
        {!cutaway && <RcdNotice z={ESC_FACE + 0.5 * MM} />}
      </group>

      <EnclosureCover open={coverOpen} onRequestOpen={requestCoverOpen} onClose={closeCover} />
    </group>
  );
}
