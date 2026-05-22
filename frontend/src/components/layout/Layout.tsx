import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  FileText,
  Home,
  Settings,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ErrorBoundary from '../feedback/ErrorBoundary';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import QuickActionsFAB from './QuickActionsFAB';
import QuickAddMovement from '../movements/QuickAddMovement';
import { useGlobalKeyboardShortcuts } from '../../hooks/useGlobalKeyboardShortcuts';
import type { ShortcutDef } from '../../hooks/useGlobalKeyboardShortcuts';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

// Full navigation list — used by the desktop sidebar and the mobile drawer.
const NAV_ITEMS: NavItem[] = [
  { path: '/summary', label: 'Summary', icon: Home },
  { path: '/accounts', label: 'Accounts', icon: Wallet },
  { path: '/fixed-expenses', label: 'Fixed Expenses', icon: Target },
  { path: '/budget-planning', label: 'Budget', icon: Calendar },
  { path: '/movements', label: 'Movements', icon: TrendingUp },
  { path: '/templates', label: 'Templates', icon: FileText },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

// Subset shown in the mobile bottom bar. The remaining items are reachable
// via the Menu button rendered alongside these inside `BottomNav`.
const BOTTOM_NAV_ITEMS: NavItem[] = [
  { path: '/summary', label: 'Home', icon: Home },
  { path: '/movements', label: 'Movements', icon: TrendingUp },
  { path: '/accounts', label: 'Accounts', icon: Wallet },
  { path: '/budget-planning', label: 'Budget', icon: Calendar },
];

interface LayoutProps {
  children: ReactNode;
}

/**
 * App shell. Acts purely as a composition root: it owns the navigation
 * data and arranges the desktop sidebar, mobile chrome (header, drawer,
 * bottom bar), the quick-actions FAB, and the page content. All
 * interactive state lives inside the child components.
 */
const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const toggleQuickAdd = useCallback(() => setShowQuickAdd((v) => !v), []);

  const shortcuts: ShortcutDef[] = useMemo(
    () => [{ key: 'm', ctrl: true, shift: true, handler: toggleQuickAdd }],
    [toggleQuickAdd]
  );
  useGlobalKeyboardShortcuts(shortcuts);

  const handleClose = useCallback(() => setShowQuickAdd(false), []);

  const handleExpandToFull = useCallback(
    (prefill: { amount?: number; notes?: string; type?: string }) => {
      const params = new URLSearchParams();
      if (prefill.amount) params.set('amount', String(prefill.amount));
      if (prefill.notes) params.set('notes', prefill.notes);
      if (prefill.type) params.set('type', prefill.type);
      setShowQuickAdd(false);
      navigate(`/movements?action=new&${params.toString()}`);
    },
    [navigate]
  );

  return (
    <div className="min-h-screen bg-gray-900 pb-20 md:pb-0 overflow-x-hidden">
      <Sidebar items={NAV_ITEMS} />
      <BottomNav items={NAV_ITEMS} bottomItems={BOTTOM_NAV_ITEMS} />

      <main className="lg:ml-[260px] p-4 md:p-8 pt-20 lg:pt-8 min-h-screen">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <QuickActionsFAB />

      {showQuickAdd && (
        <QuickAddMovement
          variant="modal"
          onClose={handleClose}
          onSuccess={handleClose}
          onExpandToFull={handleExpandToFull}
        />
      )}
    </div>
  );
};

export default Layout;
