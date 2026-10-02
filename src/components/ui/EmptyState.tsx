import React from 'react';
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = 'Belum ada data',
  description = 'Data absensi yang Anda cari tidak ditemukan atau belum tercatat.',
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-xs">
        {icon || <Inbox className="w-7 h-7" />}
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Terjadi Kesalahan',
  description = 'Gagal mengambil data dari server. Silakan periksa koneksi atau coba lagi nanti.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-rose-50/50 rounded-2xl border border-rose-200/80">
      <div className="w-14 h-14 rounded-2xl bg-rose-100/80 flex items-center justify-center text-rose-600 mb-4">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-600 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="w-4 h-4" />}
          className="border-rose-200 text-rose-700 hover:bg-rose-100/50"
        >
          Coba Lagi
        </Button>
      )}
    </div>
  );
}
