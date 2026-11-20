import * as admin from '../services/adminService.js';
import * as orders from '../services/orderService.js';
import * as stock from '../services/stockService.js';
import { asyncHandler, sendSuccess } from '../utils/response.js';

export const dashboard = asyncHandler(async (req, res) => sendSuccess(res, await admin.getDashboard()));

export const orderList = asyncHandler(async (req, res) => {
  const { items, meta } = await orders.listOrders(req.query);
  sendSuccess(res, items, { meta });
});

export const customers = asyncHandler(async (req, res) => {
  const { items, meta } = await admin.listCustomers(req.query);
  sendSuccess(res, items, { meta });
});

export const customer = asyncHandler(async (req, res) => sendSuccess(res, await admin.getCustomer(req.params.id)));

export const customerStatus = asyncHandler(async (req, res) => {
  sendSuccess(res, await admin.setCustomerStatus(req.params.id, req.body), { message: 'Customer status updated.' });
});

export const inventory = asyncHandler(async (req, res) => {
  const { items, meta, summary } = await admin.getInventory(req.query);
  sendSuccess(res, items, { meta: { ...meta, summary } });
});

export const transactions = asyncHandler(async (req, res) => {
  const { items, meta } = await stock.listTransactions(req.query);
  sendSuccess(res, items, { meta });
});
