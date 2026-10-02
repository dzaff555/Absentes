'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  animation?: 'scale' | 'none';
  scrollable?: boolean;
  portal?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  animation = 'scale',
  scrollable = false,
  portal = false,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative z-10 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl',
          animation === 'scale' && 'transform animate-scale-in',
          scrollable && 'flex max-h-[calc(100dvh-2rem)] flex-col',
          maxWidths[maxWidth]
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex shrink-0 items-start justify-between border-b border-slate-100 p-5 sm:p-6">
            <div>
              {title && <h3 className="text-lg font-bold text-slate-800">{title}</h3>}
              {description && (
                <p className="text-xs sm:text-sm text-slate-500 mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 -mr-1.5 -mt-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={clsx('p-5 sm:p-6', scrollable && 'min-h-0 overflow-y-auto')}>
          {children}
        </div>
      </div>
    </div>
  );

  return portal && typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
