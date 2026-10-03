'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  KeyRound,
  Database,
  Mail,
  Server,
  Save,
  CheckCircle2,
  Info,
  Clock,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { AuthSession } from '@/types';

export default function AdminSettingsPage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<AuthSession | null>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);

  // Profile edit states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCurrentUser(data.data);
      });

    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) {
        setSystemConfig(data.data.config);
        if (data.data.user) {
          setUsername(data.data.user.username || '');
          setEmail(data.data.user.email || '');
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload: any = { username, email };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
        payload.confirmNewPassword = confirmNewPassword;
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error('Gagal Menyimpan', data.error || 'Terjadi kesalahan.');
        return;
      }

      toast.success('Pengaturan Disimpan', 'Data akun administrator berhasil diperbarui.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      loadSettings();
    } catch (err: any) {
      toast.error('Gagal', err.message || 'Koneksi ke server gagal.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout user={currentUser}>
      <div className="space-y-8 max-w-4xl">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pengaturan Sistem & Akun Admin
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi akun administrator dan ringkasan variabel lingkungan sistem.
          </p>
        </div>

        {/* Admin Account Settings */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profil Akun Administrator</CardTitle>
              <CardDescription>
                Ubah informasi akun login atau perbarui kata sandi admin Anda.
              </CardDescription>
            </div>
            <Shield className="w-5 h-5 text-blue-600" />
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Username Admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />

                <Input
                  type="email"
                  label="Email Admin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Change Section */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    Ubah Password Administrator (Opsional)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kosongkan jika Anda tidak ingin mengubah password akun saat ini.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <PasswordInput
                    label="Password Saat Ini"
                    placeholder="Masukkan password lama"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />

                  <PasswordInput
                    label="Password Baru"
                    placeholder="Minimal 8 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />

                  <PasswordInput
                    label="Konfirmasi Baru"
                    placeholder="Ulangi password baru"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSaving}
                  loadingText="Menyimpan..."
                  icon={<Save className="w-4 h-4" />}
                >
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* System & Environment Configuration Overview */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ringkasan Lingkungan (.env)</CardTitle>
              <CardDescription>
                Parameter konfigurasi aplikasi yang aktif saat ini.
              </CardDescription>
            </div>
            <Server className="w-5 h-5 text-indigo-600" />
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <Database className="w-4 h-4 text-blue-600" /> Database MySQL
                </div>
                <div className="text-slate-500">
                  Host: <span className="font-mono text-slate-800 font-semibold">{systemConfig?.database?.host}:{systemConfig?.database?.port}</span>
                </div>
                <div className="text-slate-500">
                  Database: <span className="font-mono text-slate-800 font-semibold">{systemConfig?.database?.name}</span>
                </div>
                <div className="text-slate-500">
                  User: <span className="font-mono text-slate-800 font-semibold">{systemConfig?.database?.user}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <Clock className="w-4 h-4 text-emerald-600" /> Zona Waktu & Aplikasi
                </div>
                <div className="text-slate-500">
                  Timezone: <span className="font-bold text-slate-800">{systemConfig?.timezone}</span>
                </div>
                <div className="text-slate-500">
                  Nama Aplikasi: <span className="font-bold text-slate-800">{systemConfig?.appName}</span>
                </div>
                <div className="text-slate-500">
                  URL: <span className="font-mono text-slate-800 font-semibold">{systemConfig?.appUrl}</span>
                </div>
              </div>
            </div>

            {/* Explanatory note */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs text-blue-900 leading-relaxed">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Pengaturan environment:</strong> Untuk deployment Vercel, atur kredensial MySQL, SMTP Nodemailer, dan JWT Secret di <code>Project Settings → Environment Variables</code>. Saat development lokal, atur variabel tersebut di file <code>.env</code>.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
