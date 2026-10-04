import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ROOM_GLB, preloadRoomModelPaths } from './room-assets';

describe('preloadRoomModelPaths', () => {
  it('preloads every registered model, since all of them are in the idle view', () => {
    expect(new Set(preloadRoomModelPaths())).toEqual(new Set(Object.values(ROOM_GLB)));
  });
});

type GlbJson = {
  nodes: unknown[];
  meshes: unknown[];
  accessors: { bufferView?: number }[];
  bufferViews: { byteOffset?: number; byteLength: number }[];
  images?: { uri?: string; bufferView?: number }[];
};

function readGlb(filename: string) {
  const bytes = readFileSync(filename);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString()) as GlbJson;
  const bin = bytes.subarray(28 + jsonLength);
  return { json, bin };
}

describe('optimized room models', () => {
  for (const url of preloadRoomModelPaths().filter((url) => url.includes('/optimized/'))) {
    it(`preserves geometry and hinge nodes: ${path.basename(url)}`, () => {
      const filename = path.join(process.cwd(), 'public', url.split('?')[0]!);
      const original = readGlb(filename.replace(`${path.sep}optimized${path.sep}`, path.sep));
      const optimized = readGlb(filename);
      // JSON re-encoding normalizes -0; transforms otherwise remain byte-for-byte numbers.
      expect(JSON.stringify(optimized.json.nodes)).toBe(JSON.stringify(original.json.nodes));
      expect(optimized.json.meshes).toEqual(original.json.meshes);
      expect(optimized.json.accessors.length).toBe(original.json.accessors.length);
      optimized.json.accessors.forEach((accessor, index) => {
        if (accessor.bufferView === undefined) return;
        const a = optimized.json.bufferViews[accessor.bufferView]!;
        const b = original.json.bufferViews[original.json.accessors[index]!.bufferView!]!;
        expect(
          optimized.bin
            .subarray(a.byteOffset ?? 0, (a.byteOffset ?? 0) + a.byteLength)
            .equals(original.bin.subarray(b.byteOffset ?? 0, (b.byteOffset ?? 0) + b.byteLength))
        ).toBe(true);
      });
      for (const image of optimized.json.images ?? []) {
        if (image.uri) expect(existsSync(path.join(path.dirname(filename), image.uri))).toBe(true);
      }
    });
  }
});
