import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Edit2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import UserPermissions, { AVAILABLE_PERMISSIONS } from './UserPermissions';
import type { User } from '../../../types/types';

interface UserFormProps {
  initialData?: {
    username: string;
    role: 'admin' | 'staff';
    permissions: string[];
    email?: string;
    phoneNumber?: string;
    twoFactorMethod?: '2fa_email' | '2fa_sms' | null;
  };
  onSubmit: (data: {
    username: string;
    password?: string;
    role: 'admin' | 'staff';
    permissions: string[];
    email?: string;
    phoneNumber?: string;
    twoFactorMethod?: '2fa_email' | '2fa_sms' | null;
  }) => Promise<void>;
  onCancel: () => void;
}

function UserForm({ initialData, onSubmit, onCancel }: UserFormProps) {
  const [username, setUsername] = useState(initialData?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>(initialData?.role || 'staff');
  const [permissions, setPermissions] = useState<string[]>(initialData?.permissions || []);
  const [email, setEmail] = useState(initialData?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'2fa_email' | '2fa_sms' | null>(initialData?.twoFactorMethod || null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate permissions
      if (permissions.length === 0) {
        throw new Error('Please select at least one permission');
      }

      await onSubmit({
        username,
        password: password || undefined, // Only include password if set
        role,
        permissions,
        email,
        phoneNumber,
        twoFactorMethod
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    }
  };

  // Update permissions when role changes
  const handleRoleChange = (newRole: 'admin' | 'staff') => {
    setRole(newRole);
    if (newRole === 'admin') {
      // Admins get all permissions
      setPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
    } else {
      // Staff gets basic permissions
      setPermissions(['create_orders']);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={!!initialData} // Disable username field when editing
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {initialData ? 'New Password (optional)' : 'Password'}
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!initialData} // Only required for new users
            minLength={8}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          {initialData && (
            <p className="mt-1 text-sm text-gray-500">
              Leave blank to keep current password
            </p>
          )}
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'staff')}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        <div>
          <label htmlFor="twoFactorMethod" className="block text-sm font-medium text-gray-700 mb-1">
            Two-Factor Authentication
          </label>
          <select
            id="twoFactorMethod"
            value={twoFactorMethod || ''}
            onChange={(e) => setTwoFactorMethod(e.target.value as '2fa_email' | '2fa_sms' | null)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Disabled</option>
            <option value="2fa_email">Email</option>
            <option value="2fa_sms">SMS</option>
          </select>
        </div>
      </div>

      <UserPermissions
        selectedPermissions={permissions}
        onChange={setPermissions}
      />

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
        >
          {initialData ? 'Update User' : 'Add User'}
        </button>
      </div>
    </form>
  );
}

export default function UserManagement() {
  const { user: currentUser, getUsers, addUser, updateUser, removeUser } = useAuth();
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<{
    username: string;
    role: 'admin' | 'staff';
    permissions: string[];
    email?: string;
    phoneNumber?: string;
    twoFactorMethod?: '2fa_email' | '2fa_sms' | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{
    username: string;
    role: 'admin' | 'staff';
    permissions: string[];
    email?: string;
    phoneNumber?: string;
    twoFactorMethod?: '2fa_email' | '2fa_sms' | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  // Load users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userList = await getUsers();
        setUsers(userList);
      } catch (err) {
        setError('Failed to load users');
        console.error('Error loading users:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [getUsers]);

  const handleAddUser = async (data: {
    username: string;
    password?: string;
    role: 'admin' | 'staff';
    permissions: string[];
    email?: string;
    phoneNumber?: string;
    twoFactorMethod?: '2fa_email' | '2fa_sms' | null;
  }) => {
    try {
      if (!data.password) {
        throw new Error('Password is required for new users');
      }

      await addUser(data.username, data.password, data.role, data.permissions);
      setIsAddingUser(false);
      
      // Refresh users list
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateUser = async (data: {
    username: string;
    password?: string;
    role: 'admin' | 'staff';
    permissions: string[];
    email?: string;
    phoneNumber?: string;
    twoFactorMethod?: '2fa_email' | '2fa_sms' | null;
  }) => {
    try {
      await updateUser(data.username, {
        role: data.role,
        permissions: data.permissions,
        email: data.email,
        phoneNumber: data.phoneNumber,
        twoFactorMethod: data.twoFactorMethod
      });
      setEditingUser(null);
      
      // Refresh users list
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);
    } catch (err) {
      throw err;
    }
  };

  const handleRemoveUser = async (username: string) => {
    try {
      setError(null);
      await removeUser(username);
      
      // Refresh users list
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">User Management</h2>
        <button
          onClick={() => setIsAddingUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-md">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      {isAddingUser && (
        <UserForm
          onSubmit={handleAddUser}
          onCancel={() => setIsAddingUser(false)}
        />
      )}

      {editingUser && (
        <UserForm
          initialData={editingUser}
          onSubmit={handleUpdateUser}
          onCancel={() => setEditingUser(null)}
        />
      )}

      <div className="bg-white shadow-sm rounded-lg divide-y">
        {users.map(user => (
          <div key={user.username} className="p-4 flex justify-between items-center">
            <div>
              <h3 className="font-medium">{user.username}</h3>
              <p className="text-sm text-gray-600">
                Role: {user.role} {user.twoFactorMethod && (
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                    2FA: {user.twoFactorMethod === '2fa_email' ? 'Email' : 'SMS'}
                  </span>
                )}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {user.permissions.map(permission => {
                  const permissionInfo = AVAILABLE_PERMISSIONS.find(p => p.id === permission);
                  return (
                    <span 
                      key={permission}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {permissionInfo?.label || permission}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              {/* Only show edit button for admin user if current user is admin */}
              {(user.username !== 'admin' || currentUser?.role === 'admin') && (
              <button
                onClick={() => setEditingUser({
                  username: user.username,
                  role: user.role,
                  permissions: user.permissions,
                  email: user.email,
                  phoneNumber: user.phoneNumber,
                  twoFactorMethod: user.twoFactorMethod
                })}
                className="flex items-center gap-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              )}
              {user.username !== 'admin' && (
                <button
                  onClick={() => handleRemoveUser(user.username)}
                  className="flex items-center gap-2 px-3 py-1 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}