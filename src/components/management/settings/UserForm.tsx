import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import UserPermissions, { AVAILABLE_PERMISSIONS } from './UserPermissions';

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

export default function UserForm({ initialData, onSubmit, onCancel }: UserFormProps) {
  const [username, setUsername] = useState(initialData?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>(initialData?.role || 'staff');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'2fa_email' | '2fa_sms' | null>(
    initialData?.twoFactorMethod || null
  );
  const [permissions, setPermissions] = useState<string[]>(initialData?.permissions || []);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate permissions
      if (permissions.length === 0) {
        throw new Error('Please select at least one permission');
      }

      // Validate 2FA method requirements
      if (twoFactorMethod === '2fa_email' && !email) {
        throw new Error('Email is required for email authentication');
      }
      if (twoFactorMethod === '2fa_sms' && !phoneNumber) {
        throw new Error('Phone number is required for SMS authentication');
      }

      await onSubmit({
        username,
        password: password || undefined,
        role,
        permissions,
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
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
          {initialData?.username === 'admin' ? (
            <div className="w-full px-4 py-2 bg-gray-100 border rounded-lg text-gray-700">
              Admin (Fixed)
            </div>
          ) : (
            <select
              id="role"
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'staff')}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter email address"
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
              placeholder="+1234567890"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Two-Factor Authentication Method
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={twoFactorMethod === null}
                onChange={() => setTwoFactorMethod(null)}
                className="rounded-full border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <span>Disabled</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={twoFactorMethod === '2fa_email'}
                onChange={() => setTwoFactorMethod('2fa_email')}
                disabled={!email}
                className="rounded-full border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <span>Email Authentication</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={twoFactorMethod === '2fa_sms'}
                onChange={() => setTwoFactorMethod('2fa_sms')}
                disabled={!phoneNumber}
                className="rounded-full border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <span>SMS Authentication</span>
            </label>
          </div>
          {((twoFactorMethod === '2fa_email' && !email) || 
            (twoFactorMethod === '2fa_sms' && !phoneNumber)) && (
            <p className="mt-2 text-sm text-red-600">
              Please provide the required contact information for the selected method
            </p>
          )}
        </div>
      </div>

      <UserPermissions
        selectedPermissions={permissions}
        onChange={(newPermissions) => {
          // For admin user, ensure all permissions are always selected
          if (initialData?.username === 'admin') {
            setPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
          } else {
            setPermissions(newPermissions);
          }
        }}
        disabled={initialData?.username === 'admin'}
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