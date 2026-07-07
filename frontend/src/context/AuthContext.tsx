import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  company: 'SofaShine' | 'CleanCruisers' | 'Both';
  phone: string;
  photo?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (token: string, profile: UserProfile, rememberMe: boolean) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      const profile = {
        ...res.data,
        id: res.data._id || res.data.id
      };
      setUser(profile);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load profile, checking error type...', err);
      // Only call logout if the error status code is explicitly 401 (Unauthorized) or 403 (Forbidden)
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        logout();
        setLoading(false);
      } else {
        // If it's a network timeout, server offline, 502/504 proxy error, do NOT logout.
        // Keep loading = true and schedule a retry in 5 seconds.
        console.log('Transient network/server error. Retrying profile load in 5s...');
        setTimeout(fetchProfile, 5000);
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken: string, profile: UserProfile, rememberMe: boolean) => {
    setToken(newToken);
    setUser(profile);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const res = await api.get('/auth/profile');
        const profile = {
          ...res.data,
          id: res.data._id || res.data.id
        };
        setUser(profile);
      } catch (err) {
        console.error('Error refreshing profile data', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
