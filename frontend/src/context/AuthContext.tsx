import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  telegramUsername?: string | null;
  telegramChatId?: string | null;
  notificationEmail?: string | null;
  telegramAlertsActive?: boolean;
  emailAlertsActive?: boolean;
  language?: string;
  showSentimentChart?: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (
    telegramUsername: string | null, 
    notificationEmail: string | null,
    telegramAlertsActive: boolean,
    emailAlertsActive: boolean,
    language?: string,
    showSentimentChart?: boolean
  ) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set up global axios authorization interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch /me profile on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get<User>('http://localhost:5001/api/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Failed to load user profile on mount:', error);
        logout(); // Clear invalid token
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post<{ token: string; user: User }>('http://localhost:5001/api/auth/login', {
        email,
        password,
      });
      const { token: receivedToken, user: receivedUser } = response.data;
      localStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      throw new Error(message);
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const response = await axios.post<{ token: string; user: User }>('http://localhost:5001/api/auth/register', {
        email,
        password,
      });
      const { token: receivedToken, user: receivedUser } = response.data;
      localStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (
    telegramUsername: string | null, 
    notificationEmail: string | null,
    telegramAlertsActive: boolean,
    emailAlertsActive: boolean,
    language?: string,
    showSentimentChart?: boolean
  ) => {
    try {
      const response = await axios.put<User>('http://localhost:5001/api/auth/profile', {
        telegramUsername,
        notificationEmail,
        telegramAlertsActive,
        emailAlertsActive,
        language,
        showSentimentChart,
      });
      setUser(response.data);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update profile settings';
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
