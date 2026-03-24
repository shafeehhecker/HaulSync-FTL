import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IndentingList from './pages/Indenting/IndentingList';
import RFQList from './pages/RFQ/RFQList';
import TrackingPage from './pages/Tracking/TrackingPage';
import ExceptionsPage from './pages/Exceptions/ExceptionsPage';
import PODPage from './pages/POD/PODPage';
import BillingPage from './pages/Billing/BillingPage';
import SettlementPage from './pages/Settlement/SettlementPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="indenting"  element={<IndentingList />} />
        <Route path="rfq"        element={<RFQList />} />
        <Route path="tracking"   element={<TrackingPage />} />
        <Route path="exceptions" element={<ExceptionsPage />} />
        <Route path="pod"        element={<PODPage />} />
        <Route path="billing"    element={<BillingPage />} />
        <Route path="settlement" element={<SettlementPage />} />
        <Route path="analytics"  element={<AnalyticsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
