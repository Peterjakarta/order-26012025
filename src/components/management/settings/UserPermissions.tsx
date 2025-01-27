import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Permission {
  id: string;
  label: string;
  description: string;
  page: string;
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  // Order Form Page
  { 
    id: 'create_orders', 
    label: 'Order Form', 
    description: 'Can access order form and submit new orders',
    page: 'Order Form'
  },
  
  // Management - Orders Page
  { 
    id: 'manage_orders', 
    label: 'Orders Management', 
    description: 'Can view active orders, edit orders, and remove orders',
    page: 'Management - Orders'
  },
  
  // Management - Completed Orders Page
  { 
    id: 'manage_completed_orders', 
    label: 'Completed Orders', 
    description: 'Can view completed orders, download reports, and calculate ingredients',
    page: 'Management - Completed Orders'
  },
  
  // Management - Production Page
  { 
    id: 'manage_production', 
    label: 'Production Schedule', 
    description: 'Can schedule production, view calendar, and mark orders as completed',
    page: 'Management - Production'
  },
  {
    id: 'manage_products',
    label: 'Products',
    description: 'Can add, edit, and remove products',
    page: 'Management - Products'
  },
  {
    id: 'manage_categories',
    label: 'Categories',
    description: 'Can manage product categories and bulk import products',
    page: 'Management - Categories'
  },
  {
    id: 'manage_branches',
    label: 'Branches',
    description: 'Can add, edit, and remove branch locations',
    page: 'Management - Branches'
  },
  
  // Management - Pricing Page
  {
    id: 'manage_pricing',
    label: 'Pricing',
    description: 'Can manage ingredients, recipes, and cost calculations',
    page: 'Management - Pricing'
  },
  
  // Management - Logbook Page
  {
    id: 'view_logbook',
    label: 'Logbook',
    description: 'Can view system logs and activity history',
    page: 'Management - Logbook'
  },
  
  // Management - Settings Page
  {
    id: 'manage_users',
    label: 'User Management',
    description: 'Can manage users, roles, and permissions in settings',
    page: 'Management - Settings'
  }
];

// Group permissions by page
const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
  if (!acc[permission.page]) {
    acc[permission.page] = [];
  }
  acc[permission.page].push(permission);
  return acc;
}, {} as Record<string, Permission[]>);

interface UserPermissionsProps {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
  error?: string | null;
}

export default function UserPermissions({ 
  selectedPermissions, 
  onChange,
  disabled = false,
  error 
}: UserPermissionsProps) {
  const handleTogglePermission = (permissionId: string) => {
    const newPermissions = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter(id => id !== permissionId)
      : [...selectedPermissions, permissionId];
    onChange(newPermissions);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Permissions
        </label>
        <p className="text-sm text-gray-500 mb-4">
          Select the permissions for this user
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(groupedPermissions).map(([page, permissions]) => (
          <div key={page} className="space-y-2">
            <div className="text-sm font-semibold text-gray-900 bg-gray-50 p-2 rounded">
              {page}
            </div>
            <div className="space-y-2 ml-2">
              {permissions.map(permission => (
                <label 
                  key={permission.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission.id)}
                    onChange={() => handleTogglePermission(permission.id)}
                    disabled={disabled}
                    className="mt-1 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <div>
                    <div className="font-medium">{permission.label}</div>
                    <div className="text-sm text-gray-600">{permission.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { AVAILABLE_PERMISSIONS };