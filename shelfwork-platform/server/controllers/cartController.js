import * as cart from '../services/cartService.js';
import { asyncHandler, sendSuccess } from '../utils/response.js';

export const get = asyncHandler(async (req, res) => sendSuccess(res, await cart.getCart(req.user.userId)));

export const add = asyncHandler(async (req, res) => {
  sendSuccess(res, await cart.addItem(req.user.userId, req.body), { message: 'Added to cart.' });
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await cart.updateItem(req.user.userId, req.params.productId, req.body), { message: 'Cart updated.' });
});

export const remove = asyncHandler(async (req, res) => {
  sendSuccess(res, await cart.removeItem(req.user.userId, req.params.productId), { message: 'Item removed.' });
});

export const clear = asyncHandler(async (req, res) => {
  sendSuccess(res, await cart.clearCart(req.user.userId), { message: 'Cart cleared.' });
});

export const preview = asyncHandler(async (req, res) => sendSuccess(res, await cart.previewCart(req.body)));

export const merge = asyncHandler(async (req, res) => {
  sendSuccess(res, await cart.mergeCart(req.user.userId, req.body), { message: 'Cart merged.' });
});
