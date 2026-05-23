import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DollarSign, Moon, Sun, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: NavItem[];
}

/**
 * Fixed left sidebar shown on md+ screens. Hosts the app logo, theme
 * toggle, navigation links, and a footer with the signed-in user's
 * email and a sign-out button.
 *
 * Hidden below md — the mobile equivalents live in `BottomNav`.
 */
const Sidebar = ({ items }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { signOut, user } = useAuth();

  const themeToggleLabel =
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="hidden md:block fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 z-50">
      {/* Logo Section */}
      <div className="p-6 flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <DollarSign className="w-6 h-6 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
            Finance App
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Manage your money</p>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all hover:scale-110"
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Moon className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Navigation Items - Pill Style */}
      <ul className="mt-2 px-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-500 to-slate-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:scale-[1.01]'
                  }
                `}
              >
                {/* Animated background for active state (decorative) */}
                {isActive && (
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-blue-400 to-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  />
                )}

                <Icon
                  className={`w-5 h-5 relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'drop-shadow-sm' : ''}`}
                  aria-hidden="true"
                />
                <span className={`relative z-10 font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <div
                    className="ml-auto w-2 h-2 rounded-full bg-white relative z-10 animate-pulse"
                    aria-hidden="true"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* User info and sign out */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="ml-2 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-all hover:scale-110"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
