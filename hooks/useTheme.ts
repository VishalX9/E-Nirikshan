'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
const THEME_STORAGE_KEY = 'ems_theme';

function getSystemTheme(): 'light' | 'dark' {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');

  // Load theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setTheme(stored);
    }
  }, []);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const effective = getEffectiveTheme(theme);
      root.classList.toggle('dark', effective === 'dark');
    };
    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  return { theme, setTheme: changeTheme, effectiveTheme: getEffectiveTheme(theme) };
}
