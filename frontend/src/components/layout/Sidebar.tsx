import { Link, useLocation } from 'react-router-dom';
import { HelpCircle, Moon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
  const { user } = useAuth();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] hidden lg:flex flex-col bg-surface-container/80 backdrop-blur-xl border-r border-white/10 z-50">
      <div className="flex flex-col h-full py-8">
        {/* Logo */}
        <div className="px-6 mb-10">
          <h1 className="font-bold bg-gradient-to-r from-primary-container to-primary bg-clip-text text-transparent text-2xl">
            Finance App
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold mt-1">
            Personal Finance
          </p>
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
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-transparent text-on-surface-variant hover:text-primary hover:bg-white/5'
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
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{user?.email ?? 'User'}</p>
              <p className="text-[11px] text-on-surface-variant">Pro Account</p>
            </div>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <button className="hover:text-primary transition-colors" aria-label="Toggle theme">
              <Moon className="w-5 h-5" aria-hidden="true" />
            </button>
            <button className="hover:text-primary transition-colors" aria-label="Help">
              <HelpCircle className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
