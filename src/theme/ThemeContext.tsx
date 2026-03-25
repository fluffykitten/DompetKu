// ============================================================
// DompetKu - Theme Context
// ============================================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Colors, ColorScheme } from './colors';
import { ThemeMode } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ColorScheme;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  colors: Colors.light,
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = '@dompetku_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  // Load saved theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
      if (saved === 'dark' || saved === 'light') setMode(saved);
    }).catch(() => {});
  }, []);

  const colors = mode === 'light' ? Colors.light : Colors.dark;

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
