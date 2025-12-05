import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Wallet,
  Target,
  Calendar,
  TrendingUp,
  FileText,
  Settings,
  Moon,
  Sun,
  LogOut,
  DollarSign,
  Menu,
  Plus,
  X
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { signOut, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowQuickActions(false);
  }, [location.pathname]);

  const navItems = [
    { path: '/summary', label: 'Summary', icon: Home },
    { path: '/accounts', label: 'Accounts', icon: Wallet },
    { path: '/fixed-expenses', label: 'Fixed Expenses', icon: Target },
    { path: '/budget-planning', label: 'Budget', icon: Calendar },
    { path: '/movements', label: 'Movements', icon: TrendingUp },
    { path: '/templates', label: 'Templates', icon: FileText },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  // Items to show in the bottom navigation (limited to 5)
  const bottomNavItems = [
    { path: '/summary', label: 'Home', icon: Home },
    { path: '/movements', label: 'Movements', icon: TrendingUp },
    { path: '/accounts', label: 'Accounts', icon: Wallet },
    { path: '/budget-planning', label: 'Budget', icon: Calendar },
  ];

  const QuickActions = () => (
    <div className={`fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 transition-all duration-200 ${showQuickActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      <button
        onClick={() => navigate('/movements?action=new')}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <span className="font-medium text-sm">New Movement</span>
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
          <TrendingUp className="w-4 h-4" />
        </div>
      </button>
      <button
        onClick={() => navigate('/movements?action=transfer')}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <span className="font-medium text-sm">New Transfer</span>
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Wallet className="w-4 h-4" />
        </div>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors pb-20 md:pb-0">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
            <DollarSign className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-gray-100">Finance</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-gray-900/50 backdrop-blur-sm pt-16" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="bg-white dark:bg-gray-800 p-4 shadow-xl rounded-b-2xl" onClick={e => e.stopPropagation()}>
            <div className="space-y-1">
              {navItems.map((item) => {
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
                    <Icon className="w-5 h-5" />
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
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <nav className="hidden md:block fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 z-50">
        {/* Logo Section */}
        <div className="p-6 flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-white" strokeWidth={2.5} />
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
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation Items - Pill Style */}
        <ul className="mt-2 px-3 space-y-1">
          {navItems.map((item) => {
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
                  {/* Animated background for active state */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}

                  <Icon className={`w-5 h-5 relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'drop-shadow-sm' : ''}`} />
                  <span className={`relative z-10 font-medium ${isActive ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>

                  {/* Active indicator dot */}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-white relative z-10 animate-pulse" />
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
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 min-h-screen">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40 pb-safe">
        <div className="flex items-center justify-around p-2">
          {bottomNavItems.map((item) => {
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
                <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {/* Menu Toggle for extra items */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`
              flex flex-col items-center gap-1 p-2 rounded-lg text-gray-500 dark:text-gray-400
            `}
          >
            <Menu className="w-6 h-6" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </div>

      {/* Quick Actions FAB (Mobile) */}
      <div className="md:hidden">
        <QuickActions />
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className={`
            fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform duration-200
            ${showQuickActions
              ? 'bg-gray-800 dark:bg-gray-700 text-white rotate-45'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:scale-105'
            }
          `}
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};

export default Layout;
