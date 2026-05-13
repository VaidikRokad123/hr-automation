import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import OfferLetterEditor from './modules/OfferLetter/OfferLetterEditor';
import ContractEditor from './modules/Contract/ContractEditor';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ContractAcceptancePage from './pages/ContractAcceptancePage';
import OfferLetterPage from './pages/OfferLetterPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ROLE_CEO, ROLE_HR } from './constants/roles';
import { useAuth } from './context/AuthContext';

function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading">Loading session...</div>;
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/accept-contract/:token" element={<ContractAcceptancePage />} />
            <Route path="/accept-contract/review" element={<ContractAcceptancePage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[ROLE_CEO, ROLE_HR]} />}>
              <Route path="/offer-letter" element={<OfferLetterPage />} />
              <Route path="/offer-letter-editor" element={<OfferLetterEditor />} />
              <Route path="/contract-editor" element={<ContractEditor />} />
            </Route>
            <Route path="*" element={<LoginPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
