import React, { useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { GraduationCap, Tag, Settings, FileText, Sparkles, RefreshCw, AlertCircle, Clipboard } from 'lucide-react';
import RDProductManagement from '../components/development/RDProductManagement';
import RDCategoryManagement from '../components/development/RDCategoryManagement';
import ProductApprovalList from '../components/development/ProductApprovalList';
import { useAuth } from '../hooks/useAuth';
import { initializeRDCollections } from '../services/rdDataService';
import Beaker from '../components/common/BeakerIcon';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  requiredPermissions: string[];
  element: React.ReactNode;
}

export default function Development() {
  const location = useLocation();
  const { hasPermission, isAuthenticated, user } = useAuth();
  const [initializing, setInitializing] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Initialize Firestore R&D collections on component mount
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (!mounted) return;
      
      setInitializing(true);
      setError(null);
      
      try {
        console.log('Development page: Initializing R&D collections...');
        
        if (!isAuthenticated || !user) {
          console.log('User not authenticated or not available, skipping initialization');
          setInitializing(false);
          return;
        }
        
        // Initialize Firestore collections for RD data
        const result = await initializeRDCollections();
        console.log('R&D collections initialization result:', result);
      } catch (err) {
        console.error('Error initializing R&D collections:', err);
        
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize R&D data');
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user]);
  
  const menuItems: MenuItem[] = [
    {
      path: "/development/products",
      label: "R&D Products",
      icon: <Tag className="w-4 h-4" />,
      description: "Manage products under development",
      requiredPermissions: ['manage_products'],
      element: <RDProductManagement />
    },
    {
      path: "/development/categories",
      label: "Test Categories",
      icon: <Tag className="w-4 h-4" />,
      description: "Manage test categories",
      requiredPermissions: ['manage_products'],
      element: <RDCategoryManagement />
    },
    {
      path: "/development/approvals",
      label: "Approval Forms",
      icon: <Clipboard className="w-4 h-4" />,
      description: "Manage product approval forms",
      requiredPermissions: ['manage_products'],
      element: <ProductApprovalList />
    },
    {
      path: "/development/documentation",
      label: "Documentation",
      icon: <FileText className="w-4 h-4" />,
      description: "Product development documentation",
      requiredPermissions: ['manage_products'],
      element: <RDDocumentation />
    },
    {
      path: "/development/settings",
      label: "R&D Settings",
      icon: <Settings className="w-4 h-4" />,
      description: "Configure development environment",
      requiredPermissions: ['manage_products'],
      element: <RDSettings />
    },
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
          You don't have permission to access the development features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 rounded-lg">
            <Beaker className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Product Development</h1>
            <p className="text-gray-600">Research and development workspace</p>
            {initializing && <p className="text-xs text-cyan-600">Initializing data...</p>}
          </div>
          {initializing && (
            <RefreshCw className="w-4 h-4 text-cyan-500 animate-spin" />
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading development data</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {authorizedMenuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`p-6 rounded-lg border transition-all duration-200 hover:shadow-md hover:-translate-y-1 ${
              location.pathname === item.path
                ? 'bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 shadow-sm'
                : 'bg-white border-gray-200 hover:border-cyan-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-full ${
                location.pathname === item.path
                  ? 'bg-cyan-500 text-white'
                  : 'bg-cyan-100 text-cyan-600'
              }`}>
                {item.icon}
              </div>
              <h3 className="font-semibold">{item.label}</h3>
            </div>
            <p className="text-sm text-gray-600">{item.description}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/development/products\" replace />}
          />
          {authorizedMenuItems.map(item => (
            <Route 
              key={item.path}
              path={item.path.replace("/development/", "")} 
              element={item.element} 
            />
          ))}
          <Route 
            path="*" 
            element={<Navigate to="/development/products\" replace />} 
          />
        </Routes>
      </div>
    </div>
  );
}

function RDDocumentation() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <FileText className="w-6 h-6 text-cyan-600" />
        Development Documentation
      </h2>
      <div className="bg-gray-50 p-8 rounded-lg text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <Sparkles className="w-16 h-16 text-cyan-500" />
          <h3 className="text-lg font-medium">Documentation Coming Soon</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            This section will include product specifications, test results, and development notes.
          </p>
        </div>
      </div>
    </div>
  );
}

function RDSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Settings className="w-6 h-6 text-cyan-600" />
        R&D Settings
      </h2>
      <div className="bg-gray-50 p-8 rounded-lg text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <Sparkles className="w-16 h-16 text-cyan-500" />
          <h3 className="text-lg font-medium">Settings Coming Soon</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            This section will allow you to configure development workflows, testing parameters, and approval processes.
          </p>
        </div>
      </div>
    </div>
  );
}