import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DollarSign, LogOut } from 'lucide-react';
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
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="hidden md:flex fixed left-0 top-0 h-full w-60 bg-surface-container-low/90 backdrop-blur-xl border-r border-white/[0.06] z-50 flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-on-primary" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-primary font-display">Finance App</h1>
      </div>

      {/* Navigation */}
      <ul className="flex-1 mt-2 px-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`
                  relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200
                  ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                  }
                `}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-on-surface-variant truncate flex-1 min-w-0">
            {user?.email}
          </p>
          <button
            onClick={handleSignOut}
            className="ml-2 p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
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
