import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import InstallationManagement from './pages/admin/InstallationManagement';
import AssessmentManagement from './pages/admin/AssessmentManagement';
import QuestionnaireManagement from './pages/admin/QuestionnaireManagement';
import QuestionnaireBuilder from './pages/admin/QuestionnaireBuilder';
import Evaluation from './pages/Evaluation';
import EvaluationReport from './pages/EvaluationReport';

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-charcoal">A carregar...</div>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" /> : <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <ResetPassword />
              }
            />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Evaluation Route */}
            <Route
              path="/evaluate"
              element={
                <ProtectedRoute>
                  <Evaluation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluation-report/:evaluationId"
              element={
                <ProtectedRoute>
                  <EvaluationReport />
                </ProtectedRoute>
              }
            />
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/installations"
              element={
                <ProtectedRoute requireAdmin>
                  <InstallationManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/assessments"
              element={
                <ProtectedRoute requireAdmin>
                  <AssessmentManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/questionnaires"
              element={
                <ProtectedRoute requireAdmin>
                  <QuestionnaireManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/questionnaires/:id/edit"
              element={
                <ProtectedRoute requireAdmin>
                  <QuestionnaireBuilder />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            
            {/* 404 Route */}
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-cream flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-charcoal mb-4">404</h1>
                    <p className="text-charcoal">Página não encontrada</p>
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
