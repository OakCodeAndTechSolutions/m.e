'use client';

import { useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

function makeCanvas(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  draw(ctx);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function paperGrain(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.04) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = ((((i * 1103515245 + 12345) >>> 16) & 255) / 255 - 0.5) * 255 * alpha;
    d[i] = Math.max(0, Math.min(255, (d[i] ?? 0) + n));
    d[i + 1] = Math.max(0, Math.min(255, (d[i + 1] ?? 0) + n));
    d[i + 2] = Math.max(0, Math.min(255, (d[i + 2] ?? 0) + n));
  }
  ctx.putImageData(img, 0, 0);
}

const FACE_W = 384;
const FACE_H = 496;
const DEVICE_GREEN = '#287845';
const DEVICE_RED = '#a82d28';
const FONT = '"Segoe UI", system-ui, sans-serif';

/** Screen-printed ink on the moulding. Blank areas show the actual plastic and test recess. */
function drawDeviceFace(ctx: CanvasRenderingContext2D, rating: string, isolator: boolean) {
  const left = 18;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isolator ? DEVICE_RED : DEVICE_GREEN;
  ctx.fillRect(left, 12, FACE_W - left * 2, 55);
  ctx.fillStyle = '#ffffff';
  ctx.font = `750 35px ${FONT}`;
  ctx.fillText(isolator ? 'MAIN SWITCH' : 'RCBO  1P+N', left + 9, 40);

  ctx.fillStyle = '#25282b';
  ctx.font = `750 91px ${FONT}`;
  ctx.fillText(rating, left, 147);
  ctx.font = `700 50px ${FONT}`;
  ctx.fillText(isolator ? '240 V~' : '30 mA', left, 238);
  ctx.font = `650 33px ${FONT}`;
  ctx.fillText(isolator ? 'AC-22A   50 Hz' : '240 V~  50/60 Hz', left, 306);

  if (!isolator) {
    ctx.strokeStyle = '#303438';
    ctx.lineWidth = 3;
    ctx.strokeRect(left, 344, 101, 52);
    ctx.strokeRect(146, 344, 84, 52);
    ctx.font = `650 29px ${FONT}`;
    ctx.fillText('6000', left + 9, 371);
    ctx.fillText('A', 177, 371);
    ctx.strokeRect(249, 344, 105, 52);
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const y = 361 - Math.sin((i * Math.PI) / 20) * 6;
      if (i === 0) ctx.moveTo(260, y);
      else ctx.lineTo(260 + i * 2, y);
    }
    ctx.moveTo(260, 386);
    for (let i = 0; i <= 40; i++) {
      ctx.lineTo(260 + i * 2, 386 - Math.max(0, Math.sin((i * Math.PI) / 10)) * 10);
    }
    ctx.stroke();
    ctx.fillStyle = '#34433b';
    ctx.font = `700 25px ${FONT}`;
    ctx.fillText('TEST', 265, 226);
  }

  ctx.fillStyle = '#33373b';
  ctx.font = `650 29px ${FONT}`;
  ctx.fillText(isolator ? 'AS/NZS 60947.3' : 'AS/NZS 61009.1', left, 452);
}

export function useMainSwitchFaceTexture() {
  return useMemo(() => makeCanvas(FACE_W, FACE_H, (ctx) => drawDeviceFace(ctx, '63A', true)), []);
}

const rcboFaces = new Map<string, CanvasTexture>();

export function useRcboFaceTexture(rating: string) {
  return useMemo(() => {
    const cached = rcboFaces.get(rating);
    if (cached) return cached;
    const texture = makeCanvas(FACE_W, FACE_H, (ctx) => drawDeviceFace(ctx, rating, false));
    rcboFaces.set(rating, texture);
    return texture;
  }, [rating]);
}

/** Neutral markings sit next to the paired screw wells on the RCBO only. */
export function useNeutralMarkTexture() {
  return useMemo(
    () =>
      makeCanvas(64, 64, (ctx) => {
        ctx.fillStyle = '#224963';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `800 52px ${FONT}`;
        ctx.fillText('N', 32, 34);
      }),
    []
  );
}

const contactMarks = new Map<boolean, CanvasTexture>();

/** Printed mechanical contact flag. Its state follows the handle, including with the main off. */
export function useToggleStateTexture(on: boolean) {
  return useMemo(() => {
    const existing = contactMarks.get(on);
    if (existing) return existing;
    const map = makeCanvas(256, 64, (ctx) => {
      ctx.fillStyle = on ? DEVICE_RED : DEVICE_GREEN;
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#f6f5ef';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 47px ${FONT}`;
      ctx.fillText(on ? 'I · ON' : 'O · OFF', 128, 32);
    });
    contactMarks.set(on, map);
    return map;
  }, [on]);
}

