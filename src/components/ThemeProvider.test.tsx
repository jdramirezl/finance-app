import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '../test/testUtils';
import ThemeProvider from './ThemeProvider';
import { useThemeStore } from '../store/useThemeStore';

describe('ThemeProvider', () => {
    beforeEach(() => {
        document.documentElement.classList.remove('dark');
    });

    it('should render children', () => {
        render(
            <ThemeProvider>
                <div>Test Content</div>
            </ThemeProvider>
        );

        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should add dark class when theme is dark', () => {
        useThemeStore.setState({ theme: 'dark' });

        render(
            <ThemeProvider>
                <div>Content</div>
            </ThemeProvider>
        );

        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when theme is light', () => {
        document.documentElement.classList.add('dark');
        useThemeStore.setState({ theme: 'light' });

        render(
            <ThemeProvider>
                <div>Content</div>
            </ThemeProvider>
        );

        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should update class when theme changes', () => {
        useThemeStore.setState({ theme: 'light' });

        const { rerender } = render(
            <ThemeProvider>
                <div>Content</div>
            </ThemeProvider>
        );

        expect(document.documentElement.classList.contains('dark')).toBe(false);

        useThemeStore.setState({ theme: 'dark' });
        rerender(
            <ThemeProvider>
                <div>Content</div>
            </ThemeProvider>
        );

        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
});
