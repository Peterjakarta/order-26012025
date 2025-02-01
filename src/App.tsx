import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import OrderForm from './components/OrderForm';
import Management from './pages/Management';
import LoginForm from './components/auth/LoginForm';
import RequireAuth from './components/auth/RequireAuth';
import { StoreProvider } from './store/StoreContext';

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
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
          </Route>
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}