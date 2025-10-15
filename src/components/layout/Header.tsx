import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Coffee } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const location = useLocation();
  const { logout, hasPermission, user } = useAuth();
  
  return (
    <header className="bg-gradient-to-r from-purple-600 to-pink-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-4 group">
              <div className="w-16 h-16 bg-[#1e3a8a] rounded-full flex items-center justify-center p-2 transition-all duration-300 group-hover:scale-105 shadow-lg">
                <div className="text-white text-xs font-serif leading-tight text-center">
                  CO<br/>KE<br/>LA<br/>TEH
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Cokelateh</h1>
                <p className="text-pink-100 text-sm">Internal Product Order System</p>
              </div>
            </Link>
            
            <div className="flex items-center gap-6">
              <nav className="flex gap-3">
                <NavLink to="/" current={location.pathname === "/"}>
                  Order Form
                </NavLink>
                {hasPermission('manage_orders') && (
                  <NavLink to="/management" current={location.pathname.includes("/management")}>
                    Management
                  </NavLink>
                )}
                {hasPermission('manage_products') && (
                  <NavLink to="/development" current={location.pathname.includes("/development")}>
                    Development
                  </NavLink>
                )}
                {hasPermission('manage_orders') && (
                  <NavLink to="/haccp" current={location.pathname.includes("/haccp")}>
                    HACCP
                  </NavLink>
                )}
              </nav>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-all duration-200 
                  active:bg-white/20 active:scale-95"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, current, children }: { 
  to: string; 
  current: boolean; 
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
        current
          ? 'bg-white text-purple-600 shadow-lg transform hover:scale-[1.03] active:scale-[0.97]'
          : 'text-white hover:bg-white/10 active:bg-white/20 active:scale-95'
      }`}
    >
      {children}
    </Link>
  );
}