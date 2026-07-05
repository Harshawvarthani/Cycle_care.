'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '../utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  isOnboarded: boolean;
  averageCycleLength: number;
  averagePeriodLength: number;
  goal: 'track' | 'avoid' | 'conceive';
  lastPeriodDate?: string;
  height?: number | null;
  settings?: {
    unitTemperature: 'C' | 'F';
    unitWeight: 'kg' | 'lbs';
    hygieneInterval: number;
    hygieneProduct: 'pad' | 'tampon' | 'cup' | 'none';
    notificationPreferences?: {
      periodAlert: boolean;
      fertileAlert: boolean;
      dailyLogAlert: boolean;
      hygieneAlert: boolean;
    };
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: any) => void;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = async () => {
    const token = localStorage.getItem('cyclecare_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/auth/me');
      setUser(data);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // Protect and redirect routes
  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/login', '/register', '/'];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user) {
      if (pathname === '/' || !isPublicPath) {
        router.push('/login');
      }
    } else {
      if (!user.isOnboarded && pathname !== '/onboarding') {
        router.push('/onboarding');
      } else if (user.isOnboarded && (pathname === '/login' || pathname === '/register' || pathname === '/' || pathname === '/onboarding')) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);



  const login = (token: string, userData: any) => {
    localStorage.setItem('cyclecare_token', token);
    setUser(userData);
    
    if (userData.isOnboarded) {
      router.push('/dashboard');
    } else {
      router.push('/onboarding');
    }
  };

  const logout = () => {
    localStorage.removeItem('cyclecare_token');
    setUser(null);
    router.push('/login');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
