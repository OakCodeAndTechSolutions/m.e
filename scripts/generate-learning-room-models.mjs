/**
 * AU wall fittings next to the Sketchfab Type I GPO (130×83×15.6 mm, white,
 * roughness 0.757). No CC-BY AU C2000 rocker exists, so these are extruded
 * one-piece plates with a wall box — not stacked toy boxes.
 * Run: npm run generate:learning-room-models
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Path,
  Scene,
  Shape,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

class FileReaderPolyfill {
  result = null;
  readyState = 0;
  onload = null;
  onloadend = null;
  onerror = null;
  readAsArrayBuffer(blob) {
    this.readyState = 1;
    Promise.resolve(blob.arrayBuffer())
      .then((buf) => {
        this.result = buf;
        this.readyState = 2;
        const ev = { target: this };
        this.onload?.(ev);
        this.onloadend?.(ev);
      })
      .catch((err) => this.onerror?.(err));
  }
}
globalThis.FileReader = FileReaderPolyfill;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'models', 'learning-room');

/** Copied off real/gpo-double.glb `power_outlet` material. */
const TYPE_I = { color: '#ffffff', roughness: 0.757, metalness: 0 };

const MAT = {
  plate: () => new MeshStandardMaterial({ ...TYPE_I, name: 'plate' }),
  rocker: () => new MeshStandardMaterial({ color: '#ffffff', roughness: 0.62, metalness: 0.02, name: 'rocker' }),
  rockerRed: () => new MeshStandardMaterial({ color: '#9b1c1c', roughness: 0.46, metalness: 0.08, name: 'rocker' }),
  well: () => new MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.5, metalness: 0.04, name: 'well' }),
  screw: () => new MeshStandardMaterial({ color: '#c8ccd1', roughness: 0.26, metalness: 0.84, name: 'screw' }),
  pvc: () => new MeshStandardMaterial({ color: '#8b9096', roughness: 0.78, metalness: 0.04, name: 'box' }),
};

function add(root, mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

function roundMesh(mat, w, h, d, r = 0.003, segs = 6) {
  return new Mesh(new RoundedBoxGeometry(w, h, d, segs, r), mat);
}

function boxMesh(mat, w, h, d) {
  return new Mesh(new BoxGeometry(w, h, d), mat);
}

function cylMesh(mat, r, h, seg = 20) {
  return new Mesh(new CylinderGeometry(r, r, h, seg), mat);
}

function roundedRect(path, w, h, r, cx = 0, cy = 0, ccw = true) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const rr = Math.min(r, w / 2 - 0.0004, h / 2 - 0.0004);
  if (ccw) {
    path.moveTo(x0 + rr, y0);
    path.lineTo(x1 - rr, y0);
    path.quadraticCurveTo(x1, y0, x1, y0 + rr);
    path.lineTo(x1, y1 - rr);
    path.quadraticCurveTo(x1, y1, x1 - rr, y1);
    path.lineTo(x0 + rr, y1);
    path.quadraticCurveTo(x0, y1, x0, y1 - rr);
    path.lineTo(x0, y0 + rr);
    path.quadraticCurveTo(x0, y0, x0 + rr, y0);
  } else {
    path.moveTo(x0 + rr, y0);
    path.quadraticCurveTo(x0, y0, x0, y0 + rr);
    path.lineTo(x0, y1 - rr);
    path.quadraticCurveTo(x0, y1, x0 + rr, y1);
    path.lineTo(x1 - rr, y1);
    path.quadraticCurveTo(x1, y1, x1, y1 - rr);
    path.lineTo(x1, y0 + rr);
    path.quadraticCurveTo(x1, y0, x1 - rr, y0);
    path.lineTo(x0 + rr, y0);
  }
}

function extrudedPlate(w, h, d, r, holes = []) {
  const shape = new Shape();
  roundedRect(shape, w, h, r, 0, 0, true);
  for (const hole of holes) {
    const p = new Path();
    roundedRect(p, hole.w, hole.h, hole.r ?? 0.003, hole.x ?? 0, hole.y ?? 0, false);
    shape.holes.push(p);
  }
  const geo = new ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: 0.0011,
    bevelSize: 0.0012,
    bevelOffset: 0,
    bevelSegments: 2,
    curveSegments: 18,
  });
  return new Mesh(geo, MAT.plate());
}

/** Grey PVC wall box behind the plate, into the cavity. */
function wallBox(root, w = 0.05, h = 0.072, d = 0.036) {
  const shell = 0.003;
  add(root, layerBox(MAT.pvc(), w, h, shell, 0, 0, -d));
  add(root, layerBox(MAT.pvc(), shell, h, d, -w / 2 + shell / 2, 0, -d));
  add(root, layerBox(MAT.pvc(), shell, h, d, w / 2 - shell / 2, 0, -d));
  add(root, layerBox(MAT.pvc(), w, shell, d, 0, h / 2 - shell / 2, -d));
  add(root, layerBox(MAT.pvc(), w, shell, d, 0, -h / 2 + shell / 2, -d));
  const cable = cylMesh(MAT.well(), 0.006, shell + 0.002, 12);
  cable.rotation.x = Math.PI / 2;
  cable.position.set(0, 0.018, -d + shell / 2);
  add(root, cable);
}

