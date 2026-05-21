import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DollarSign, LogOut, Menu, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface BottomNavProps {
  items: NavItem[];
  bottomItems: NavItem[];
}

const BottomNav = ({ items, bottomItems }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface-container-low/95 backdrop-blur-xl border-b border-white/[0.06] z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-on-primary" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span className="font-bold text-lg text-primary font-display">Finance</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 transition-colors"
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm pt-16"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-surface-container-low/95 backdrop-blur-xl p-4 border-b border-white/[0.06] rounded-b-2xl"
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
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              <div className="pt-4 mt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-on-surface-variant">{user?.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container-low/90 backdrop-blur-xl border-t border-white/[0.06] z-40 pb-safe">
        <div className="flex items-center justify-around p-2">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg transition-colors
                  ${isActive ? 'text-primary' : 'text-on-surface-variant'}
                `}
              >
                <Icon className="w-6 h-6" aria-hidden="true" />
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg text-on-surface-variant"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" aria-hidden="true" />
            <span className="text-[11px] font-medium">Menu</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default BottomNav;
