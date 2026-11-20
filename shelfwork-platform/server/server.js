import { createApp } from './app.js';
import { initStorage } from './utils/fileStore.js';
import { ensureAdminAccount } from './services/authService.js';

const PORT = Number(process.env.PORT) || 3001;

try {
  await initStorage(); // creates the data folder and any missing JSON file
  if (!(await ensureAdminAccount()))
    console.warn('No admin account exists. Run "npm run reset-data" for sample data, or set ADMIN_EMAIL and ADMIN_PASSWORD and restart.');
} catch (err) {
  console.error('Could not prepare the data files:', err.message);
  process.exit(1);
}

createApp().listen(PORT, () => {
  console.log(`Shelfwork API running at http://localhost:${PORT}/api/health`);
});