export type LabelStripCell = {
  /** Circuit number (AS/NZS 3000 circuit designation) or "MAIN". */
  id: string;
  lines: string[];
  tone?: 'main' | 'circuit' | 'spare';
};

const STRIP_CELL_W = 320;
const STRIP_CELL_H = 440;

/**
 * One engraved label strip under the pole row — one cell per pole.
 * Landscape canvas so the aspect matches the mesh and the text stays crisp.
 */
export function useLabelStripTexture(cells: LabelStripCell[]) {
  const key = JSON.stringify(cells);
  return useMemo(
    () =>
      makeCanvas(STRIP_CELL_W * cells.length, STRIP_CELL_H, (ctx) => {
        const w = STRIP_CELL_W * cells.length;
        ctx.fillStyle = '#f7f5ef';
        ctx.fillRect(0, 0, w, STRIP_CELL_H);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        cells.forEach((cell, i) => {
          const x0 = i * STRIP_CELL_W;
          const cx = x0 + STRIP_CELL_W / 2;
          const tone = cell.tone ?? 'circuit';
          const badge = tone === 'main' ? '#9b1c1c' : tone === 'spare' ? '#71717a' : '#1e3a5f';

          // Cell divider
          ctx.fillStyle = '#c9c4b8';
          ctx.fillRect(x0, 0, 4, STRIP_CELL_H);

          // Designation badge
          ctx.fillStyle = badge;
          ctx.fillRect(x0 + 26, 24, STRIP_CELL_W - 52, 128);
          ctx.fillStyle = '#fafafa';
          ctx.font = `800 ${cell.id.length > 2 ? 62 : 92}px "Segoe UI", system-ui, sans-serif`;
          ctx.fillText(cell.id, cx, 90);

          // Description lines
          ctx.fillStyle = tone === 'spare' ? '#71717a' : '#18181b';
          const lines = cell.lines.slice(0, 3);
          const size = lines.some((l) => l.length > 8) ? 50 : 60;
          ctx.font = `800 ${size}px "Segoe UI", system-ui, sans-serif`;
          const lineH = size + 14;
          const startY = 236 + ((3 - lines.length) * lineH) / 2;
          lines.forEach((line, li) => ctx.fillText(line, cx, startY + li * lineH));
        });
        ctx.fillStyle = '#c9c4b8';
        ctx.fillRect(w - 4, 0, 4, STRIP_CELL_H);
        ctx.fillRect(0, 0, w, 4);
        ctx.fillRect(0, STRIP_CELL_H - 4, w, 4);
        paperGrain(ctx, w, STRIP_CELL_H, 0.05);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
}

/** Durable RCD notice required on the switchboard (AS/NZS 3000 Section 2). */
export function useRcdNoticeTexture() {
  return useMemo(
    () =>
      makeCanvas(1024, 256, (ctx) => {
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(0, 0, 1024, 256);
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 10;
        ctx.strokeRect(8, 8, 1008, 240);
        ctx.fillStyle = '#18181b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 54px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('RCD PROTECTION FITTED', 512, 58);
        ctx.font = '600 38px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('Press the T button regularly to test.', 512, 130);
        ctx.fillText('If the device does not trip, call a licensed electrician.', 512, 190);
        paperGrain(ctx, 1024, 256, 0.04);
      }),
    []
  );
}

/** Main switch designation plate — AS/NZS 3000 requires it to be marked. */
export function useMainSwitchPlateTexture() {
  return useMemo(
    () =>
      makeCanvas(768, 192, (ctx) => {
        // Red with white lettering, so the main switch is readily distinguished.
        ctx.fillStyle = DEVICE_RED;
        ctx.fillRect(0, 0, 768, 192);
        ctx.fillStyle = '#fafafa';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 96px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('MAIN SWITCH', 384, 96);
      }),
    []
  );
}

export function useEarthStripeTexture() {
  return useMemo(
    () =>
      makeCanvas(16, 128, (ctx) => {
        ctx.fillStyle = '#35763f';
        ctx.fillRect(0, 0, 16, 128);
        ctx.fillStyle = '#d7bf32';
        ctx.fillRect(0, 16, 16, 30);
        ctx.fillRect(0, 80, 16, 30);
      }),
    []
  );
}
