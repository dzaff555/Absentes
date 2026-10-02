'use client';

import React, { createContext, useContext } from 'react';

interface ThemeContextValue {
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  toggleTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const toggleTheme = () => {
    const nextTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem('daily-attendance-theme', nextTheme);
  };

  return <ThemeContext.Provider value={{ toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}