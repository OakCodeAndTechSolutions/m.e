import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const materials = [
  ['poly_wool_herringbone', 'herringbone'],
  ['wood_floor', 'oak-floor'],
];
for (const [id, folder] of materials) {
  const response = await fetch('https://api.polyhaven.com/files/' + id);
  if (!response.ok) throw new Error('Material catalogue failed for ' + id);
  const files = await response.json();
  const destination = path.resolve(
    'public/models/learning-room/optimized/polyhaven/textures',
    folder
  );
  await fs.mkdir(destination, { recursive: true });
  await Promise.all(
    [
      ['Diffuse', 'color'],
      ['nor_gl', 'normal'],
      ['Rough', 'roughness'],
    ].map(async ([channel, filename]) => {
      const source = files[channel]['1k'].jpg;
      const download = await fetch(source.url);
      if (!download.ok) throw new Error('Material download failed for ' + source.url);
      const bytes = Buffer.from(await download.arrayBuffer());
      const compressed = await sharp(bytes)
        .resize(1024, 1024, { fit: 'inside' })
        .jpeg({ quality: channel === 'nor_gl' ? 90 : 82 })
        .toBuffer();
      await fs.writeFile(path.join(destination, filename + '.jpg'), compressed);
    })
  );
  console.log('Prepared ' + id + ' at 1K');
}
