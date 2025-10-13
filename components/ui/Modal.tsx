'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

function ModalContent({ open, onClose, title, description, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-[1001] w-full max-w-2xl rounded-3xl border border-slate-200/50 bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-blue-600 rounded-t-3xl" />

        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
              {description && <p className="mt-2 text-sm font-medium text-slate-600">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition-all hover:bg-gray-50 hover:text-slate-900 hover:shadow-md active:scale-95"
              aria-label="Close dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-6 max-h-[60vh] overflow-y-auto pr-2 text-sm font-medium text-slate-700 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            {children}
          </div>
          {footer && <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-6">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function Modal(props: ModalProps) {
  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(<ModalContent {...props} />, document.body);
}
