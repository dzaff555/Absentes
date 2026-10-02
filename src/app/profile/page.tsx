'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle2, ShieldCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProfileForm, ProfileFormValues } from '@/components/profile/ProfileForm';
import { AuthSession } from '@/types';
import { useToast } from '@/components/ui/Toast';

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.success) {
          router.replace('/login');
          return;
        }
        setUser(data.data);
      } catch {
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  const handleSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error('Gagal Menyimpan', data.error || 'Tidak dapat memperbarui biodata.');
        return;
      }

      toast.success('Biodata Diperbarui', 'Perubahan profil berhasil disimpan.');
      if (user?.role === 'ADMIN') {
        router.refresh();
      } else {
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan profil.';
      toast.error('Gagal', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout user={user}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="mt-4 text-sm text-slate-500">Memuat profil Anda...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="mx-auto max-w-4xl space-y-6 py-2">
        <div className="rounded-3xl bg-gradient-to-r from-slate-800 via-slate-900 to-blue-900 p-6 text-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <UserCircle2 className="h-6 w-6 text-blue-200" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Profil</p>
              <h1 className="text-2xl font-extrabold tracking-tight">Biodata Pengguna</h1>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-800">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-xs font-medium sm:text-sm">
              {user?.role === 'ADMIN'
                ? 'Di halaman ini Anda hanya dapat mengubah foto profil akun administrator.'
                : 'Hanya foto profil, username Roblox, dan username Discord yang dapat diubah. Role tetap otomatis dan tidak dapat diedit.'}
            </p>
          </div>

          <ProfileForm
            initialValues={{
              profile_photo: user?.profile_photo || '',
              attendance_role: user?.attendance_role || 'CSOT',
              roblox_username: user?.roblox_username || '',
              discord_username: user?.discord_username || '',
            }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Simpan Perubahan"
            showRole={user?.role !== 'ADMIN'}
            photoOnly={user?.role === 'ADMIN'}
          />
        </div>
      </div>
    </AppLayout>
  );
}
