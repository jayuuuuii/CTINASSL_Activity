# Shelfwork API Reference (v2: e-commerce + inventory)

Base URL `http://localhost:3001/api` · JSON everywhere · Prices in PHP.

## Conventions

**Success** `{ "success": true, "message"?: "...", "data": ..., "meta"?: {...} }`
**Error** `{ "success": false, "error": { "code": "...", "message": "...", "details"?: {...} } }`

| Status | When | Codes |
|---|---|---|
| 400 | Bad input / rule broken | `VALIDATION_ERROR`, `INVALID_ID`, `INVALID_JSON`, `INSUFFICIENT_STOCK`, `CART_EMPTY`, `INVALID_STATUS_TRANSITION`, `ORDER_NOT_CANCELLABLE`, `NO_CHANGE` |
| 401 | Not logged in / token invalid or expired / wrong password | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` |
| 403 | Logged in but not allowed / account disabled | `FORBIDDEN`, `ACCOUNT_DISABLED` |
| 404 | Not found (also used for other customers' orders) | `NOT_FOUND`, `PRODUCT_UNAVAILABLE`, `ROUTE_NOT_FOUND` |
| 409 | Conflicts with existing data | `DUPLICATE_*`, `CATEGORY_IN_USE`, `SUPPLIER_IN_USE`, `CART_INVALID` |
| 413 | Body or image too large | `PAYLOAD_TOO_LARGE` |
| 429 | Too many failed logins | `TOO_MANY_ATTEMPTS` |
| 500 | Server or data-file problem | `STORAGE_ERROR`, `STORAGE_CORRUPT`, `INTERNAL_ERROR` |

**IDs:** `PRD-`, `CAT-`, `SUP-`, `TXN-`, `USR-`, `ORD-`, `PAY-` + 8 hex characters.
**Lists** accept `page` (default 1) and `limit` (default 10, max 100) and return `meta: { page, limit, totalItems, totalPages }`.

## Authentication
Send the token from login/register as `Authorization: Bearer <token>`.
Tokens are HS256 JWTs valid for 7 days. Passwords are hashed with scrypt and a random salt; they are never stored or returned in plain text.

| Access | Meaning |
|---|---|
| Public | No token needed |
| Customer | Token of a `customer` account |
| Admin | Token of an `admin` account |
| Any login | Either role |

### `POST /auth/register` — Public
```json
{ "fullName": "Lea Navarro", "email": "lea@example.com", "password": "secret123", "phone": "+63 917 000 1111", "address": "Pasig City" }
```
Password: 8–128 characters with a letter and a number. Always creates a **customer** (a `role` field is ignored).
`201 { data: { user, token, expiresAt } }` · `409 DUPLICATE_EMAIL`

### `POST /auth/login` — Public
```json
{ "email": "andrea@example.com", "password": "Customer@123", "role": "customer" }
```
`role` is optional; when given, an account of the other role is refused (`403`). `POST /auth/admin/login` is the same with `role: "admin"`.
`200 { data: { user, token, expiresAt } }` · `401 INVALID_CREDENTIALS` · `403 ACCOUNT_DISABLED` · `429 TOO_MANY_ATTEMPTS` (5 failures → 15 min lock)

### `POST /auth/logout` — Any login
Invalidates **every** token issued to the user so far (all devices).

### `GET /auth/profile` · `PUT /auth/profile` — Any login
`PUT` accepts `fullName`, `phone`, `address` (email and role cannot be changed here).

User object (never contains `passwordHash`):
```json
{ "userId": "USR-00000002", "fullName": "Andrea Bautista", "email": "andrea@example.com", "phone": "+63 917 123 4501",
  "address": "Unit 4B, 21 Kalayaan Ave, Diliman, Quezon City", "role": "customer", "status": "active",
  "createdAt": "...", "updatedAt": "...", "lastLoginAt": "..." }
```

---

## Products

Product (admin view):
```json
{ "productId": "PRD-00000003", "productName": "Stainless Steel Tumbler 500ml", "category": "Kitchen & Pantry",
  "description": "...", "supplier": "Harbor Housewares", "quantity": 94, "price": 420, "lowStockThreshold": 30,
  "imageUrl": "/uploads/products/PRD-00000003.svg", "isAvailable": true, "isFeatured": true,
  "status": "in", "createdAt": "...", "updatedAt": "..." }
