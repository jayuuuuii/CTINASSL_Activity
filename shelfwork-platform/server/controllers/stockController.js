import * as stock from '../services/stockService.js';
import { asyncHandler, sendSuccess } from '../utils/response.js';

export const transactions = asyncHandler(async (req, res) => {
  const { items, meta } = await stock.listTransactions(req.query);
  sendSuccess(res, items, { meta });
});

export const stockIn = asyncHandler(async (req, res) => {
  sendSuccess(res, await stock.stockIn(req.body, req.user), { status: 201, message: 'Stock added.' });
});

export const stockOut = asyncHandler(async (req, res) => {
  sendSuccess(res, await stock.stockOut(req.body, req.user), { status: 201, message: 'Stock removed.' });
});

export const adjust = asyncHandler(async (req, res) => {
  sendSuccess(res, await stock.adjustStock(req.body, req.user), { status: 201, message: 'Stock adjusted.' });
});

export const low = asyncHandler(async (req, res) => {
  const items = await stock.listLowStock();
  sendSuccess(res, items, { meta: { totalItems: items.length } });
});

export const outOfStock = asyncHandler(async (req, res) => {
  const items = await stock.listOutOfStock();
  sendSuccess(res, items, { meta: { totalItems: items.length } });
});
