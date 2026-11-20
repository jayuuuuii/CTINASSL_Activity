import * as dashboard from '../services/dashboardService.js';
import { asyncHandler, sendSuccess } from '../utils/response.js';

export const stats = asyncHandler(async (req, res) => sendSuccess(res, await dashboard.getStats()));

export const recentProducts = asyncHandler(async (req, res) =>
  sendSuccess(res, await dashboard.getRecentProducts(req.query))
);

export const recentTransactions = asyncHandler(async (req, res) =>
  sendSuccess(res, await dashboard.getRecentTransactions(req.query))
);

export const categorySummary = asyncHandler(async (req, res) =>
  sendSuccess(res, await dashboard.getCategorySummary())
);
