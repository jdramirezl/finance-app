import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DollarSign, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface BottomNavProps {
  /** Full navigation list rendered inside the drawer overlay. */
  items: NavItem[];
  /** Subset of items rendered as shortcuts in the bottom bar. */
  bottomItems: NavItem[];
}

/**
 * Mobile-only navigation chrome (hidden on md+). Renders three pieces
 * that share a single drawer-open state:
 *
 *  1. A fixed top header with logo, theme toggle, and a hamburger button.
 *  2. A slide-down drawer overlay listing the full navigation plus a
 *     sign-out control.
 *  3. A fixed bottom bar with shortcut links and a Menu button that also
 *     opens the drawer.
 *
 * The drawer auto-closes on route change so navigating from inside it
 * doesn't leave it covering the new page.
 */
const BottomNav = ({ items, bottomItems }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { signOut, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close drawer on route change.
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const themeToggleLabel =
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <DollarSign className="w-5 h-5 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-gray-100">Finance</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Moon className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay (drawer) */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-gray-900/50 backdrop-blur-sm pt-16"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 p-4 shadow-xl rounded-b-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                      ${isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40 pb-safe">
        <div className="flex items-center justify-around p-2">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-lg transition-colors
                  ${isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} aria-hidden="true" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {/* Menu Toggle for items not shown in the bottom bar */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-gray-500 dark:text-gray-400"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" aria-hidden="true" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default BottomNav;
