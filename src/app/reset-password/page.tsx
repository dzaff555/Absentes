'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-100">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Token Tidak Ditemukan</h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Tautan reset password ini tidak valid karena tidak memuat parameter token yang sah.
        </p>
        <Link href="/forgot-password">
          <Button variant="outline" size="sm" className="mt-2">
            Minta Tautan Baru
          </Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password || !confirmPassword) {
      setErrorMessage('Harap lengkapi kedua kolom password.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password baru minimal 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password baru dan konfirmasi tidak sesuai.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const err = data.error || 'Gagal mengubah password.';
        setErrorMessage(err);
        toast.error('Gagal', err);
        return;
      }

      setIsSuccess(true);
      toast.success('Password Berhasil Diubah!', 'Silakan login kembali.');

      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      const errText = err.message || 'Gagal terhubung ke server.';
      setErrorMessage(errText);
      toast.error('Koneksi Gagal', errText);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-4 py-4 animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Password Berhasil Diubah</h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Akun Anda telah diperbarui dengan kata sandi baru. Mengalihkan Anda ke halaman login...
        </p>
        <div className="pt-2">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Masuk ke Akun Sekarang
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Buat Password Baru
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
          Silakan masukkan kata sandi baru yang kuat untuk akun Daily Attendance Anda.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput
          label="Password Baru"
          placeholder="Minimal 8 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />

        <PasswordInput
          label="Konfirmasi Password Baru"
          placeholder="Ulangi password baru"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={isLoading}
          loadingText="Menyimpan Password..."
          icon={<ArrowRight className="w-4 h-4" />}
        >
          Reset Password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#F5F8FC]">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6">
        <Suspense
          fallback={
            <div className="text-center py-8 text-slate-400 text-sm">
              Memuat formulir reset password...
            </div>
          }
        >
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