```
`status` is calculated: `out` (0), `low` (≤ threshold), `in`. The **public view** omits `supplier`, `lowStockThreshold`, `isAvailable` and `updatedAt`, and only includes products with `isAvailable: true`.

### `GET /products` — Public (admins see all products unless `?view=public`)
| Param | Notes |
|---|---|
| `search` | Name contains (admins: also supplier) |
| `category` | Exact name, case-insensitive |
| `status` | `in`, `low`, `out` |
| `featured=true`, `inStock=true` | Shop filters |
| `availability` | Admins only: `available` / `unavailable` |
| `sortBy` | `productName`, `category`, `quantity`, `price`, `createdAt` (default), `updatedAt` |
| `order` | `asc` / `desc` (default) |

### `GET /products/:id` — Public (hidden products return 404 except to admins)
### `GET /products/:id/availability?quantity=3` — Public
`{ productId, availableQuantity, requestedQuantity, status, canPurchase }`

### `POST /products` — Admin
```json
{ "productName": "Enamel Camp Mug", "category": "Kitchen & Pantry", "supplier": "Harbor Housewares",
  "description": "Speckled enamel, 350 ml.", "price": 350, "quantity": 20, "lowStockThreshold": 5,
  "isAvailable": true, "isFeatured": false, "imageUrl": "" }
```
Required: `productName, category, price, quantity`. Category and supplier must exist. Opening stock > 0 is logged as an `IN` transaction.

### `PUT /products/:id` — Admin
Partial updates allowed. A quantity change is logged as an `ADJUSTMENT`. Setting `isAvailable: false` removes it from the shop immediately.

### `DELETE /products/:id` — Admin
Also removes it from carts. Past orders and transactions keep their snapshot.

### `PUT /products/:id/image` — Admin
```json
{ "image": "data:image/png;base64,iVBORw0KGgo..." }
```
PNG, JPEG or WebP, ≤ 2 MB; file content must match its type (SVG is refused). Saved under `/uploads/products/`, old file removed. Returns the product.
### `DELETE /products/:id/image` — Admin

---

## Categories
| Endpoint | Access | Notes |
|---|---|---|
| `GET /categories` | Public | Adds `productCount` and `availableProductCount` |
| `GET /categories/:id` | Public | |
| `POST /categories` | Admin | `{ "categoryName": "Cleaning", "description": "..." }`, unique name |
| `PUT /categories/:id` | Admin | Renaming updates every product in it |
| `DELETE /categories/:id` | Admin | `409 CATEGORY_IN_USE` while products use it |

## Suppliers — Admin only
`GET/POST /suppliers`, `GET/PUT/DELETE /suppliers/:id`.
```json
{ "supplierName": "Clean Co.", "contactPerson": "Ana Reyes", "email": "ana@clean.example", "phone": "+63 917 000 1234", "address": "Manila" }
```
Name and email unique. Renaming updates products. `409 SUPPLIER_IN_USE` while products use it.

---

## Cart — Customer (except `preview`)
Cart response (all amounts calculated by the server from current prices):
```json
{ "items": [ { "productId": "PRD-00000003", "productName": "Stainless Steel Tumbler 500ml", "imageUrl": "...",
      "unitPrice": 420, "quantity": 2, "availableQuantity": 94, "lineTotal": 840, "status": "in", "issue": null } ],
  "itemCount": 2, "subtotal": 840, "shippingFee": 100, "total": 940, "hasIssues": false, "freeShippingOver": 3000 }
```
Delivery: ₱100, free from ₱3,000. Lines with an `issue` (unavailable, out of stock, more than available) are left out of the totals and block checkout.

| Endpoint | Body | Notes |
|---|---|---|
| `GET /cart` | | |
| `POST /cart/items` | `{ "productId": "PRD-00000003", "quantity": 2 }` | Adds to an existing line. Total in cart may not exceed stock (`400 INSUFFICIENT_STOCK`, details `{available, inCart, requested}`) |
| `PUT /cart/items/:productId` | `{ "quantity": 1 }` | 1 … stock |
| `DELETE /cart/items/:productId` | | |
| `DELETE /cart` | | Empty the cart |
| `POST /cart/merge` | `{ "items": [{ "productId", "quantity" }] }` | Move a guest cart in after login; capped at stock, returns `adjustments` |
| `POST /cart/preview` | same as merge | **Public.** Prices a guest cart without saving anything |

Admin accounts get `403` (admins don't shop).

---

## Orders

Order:
```json
{ "orderId": "ORD-1a2b3c4d", "userId": "USR-00000002",
  "customer": { "fullName": "...", "email": "...", "phone": "...", "address": "..." },
  "items": [ { "productId": "PRD-00000003", "productName": "...", "imageUrl": "...", "unitPrice": 420, "quantity": 2, "lineTotal": 840 } ],
  "subtotal": 840, "shippingFee": 100, "total": 940,
  "paymentMethod": "COD", "paymentStatus": "PENDING", "paymentId": "PAY-...",
  "status": "Pending",
  "statusHistory": [ { "status": "Pending", "at": "...", "by": "customer", "note": "Order placed" } ],
  "notes": "", "createdAt": "...", "updatedAt": "...",
  "cancelledAt": "...", "cancelledBy": "customer", "cancelReason": "..." }
