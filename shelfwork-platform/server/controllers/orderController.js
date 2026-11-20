import * as orders from '../services/orderService.js';
import { asyncHandler, sendSuccess } from '../utils/response.js';

export const create = asyncHandler(async (req, res) => {
  const key = req.get('Idempotency-Key') || req.body?.idempotencyKey;
  const { order, duplicate } = await orders.placeOrder(req.user, req.body, key);
  // A retried request gets the original order back with 200 instead of 201.
  sendSuccess(res, order, {
    status: duplicate ? 200 : 201,
    message: duplicate ? 'This order was already placed.' : 'Order placed.',
    meta: { duplicate },
  });
});

/** Admins get every order; customers get only their own. */
export const list = asyncHandler(async (req, res) => {
  const scope = req.user.role === 'admin' ? {} : { userId: req.user.userId };
  const { items, meta } = await orders.listOrders(req.query, scope);
  sendSuccess(res, items, { meta });
});

export const mine = asyncHandler(async (req, res) => {
  const { items, meta } = await orders.listOrders(req.query, { userId: req.user.userId });
  sendSuccess(res, items, { meta });
});

export const get = asyncHandler(async (req, res) => sendSuccess(res, await orders.getOrder(req.params.id, req.user)));

export const updateStatus = asyncHandler(async (req, res) => {
  sendSuccess(res, await orders.updateStatus(req.params.id, req.body, req.user), { message: 'Order status updated.' });
});

export const cancel = asyncHandler(async (req, res) => {
  sendSuccess(res, await orders.cancelOrder(req.params.id, req.user, req.body), { message: 'Order cancelled.' });
});
