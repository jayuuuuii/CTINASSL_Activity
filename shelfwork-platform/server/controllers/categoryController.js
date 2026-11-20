import * as categories from '../services/categoryService.js';
import { asyncHandler, sendSuccess } from '../utils/response.js';

export const list = asyncHandler(async (req, res) => {
  const items = await categories.listCategories();
  sendSuccess(res, items, { meta: { totalItems: items.length } });
});

export const get = asyncHandler(async (req, res) => {
  sendSuccess(res, await categories.getCategory(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  sendSuccess(res, await categories.createCategory(req.body), { status: 201, message: 'Category created.' });
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await categories.updateCategory(req.params.id, req.body), { message: 'Category updated.' });
});

export const remove = asyncHandler(async (req, res) => {
  sendSuccess(res, await categories.deleteCategory(req.params.id), { message: 'Category deleted.' });
});
