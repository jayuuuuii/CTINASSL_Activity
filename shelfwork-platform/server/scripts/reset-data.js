/**
 * Replace everything in data/ and uploads/products/ with the sample dataset.
 * Usage: npm run reset-data   (add --yes to skip the confirmation prompt)
 */
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { writeSampleData, SAMPLE_ACCOUNTS } from './sampleData.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const uploadsDir = process.env.UPLOADS_DIR || path.join(root, 'uploads');

if (!process.argv.includes('--yes')) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`This replaces ALL data in ${dataDir} with sample data. Continue? (y/N) `);
  rl.close();
  if (answer.trim().toLowerCase() !== 'y') {
    console.log('Cancelled. Nothing was changed.');
    process.exit(0);
  }
}

const data = await writeSampleData({ dataDir, uploadsDir });
console.log(`Sample data written: ${data.products.length} products, ${data.orders.length} orders, ${data.users.length} users, ${data.transactions.length} transactions.`);
console.log(`Admin login:    ${SAMPLE_ACCOUNTS.admin.email} / ${SAMPLE_ACCOUNTS.admin.password}`);
console.log(`Customer login: andrea@example.com / ${SAMPLE_ACCOUNTS.customerPassword} (also miguel@, carla@)`);
console.log('Restart the server if it is running.');
