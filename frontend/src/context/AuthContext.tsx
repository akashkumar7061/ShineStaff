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
  login: (token: string, refreshToken: string, profile: UserProfile) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

const setCookie = (name: string, value: string, days: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax; Secure";
};

const eraseCookie = (name: string) => {
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
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
    const initializeAuth = async () => {
      let currentToken = localStorage.getItem('token') || getCookie('token');
      const savedRefreshToken = localStorage.getItem('refreshToken');

      if (!currentToken) {
        try {
          console.log('Access token missing on startup. Attempting silent token refresh...');
          const res = await api.post('/auth/refresh', { refreshToken: savedRefreshToken || '' });
          currentToken = res.data.token;
          localStorage.setItem('token', currentToken || '');
        } catch (err) {
          console.log('No active session found or silent refresh failed during startup.');
        }
      }

      if (currentToken) {
        setToken(currentToken);
        try {
          const res = await api.get('/auth/profile');
          const profile = {
            ...res.data,
            id: res.data._id || res.data.id
          };
          setUser(profile);
        } catch (err: any) {
          console.error('Failed to load profile during init:', err);
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            logout();
          } else {
            // Transient error: retry in 5s
            setTimeout(fetchProfile, 5000);
            return; // don't set loading to false yet
          }
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, newRefreshToken: string, profile: UserProfile) => {
    setToken(newToken);
    setUser(profile);
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    setCookie('token', newToken, 365); // Save cookie backup for 365 days
    setCookie('refreshToken', newRefreshToken, 365); // Save cookie backup for 365 days
  };

  const logout = () => {
    const savedRefreshToken = localStorage.getItem('refreshToken') || getCookie('refreshToken');
    api.post('/auth/logout', { refreshToken: savedRefreshToken || '' }).catch((err) => {
      console.error('Failed to revoke refresh token on server:', err);
    });

    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    eraseCookie('token');
    eraseCookie('refreshToken');
  };

  const refreshUser = async () => {
    const activeToken = token || localStorage.getItem('token') || getCookie('token');
    if (activeToken) {
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
