'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send, CheckCircle2, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Harap masukkan alamat email Anda.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const err = data.error || 'Gagal mengirim email reset password.';
        setErrorMessage(err);
        toast.error('Gagal', err);
        return;
      }

      setIsSent(true);
      if (data.previewUrl) {
        setPreviewUrl(data.previewUrl);
      }
      toast.success('Email Terkirim', 'Silakan periksa kotak masuk email Anda.');
    } catch (err: any) {
      const errText = err.message || 'Gagal terhubung ke server.';
      setErrorMessage(errText);
      toast.error('Koneksi Gagal', errText);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#F5F8FC]">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-xl p-6 sm:p-8 space-y-6 animate-scale-in">
        {/* Back Link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Login</span>
        </Link>

        {isSent ? (
          /* Sent State */
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Email Pemulihan Dikirim</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Tautan reset password telah dikirim ke <strong className="text-slate-800">{email}</strong>. Periksa inbox dan folder spam Anda.
              </p>
            </div>

            {/* Development helper link if SMTP is local/mock */}
            {previewUrl && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-left text-xs space-y-2">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Link Reset (Mode Development):
                </div>
                <p className="text-blue-700 text-[11px]">
                  Karena kredensial SMTP belum diset di .env, tautan reset langsung disediakan di bawah:
                </p>
                <a
                  href={previewUrl}
                  className="block font-mono text-[11px] text-blue-600 underline break-all hover:text-blue-800"
                >
                  {previewUrl}
                </a>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsSent(false);
                  setEmail('');
                }}
              >
                Kirim Ulang ke Email Lain
              </Button>
            </div>
          </div>
        ) : (
          /* Request Form */
          <>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100">
                <Mail className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Lupa Password?
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                Masukkan email yang terdaftar pada akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang password.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email Terdaftar"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
                loadingText="Mengirim Link..."
                icon={<Send className="w-4 h-4" />}
              >
                Kirim Tautan Reset
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