```
Statuses: `Pending → Confirmed → Processing → Shipped → Delivered`, or `Cancelled`.
Payment methods: `COD`, `ONLINE_SIMULATED`. Payment statuses: `PENDING`, `PAID`, `REFUNDED`, `VOIDED`.

### `POST /orders` — Customer
Header **`Idempotency-Key: <unique string, 8–100 chars>`** (required).
```json
{ "fullName": "Andrea Bautista", "email": "andrea@example.com", "phone": "+63 917 123 4501",
  "address": "Unit 4B, 21 Kalayaan Ave, Diliman, Quezon City", "paymentMethod": "COD", "notes": "Call before delivery" }
```
Uses the customer's **server cart**. In one locked, all-or-nothing save it:
1. checks every line against live stock and availability (`409 CART_INVALID` with `details.items[]` if any line fails; nothing changes),
2. prices every line from the product records (client prices are ignored),
3. deducts stock and writes one `OUT` transaction per line (`referenceType: "ORDER"`),
4. records a payment (`ONLINE_SIMULATED` → `PAID` with a `SIM-…` reference; `COD` → `PENDING`),
5. empties the cart.

`201` new order · `200` with `meta.duplicate: true` when the same key is sent again (returns the original order; stock is not deducted twice) · `400 CART_EMPTY` · `400 VALIDATION_ERROR`.

### `GET /orders` — Any login
Admins: all orders; customers: their own. Filters `search` (order ID or customer name), `status`, paging.
### `GET /orders/my-orders` — Any login
### `GET /orders/:id` — Any login (customers get `404` for other people's orders)

### `PUT /orders/:id/status` — Admin
```json
{ "status": "Confirmed", "note": "Payment verified" }
```
Only the next step is allowed (`400 INVALID_STATUS_TRANSITION`, details `{ current, allowed }`). `"Cancelled"` is handled like the cancel endpoint. On `Delivered`, a COD payment becomes `PAID`.

### `PUT /orders/:id/cancel` — Any login
```json
{ "reason": "Ordered by mistake" }
```
Customers: `Pending` or `Confirmed` orders of their own. Admins: also `Processing`. Shipped/Delivered/Cancelled → `400 ORDER_NOT_CANCELLABLE`.
Stock is restored with one `IN` transaction per line (skipped, and noted, for products that were deleted). Payment becomes `REFUNDED` (if paid) or `VOIDED`. An order can only be cancelled once, so stock is never restored twice.

---

## Stock — Admin
| Endpoint | Body |
|---|---|
| `POST /stock/in` | `{ "productId", "quantity" (≥1), "reason"? }` |
| `POST /stock/out` | same; refuses more than on hand (`400 INSUFFICIENT_STOCK`) |
| `POST /stock/adjust` | `{ "productId", "newQuantity" (≥0), "reason" (required) }` → `ADJUSTMENT` |
| `GET /stock/transactions` | filters `productId`, `type` (IN/OUT/ADJUSTMENT), `source` (order/manual), `search` |
| `GET /stock/low` · `GET /stock/out-of-stock` | |

Responses: `{ product, transaction }`. Transaction:
```json
{ "transactionId": "TXN-…", "productId": "PRD-…", "productName": "…", "type": "IN", "quantity": 20,
  "previousQuantity": 8, "newQuantity": 28, "reason": "Delivery", "referenceType": "MANUAL", "referenceId": null,
  "performedBy": "USR-00000001", "createdAt": "…" }
```
History lists also include `performedByName` and `performedByRole`.

## Admin — Admin only
| Endpoint | Returns |
|---|---|
| `GET /admin/dashboard` | `totalProducts, availableStockUnits, lowStockItems, outOfStockItems, wellStockedItems, totalInventoryValue, totalOrders, pendingOrders, ordersByStatus, totalSales` (non-cancelled orders), `collectedSales` (paid), `recentOrders, recentTransactions, lowStockProducts` |
| `GET /admin/orders` | Same filters as `GET /orders` |
| `GET /admin/customers` | Customers with `orderCount, totalSpent, lastOrderAt`; filters `search` (name, email, phone), `status` |
| `GET /admin/customers/:id` | Customer + their orders |
| `PUT /admin/customers/:id/status` | `{ "status": "disabled" }` or `"active"`; disabling signs them out everywhere |
| `GET /admin/inventory` | All products (product list filters) + `meta.summary` |
| `GET /admin/transactions` | Same as `GET /stock/transactions` |

Phase 2 dashboard routes (`/dashboard/stats`, `/recent-products`, `/recent-transactions`, `/category-summary`) still work and are now admin-only.

## Static files
`GET /uploads/products/<file>`: product images (sent with `X-Content-Type-Options: nosniff`).
