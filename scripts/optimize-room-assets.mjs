/** Rebuild runtime assets without altering geometry, node names, or hinge coordinates.
 * Originals and their licence files remain alongside the generated assets.
 * Run: node scripts/optimize-room-assets.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('public/models/learning-room');
const output = path.join(root, 'optimized');
const source = await fs.readFile(
  'components/effects/switchboard/learning-room/room-assets.ts',
  'utf8'
);
const imageCache = new Map();
let before = 0;
let after = 0;

async function write(relative, bytes) {
  const dest = path.join(output, relative);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, bytes);
  after += bytes.length;
}

async function resizeImage(bytes) {
  const image = sharp(bytes).resize({
    width: 1024,
    height: 1024,
    fit: 'inside',
    withoutEnlargement: true,
  });
  const { isOpaque } = await image.stats();
  return isOpaque
    ? {
        bytes: await image.jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer(),
        mime: 'image/jpeg',
        ext: '.jpg',
      }
    : { bytes: await image.png().toBuffer(), mime: 'image/png', ext: '.png' };
}

async function externalImage(relative) {
  if (imageCache.has(relative)) return imageCache.get(relative);
  const original = await fs.readFile(path.join(root, relative));
  before += original.length;
  const result = await resizeImage(original);
  const dest = relative.replace(/\.[^.]+$/, result.ext);
  await write(dest, result.bytes);
  imageCache.set(relative, dest);
  return dest;
}

async function optimizeGlb(relative) {
  const original = await fs.readFile(path.join(root, relative));
  before += original.length;
  const jsonLength = original.readUInt32LE(12);
  const json = JSON.parse(original.subarray(20, 20 + jsonLength).toString());
  const bin = original.subarray(28 + jsonLength);
  const replacements = new Map();
  for (const image of json.images ?? []) {
    if (image.uri) {
      const dest = await externalImage(path.posix.join(path.posix.dirname(relative), image.uri));
      image.uri = path.posix.basename(dest);
      image.mimeType = dest.endsWith('.png') ? 'image/png' : 'image/jpeg';
    } else if (image.bufferView !== undefined) {
      const view = json.bufferViews[image.bufferView];
      const result = await resizeImage(
        bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
      );
      replacements.set(image.bufferView, result.bytes);
      image.mimeType = result.mime;
    }
  }
  // Repacking also removes abandoned image payloads from externally textured GLBs.
  const references = [
    ...(json.accessors ?? []),
    ...(json.images ?? []),
    ...(json.accessors ?? []).flatMap((a) => (a.sparse ? [a.sparse.indices, a.sparse.values] : [])),
  ].filter((item) => item.bufferView !== undefined);
  const used = new Set(references.map((item) => item.bufferView));
  const remap = new Map();
  let offset = 0;
  const parts = [];
  for (const [index, view] of json.bufferViews.entries()) {
    if (!used.has(index)) continue;
    remap.set(index, remap.size);
    const bytes =
      replacements.get(index) ??
      bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    view.byteOffset = offset;
    view.byteLength = bytes.length;
    const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4);
    bytes.copy(padded);
    parts.push(padded);
    offset += padded.length;
  }
  json.bufferViews = json.bufferViews.filter((_, index) => used.has(index));
  for (const item of references) item.bufferView = remap.get(item.bufferView);
  json.buffers[0].byteLength = offset;
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonPadded = Buffer.alloc(Math.ceil(jsonBytes.length / 4) * 4, 32);
  jsonBytes.copy(jsonPadded);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonPadded.length + offset, 8);
  header.writeUInt32LE(jsonPadded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(offset, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  await write(relative, Buffer.concat([header, jsonPadded, binHeader, ...parts]));
}

const idleNames = source.match(/const IDLE_ROOM_MODELS = \[([\s\S]*?)\]/)[1];
const paths = [...source.matchAll(/(\w+):\s*'(\/models\/learning-room\/[^']+)'/g)];
for (const [, name, url] of paths) {
  const relative = url
    .split('?')[0]
    .replace('/models/learning-room/', '')
    .replace(/^optimized\//, '');
  if (relative.endsWith('.glb') && idleNames.includes(`ROOM_GLB.${name},`))
    await optimizeGlb(relative);
  if (/\.(jpg|png)$/.test(relative)) await externalImage(relative);
}

console.log(
  `Room assets: ${(before / 1e6).toFixed(2)} MB → ${(after / 1e6).toFixed(2)} MB (geometry unchanged)`
);
await fs.writeFile(
  path.join(output, 'README.md'),
  '# Optimized runtime assets\n\nGenerated by `scripts/optimize-room-assets.mjs`. Textures are resized/re-encoded and unused GLB buffer payloads are removed. Geometry and node transforms are unchanged.\n\nOriginal authors, licences, source links and attribution: [CREDITS.md](../CREDITS.md). Original assets are retained outside this directory.\n'
);
