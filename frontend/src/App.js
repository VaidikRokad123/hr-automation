import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdvancedEditor from './modules/OfferLetter/AdvancedEditor';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
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
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[ROLE_CEO, ROLE_HR]} />}>
              <Route path="/advanced-editor" element={<AdvancedEditor />} />
            </Route>
            <Route path="*" element={<LoginPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
