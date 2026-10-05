'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function Providers({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Grab the token from this specific tab's session
    setToken(sessionStorage.getItem('access_token'));
  }, []);

  // Generate a unique storage key for this specific tab's session using the end of the token.
  // This prevents `next-themes` from syncing themes across tabs that are logged into different accounts.
  const storageKey = token ? `theme-${token.slice(-15)}` : 'theme';

  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={true} storageKey={storageKey}>
      {children}
    </NextThemesProvider>
  );
}
