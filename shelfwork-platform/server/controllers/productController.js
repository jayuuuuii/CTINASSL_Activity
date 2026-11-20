import * as products from '../services/productService.js';
import * as images from '../services/imageService.js';
import { asyncHandler, sendSuccess } from '../utils/response.js';

/** Admins see every product unless they ask for the shop view (?view=public). */
const viewer = (req) => (req.user?.role === 'admin' && req.query.view !== 'public' ? 'admin' : 'public');

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await products.listProducts(req.query, { viewer: viewer(req) });
  sendSuccess(res, items, { meta });
});

export const get = asyncHandler(async (req, res) => {
  sendSuccess(res, await products.getProduct(req.params.id, { viewer: viewer(req) }));
});

export const availability = asyncHandler(async (req, res) => {
  sendSuccess(res, await products.checkAvailability(req.params.id, req.query.quantity));
});

export const create = asyncHandler(async (req, res) => {
  sendSuccess(res, await products.createProduct(req.body, req.user), { status: 201, message: 'Product created.' });
});

export const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await products.updateProduct(req.params.id, req.body, req.user), { message: 'Product updated.' });
});

export const remove = asyncHandler(async (req, res) => {
  sendSuccess(res, await products.deleteProduct(req.params.id), { message: 'Product deleted.' });
});

export const uploadImage = asyncHandler(async (req, res) => {
  sendSuccess(res, await images.setProductImage(req.params.id, req.body), { message: 'Image updated.' });
});

export const removeImage = asyncHandler(async (req, res) => {
  sendSuccess(res, await images.removeProductImage(req.params.id), { message: 'Image removed.' });
});
