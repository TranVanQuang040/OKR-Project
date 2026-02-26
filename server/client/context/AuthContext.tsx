``
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Period } from '../types';
import { dataService } from '../services/dataService';
import { safeStorage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  createUser: (userData: any) => void;
  updateAvatar?: (id: string, avatar: string) => Promise<any>;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedPeriod: Period;
  setSelectedPeriod: (period: Period) => void;
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>({
    quarter: 'Q3',
    year: 2024
  });

  const refreshUsers = async () => {
    try {
      const users = await dataService.getUsers();
      setAllUsers(users as any);
      // if we have a session user, keep it in sync
      if (user) {
        const updated = (users as any).find((u: any) => u.id === user.id || u._id === user.id || u.email === user.email);
        if (updated) {
          safeStorage.setItem('okr_session_user', JSON.stringify(updated));
          setUser(updated);
        }
      }
    } catch (err: any) {
      // Re-throw auth errors so caller can handle session invalidation
      if (err?.status === 401 || err?.status === 403) {
        throw err;
      }
      // For network errors, try localStorage fallback
      try {
        const data = safeStorage.getItem('okr_pro_data_users');
        if (data) {
          const users = JSON.parse(data);
          setAllUsers(users);
        }
      } catch (e) {
        // ignore localStorage parse errors
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      const savedUser = safeStorage.getItem('okr_session_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          safeStorage.removeItem('okr_session_user');
        }
      }

      const savedPeriod = safeStorage.getItem('okr_selected_period');
      if (savedPeriod) {
        try {
          setSelectedPeriod(JSON.parse(savedPeriod));
        } catch (e) { /* ignore */ }
      }

      try {
        await refreshUsers();
      } catch (err: any) {
        // If 401, the token is expired/invalid - clear user session
        if (err?.status === 401) {
          setUser(null);
          safeStorage.removeItem('okr_session_user');
          safeStorage.removeItem('okr_auth_token');
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await res.json();
      if (!res.ok) return false;
      const { token, user: loggedInUser } = data;
      if (loggedInUser && typeof loggedInUser === 'object') loggedInUser.id = loggedInUser._id || loggedInUser.id;
      safeStorage.setItem('okr_auth_token', token);
      safeStorage.setItem('okr_session_user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return true;
    } catch (err) {
      // fallback to local users
      const users = await dataService.getUsers();
      const foundUser = users.find((u: any) => u.email === email && u.password === pass);
      if (foundUser) {
        const { password, ...userWithoutPass } = foundUser;
        setUser(userWithoutPass as User);
        safeStorage.setItem('okr_session_user', JSON.stringify(userWithoutPass));
        return true;
      }
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    safeStorage.removeItem('okr_session_user');
    safeStorage.removeItem('okr_auth_token');
  };

  const updateAvatar = async (id: string, avatar: string) => {
    try {
      const res = await dataService.updateAvatar(id, avatar);
      // if current user updated themselves, refresh session
      if (user && user.id === id) {
        safeStorage.setItem('okr_session_user', JSON.stringify(res));
        setUser(res);
      }
      refreshUsers();
      return res;
    } catch (err) {
      throw err;
    }
  };

  const createUser = async (userData: any) => {
    try {
      // If current user is ADMIN, create via /api/users so we don't switch session
      if (user?.role === 'ADMIN') {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${safeStorage.getItem('okr_auth_token')}` },
          body: JSON.stringify(userData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Create user failed');
        refreshUsers();
        return;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Register failed');
      const { token, user: registeredUser } = data;
      safeStorage.setItem('okr_auth_token', token);
      safeStorage.setItem('okr_session_user', JSON.stringify(registeredUser));
      setUser(registeredUser);
      refreshUsers();
    } catch (err) {
      // fallback: create local user
      const newUser = {
        ...userData,
        id: `u-${Date.now()}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name)}`
      };
      await dataService.saveUser(newUser);
      refreshUsers();
    }
  };

  return (
    <AuthContext.Provider value={{
      user, allUsers, login, logout, createUser, refreshUsers, updateAvatar,
      isAuthenticated: !!user, isLoading, selectedPeriod,
      setSelectedPeriod: (p) => {
        setSelectedPeriod(p);
        safeStorage.setItem('okr_selected_period', JSON.stringify(p));
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