function layerBox(mat, w, h, d, x, y, z0) {
  const mesh = boxMesh(mat, w, h, d);
  mesh.position.set(x, y, z0 + d / 2);
  return mesh;
}

function screwCap(root, x, y, z) {
  const well = cylMesh(MAT.plate(), 0.0044, 0.001, 18);
  well.rotation.x = Math.PI / 2;
  well.position.set(x, y, z - 0.0002);
  add(root, well);
  const cap = cylMesh(MAT.screw(), 0.0028, 0.0012, 18);
  cap.rotation.x = Math.PI / 2;
  cap.position.set(x, y, z + 0.0003);
  add(root, cap);
  const slot = boxMesh(MAT.well(), 0.0032, 0.00045, 0.00045);
  slot.position.set(x, y, z + 0.001);
  add(root, slot);
}

function buildRocker(mat, w, h, d) {
  const group = new Group();
  group.name = 'Rocker';
  const body = roundMesh(mat, w, h, d, 0.0028, 6);
  group.add(body);
  const mark = boxMesh(MAT.well(), w * 0.38, 0.0007, 0.0005);
  mark.position.set(0, h * 0.28, d / 2 + 0.0002);
  group.add(mark);
  return group;
}

const PLATE_W = 0.076;
const PLATE_H = 0.116;
const PLATE_D = 0.009;

function gangPlate(root, holes) {
  add(root, extrudedPlate(PLATE_W, PLATE_H, PLATE_D, 0.0075, holes));
  screwCap(root, 0, PLATE_H / 2 - 0.011, PLATE_D + 0.0006);
  screwCap(root, 0, -PLATE_H / 2 + 0.011, PLATE_D + 0.0006);
  wallBox(root);
}

function gridAndRocker(root, mat, { y = 0, w = 0.026, h = 0.046, d = 0.007 } = {}) {
  const lining = roundMesh(MAT.well(), w + 0.0032, h + 0.0036, 0.0024, 0.0018, 4);
  lining.position.set(0, y, PLATE_D * 0.55);
  add(root, lining);
  const rocker = buildRocker(mat, w, h, d);
  rocker.position.set(0, y, PLATE_D + 0.0035);
  root.add(rocker);
}

function buildSwitch() {
  const root = new Group();
  root.name = 'switch';
  gangPlate(root, [{ w: 0.03, h: 0.052, r: 0.0035, y: 0 }]);
  gridAndRocker(root, MAT.rocker());
  return root;
}

function buildIsolator() {
  const root = new Group();
  root.name = 'isolator';
  gangPlate(root, [{ w: 0.032, h: 0.054, r: 0.0035, y: 0.008 }]);
  gridAndRocker(root, MAT.rockerRed(), { y: 0.008, w: 0.027, h: 0.046, d: 0.008 });
  const pad = roundMesh(MAT.plate(), 0.05, 0.014, 0.0012, 0.002, 4);
  pad.position.set(0, -0.046, PLATE_D + 0.0004);
  add(root, pad);
  return root;
}

/** C2000 rotary dimmer — same plate family as the rocker switch. */
function buildDimmer() {
  const root = new Group();
  root.name = 'dimmer';
  gangPlate(root, [{ w: 0.038, h: 0.038, r: 0.017, y: 0.008 }]);
  const well = cylMesh(MAT.well(), 0.017, 0.0028, 28);
  well.rotation.x = Math.PI / 2;
  well.position.set(0, 0.008, PLATE_D * 0.55);
  add(root, well);
  const knob = new Group();
  knob.name = 'Knob';
  const body = cylMesh(MAT.rocker(), 0.0135, 0.011, 28);
  body.rotation.x = Math.PI / 2;
  knob.add(body);
  const cap = cylMesh(MAT.rocker(), 0.011, 0.004, 28);
  cap.rotation.x = Math.PI / 2;
  cap.position.set(0, 0, 0.005);
  knob.add(cap);
  const tick = boxMesh(MAT.well(), 0.0024, 0.0075, 0.0012);
  tick.position.set(0, 0.006, 0.007);
  knob.add(tick);
  knob.position.set(0, 0.008, PLATE_D + 0.007);
  root.add(knob);
  const pad = roundMesh(MAT.plate(), 0.042, 0.012, 0.0012, 0.002, 4);
  pad.position.set(0, -0.044, PLATE_D + 0.0004);
  add(root, pad);
  return root;
}

async function exportGlb(root, filename) {
  const scene = new Scene();
  scene.add(root);
  const exporter = new GLTFExporter();
  const data = await exporter.parseAsync(scene, { binary: true });
  writeFileSync(join(OUT, filename), Buffer.from(data));
  console.log(`wrote ${filename} (${data.byteLength} bytes)`);
}

mkdirSync(OUT, { recursive: true });
await exportGlb(buildSwitch(), 'switch.glb');
await exportGlb(buildIsolator(), 'isolator.glb');
await exportGlb(buildDimmer(), 'dimmer.glb');
console.log('done');
