'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    // Grab the token from this specific tab's session
    setToken(sessionStorage.getItem('access_token'));
  }, [pathname]);

  // Avoid hydration mismatch by waiting for mount
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  // Generate a unique storage key for this specific tab's session using the end of the token (since JWT headers are identical).
  // This prevents `next-themes` from syncing themes across tabs that are logged into different accounts!
  const storageKey = token ? `theme-${token.slice(-15)}` : 'theme';

  return (
    <NextThemesProvider key={storageKey} attribute="class" defaultTheme="light" enableSystem={false} storageKey={storageKey}>
      {children}
    </NextThemesProvider>
  );
}
