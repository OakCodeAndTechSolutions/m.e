import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Shape,
  type BufferGeometry as Geometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BOARD } from '../circuit-data';
import { DIN, DIN_Z, MM } from '../din';

/**
 * Body of a one-module DIN device: the side profile (terminal shoulders and the 45 mm
 * nose) extruded across the module width, with bevelled edges so it reads moulded.
 * Returned in module-local space: X across the pole, Y up, Z out of the board.
 */
export function createDinBodyGeometry(width = BOARD.rcboWidth): BufferGeometry {
  const bevel = 0.7 * MM;
  // The bevel grows the outline by bevelSize, so draw it inset by that much: the
  // finished surfaces then land on the nominal planes printed parts are placed on.
  const grow = bevel * 0.8;
  const half = DIN.height / 2 - grow;
  const noseHalf = DIN.noseHeight / 2 - grow;
  const rear = DIN_Z.rear + grow;
  const shoulder = DIN_Z.shoulder - grow;
  const nose = DIN_Z.nose - grow;
  const c = DIN.shoulderChamfer;
  const r = 1.5 * MM;

  // Profile drawn in (depth, height) and later turned so depth runs along +Z.
  const s = new Shape();
  s.moveTo(rear, -half);
  s.lineTo(shoulder - c, -half);
  s.lineTo(shoulder, -half + c);
  s.lineTo(shoulder, -noseHalf);
  s.lineTo(nose - r, -noseHalf);
  s.quadraticCurveTo(nose, -noseHalf, nose, -noseHalf + r);
  s.lineTo(nose, noseHalf - r);
  s.quadraticCurveTo(nose, noseHalf, nose - r, noseHalf);
  s.lineTo(shoulder, noseHalf);
  s.lineTo(shoulder, half - c);
  s.lineTo(shoulder - c, half);
  s.lineTo(rear, half);
  // Rail channel in the back face.
  s.lineTo(rear, 17.5 * MM);
  s.lineTo(rear + 2 * MM, 17.5 * MM);
  s.lineTo(rear + 2 * MM, -17.5 * MM);
  s.lineTo(rear, -17.5 * MM);
  s.closePath();

  const depth = width - DIN.gap - bevel * 2;
  const geometry = new ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: grow,
    bevelSegments: 3,
    curveSegments: 6,
  });
  // Shape X (depth) → +Z, extrusion axis → X, centred on the pole.
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(depth / 2, 0, 0);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Terminal screw access hole, drawn on the shoulder face: a dark ring the screw head
 * sits inside, which reads as a recess from the front without cutting the body.
 */
export function createScrewHoleGeometry(): BufferGeometry {
  const g = new CylinderGeometry(DIN.screwRadius, DIN.screwRadius, 0.4 * MM, 22);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Pozi-drive screw head seated in the access hole. */
export function createScrewHeadGeometry(): BufferGeometry {
  const head = new CylinderGeometry(DIN.screwRadius * 0.78, DIN.screwRadius * 0.78, 0.4 * MM, 18);
  head.rotateX(Math.PI / 2);
  return head;
}

/** Dark cross recess drawn over a screw head. */
export function createScrewSlotGeometry(): BufferGeometry {
  const a = new BoxGeometry(DIN.screwRadius * 1.15, 0.4 * MM, 0.3 * MM);
  const b = new BoxGeometry(0.4 * MM, DIN.screwRadius * 1.15, 0.3 * MM);
  return merge([a, b]);
}

/** Rectangular cable entry on the top or bottom face, viewed from outside. */
export function createCableEntryGeometry(): BufferGeometry {
  const g = new BoxGeometry(5.2 * MM, 0.3 * MM, 4.6 * MM);
  return g;
}

/** Yellow DIN clip tab protruding below the body at the rail. */
export function createDinClipGeometry(width = BOARD.rcboWidth): BufferGeometry {
  const tab = new BoxGeometry(width * 0.42, 3.2 * MM, 6 * MM);
  tab.translate(0, -DIN.height / 2 - 1.2 * MM, DIN_Z.rear + 5 * MM);
  const lip = new BoxGeometry(width * 0.3, 1.6 * MM, 2.4 * MM);
  lip.translate(0, -DIN.height / 2 - 2.4 * MM, DIN_Z.rear + 9 * MM);
  return merge([tab, lip]);
}

function merge(parts: Geometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error('Could not merge DIN part geometry');
  return merged;
}
