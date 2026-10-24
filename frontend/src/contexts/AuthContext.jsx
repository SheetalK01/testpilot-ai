import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, tokenStore, UNAUTHORIZED_EVENT } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  // With a stored token we must ask the API who it belongs to before rendering protected pages.
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'loading' : 'ready'));

  useEffect(() => {
    if (!tokenStore.get()) return undefined;
    const controller = new AbortController();
    api.auth
      .me(controller.signal)
      .then((me) => {
        setUser(me);
        setStatus('ready');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        tokenStore.clear();
        setStatus('ready');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      navigate('/login', { replace: true });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [navigate]);

  const authenticate = useCallback((response) => {
    tokenStore.set(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const login = useCallback(
    (credentials) => api.auth.login(credentials).then(authenticate),
    [authenticate],
  );
  const register = useCallback(
    (details) => api.auth.register(details).then(authenticate),
    [authenticate],
  );
  const startDemo = useCallback(() => api.demo.start().then(authenticate), [authenticate]);
  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    navigate('/', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ user, status, login, register, startDemo, logout }),
    [user, status, login, register, startDemo, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
