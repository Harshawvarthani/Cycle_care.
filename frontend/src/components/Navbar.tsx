'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Bell, User as UserIcon, Calendar, BarChart2, BookOpen, Clock, LogOut, CheckCircle, Heart } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface AlertItem {
  id: string;
  type: 'period' | 'fertility' | 'log' | 'hygiene';
  title: string;
  message: string;
  time: string;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = async () => {
    if (!user) return;
    try {
      const items: AlertItem[] = [];

      // 1. Check daily log status
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const log = await apiFetch(`/symptoms/date/${todayStr}`);
        if (!log) {
          items.push({
            id: 'log-reminder',
            type: 'log',
            title: 'Daily Check-in',
            message: 'How are you feeling today? Take a moment to log your symptoms and mood.',
            time: 'Morning'
          });
        }
      } catch (e) {
        console.warn('Failed to check today symptoms:', e);
      }

      // 2. Check cycle predictions
      try {
        const predictions = await apiFetch('/cycles/predictions');
        if (predictions && predictions.hasHistory) {
          if (predictions.daysUntilNextPeriod <= 3) {
            items.push({
              id: 'period-alert',
              type: 'period',
              title: 'Period Starting Soon',
              message: `Your next period is predicted to start in ${predictions.daysUntilNextPeriod} days. Be prepared!`,
              time: 'Now'
            });
          }
          if (predictions.currentPhase === 'Ovulation') {
            items.push({
              id: 'fertile-alert',
              type: 'fertility',
              title: 'Fertile Window Active',
              message: 'You are currently in your high-fertility window. Ovulation is predicted around now.',
              time: 'Today'
            });
          }
        }
      } catch (e) {
        console.warn('Failed to get predictions for alerts:', e);
      }

      // 3. Check hygiene status
      try {
        const hygiene = await apiFetch('/hygiene/status');
        if (hygiene && hygiene.needsChange && user.settings?.hygieneProduct !== 'none') {
          const product = user.settings?.hygieneProduct || 'product';
          items.push({
            id: 'hygiene-alert',
            type: 'hygiene',
            title: 'Hygiene Reminder',
            message: `It's time to change or refresh your ${product}. Care for your hygiene and comfort!`,
            time: hygiene.minutesSinceChange ? `${Math.round(hygiene.minutesSinceChange / 60)}h ago` : 'Now'
          });
        }
      } catch (e) {
        console.warn('Failed to check hygiene for alerts:', e);
      }

      setAlerts(items);
    } catch (err) {
      console.error('Error compiling notification alerts:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll alerts every 2 minutes
    const interval = setInterval(fetchAlerts, 120000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle click outside to close notification dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user || !user.isOnboarded) return null;

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border-soft bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-md">
              <Heart className="h-5 w-5 fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight text-text-dark bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              CycleCare
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            <Link
              href="/dashboard"
              className={`flex items-center space-x-1.5 px-1 py-2 text-sm font-medium transition-colors ${
                isActive('/dashboard') ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-primary'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Calendar</span>
            </Link>

            <Link
              href="/log"
              className={`flex items-center space-x-1.5 px-1 py-2 text-sm font-medium transition-colors ${
                isActive('/log') ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-primary'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Log Today</span>
            </Link>

            <Link
              href="/trends"
              className={`flex items-center space-x-1.5 px-1 py-2 text-sm font-medium transition-colors ${
                isActive('/trends') ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-primary'
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              <span>Trends</span>
            </Link>

            <Link
              href="/history"
              className={`flex items-center space-x-1.5 px-1 py-2 text-sm font-medium transition-colors ${
                isActive('/history') ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-primary'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              <span>History</span>
            </Link>

            <Link
              href="/education"
              className={`flex items-center space-x-1.5 px-1 py-2 text-sm font-medium transition-colors ${
                isActive('/education') ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-primary'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Learn</span>
            </Link>

            <Link
              href="/profile"
              className={`flex items-center space-x-1.5 px-1 py-2 text-sm font-medium transition-colors ${
                isActive('/profile') ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-primary'
              }`}
            >
              <UserIcon className="h-4 w-4" />
              <span>Profile</span>
            </Link>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-text-muted hover:text-primary rounded-full hover:bg-primary-light/35 transition-colors focus:outline-none"
              >
                <Bell className="h-6 w-6" />
                {alerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                    {alerts.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-xl ring-1 ring-border-soft overflow-hidden z-50 transition-all">
                  <div className="px-4 py-3 border-b border-border-soft bg-primary-light/20 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-text-dark flex items-center gap-1.5">
                      <Heart className="h-4 w-4 text-primary fill-current" />
                      Your Health Center
                    </h3>
                    <span className="text-xs text-primary font-semibold">
                      {alerts.length} active updates
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border-soft">
                    {alerts.length === 0 ? (
                      <div className="p-6 text-center text-sm text-text-muted">
                        All clear! You are fully cared for today.
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div key={alert.id} className="p-4 hover:bg-bg-base/50 transition-colors flex gap-3">
                          <div className="mt-0.5">
                            {alert.type === 'period' && (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                <Calendar className="h-4.5 w-4.5" />
                              </span>
                            )}
                            {alert.type === 'fertility' && (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                <Heart className="h-4.5 w-4.5" />
                              </span>
                            )}
                            {alert.type === 'log' && (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                                <Clock className="h-4.5 w-4.5" />
                              </span>
                            )}
                            {alert.type === 'hygiene' && (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                                <Clock className="h-4.5 w-4.5" />
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="text-xs font-bold text-text-dark truncate">{alert.title}</p>
                              <span className="text-[10px] text-text-muted whitespace-nowrap ml-2">{alert.time}</span>
                            </div>
                            <p className="text-xs text-text-muted mt-1 leading-relaxed">{alert.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 text-text-muted hover:text-primary rounded-full hover:bg-primary-light/35 transition-colors focus:outline-none hidden md:inline-flex"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Links */}
      <div className="flex md:hidden border-t border-border-soft bg-white w-full justify-around items-center py-2 fixed bottom-0 left-0 right-0 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Link href="/dashboard" className={`flex flex-col items-center py-1 text-[10px] font-medium ${isActive('/dashboard') ? 'text-primary' : 'text-text-muted'}`}>
          <Calendar className="h-5 w-5" />
          <span>Calendar</span>
        </Link>
        <Link href="/log" className={`flex flex-col items-center py-1 text-[10px] font-medium ${isActive('/log') ? 'text-primary' : 'text-text-muted'}`}>
          <Clock className="h-5 w-5" />
          <span>Log</span>
        </Link>
        <Link href="/trends" className={`flex flex-col items-center py-1 text-[10px] font-medium ${isActive('/trends') ? 'text-primary' : 'text-text-muted'}`}>
          <BarChart2 className="h-5 w-5" />
          <span>Trends</span>
        </Link>
        <Link href="/education" className={`flex flex-col items-center py-1 text-[10px] font-medium ${isActive('/education') ? 'text-primary' : 'text-text-muted'}`}>
          <BookOpen className="h-5 w-5" />
          <span>Learn</span>
        </Link>
        <Link href="/profile" className={`flex flex-col items-center py-1 text-[10px] font-medium ${isActive('/profile') ? 'text-primary' : 'text-text-muted'}`}>
          <UserIcon className="h-5 w-5" />
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
