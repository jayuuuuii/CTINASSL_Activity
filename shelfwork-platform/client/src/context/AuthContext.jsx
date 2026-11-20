import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore the session from a saved token.
  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api('/auth/profile')
      .then((r) => setUser(r.data))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  // The API client fires this when the server rejects the token.
  useEffect(() => {
    const onEnded = () => setUser(null);
    window.addEventListener('shelfwork:session-ended', onEnded);
    return () => window.removeEventListener('shelfwork:session-ended', onEnded);
  }, []);

  const startSession = useCallback((data) => {
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(
    async (email, password, role) => startSession((await api('/auth/login', { method: 'POST', body: { email, password, role } })).data),
    [startSession]
  );

  const register = useCallback(
    async (fields) => startSession((await api('/auth/register', { method: 'POST', body: fields })).data),
    [startSession]
  );

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* already signed out on the server */
    }
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const r = await api('/auth/profile', { method: 'PUT', body: fields });
    setUser(r.data);
    return r.data;
  }, []);

  const value = useMemo(
    () => ({ user, ready, isAdmin: user?.role === 'admin', isCustomer: user?.role === 'customer', login, register, logout, updateProfile }),
    [user, ready, login, register, logout, updateProfile]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
