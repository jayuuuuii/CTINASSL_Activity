import * as suppliers from '../services/supplierService.js';
import { asyncHandler, sendSuccess } from '../utils/response.js';

export const list = asyncHandler(async (req, res) => {
  const items = await suppliers.listSuppliers();
  sendSuccess(res, items, { meta: { totalItems: items.length } });
});

export const get = asyncHandler(async (req, res) => {
  sendSuccess(res, await suppliers.getSupplier(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  sendSuccess(res, await suppliers.createSupplier(req.body), { status: 201, message: 'Supplier registered.' });
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await suppliers.updateSupplier(req.params.id, req.body), { message: 'Supplier updated.' });
});

export const remove = asyncHandler(async (req, res) => {
  sendSuccess(res, await suppliers.deleteSupplier(req.params.id), { message: 'Supplier deleted.' });
});
