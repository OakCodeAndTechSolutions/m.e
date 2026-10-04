'use client';

import { useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

import { FIXTURES } from './room-layout';

type Print = {
  kicker: string;
  title: string;
  body: string;
  position: [number, number, number];
};

const PRINTS: Print[] = [
  {
    kicker: 'Dual trade',
    title: 'A-Grade Electrician & Full-Stack Developer',
    body: 'Fully licensed for electrical work, and equally at home building the web app that sits next to it.',
    position: [FIXTURES.portrait1.x, FIXTURES.portrait1.y, FIXTURES.portrait1.z],
  },
  {
    kicker: 'Today',
    title: 'Hands-on trade, modern stack',
    body: 'I combine an electrical background with web development — practical solutions for homes, worksites and growing businesses.',
    position: [FIXTURES.portrait2.x, FIXTURES.portrait2.y, FIXTURES.portrait2.z],
  },
];

/** Print, mat and frame sizes in metres (a 50 × 68 cm framed print). */
const PRINT_W = 0.36;
const PRINT_H = 0.52;
const MAT = 0.05;
const FRAME = 0.018;
const FRAME_DEPTH = 0.028;
const TEX_W = 900;
const TEX_H = Math.round((TEX_W * PRINT_H) / PRINT_W);

function usePrintTexture(p: Print) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');

    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(0, 0, TEX_W, TEX_H);
    const left = 90;
    const width = TEX_W - left * 2;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(left, 120, 64, 4);
    ctx.fillStyle = '#78716c';
    ctx.font = '600 30px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(spaced(p.kicker.toUpperCase()), left, 190);

    ctx.fillStyle = '#1c1917';
    ctx.font = '400 74px "Georgia", "Times New Roman", serif';
    const after = wrapText(ctx, p.title, left, 320, width, 88);

    ctx.fillStyle = '#57534e';
    ctx.font = '400 32px "Segoe UI", system-ui, sans-serif';
    wrapText(ctx, p.body, left, after + 70, width * 0.86, 48);

    ctx.fillStyle = '#a8a29e';
    ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(spaced('OAKCODEANDTECHSOLUTIONS'), left, TEX_H - 110);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }, [p]);
}

/** Letter-spacing for small caps, which canvas text does not support everywhere. */
function spaced(text: string) {
  return text.split('').join(' ');
}

/** Wraps text and returns the baseline of the last line. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number
) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
  return yy;
}

function FramedPrint({ print }: { print: Print }) {
  const map = usePrintTexture(print);
  const outerW = PRINT_W + (MAT + FRAME) * 2;
  const outerH = PRINT_H + (MAT + FRAME) * 2;
  const rails: { at: [number, number]; size: [number, number] }[] = [
    { at: [0, (outerH - FRAME) / 2], size: [outerW, FRAME] },
    { at: [0, -(outerH - FRAME) / 2], size: [outerW, FRAME] },
    { at: [-(outerW - FRAME) / 2, 0], size: [FRAME, outerH - FRAME * 2] },
    { at: [(outerW - FRAME) / 2, 0], size: [FRAME, outerH - FRAME * 2] },
  ];
  return (
    // Local +Z faces into the room from the board wall.
    <group position={print.position} rotation={[0, Math.PI / 2, 0]}>
      {rails.map(({ at, size }) => (
        <mesh key={`${at[0]}:${at[1]}`} position={[at[0], at[1], FRAME_DEPTH / 2]} castShadow>
          <boxGeometry args={[size[0], size[1], FRAME_DEPTH]} />
          <meshStandardMaterial color="#1b1b1c" roughness={0.45} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0, FRAME_DEPTH * 0.45]} receiveShadow>
        <planeGeometry args={[outerW - FRAME * 2, outerH - FRAME * 2]} />
        <meshStandardMaterial color="#f7f5f0" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0, FRAME_DEPTH * 0.45 + 0.0012]} receiveShadow>
        <planeGeometry args={[PRINT_W, PRINT_H]} />
        <meshStandardMaterial map={map} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** Two framed prints on the board wall, lit by the up/down lights above them. */
export function AboutPortraits() {
  return (
    <group>
      {PRINTS.map((p) => (
        <FramedPrint key={p.kicker} print={p} />
      ))}
    </group>
  );
}
