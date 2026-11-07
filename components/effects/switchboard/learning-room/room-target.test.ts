import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, PerspectiveCamera, Raycaster, Scene } from 'three';
import { boardControlTarget, registerRoomTarget, roomTargetAtView } from './room-target';

function fixture(parent: Scene | Group, y: number, z: number) {
  const mesh = new Mesh(new BoxGeometry(0.2, 0.2, 0.15));
  mesh.visible = false;
  mesh.position.set(0, y, z);
  parent.add(mesh);
  return mesh;
}

describe('shared room targets', () => {
  it('uses the cabinet being looked at, even with a nearby cabinet on another shelf', () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(64, 16 / 9, 0.01, 20);
    const ray = new Raycaster();
    const upper = vi.fn();
    const lower = vi.fn();
    registerRoomTarget(scene, fixture(scene, 0.3, -1), () => ({
      activate: upper,
      prompt: 'Upper',
    }));
    registerRoomTarget(scene, fixture(scene, -0.3, -1), () => ({
      activate: lower,
      prompt: 'Lower',
    }));
    camera.lookAt(0, -0.3, -1);
    camera.updateMatrixWorld();
    roomTargetAtView(scene, camera, ray)?.activate();
    expect(lower).toHaveBeenCalledOnce();
    expect(upper).not.toHaveBeenCalled();
    camera.lookAt(0, 0, 1);
    camera.updateMatrixWorld();
    expect(roomTargetAtView(scene, camera, ray)).toBeNull();
  });

  it('excludes hidden controls and targets beyond interaction reach', () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(64, 16 / 9, 0.01, 20);
    const controls = new Group();
    controls.visible = false;
    scene.add(controls);
    const activate = vi.fn();
    const ray = new Raycaster();
    registerRoomTarget(scene, fixture(controls, 0, -1), () => ({
      activate,
      prompt: 'Test',
      device: { id: 'light-1', kind: 'test' },
    }));
    registerRoomTarget(scene, fixture(scene, 0, -3), () => ({ activate, prompt: 'Far away' }));
    expect(roomTargetAtView(scene, camera, ray)).toBeNull();
    expect(boardControlTarget(scene, 'light-1', 'test')).toBeNull();
    controls.visible = true;
    expect(boardControlTarget(scene, 'light-1', 'test')?.prompt).toBe('Test');
    expect(roomTargetAtView(scene, camera, ray)?.prompt).toBe('Test');
  });

  it('follows a moving door and unregisters on removal', () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(64, 16 / 9, 0.01, 20);
    const door = new Group();
    scene.add(door);
    const ray = new Raycaster();
    const unregister = registerRoomTarget(scene, fixture(door, 0, -1), () => ({
      activate: vi.fn(),
      prompt: 'Close door',
    }));
    expect(roomTargetAtView(scene, camera, ray)?.prompt).toBe('Close door');
    door.position.x = 0.5;
    expect(roomTargetAtView(scene, camera, ray)).toBeNull();
    camera.lookAt(0.5, 0, -1);
    camera.updateMatrixWorld();
    expect(roomTargetAtView(scene, camera, ray)?.prompt).toBe('Close door');
    unregister();
    expect(roomTargetAtView(scene, camera, ray)).toBeNull();
  });
});
