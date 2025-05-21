import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { GraduationCap, Tag, Settings, FileText, Sparkles, Loader, RefreshCw, AlertCircle } from 'lucide-react';
import RDProductManagement from '../components/development/RDProductManagement';
import RDCategoryManagement from '../components/development/RDCategoryManagement';
import { useAuth } from '../hooks/useAuth';
import { initializeRDData } from '../services/rdDataService'; 

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
  const { hasPermission } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Initialize R&D data when the component mounts
  useEffect(() => {
    const init = async () => {
      try {
        await initializeRDData();
        console.log('R&D data initialized successfully in Development component');
      } catch (error) {
        console.error('Error initializing R&D data:', error);
        setInitError('Failed to initialize development data. Please try again.');
      } finally {
        setIsInitializing(false);
      }
    };
    
    init();
  }, []);
  
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
      label: "R&D Categories", 
      icon: <Tag className="w-4 h-4" />,
      description: "Manage test categories",
      requiredPermissions: ['manage_products'],
      element: <RDCategoryManagement />
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

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-cyan-100 rounded-lg">
            <GraduationCap className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Product Development</h1>
            <p className="text-gray-600">Initializing development environment...</p>
          </div>
        </div>
        <div className="bg-white p-12 rounded-xl text-center shadow">
          <Loader className="w-10 h-10 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading development data...</p>
        </div>
      </div>
    );
  }
  
  // Show error if initialization failed
  if (initError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-cyan-100 rounded-lg">
            <GraduationCap className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Product Development</h1>
            <p className="text-gray-600">Research and development workspace</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-2 text-red-800">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="font-medium text-lg">Initialization Error</h3>
          </div>
          <p className="text-red-600 mb-4">{initError}</p>
          <p className="text-gray-600 mb-4">
            Unable to connect to the database. Please check your connection and permissions.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => {
                setIsInitializing(true);
                setInitError(null);
                initializeRDData()
                  .then(() => {
                    console.log('R&D data reinitialized successfully');
                    setIsInitializing(false);
                  })
                  .catch(error => {
                    console.error('Error reinitializing R&D data:', error);
                    setInitError('Failed to initialize development data. Please try again.');
                    setIsInitializing(false);
                  });
              }}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline-block" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 rounded-lg">
            <GraduationCap className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Product Development</h1>
            <p className="text-gray-600">Research and development workspace</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            element={<Navigate to="/development/products" replace />}
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
            element={<Navigate to="/development/products" replace />} 
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