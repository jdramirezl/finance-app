import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SelectionProvider } from './contexts/SelectionContext';
import { ConfirmDialogProvider } from './contexts/ConfirmDialogContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';
import { Skeleton } from './components/Skeleton';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load page components for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const SummaryPage = lazy(() => import('./pages/SummaryPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const FixedExpensesPage = lazy(() => import('./pages/FixedExpensesPage'));
const BudgetPlanningPage = lazy(() => import('./pages/BudgetPlanningPage'));
const MovementsPage = lazy(() => import('./pages/MovementsPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Loading fallback component
const PageLoader = () => (
  <div className="space-y-6 p-6">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
  </div>
);

/**
 * Wrap each route's element in an ErrorBoundary so a render crash on
 * one page produces a recoverable fallback instead of a white screen,
 * and the user can still navigate via the surrounding Layout.
 */
const guard = (node: ReactNode) => <ErrorBoundary>{node}</ErrorBoundary>;

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SelectionProvider>
          <ConfirmDialogProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={guard(<LoginPage />)} />
                <Route path="/signup" element={guard(<SignUpPage />)} />

                {/* Protected routes */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route
                              path="/"
                              element={<Navigate to="/summary" replace />}
                            />
                            <Route
                              path="/summary"
                              element={guard(<SummaryPage />)}
                            />
                            <Route
                              path="/accounts"
                              element={guard(<AccountsPage />)}
                            />
                            <Route
                              path="/fixed-expenses"
                              element={guard(<FixedExpensesPage />)}
                            />
                            <Route
                              path="/budget-planning"
                              element={guard(<BudgetPlanningPage />)}
                            />
                            <Route
                              path="/movements"
                              element={guard(<MovementsPage />)}
                            />
                            <Route
                              path="/templates"
                              element={guard(<TemplatesPage />)}
                            />
                            <Route
                              path="/settings"
                              element={guard(<SettingsPage />)}
                            />
                          </Routes>
                        </Suspense>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
              <ToastContainer />
            </Suspense>
          </ConfirmDialogProvider>
        </SelectionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
