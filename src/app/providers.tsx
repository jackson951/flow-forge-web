import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/feedback/toaster';
import { clearCacheOnSessionEnd } from '@/features/auth/session/bind-cache';
import { queryClient } from './query-client';

clearCacheOnSessionEnd(queryClient);

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
