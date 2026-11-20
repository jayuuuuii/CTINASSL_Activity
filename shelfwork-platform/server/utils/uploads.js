import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Folder for uploaded files, served at /uploads. Resolved on each call so tests can redirect it. */
export const uploadsDir = () => process.env.UPLOADS_DIR || path.join(here, '..', 'uploads');
export const productImageDir = () => path.join(uploadsDir(), 'products');
