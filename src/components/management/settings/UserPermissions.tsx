import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Permission {
  id: string;
  label: string;
  description: string;
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  { 
    id: 'manage_users', 
    label: 'Manage Users', 
    description: 'Can add, edit, and remove users' 
  },
  { 
    id: 'manage_orders', 
    label: 'Manage Orders', 
    description: 'Can view and manage all orders' 
  },
  { 
    id: 'manage_products', 
    label: 'Manage Products', 
    description: 'Can manage products and categories' 
  },
  { 
    id: 'create_orders', 
    label: 'Create Orders', 
    description: 'Can create new orders' 
  }
];

interface UserPermissionsProps {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  error?: string | null;
}

export default function UserPermissions({ 
  selectedPermissions, 
  onChange,
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
        {AVAILABLE_PERMISSIONS.map(permission => (
          <label 
            key={permission.id}
            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedPermissions.includes(permission.id)}
              onChange={() => handleTogglePermission(permission.id)}
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
  );
}

export { AVAILABLE_PERMISSIONS };