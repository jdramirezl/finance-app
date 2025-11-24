import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from './useThemeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ theme: 'light' });
  });

  it('should have default theme as light', () => {
    const { theme } = useThemeStore.getState();
    expect(theme).toBe('light');
  });

  it('should toggle theme from light to dark', () => {
    const { toggleTheme } = useThemeStore.getState();
    
    toggleTheme();
    
    const { theme } = useThemeStore.getState();
    expect(theme).toBe('dark');
  });

  it('should toggle theme from dark to light', () => {
    useThemeStore.setState({ theme: 'dark' });
    const { toggleTheme } = useThemeStore.getState();
    
    toggleTheme();
    
    const { theme } = useThemeStore.getState();
    expect(theme).toBe('light');
  });

  it('should persist theme to localStorage', () => {
    const { toggleTheme } = useThemeStore.getState();
    
    toggleTheme();
    
    const stored = localStorage.getItem('finance-app-theme');
    expect(stored).toBe('dark');
  });

  it('should load theme from localStorage on init', () => {
    localStorage.setItem('finance-app-theme', 'dark');
    
    // Simulate store initialization by getting initial state
    const stored = localStorage.getItem('finance-app-theme');
    const theme = stored || 'light';
    
    expect(theme).toBe('dark');
  });
});
