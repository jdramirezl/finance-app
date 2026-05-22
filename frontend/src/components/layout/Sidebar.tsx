import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, LogOut, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeStore } from '../../store/useThemeStore';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: NavItem[];
}

const Sidebar = ({ items }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useThemeStore();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] hidden lg:flex flex-col bg-gray-800 border-r border-gray-700 z-50">
      <div className="flex flex-col h-full py-8">
        {/* Logo */}
        <div className="px-6 mb-10">
          <h1 className="text-blue-400 font-bold text-xl">Finance App</h1>
          <p className="text-xs text-gray-500 mt-1">Personal Finance</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-6 py-3 border-l-4 transition-colors duration-200 ${
                  isActive
                    ? 'border-blue-400 bg-blue-500/10 text-blue-400 font-bold'
                    : 'border-transparent text-gray-400 hover:text-gray-100 hover:bg-gray-700/50'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile + actions */}
        <div className="mt-auto px-6 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-700/50">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-gray-100 truncate">{user?.email ?? 'User'}</p>
              <p className="text-[11px] text-gray-400">Pro Account</p>
            </div>
          </div>
          <div className="flex justify-between text-gray-400">
            <button onClick={toggleTheme} className="hover:text-gray-100 transition-colors" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
            </button>
            <button className="hover:text-gray-100 transition-colors" aria-label="Help">
              <HelpCircle className="w-5 h-5" aria-hidden="true" />
            </button>
            <button onClick={handleSignOut} className="hover:text-red-400 transition-colors" aria-label="Sign out">
              <LogOut className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
