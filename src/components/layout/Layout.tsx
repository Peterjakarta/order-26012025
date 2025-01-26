import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../../hooks/useAuth';

export default function Layout() {
  const { isAuthenticated } = useAuth();
  
  // Add any layout-specific effects here
  useEffect(() => {
    // This ensures hooks are called in the same order
    // You can add layout-specific side effects here if needed
  }, []);

  // Don't show header for non-authenticated users
  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}