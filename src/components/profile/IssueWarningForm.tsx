'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

export function IssueWarningForm({ userId }: { userId: number }) {
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();
  const toast = useToast();

  const submitWarning = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.warning('Alasan wajib diisi', 'Masukkan alasan sebelum memberi peringatan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/warnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: trimmedReason }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error('Peringatan gagal disimpan', result.error || 'Silakan coba lagi.');
        return;
      }

      setReason('');
      toast.success('Peringatan tercatat', 'Jumlah peringatan pada profil telah diperbarui.');
      router.refresh();
    } catch {
      toast.error('Peringatan gagal disimpan', 'Periksa koneksi lalu coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submitWarning} className="space-y-3">
      <label htmlFor="warning-reason" className="block text-xs font-semibold text-slate-500">
        Alasan peringatan
      </label>
      <textarea
        id="warning-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={1000}
        required
        rows={3}
        placeholder="Jelaskan alasan peringatan..."
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">{reason.length}/1000</span>
        <button
          type="submit"
          disabled={isSubmitting || !reason.trim()}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Menyimpan...' : 'Beri Peringatan'}
        </button>
      </div>
    </form>
  );
}
