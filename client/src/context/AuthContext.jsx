import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setDoctor(data.doctor);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const setSession = (token, doc) => {
    localStorage.setItem('token', token);
    if (doc) setDoctor(doc);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setDoctor(null);
  };

  return (
    <AuthCtx.Provider value={{ doctor, loading, setDoctor, setSession, logout, refresh: loadMe }}>
      {children}
    </AuthCtx.Provider>
  );
}
