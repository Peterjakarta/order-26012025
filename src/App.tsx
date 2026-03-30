import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import OrderForm from './components/OrderForm';
import Management from './pages/Management';
import Development from './pages/Development';
import HACCP from './pages/HACCP';
import LoginForm from './components/auth/LoginForm';
import RequireAuth from './components/auth/RequireAuth';
import { StoreProvider } from './store/StoreContext';
import { useAutoBackup } from './hooks/useAutoBackup';
import { Database } from 'lucide-react';

function AppContent() {
  const { isBackingUp, backupSuccess } = useAutoBackup();

  return (
    <>
      {(isBackingUp || backupSuccess) && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-center gap-3">
          <Database className={`w-5 h-5 ${isBackingUp ? 'text-blue-500 animate-pulse' : 'text-green-500'}`} />
          <span className="text-sm font-medium text-gray-700">
            {isBackingUp ? 'Creating daily backup...' : 'Backup completed'}
          </span>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <RequireAuth requiredPermissions={['create_orders']}>
                <OrderForm />
              </RequireAuth>
            }
          />
          <Route
            path="/management/*"
            element={
              <RequireAuth requiredPermissions={['manage_orders', 'manage_products']}>
                <Management />
              </RequireAuth>
            }
          />
          <Route
            path="/development/*"
            element={
              <RequireAuth requiredPermissions={['manage_products']}>
                <Development />
              </RequireAuth>
            }
          />
          <Route
            path="/haccp/*"
            element={
              <RequireAuth requiredPermissions={['manage_orders']}>
                <HACCP />
              </RequireAuth>
            }
          />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </BrowserRouter>
  );
}