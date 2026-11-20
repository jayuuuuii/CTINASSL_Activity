# Shelfwork — Backend (Phase 3: e-commerce + inventory)

Node.js + Express REST API used by both the customer shop and the admin panel. Data is stored in JSON
files with safe, serialized writes. The Phase 2 structure (routes → controllers → services → utils) is kept
and extended.

## Requirements
Node.js 18 or newer.

## Install and run
```bash
npm install
npm run reset-data -- --yes   # optional: (re)load the sample data
npm start                     # http://localhost:3001/api/health
npm run dev                   # auto-restart while editing
npm test                      # 54 automated tests (uses temporary data, never your data/ folder)
```

Sample accounts:

| Role | Email | Password |
|---|---|---|
| Admin | admin@shelfwork.example | Admin@12345 |
| Customer | andrea@example.com (also miguel@, carla@) | Customer@123 |

Change the admin password before showing this to anyone outside class (edit via a new admin, or set
`ADMIN_EMAIL`/`ADMIN_PASSWORD` on an empty `users.json`).

### Environment variables (optional, see `.env.example`)
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | 3001 | Port |
| `CORS_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed frontend origins |
| `AUTH_SECRET` | random, saved in `data/auth-secret.key` | Token signing secret |
| `DATA_DIR` / `UPLOADS_DIR` | `./data` / `./uploads` | Storage folders |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | | Creates the first admin if none exists |

## Structure
```
backend/
  server.js, app.js, config.js     startup, Express wiring, business settings (shipping, statuses)
  routes/        auth, products, categories, suppliers, stock, dashboard, cart, orders, admin
  controllers/   thin HTTP layer
  services/      business rules: auth, product, image, category, supplier, stock, cart, order, admin, dashboard
  middleware/    auth (authenticate, requireRole), errorHandler, validateId
  utils/         fileStore (locked atomic JSON writes), auth (scrypt, JWT), validators, ids, pagination
  data/          products, categories, suppliers, transactions, users, orders, carts, payments (.json)
  uploads/       product images (served at /uploads)
  scripts/       sample data generator and reset-data
  test/          automated HTTP tests
  docs/          API.md, TESTING.md
  postman/       Postman collection
```

## What changed from Phase 2
- **New:** users (customer/admin) with scrypt-hashed passwords and JWT login; role-protected routes; server-side carts; orders with a status workflow; simulated payments; customer management; manual stock adjustments; product images, availability and featured flags.
- **Protected:** product/category writes, suppliers, stock and dashboard routes now require an admin token. `GET /api/products` and `GET /api/categories` stay public.
- **Kept:** every Phase 2 endpoint, field name and response format.
- Transactions now record `referenceType` (`ORDER`/`MANUAL`), `referenceId` and `performedBy`.

## Inventory consistency
- All writes go through one lock, so requests never interleave.
- A change touching several files (order + stock + transactions + payment + cart) is written to temp files and swapped in together; if a swap fails the earlier files are restored.
- Checkout re-checks stock inside the lock, so two customers can never buy the same last unit.
- Each order carries an `Idempotency-Key`; repeats return the first order.
- Cancelling restores stock once, with a matching transaction.

Full endpoint list with request/response examples: **[docs/API.md](docs/API.md)**. Test plan and results: **[docs/TESTING.md](docs/TESTING.md)**.
