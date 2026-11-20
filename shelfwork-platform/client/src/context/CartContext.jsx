import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

/**
 * One cart API for the whole app.
 * - Guests: lines are kept in this browser (localStorage) and priced by POST /api/cart/preview.
 * - Customers: the cart lives on the server (/api/cart), so it follows them across devices.
 * - On login, a guest cart is merged into the account.
 * Totals always come from the server.
 */
const GUEST_KEY = 'shelfwork.guestCart';
const EMPTY = { items: [], itemCount: 0, subtotal: 0, shippingFee: 0, total: 0, hasIssues: false, freeShippingOver: 3000 };
const CartContext = createContext(null);

function readGuest() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((l) => l && l.productId && l.quantity > 0) : [];
  } catch {
    return [];
  }
}
function writeGuest(lines) {
  try {
    if (lines.length) localStorage.setItem(GUEST_KEY, JSON.stringify(lines));
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function CartProvider({ children }) {
  const { user, ready, isCustomer, isAdmin } = useAuth();
  const toast = useToast();
  const [cart, setCart] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const priceGuest = useCallback(async (lines) => {
    if (!lines.length) return EMPTY;
    return (await api('/cart/preview', { method: 'POST', body: { items: lines } })).data;
  }, []);

  const refresh = useCallback(async () => {
    if (isAdmin) return setCart(EMPTY);
    try {
      setCart(isCustomer ? (await api('/cart')).data : await priceGuest(readGuest()));
    } catch {
      /* keep what we have; pages show their own errors */
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isCustomer, priceGuest]);

  // Load the cart whenever the signed-in user changes; merge a guest cart on login.
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const guest = readGuest();
      if (isCustomer && guest.length) {
        try {
          const r = await api('/cart/merge', { method: 'POST', body: { items: guest } });
          writeGuest([]);
          if (r.data.adjustments?.length) toast('Some items in your cart were adjusted to match available stock.', 'warn');
        } catch {
          /* leave the guest cart in place and try again later */
        }
      }
      refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.userId]);

  const guestUpdate = useCallback(
    async (productId, quantity, { add = false } = {}) => {
      const lines = readGuest();
      const existing = lines.find((l) => l.productId === productId);
      const next = add ? (existing?.quantity || 0) + quantity : quantity;
      const check = (await api(`/products/${productId}/availability`, { query: { quantity: next } })).data;
      if (!check.canPurchase)
        throw new ApiError(400, 'INSUFFICIENT_STOCK', check.availableQuantity
          ? `Only ${check.availableQuantity} in stock${existing ? ` (you have ${existing.quantity} in your cart)` : ''}.`
          : 'This product is out of stock.');
      const updated = existing ? lines.map((l) => (l.productId === productId ? { ...l, quantity: next } : l)) : [...lines, { productId, quantity: next }];
      writeGuest(updated);
      setCart(await priceGuest(updated));
    },
    [priceGuest]
  );

  const addItem = useCallback(
    async (productId, quantity = 1) => {
      if (isAdmin) throw new ApiError(403, 'FORBIDDEN', 'Admin accounts cannot shop. Log out of the admin panel first.');
      if (isCustomer) setCart((await api('/cart/items', { method: 'POST', body: { productId, quantity } })).data);
      else await guestUpdate(productId, quantity, { add: true });
    },
    [isAdmin, isCustomer, guestUpdate]
  );

  const updateItem = useCallback(
    async (productId, quantity) => {
      if (isCustomer) setCart((await api(`/cart/items/${productId}`, { method: 'PUT', body: { quantity } })).data);
      else await guestUpdate(productId, quantity);
    },
    [isCustomer, guestUpdate]
  );

  const removeItem = useCallback(
    async (productId) => {
      if (isCustomer) setCart((await api(`/cart/items/${productId}`, { method: 'DELETE' })).data);
      else {
        const lines = readGuest().filter((l) => l.productId !== productId);
        writeGuest(lines);
        setCart(await priceGuest(lines));
      }
    },
    [isCustomer, priceGuest]
  );

  const clear = useCallback(async () => {
    if (isCustomer) setCart((await api('/cart', { method: 'DELETE' })).data);
    else {
      writeGuest([]);
      setCart(EMPTY);
    }
  }, [isCustomer]);

  const quantityOf = useCallback((productId) => cart.items.find((i) => i.productId === productId)?.quantity || 0, [cart]);

  const value = useMemo(
    () => ({ cart, loading, count: cart.itemCount, addItem, updateItem, removeItem, clear, refresh, quantityOf }),
    [cart, loading, addItem, updateItem, removeItem, clear, refresh, quantityOf]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
