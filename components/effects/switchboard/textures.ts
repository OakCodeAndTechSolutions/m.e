'use client';

import { useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

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

/** Device label canvas — aspect matches NOSE_LAYOUT.label (width × height on the nose). */
const FACE_W = 384;
const FACE_H = 432;

/** Moulded white of the module bodies — labels use it so they read printed, not stuck on. */
const MODULE_WHITE = '#f1f1ef';
/** Residential device accent: green for protective devices, red for the main switch. */
export const DEVICE_GREEN = '#2f9a4a';
export const DEVICE_RED = '#c62828';

const FONT = '"Segoe UI", system-ui, sans-serif';

/**
 * Nose label, after the reference devices: accent header band with the device type,
 * then the markings AS/NZS 61009.1 / 60947.3 put on the front (rating, sensitivity,
 * type, breaking capacity, standard). RCBOs keep the right column clear for the T
 * button, which sits on top of this label. Deliberately unbranded.
 */
function drawDeviceFace(
  ctx: CanvasRenderingContext2D,
  accent: string,
  header: string,
  rating: string,
  lines: [string, string, string],
  testColumn: boolean
) {
  ctx.fillStyle = MODULE_WHITE;
  ctx.fillRect(0, 0, FACE_W, FACE_H);
  ctx.textBaseline = 'middle';

  ctx.fillStyle = accent;
  roundRect(ctx, 10, 10, FACE_W - 20, 78, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = `800 50px ${FONT}`;
  ctx.fillText(header, FACE_W / 2, 50);

  const left = testColumn ? 22 : FACE_W / 2;
  ctx.textAlign = testColumn ? 'left' : 'center';
  ctx.fillStyle = '#18181b';
  ctx.font = `800 ${testColumn ? 112 : 124}px ${FONT}`;
  ctx.fillText(rating, left, 168);
  ctx.font = `800 60px ${FONT}`;
  ctx.fillText(lines[0], left, 262);
  ctx.fillStyle = '#3f3f46';
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(lines[1], left, 328);

  if (testColumn) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#52525b';
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText('TEST', 307, 214);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#71717a';
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText(lines[2], FACE_W / 2, 398);

  paperGrain(ctx, FACE_W, FACE_H, 0.025);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function useMainSwitchFaceTexture() {
  return useMemo(
    () =>
      makeCanvas(FACE_W, FACE_H, (ctx) =>
        drawDeviceFace(
          ctx,
          DEVICE_RED,
          'ISOLATOR',
          '63A',
          ['AC-22A', '240V~ 50Hz', 'AS/NZS 60947.3'],
          false
        )
      ),
    []
  );
}

/** Ratings repeat across the board, so each label is drawn once and shared. */
const rcboFaces = new Map<string, CanvasTexture>();

export function useRcboFaceTexture(rating: string) {
  return useMemo(() => {
    const cached = rcboFaces.get(rating);
    if (cached) return cached;
    const texture = makeCanvas(FACE_W, FACE_H, (ctx) =>
      drawDeviceFace(
        ctx,
        DEVICE_GREEN,
        'RCBO',
        rating,
        ['30mA', 'Type A · 6kA', 'AS/NZS 61009.1  240V~'],
        true
      )
    );
    rcboFaces.set(rating, texture);
    return texture;
  }, [rating]);
}

/** Printed "N" beside the neutral terminals. Transparent so it sits on the moulding. */
export function useNeutralMarkTexture() {
  return useMemo(
    () =>
      makeCanvas(64, 64, (ctx) => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = '#2a2a2e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `800 52px ${FONT}`;
        ctx.fillText('N', 32, 34);
      }),
    []
  );
}

/** Toggle paddle: solid accent with the moulded ▲▼ grip pattern from the reference photos. */
export function usePaddleTexture(accent: string) {
  return useMemo(
    () =>
      makeCanvas(256, 112, (ctx) => {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, 256, 112);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        const cols = 7;
        const step = 256 / (cols + 1);
        for (let i = 1; i <= cols; i++) {
          const x = i * step;
          // Upper row points up, lower row points down.
          ctx.beginPath();
          ctx.moveTo(x, 22);
          ctx.lineTo(x + 11, 44);
          ctx.lineTo(x - 11, 44);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(x, 90);
          ctx.lineTo(x + 11, 68);
          ctx.lineTo(x - 11, 68);
          ctx.closePath();
          ctx.fill();
        }
      }),
    [accent]
  );
}

/** Yellow "dangerous voltage" label below the toggle (AS 1319 lightning-flash symbol). */
export function useVoltageWarningTexture() {
  return useMemo(
    () =>
      makeCanvas(256, 192, (ctx) => {
        ctx.fillStyle = '#f5c400';
        ctx.fillRect(0, 0, 256, 192);
        // Black-bordered triangle with the lightning flash.
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(128, 18);
        ctx.lineTo(218, 172);
        ctx.lineTo(38, 172);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f5c400';
        ctx.beginPath();
        ctx.moveTo(128, 48);
        ctx.lineTo(194, 160);
        ctx.lineTo(62, 160);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(138, 70);
        ctx.lineTo(108, 120);
        ctx.lineTo(128, 120);
        ctx.lineTo(116, 152);
        ctx.lineTo(150, 104);
        ctx.lineTo(130, 104);
        ctx.lineTo(144, 70);
        ctx.closePath();
        ctx.fill();
      }),
    []
  );
}

/** Push-button cap: a bold "T", the marking AS/NZS 61009.1 uses for the test device. */
export function useTestButtonTexture() {
  return useMemo(
    () =>
      makeCanvas(128, 128, (ctx) => {
        ctx.fillStyle = '#e4e4e7';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#18181b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 96px "Segoe UI", system-ui, sans-serif';
        ctx.fillText('T', 64, 70);
      }),
    []
  );
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
  return useMemo(() => {
    const texture = makeCanvas(64, 64, (ctx) => {
      ctx.fillStyle = '#4d7c0f';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#ca8a04';
      for (let i = -64; i < 128; i += 14) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 28, 0);
        ctx.lineTo(i + 14, 64);
        ctx.lineTo(i - 14, 64);
        ctx.closePath();
        ctx.fill();
      }
    });
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(6, 1);
    return texture;
  }, []);
}
