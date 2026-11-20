import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError, storageError } from './errors.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export const COLLECTIONS = [
  'products',
  'categories',
  'suppliers',
  'transactions',
  'users',
  'orders',
  'carts',
  'payments',
];

/** Resolved on every call so tests (and DATA_DIR) can point somewhere else. */
export const dataDir = () => process.env.DATA_DIR || path.join(here, '..', 'data');
const fileFor = (name) => path.join(dataDir(), `${name}.json`);

/* ---- One operation at a time ------------------------------------------
   Writes go through withLock so two requests can never interleave a
   read-modify-write on the same files. */
let queue = Promise.resolve();
export function withLock(task) {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

async function writeFileAtomic(file, content) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, file);
}

/** Create the data folder and any missing JSON file (as an empty list). */
export async function initStorage() {
  try {
    await fs.mkdir(dataDir(), { recursive: true });
    for (const name of COLLECTIONS) {
      try {
        await fs.access(fileFor(name));
      } catch {
        await writeFileAtomic(fileFor(name), '[]\n');
      }
    }
  } catch (err) {
    throw storageError('Could not initialise the data folder.', err);
  }
}

export async function readCollection(name) {
  let raw;
  try {
    raw = await fs.readFile(fileFor(name), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      await initStorage();
      return [];
    }
    throw storageError(`Could not read ${name}.json.`, err);
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('not an array');
    return parsed;
  } catch {
    // Never overwrite a damaged file automatically: the owner may want to repair it.
    throw new AppError(500, `${name}.json is damaged and could not be parsed. Fix or restore the file.`, 'STORAGE_CORRUPT');
  }
}

/**
 * Save several collections together. Every file is written to a temp file first;
 * only then are they swapped in. If a swap fails part-way, files already swapped
 * are restored, so products and transactions never disagree on disk.
 */
export async function writeCollections(updates) {
  const names = Object.keys(updates);
  const backups = {};
  try {
    for (const name of names) {
      try {
        backups[name] = await fs.readFile(fileFor(name), 'utf8');
      } catch {
        backups[name] = '[]\n';
      }
    }
    for (const name of names) {
      await fs.writeFile(`${fileFor(name)}.tmp`, JSON.stringify(updates[name], null, 2) + '\n', 'utf8');
    }
  } catch (err) {
    await Promise.all(names.map((n) => fs.rm(`${fileFor(n)}.tmp`, { force: true })));
    throw storageError('Could not save your changes.', err);
  }

  const swapped = [];
  try {
    for (const name of names) {
      await fs.rename(`${fileFor(name)}.tmp`, fileFor(name));
      swapped.push(name);
    }
  } catch (err) {
    for (const name of swapped) {
      await fs.writeFile(fileFor(name), backups[name], 'utf8').catch(() => {});
    }
    await Promise.all(names.map((n) => fs.rm(`${fileFor(n)}.tmp`, { force: true })));
    throw storageError('Could not save your changes. Nothing was modified.', err);
  }
}
