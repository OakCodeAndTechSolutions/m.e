import { Raycaster, Vector2, type Camera, type Mesh, type Scene } from 'three';
import { INTERACTION_REACH } from '../interaction';

type Interaction = {
  activate: () => void;
  prompt: string;
  actionable?: boolean;
  device?: { id: string; kind: 'toggle' | 'test' };
};

type ReadTarget = () => Interaction;
const targetsByScene = new WeakMap<Scene, Map<Mesh, ReadTarget>>();

/** A canvas owns only its own interactive meshes. Invisible hit boxes still raycast. */
export function registerRoomTarget(scene: Scene, mesh: Mesh, read: ReadTarget) {
  let targets = targetsByScene.get(scene);
  if (!targets) {
    targets = new Map();
    targetsByScene.set(scene, targets);
  }
  targets.set(mesh, read);
  return () => {
    targets.delete(mesh);
  };
}

export function boardControlTarget(scene: Scene, id: string, kind: 'toggle' | 'test') {
  const targets = targetsByScene.get(scene);
  if (!targets) return null;
  for (const [mesh, read] of targets) {
    const target = read();
    if (target.device?.id === id && target.device.kind === kind && isAvailable(mesh)) return target;
  }
  return null;
}

function isAvailable(mesh: Mesh) {
  let ancestor = mesh.parent;
  while (ancestor) {
    if (!ancestor.visible) return false;
    ancestor = ancestor.parent;
  }
  return mesh.parent !== null;
}

const aimPoints = [
  new Vector2(0, 0),
  new Vector2(-0.038, 0),
  new Vector2(0.038, 0),
  new Vector2(0, 0.05),
  new Vector2(0, -0.05),
];

/** Exact center first, with a small amount of forgiveness for a narrow wall rocker. */
export function roomTargetAtView(scene: Scene, camera: Camera, ray: Raycaster): Interaction | null {
  return pickRoomTarget(scene, camera, ray, aimPoints);
}

/** Tap at the actual screen position, with a small finger-sized margin around narrow controls. */
export function roomTargetAtPointer(
  scene: Scene,
  camera: Camera,
  ray: Raycaster,
  point: Vector2,
  margin: Vector2
): Interaction | null {
  return pickRoomTarget(scene, camera, ray, [
    point,
    new Vector2(point.x - margin.x, point.y),
    new Vector2(point.x + margin.x, point.y),
    new Vector2(point.x, point.y - margin.y),
    new Vector2(point.x, point.y + margin.y),
  ]);
}

function pickRoomTarget(scene: Scene, camera: Camera, ray: Raycaster, points: Vector2[]) {
  const targets = targetsByScene.get(scene);
  if (!targets?.size) return null;
  const meshes = [...targets.keys()].filter(isAvailable);
  for (const mesh of meshes) mesh.updateWorldMatrix(true, false);
  ray.far = INTERACTION_REACH;

  for (const aim of points) {
    ray.setFromCamera(aim, camera);
    const nearest = ray.intersectObjects(meshes, false)[0];
    if (nearest) return targets.get(nearest.object as Mesh)!();
  }
  return null;
}
