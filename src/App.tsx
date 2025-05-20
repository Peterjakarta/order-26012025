import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import OrderForm from './components/OrderForm';
import Management from './pages/Management';
import Development from './pages/Development';
import LoginForm from './components/auth/LoginForm';
import RequireAuth from './components/auth/RequireAuth';
import { StoreProvider } from './store/StoreContext';
import { initializeRDData } from './services/rdDataService';

export default function App() {
  // Initialize R&D data when the app starts
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeRDData();
        console.log('R&D data initialized in App component');
      } catch (error) {
        console.error('Failed to initialize R&D data in App component:', error);
        // Continue app initialization even if R&D data fails
        // Individual components will handle the fallback
      }
    };
    
    initialize();
  }, []);

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
            <Route 
              path="/development/*" 
              element={
                <RequireAuth requiredPermissions={['manage_products']}>
                  <Development />
                </RequireAuth>
              } 
            />
          </Route>
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}