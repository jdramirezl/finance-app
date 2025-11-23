import { create } from 'zustand';
import { StorageService } from '../services/storageService';

type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Load theme from storage
const loadTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('finance-app-theme');
    return (saved as Theme) || 'light';
  } catch {
    return 'light';
  }
};

// Save theme to storage
const saveTheme = (theme: Theme) => {
  try {
    localStorage.setItem('finance-app-theme', theme);
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
};

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: loadTheme(),
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      saveTheme(newTheme);
      return { theme: newTheme };
    }),
  setTheme: (theme: Theme) => {
    saveTheme(theme);
    set({ theme });
  },
}));

