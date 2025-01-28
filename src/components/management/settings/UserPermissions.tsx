import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Permission {
  id: string;
  label: string;
  description: string;
  group: string;
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  { 
    id: 'manage_users', 
    label: 'Manage Users', 
    description: 'Can add, edit, and remove users, manage roles and permissions',
    group: 'Administration'
  },
  { 
    id: 'manage_orders', 
    label: 'Manage Orders', 
    description: 'Can view, edit, and delete orders, manage production schedule',
    group: 'Orders'
  },
  { 
    id: 'manage_products', 
    label: 'Manage Products', 
    description: 'Can manage products, categories, recipes, and ingredients',
    group: 'Products'
  },
  { 
    id: 'create_orders', 
    label: 'Create Orders', 
    description: 'Can create and submit new orders',
    group: 'Orders'
  },
  {
    id: 'manage_production',
    label: 'Manage Production',
    description: 'Can schedule production, mark orders as completed, calculate ingredients',
    group: 'Production'
  },
  {
    id: 'manage_recipes',
    label: 'Manage Recipes',
    description: 'Can create and edit recipes, manage ingredient costs and usage',
    group: 'Products'
  },
  {
    id: 'view_reports',
    label: 'View Reports',
    description: 'Can view production reports, ingredient usage, and order history',
    group: 'Reports'
  },
  {
    id: 'manage_branches',
    label: 'Manage Branches',
    description: 'Can add, edit, and remove branch locations',
    group: 'Administration'
  }
];

// Group permissions by category
const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
  if (!acc[permission.group]) {
    acc[permission.group] = [];
  }
  acc[permission.group].push(permission);
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
        {Object.entries(groupedPermissions).map(([group, permissions]) => (
          <div key={group} className="space-y-2">
            <div className="text-sm font-semibold text-gray-900 bg-gray-50 p-2 rounded">
              {group}
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