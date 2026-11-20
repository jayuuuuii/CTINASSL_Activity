<<<<<<< HEAD
# CTINASSL_Activity
=======
# Shelfwork — E-commerce & Inventory Platform (Phase 3)

The Phase 1 frontend and Phase 2 backend, extended into one platform with two interfaces:

- **Customer shop**: browse, search, cart, checkout (Cash on Delivery or simulated online payment), order tracking and history.
- **Admin panel**: dashboard, products (with images and shop visibility), stock in/out/adjust, stock history, orders, customers, categories, suppliers.

Both use the same Node/Express backend and JSON data.

```
shelfwork-platform/
  backend/    Express API, JSON storage, tests, Postman, docs (see backend/README.md)
  frontend/   React + Vite app (see frontend/README.md)
```

## Quick start (two terminals)
```bash
# Terminal 1: backend
cd backend
npm install
npm start                 # http://localhost:3001/api/health

# Terminal 2: frontend
cd frontend
npm install
npm run dev               # open http://localhost:5173
```
- Shop: `http://localhost:5173/#/home`, log in as `andrea@example.com` / `Customer@123`
- Admin: `http://localhost:5173/#/admin`, log in as `admin@shelfwork.example` / `Admin@12345`

Reset to the sample data at any time: `cd backend && npm run reset-data` (then restart the backend).

## Documentation
- API reference: `backend/docs/API.md`
- Testing documentation and checklist: `backend/docs/TESTING.md`
- Postman collection: `backend/postman/Shelfwork-API.postman_collection.json`
- Run the automated tests: `cd backend && npm test`

Payments are simulated for a school project. No real payment is processed and no card details are collected.
>>>>>>> 148e887 (initial commit)
