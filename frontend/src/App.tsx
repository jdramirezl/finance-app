import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { SelectionProvider } from './context/SelectionContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';
import { Skeleton } from './components/Skeleton';

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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SelectionProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />

              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/" element={<Navigate to="/summary" replace />} />
                          <Route path="/summary" element={<SummaryPage />} />
                          <Route path="/accounts" element={<AccountsPage />} />
                          <Route path="/fixed-expenses" element={<FixedExpensesPage />} />
                          <Route path="/budget-planning" element={<BudgetPlanningPage />} />
                          <Route path="/movements" element={<MovementsPage />} />
                          <Route path="/templates" element={<TemplatesPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                        </Routes>
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
            <ToastContainer />
          </Suspense>
        </SelectionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
