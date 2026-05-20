import type { ReactNode } from 'react';
import {
  Calendar,
  FileText,
  Home,
  Settings,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';
import Sidebar from './layout/Sidebar';
import BottomNav from './layout/BottomNav';
import QuickActionsFAB from './layout/QuickActionsFAB';

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
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors pb-20 md:pb-0 overflow-x-hidden">
      <Sidebar items={NAV_ITEMS} />
      <BottomNav items={NAV_ITEMS} bottomItems={BOTTOM_NAV_ITEMS} />

      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 min-h-screen">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <QuickActionsFAB />
    </div>
  );
};

export default Layout;
