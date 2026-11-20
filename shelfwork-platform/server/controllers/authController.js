import * as auth from '../services/authService.js';
import { asyncHandler, sendSuccess } from '../utils/response.js';

export const register = asyncHandler(async (req, res) => {
  sendSuccess(res, await auth.register(req.body), { status: 201, message: 'Account created.' });
});

/** One login for both roles. Optional body.role ("admin" | "customer") refuses the other kind of account. */
export const login = asyncHandler(async (req, res) => {
  const role = ['admin', 'customer'].includes(req.body?.role) ? req.body.role : undefined;
  sendSuccess(res, await auth.login(req.body, { expectedRole: role }), { message: 'Logged in.' });
});

export const adminLogin = asyncHandler(async (req, res) => {
  sendSuccess(res, await auth.login(req.body, { expectedRole: 'admin' }), { message: 'Logged in.' });
});

export const logout = asyncHandler(async (req, res) => {
  sendSuccess(res, await auth.logout(req.user.userId), { message: 'Logged out.' });
});

export const profile = asyncHandler(async (req, res) => {
  sendSuccess(res, await auth.getProfile(req.user.userId));
});

export const updateProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, await auth.updateProfile(req.user.userId, req.body), { message: 'Profile updated.' });
});
