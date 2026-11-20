# Shelfwork — Frontend (customer shop + admin panel)

React 18 + Vite. One app, two interfaces:

| Interface | Address | Who |
|---|---|---|
| Customer shop | `http://localhost:5173/#/home` | Anyone; checkout and order history need a customer account |
| Admin panel | `http://localhost:5173/#/admin` | Admin accounts only |

Both talk to the same backend (`../backend`). In development Vite forwards `/api` and `/uploads` to
`http://localhost:3001`, so start the backend first.

## Run
```bash
npm install
npm run dev        # open the address it prints (usually http://localhost:5173)
```
Use another backend address with `VITE_BACKEND_URL=http://host:port npm run dev`.

## Build
```bash
npm run build      # output in dist/
```
The built site must be served from the same origin as the API (or behind a proxy that forwards `/api` and `/uploads`).

## Structure
```
src/
  api/client.js          fetch wrapper: token, JSON envelope, ApiError
  context/               AuthContext (session), CartContext (guest + server cart), ToastContext
  hooks/                 useHashRoute (routing), useAsync (data loading), useDebounced
  components/            shared UI (Header, Footer, Hero, ProductCard, ProductForm, OrderTracker, …)
  pages/shop/            Home, Shop, ProductPage, CategoriesPage, CartPage, CheckoutPage,
                         AccountPage, OrderPage, LoginPage, RegisterPage, About
  pages/admin/           AdminLayout, AdminLogin, AdminDashboard, AdminProducts, AdminStock,
                         AdminOrders, AdminOrderDetail, AdminCustomers, AdminCustomerDetail,
                         AdminTransactions, AdminCategories, AdminSuppliers
  styles.css             one stylesheet: turquoise / cream / charcoal identity
```

## How the cart works
- **Guests:** cart lines are kept in this browser (`localStorage`) and priced by the server (`POST /api/cart/preview`).
- **Customers:** the cart lives on the server (`/api/cart`) and follows the account.
- **On login** a guest cart is merged into the account; quantities are capped at what is in stock.
- Totals shown anywhere are calculated by the server. The browser never decides a price.

## Checkout safety
Each checkout attempt sends an `Idempotency-Key`. A double click or a retry after a network error returns
the same order instead of creating a second one.
