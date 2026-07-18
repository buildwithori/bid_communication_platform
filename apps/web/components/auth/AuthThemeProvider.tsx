'use client';

import * as React from 'react';

type AuthTheme = 'light' | 'dark';

type AuthThemeContextValue = {
  toggleTheme: () => void;
};

const AUTH_THEME_STORAGE_KEY = 'bid-hub-theme';
const AuthThemeContext = React.createContext<AuthThemeContextValue | null>(null);

function applyTheme(theme: AuthTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

function resolveInitialTheme(): AuthTheme {
  const storedTheme = window.localStorage.getItem(AUTH_THEME_STORAGE_KEY);
  if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AuthThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<AuthTheme>(() =>
    typeof window === 'undefined' ? 'light' : resolveInitialTheme(),
  );
  const originalRootState = React.useRef<{ hadDarkClass: boolean; colorScheme: string } | null>(null);

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    originalRootState.current = {
      hadDarkClass: root.classList.contains('dark'),
      colorScheme: root.style.colorScheme,
    };

    return () => {
      const original = originalRootState.current;
      if (!original) return;

      root.classList.toggle('dark', original.hadDarkClass);
      root.style.colorScheme = original.colorScheme;
    };
  }, []);

  React.useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem(AUTH_THEME_STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  }, []);

  const value = React.useMemo(
    () => ({ toggleTheme }),
    [toggleTheme],
  );

  return <AuthThemeContext.Provider value={value}>{children}</AuthThemeContext.Provider>;
}

export function useAuthTheme() {
  const context = React.useContext(AuthThemeContext);
  if (!context) throw new Error('useAuthTheme must be used within AuthThemeProvider');
  return context;
}
