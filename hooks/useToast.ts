'use client';

import { useToastContext } from '@/components/providers/ToastProvider';

export function useToast() {
  const { toasts, showToast, dismissToast } = useToastContext();
  return { toasts, showToast, dismissToast };
}
