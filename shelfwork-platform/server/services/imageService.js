import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { readCollection, writeCollections, withLock } from '../utils/fileStore.js';
import { AppError, notFound, validationError, storageError } from '../utils/errors.js';
import { productImageDir } from '../utils/uploads.js';
import { IMAGE } from '../config.js';
import { withStatus } from './productService.js';

/** The file's first bytes must match its declared type (stops renamed or disguised files). */
const MAGIC = {
  png: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  jpg: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

function decode(dataUrl) {
  if (typeof dataUrl !== 'string') throw validationError({ image: 'Send the image as a base64 data URL in the "image" field.' });
  const match = dataUrl.match(/^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) throw validationError({ image: 'Image must be a base64 data URL, e.g. data:image/png;base64,....' });
  const ext = IMAGE.types[match[1].toLowerCase()];
  if (!ext) throw validationError({ image: 'Only PNG, JPEG and WebP images are accepted.' });
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) throw validationError({ image: 'The image is empty.' });
  if (buffer.length > IMAGE.maxBytes)
    throw new AppError(413, `Image is too large. The limit is ${IMAGE.maxBytes / 1024 / 1024} MB.`, 'PAYLOAD_TOO_LARGE');
  if (!MAGIC[ext](buffer)) throw validationError({ image: 'The file content does not match its image type.' });
  return { buffer, ext };
}

/** Remove an old uploaded image, if it lives in our uploads folder. */
async function removeLocalFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/products/')) return;
  const file = path.join(productImageDir(), path.basename(imageUrl));
  await fs.rm(file, { force: true }).catch(() => {});
}

export function setProductImage(id, body) {
  return withLock(async () => {
    const { buffer, ext } = decode(body?.image);
    const products = await readCollection('products');
    const current = products.find((p) => p.productId === id);
    if (!current) throw notFound('Product');

    const filename = `${id}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    try {
      await fs.mkdir(productImageDir(), { recursive: true });
      await fs.writeFile(path.join(productImageDir(), filename), buffer);
    } catch (err) {
      throw storageError('Could not save the image.', err);
    }

    const updated = { ...current, imageUrl: `/uploads/products/${filename}`, updatedAt: new Date().toISOString() };
    await writeCollections({ products: products.map((p) => (p.productId === id ? updated : p)) });
    await removeLocalFile(current.imageUrl);
    return withStatus(updated);
  });
}

export function removeProductImage(id) {
  return withLock(async () => {
    const products = await readCollection('products');
    const current = products.find((p) => p.productId === id);
    if (!current) throw notFound('Product');
    const updated = { ...current, imageUrl: '', updatedAt: new Date().toISOString() };
    await writeCollections({ products: products.map((p) => (p.productId === id ? updated : p)) });
    await removeLocalFile(current.imageUrl);
    return withStatus(updated);
  });
}
