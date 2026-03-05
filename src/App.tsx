/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Transactions from './pages/Transactions';
import Production from './pages/Production';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Stock from './pages/Stock';
import PurchasingManagement from './pages/PurchasingManagement';
import SalesManagement from './pages/SalesManagement';
import Settings from './pages/Settings';
import DocumentPreview from './pages/DocumentPreview';
import Finance from './pages/Finance';
import { AuthProvider, useAuth, UserRole } from './lib/auth';

import Login from './pages/Login';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, hasPermission } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasPermission(allowedRoles)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/document" element={<DocumentPreview />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="stock" element={
              <ProtectedRoute allowedRoles={['Warehouse Staff']}>
                <Stock />
              </ProtectedRoute>
            } />
            <Route path="production" element={
              <ProtectedRoute allowedRoles={['Production Manager']}>
                <Production />
              </ProtectedRoute>
            } />
            <Route path="purchasing" element={
              <ProtectedRoute allowedRoles={['Purchasing Officer', 'Finance Staff']}>
                <PurchasingManagement />
              </ProtectedRoute>
            } />
            <Route path="sales" element={
              <ProtectedRoute allowedRoles={['Sales Officer', 'Finance Staff']}>
                <SalesManagement />
              </ProtectedRoute>
            } />
            <Route path="inventory" element={
              <ProtectedRoute allowedRoles={['Warehouse Staff', 'Production Manager', 'Purchasing Officer']}>
                <Inventory />
              </ProtectedRoute>
            } />
            <Route path="suppliers" element={
              <ProtectedRoute allowedRoles={['Purchasing Officer']}>
                <Suppliers />
              </ProtectedRoute>
            } />
            <Route path="customers" element={
              <ProtectedRoute allowedRoles={['Sales Officer']}>
                <Customers />
              </ProtectedRoute>
            } />
            <Route path="finance" element={
              <ProtectedRoute allowedRoles={['Finance Staff']}>
                <Finance />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

