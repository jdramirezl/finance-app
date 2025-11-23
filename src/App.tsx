import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SummaryPage from './pages/SummaryPage';
import AccountsPage from './pages/AccountsPage';
import FixedExpensesPage from './pages/FixedExpensesPage';
import BudgetPlanningPage from './pages/BudgetPlanningPage';
import MovementsPage from './pages/MovementsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
