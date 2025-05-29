import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Package2, CheckCircle2, Calendar, Calculator, Settings, ClipboardList, FileText } from 'lucide-react';
import OrderList from '../components/management/OrderList';
import ProductManagement from '../components/management/ProductManagement';
import CategoryManagement from '../components/management/CategoryManagement';
import CompletedOrders from '../components/management/CompletedOrders';
import ProductionSchedule from '../components/management/production/ProductionSchedule';
import IngredientManagement from '../components/management/pricing/IngredientManagement';
import RecipeManagement from '../components/management/pricing/RecipeManagement';
import IngredientStock from '../components/management/pricing/IngredientStock';
import SettingsPage from '../components/management/settings/Settings';
import Logbook from '../components/management/logbook/Logbook';
import DocumentationManagement from '../components/management/documentation/DocumentationManagement';
import { useAuth } from '../hooks/useAuth';

interface MenuItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
  requiredPermissions: string[];
  element: React.ReactNode;
}

export default function Management() {
  const location = useLocation();
  const { hasPermission } = useAuth();
  
  const menuItems: MenuItem[] = [
    {
      path: "/management/orders",
      label: "Orders",
      icon: <Package2 className="w-4 h-4" />,
      requiredPermissions: ['manage_orders'],
      element: <OrderList filter="pending" />
    },
    {
      path: "/management/completed",
      label: "Completed",
      icon: <CheckCircle2 className="w-4 h-4" />,
      requiredPermissions: ['manage_orders'],
      element: <CompletedOrders />
    },
    {
      path: "/management/production",
      label: "Production",
      icon: <Calendar className="w-4 h-4" />,
      requiredPermissions: ['manage_orders'],
      element: <ProductionSchedule />
    },
    {
      path: "/management/products",
      label: "Products",
      requiredPermissions: ['manage_products'],
      element: <ProductManagement />
    },
    {
      path: "/management/categories",
      label: "Categories",
      requiredPermissions: ['manage_products'],
      element: <CategoryManagement />
    },
    {
      path: "/management/pricing",
      label: "Pricing",
      icon: <Calculator className="w-4 h-4" />,
      requiredPermissions: ['manage_products'],
      element: <PricingDashboard />
    },
    {
      path: "/management/documentation",
      label: "Documentation",
      icon: <FileText className="w-4 h-4" />,
      requiredPermissions: ['manage_products'],
      element: <DocumentationManagement />
    },
    {
      path: "/management/logbook",
      label: "Logbook",
      icon: <ClipboardList className="w-4 h-4" />,
      requiredPermissions: ['manage_users'],
      element: <Logbook />
    },
    {
      path: "/management/settings",
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
      requiredPermissions: [], // Empty array means all authenticated users can access
      element: <SettingsPage />
    }
  ];

  // Filter menu items based on permissions
  const authorizedMenuItems = menuItems.filter(item => 
    item.requiredPermissions.every(permission => hasPermission(permission))
  );

  // If no menu items are authorized, show access denied
  if (authorizedMenuItems.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600">
          You don't have permission to access any management features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex gap-2 p-1 bg-white rounded-lg shadow-sm">
        {authorizedMenuItems.map(item => (
          <NavTab 
            key={item.path}
            to={item.path} 
            active={location.pathname === item.path || 
              (item.path === "/management/orders" && location.pathname === "/management") ||
              (item.path === "/management/production" && location.pathname.includes("/management/production"))}
            icon={item.icon}
          >
            {item.label}
          </NavTab>
        ))}
      </nav>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <Routes>
          {authorizedMenuItems.map(item => (
            <Route 
              key={item.path}
              path={item.path === "/management/orders" ? "" : item.path.replace("/management/", "")} 
              element={item.element} 
            />
          ))}
          {/* Special route for production with ID */}
          {hasPermission('manage_orders') && (
            <Route path="production/:orderId\" element={<ProductionSchedule />} />
          )}
          {/* Special routes for pricing sub-pages */}
          {hasPermission('manage_products') && (
            <>
              <Route path="pricing/ingredients" element={<IngredientManagement />} />
              <Route path="pricing/stock" element={<IngredientStock />} />
              <Route path="pricing/recipes" element={<RecipeManagement />} />
            </>
          )}
          {/* Redirect to first authorized menu item if no match */}
          <Route 
            path="*" 
            element={<Navigate to={authorizedMenuItems[0].path} replace />} 
          />
        </Routes>
      </div>
    </div>
  );
}

function PricingDashboard() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-3">
        <Link 
          to="/management/pricing/ingredients"
          className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold mb-2">Ingredients</h3>
          <p className="text-gray-600">
            Manage ingredients, their costs, and packaging information
          </p>
        </Link>

        <Link 
          to="/management/pricing/stock"
          className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold mb-2">Stock Management</h3>
          <p className="text-gray-600">
            Track and update ingredient stock levels
          </p>
        </Link>

        <Link 
          to="/management/pricing/recipes"
          className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold mb-2">Recipes</h3>
          <p className="text-gray-600">
            Create and manage recipes, calculate costs and ingredient usage
          </p>
        </Link>
      </div>
    </div>
  );
}

function NavTab({ to, active, children, icon }: {
  to: string;
  active: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`relative px-4 py-2 rounded-md transition-all duration-300 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] overflow-hidden ${
        active
          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-glow hover:shadow-lg hover:from-purple-700 hover:to-pink-700 after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full hover:after:translate-x-full after:transition-transform after:duration-500'
          : 'text-gray-600 hover:bg-gray-50/80 hover:shadow-depth backdrop-blur-sm bg-white/50'
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}