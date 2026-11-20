/**
 * Small wrapper around fetch for the Shelfwork API.
 * - Adds the login token.
 * - Always resolves to the server's JSON envelope { success, data, meta, message }.
 * - Throws ApiError (with code, details and status) for anything that isn't a success.
 */
const TOKEN_KEY = 'shelfwork.token';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details || null;
  }
}

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let token = readToken();

export const getToken = () => token;

export function setToken(value) {
  token = value || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: the session lasts until the tab closes */
  }
}

function buildQuery(query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') params.set(k, v);
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function api(path, { method = 'GET', body, query, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}${buildQuery(query)}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Make sure the backend is running (npm start in the backend folder).');
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty or non-JSON body */
  }

  if (!res.ok || !json?.success) {
    const err = json?.error;
    // A rejected token means the session ended (logout elsewhere, account disabled, expiry).
    if (res.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event('shelfwork:session-ended'));
    }
    throw new ApiError(res.status, err?.code || 'HTTP_ERROR', err?.message || `Request failed (${res.status}).`, err?.details);
  }
  return json;
}

/** Turn an ApiError's field details into { field: message } for forms. */
export const fieldErrors = (error) => (error?.code === 'VALIDATION_ERROR' && error.details) || {};
