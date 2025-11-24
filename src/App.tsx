import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import SummaryPage from './pages/SummaryPage';
import AccountsPage from './pages/AccountsPage';
import FixedExpensesPage from './pages/FixedExpensesPage';
import BudgetPlanningPage from './pages/BudgetPlanningPage';
import MovementsPage from './pages/MovementsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
                  <Routes>
                    <Route path="/" element={<Navigate to="/summary" replace />} />
                    <Route path="/summary" element={<SummaryPage />} />
                    <Route path="/accounts" element={<AccountsPage />} />
                    <Route path="/fixed-expenses" element={<FixedExpensesPage />} />
                    <Route path="/budget-planning" element={<BudgetPlanningPage />} />
                    <Route path="/movements" element={<MovementsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <ToastContainer />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
