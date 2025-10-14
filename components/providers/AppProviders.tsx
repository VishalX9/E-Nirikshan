'use client';

import { PropsWithChildren } from 'react';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from './ToastProvider';

export default function AppProviders({ children }: PropsWithChildren) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
