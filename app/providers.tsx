'use client';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { QueryProvider } from '@/components/query-provider';
import { DevBootRecovery } from '@/components/dev-boot-recovery';
import { SentryInit } from '@/components/monitoring/sentry-init';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="orion-theme-v5"
      >
        <SentryInit />
        <DevBootRecovery />
        {children}
        <Toaster
          position="bottom-right"
          gutter={12}
          toastOptions={{
            duration: 3500,
            className: 'orion-toast orion-toast--default',
            style: {
              borderRadius: '7px',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)',
              padding: '12px 16px',
            },
            success: {
              duration: 3800,
              className: 'orion-toast orion-toast--success',
              iconTheme: { primary: '#fff', secondary: '#27ae60' },
            },
            error: {
              duration: 4500,
              className: 'orion-toast orion-toast--error',
              iconTheme: { primary: '#fff', secondary: '#c62828' },
            },
            loading: {
              className: 'orion-toast orion-toast--loading',
            },
          }}
        />
        {process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL ? <SpeedInsights /> : null}
      </ThemeProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
