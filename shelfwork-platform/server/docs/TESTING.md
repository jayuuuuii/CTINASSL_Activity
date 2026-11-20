# Testing documentation

Three layers of testing: automated tests (run with one command), the Postman collection, and a manual
browser checklist. Sample accounts (created by `npm run reset-data`):

| Role | Email | Password |
|---|---|---|
| Admin | admin@shelfwork.example | Admin@12345 |
| Customer | andrea@example.com / miguel@example.com / carla@example.com | Customer@123 |
| Customer (disabled) | paolo@example.com | Customer@123 |

## 1. Automated tests — `npm test`
Every test file starts the real app on a random port with a fresh copy of the sample data in a temporary
folder, then makes real HTTP requests. Your own `data/` folder is never touched.

| File | What it proves |
|---|---|
| `sampleData.test.js` | Sample IDs are valid and unique; every product's stock equals its transaction history; every order line has its OUT transaction (and cancelled orders their IN); totals and payments add up; passwords are hashed |
| `auth.test.js` | Registration (hashing, validation, duplicate email, cannot self-register as admin); login for both roles; wrong vs unknown email look identical; role-restricted login; disabled accounts; tampered/garbage tokens rejected; profile update; logout invalidates the token; lockout after 5 failed logins |
| `shop.test.js` | Shop shows only available products without internal fields; search, category, price sort, featured, in-stock filters; admins see hidden products; availability check; public categories with counts; images served; cart requires a customer; add/update/remove/clear with server totals and free-shipping rule; cannot exceed stock (including what is already in the cart); out-of-stock/hidden/invalid refused; guest preview; merge capped at stock |
| `orders.test.js` | Order deducts stock, logs OUT transactions, records payment, empties cart; server ignores client prices; same Idempotency-Key → same order, stock deducted once; two simultaneous identical submissions → one order; key required; checkout validation; empty cart; overselling blocked; **5 customers racing for 2 units → exactly 2 orders, stock 0**; hidden product can't be ordered; customers see only their own orders; admin search/filter; status workflow (no skipping, customers can't change status, shipped can't be cancelled, COD paid on delivery); cancellation restores stock exactly once, customer vs admin cancel rules, refund/void; ledger consistent afterwards; data and tokens survive a restart |
| `admin.test.js` | Every admin route returns 401 to guests and 403 to customers; dashboard figures match the stored records; product CRUD incl. availability/featured/validation; image upload accepts real PNG, rejects disguised/SVG files, replaces the old file, customers blocked; category and supplier CRUD with in-use protection and rename propagation; stock in/out/adjust recorded with who did it; inventory and history filters; customer list/search/detail without password data; disabling a customer ends their session and blocks login; consistent error format; ledger consistent |

Last run: **54 tests, 54 passed**.

## 2. Postman — `postman/Shelfwork-API.postman_collection.json`
1. `npm run reset-data -- --yes` then `npm start`.
2. Import the collection and run it top to bottom with the **Collection Runner**.
3. The login requests save `adminToken` and `customerToken` automatically; created IDs are saved too, and the
   last folder cleans up. Each request has tests for status code and key fields.

Folders: Health · Auth · Shop (public) · Cart · Orders (customer) · Admin: orders · Admin: products · Admin:
categories & suppliers · Admin: stock · Admin: dashboard & customers · Security checks · Cleanup.

## 3. Manual browser checklist (frontend + backend running)
**Customer**
- [ ] Home shows featured products, categories, new arrivals and available products with images.
- [ ] Shop: search "coffee", pick a category, sort by price, tick "In stock only"; URL updates and survives refresh.
- [ ] Product page: the + button stops at the available quantity; out-of-stock products can't be added.
- [ ] As a guest add items, then log in: the cart is kept (merged into the account).
- [ ] Cart: change quantities, remove a line, totals and delivery fee update; free delivery from ₱3,000.
- [ ] Checkout with Cash on Delivery, then with Simulated Online Payment; confirmation page appears.
- [ ] Double-click "Place order": only one order is created.
- [ ] Account page lists orders; open one, cancel it; stock goes back up (check in admin).
- [ ] Register a new account; log out; log in again.

**Admin** (`#/admin`)
- [ ] Customer accounts are refused on the admin login.
- [ ] Dashboard figures match the Products and Orders pages.
- [ ] Add a product with an image; it appears in the shop. Hide it with the switch; it disappears from the shop.
- [ ] Stock in / stock out / set exact count; each appears in Stock history with your name.
- [ ] Open a pending order, move it through Confirmed → Delivered; COD shows Paid at the end.
- [ ] Cancel a processing order; its units return to stock.
- [ ] Disable a customer; that customer is signed out and can't log in. Re-enable.
- [ ] Try to delete a category or supplier that has products: refused with a clear message.

**Persistence**
- [ ] Place an order, stop the backend (Ctrl+C), start it again: the order, stock levels and your login are still there.

## Business-logic summary
| Rule | Where enforced |
|---|---|
| No purchase of unavailable products | `cartService.addItem`, `orderService.placeOrder` |
| No quantity above stock | cart add/update and again at checkout inside the lock |
| Prices and totals from the server | `orderService.placeOrder`, `cartService.priceCart` |
| Stock deducted and logged per purchase | `placeOrder` (one OUT transaction per line, saved with the order) |
| Unique order IDs | `generateId` checks existing IDs |
| Cancellation restores stock once | `cancelOrder` (status check + one IN per line) |
| No duplicate orders | required `Idempotency-Key`, checked inside the lock |
| Serialized file updates | `withLock` in `utils/fileStore.js`; multi-file saves are all-or-nothing |
