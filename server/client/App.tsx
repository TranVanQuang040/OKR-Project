
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { OKRs } from './pages/OKRs';
import { Teams } from './pages/Teams';
import { Users } from './pages/Users';
import { Tasks } from './pages/Tasks';
import { Reports } from './pages/Reports';
import { Login } from './pages/Login';
import { MyOKRs } from './pages/MyOKRs';
import { DepartmentKPIs } from './pages/DepartmentKPIs';
import { PersonalKPIs } from './pages/PersonalKPIs';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/okrs" element={
            <ProtectedRoute>
              <Layout><OKRs /></Layout>
            </ProtectedRoute>
          } />

           <Route path="/myOkrs" element={
            <ProtectedRoute>
              <Layout><MyOKRs /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute>
              <Layout><Users /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teams" element={
            <ProtectedRoute>
              <Layout><Teams /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/tasks" element={
            <ProtectedRoute>
              <Layout><Tasks /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Layout><Reports /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/kpis/department" element={
            <ProtectedRoute>
              <Layout><DepartmentKPIs /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/kpis/personal" element={
            <ProtectedRoute>
              <Layout><PersonalKPIs /></Layout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
