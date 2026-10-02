'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Clock,
  Calendar,
  CheckCircle2,
  Moon,
  Sun,
} from 'lucide-react';
import { AuthSession } from '@/types';
import { formatIndonesianDate, getJakartaTimeString } from '@/lib/utils/date';
import { useToast } from '../ui/Toast';
import { useTheme } from '@/components/theme/ThemeProvider';

export interface HeaderProps {
  user: AuthSession | null;
  onMenuClick: () => void;
  collapsed: boolean;
  showMenuButton?: boolean;
  showUserMenu?: boolean;
}

export function Header({ user, onMenuClick, collapsed, showMenuButton = true, showUserMenu = true }: HeaderProps) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { toggleTheme } = useTheme();

  // Update clock every second (WIB)
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(getJakartaTimeString(new Date()) + ' WIB');
      setCurrentDate(formatIndonesianDate(new Date()));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.info('Berhasil Logout', 'Sampai jumpa kembali!');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Gagal logout', 'Silakan coba lagi');
    }
  };

  // Compute breadcrumb title
  const getPageTitle = () => {
    if (pathname.startsWith('/admin/reports')) return 'Laporan Absensi';
    if (pathname.startsWith('/admin/users')) return 'Manajemen User';
    if (pathname.startsWith('/admin/settings')) return 'Pengaturan Sistem';
    if (pathname.startsWith('/admin/dashboard')) return 'Dashboard Admin';
    if (pathname.startsWith('/attendance/history')) return 'Riwayat Absensi';
    if (pathname.startsWith('/attendance')) return 'Form Absensi Hari Ini';
    if (pathname.startsWith('/dashboard')) return 'Dashboard Staff';
    return 'Daily Attendance';
  };

  return (
    <header className="sticky top-0 z-20 h-18 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between transition-all">
      {/* Left: Mobile Hamburger & Breadcrumb */}
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider hidden sm:block">
            Sistem Absensi
          </span>
          <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Clock & User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Live Jakarta Time Pill */}
        <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{currentDate || 'Memuat tanggal...'}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>{currentTime || '00:00:00 WIB'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Ganti mode terang atau gelap"
          title="Ganti mode terang atau gelap"
        >
          <Moon className="h-5 w-5 dark:hidden" />
          <Sun className="hidden h-5 w-5 dark:block" />
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Lihat notifikasi"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-scale-in">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">Notifikasi</span>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Terbaru
                </span>
              </div>
              <div className="p-2 space-y-1">
                <div className="p-3 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Sistem Absensi Aktif
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Waktu absensi hari ini telah dibuka di zona waktu Asia/Jakarta (WIB).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        {showUserMenu && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-200/60"
            >
              {user?.profile_photo ? (
                <img
                  src={user.profile_photo}
                  alt={`Foto profil ${user.username}`}
                  className="h-8 w-8 rounded-xl border border-slate-200 object-cover shadow-xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {user?.username || 'Pengguna'}
                </span>
                <span className="text-[10px] font-medium text-slate-500 capitalize">
                  {user?.role === 'ADMIN' ? 'Administrator' : user?.attendance_role || 'User'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-scale-in">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-800">{user?.username}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'Email tidak tersedia'}</p>
              </div>

              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Pengaturan Admin</span>
                </Link>
              )}

              {user && (
                <Link
                  href="/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profil / Biodata</span>
                </Link>
              )}

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Logout</span>
              </button>
            </div>
          )}
          </div>
        )}
      </div>
    </header>
  );
}
