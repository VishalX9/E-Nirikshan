'use client';

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/components/providers/AuthProvider';

interface UseAuthOptions {
  requireAuth?: boolean;
  redirectTo?: string;
  redirectIfAuthenticated?: boolean;
  authenticatedRedirectTo?: string;
}

export function useAuth(options: UseAuthOptions = {}) {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const router = useRouter();
  const {
    requireAuth = false,
    redirectTo = '/login',
    redirectIfAuthenticated = false,
    authenticatedRedirectTo = '/dashboard',
  } = options;

  useEffect(() => {
    if (context.loading) {
      return;
    }

    if (requireAuth && !context.user) {
      router.replace(redirectTo);
    } else if (redirectIfAuthenticated && context.user) {
      router.replace(authenticatedRedirectTo);
    }
  }, [
    context.loading,
    context.user,
    requireAuth,
    redirectTo,
    redirectIfAuthenticated,
    authenticatedRedirectTo,
    router,
  ]);

  return context;
}
